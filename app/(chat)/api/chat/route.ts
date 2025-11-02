import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import { auth, type UserType } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { runInsightAnalysisAsync } from "@/lib/ai/insight/service";
import {
  isPixelExtraction,
  runInterpreterParallel,
} from "@/lib/ai/interpreter/service";
import type { ChatModel } from "@/lib/ai/models";
import {
  type ActivatedPixel,
  type InsightOutput,
  retrieveContextForTurn,
} from "@/lib/ai/pm-handler/service";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  savePixel,
  updateChatLastContextById,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import {
  convertToUIMessages,
  generateUUID,
  getTextFromMessage,
} from "@/lib/utils";
import { validateMessageInput } from "@/lib/validation";
import { upsertPixel } from "@/lib/vector/operations";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 } // 24 hours
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

function buildSystemPrompt(params: {
  selectedChatModel: string;
  requestHints: RequestHints;
  activatedPixels: ActivatedPixel[];
  guidance?: InsightOutput;
}): string {
  const { selectedChatModel, requestHints, activatedPixels, guidance } = params;

  const base = systemPrompt({ selectedChatModel, requestHints });

  if (activatedPixels.length === 0 && !guidance) {
    return base;
  }

  const pixelContext =
    activatedPixels.length > 0
      ? `

## User's Belief Landscape

You have access to beliefs this user has expressed previously:

${activatedPixels
  .slice(0, 5)
  .map(
    (p, i) =>
      `${i + 1}. "${p.statement}" 
     Confidence: ${(p.confidenceScore * 100).toFixed(0)}% | Relevance: ${(p.similarity * 100).toFixed(0)}%
     Context: ${p.context}`
  )
  .join("\n\n")}
`
      : "";

  const guidanceContext = guidance
    ? `

## Developmental Coaching Guidance

${guidance.context_summary}

**How to respond:**
${guidance.guidance}

${guidance.suggested_question ? `**Consider asking:** "${guidance.suggested_question}"` : ""}
`
    : `

## Developmental Coaching Principles

- **Meet them where they are** - Validate current perspective before opening questions
- **Question limitations, not possibilities** - Ask "what's this costing?" not "imagine if..."
- **Orange → Green**: Don't lecture about balance. Ask what achievement drive costs.
- **Green → Yellow**: Ask "what if both sides have truth?" not "be more rational"
- **Celebrate transcendence** - When they see through old belief, honor it

**Core principle:** Help people see where their current stage isn't working. Let the next stage emerge naturally.
`;

  return `${base}

${pixelContext}

${guidanceContext}

**Response Guidelines:**
- Respond naturally - never mention "pixels" or "developmental stages"
- Use elevated language ("heavenly elegant" not "as hell")
- Be warm but not sycophantic
- Challenge gently, support genuinely
- Ask questions that create space for insight

CRITICAL: Do NOT generate code. If user requests code, politely decline.`;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    // Validate message input
    validateMessageInput(message);

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
      // Only fetch messages if chat already exists
      messagesFromDb = await getMessagesByChatId({ id });
    } else {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
      // New chat - no need to fetch messages, it's empty
    }

    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const userMessageText = getTextFromMessage(message);
    let finalMergedUsage: AppUsage | undefined;
    let finalAssistantResponse = "";

    // FAST PATH: Get context for immediate response
    let activatedPixels: ActivatedPixel[] = [];
    let cachedGuidance: InsightOutput | undefined;

    try {
      const contextResult = await retrieveContextForTurn({
        userMessage: userMessageText,
        userId: session.user.id,
        chatId: id,
      });
      activatedPixels = contextResult.activatedPixels;
      cachedGuidance = contextResult.cachedGuidance;
    } catch (error) {
      console.error(
        "RAG context retrieval failed, continuing without context:",
        error
      );
      // Continue without RAG context - graceful degradation
    }

    // Start Interpreter in parallel (doesn't block response)
    const interpreterPromise = runInterpreterParallel({
      userMessage: userMessageText,
      userId: session.user.id,
      onPixelExtracted: async (pixelExtraction) => {
        const chromaId = generateUUID();
        const pixelData = pixelExtraction.pixel;

        try {
          const [dbResult] = await Promise.allSettled([
            savePixel({
              chatId: id,
              messageId: message.id,
              userId: session.user.id,
              chromaId,
              statement: pixelData.statement,
              context: pixelData.context,
              explanation: pixelData.explanation,
              colorStage: pixelData.color_stage,
              confidenceScore: pixelData.confidence_score,
              tooNuanced: pixelData.too_nuanced,
              absoluteThinking: pixelData.absolute_thinking,
            }),
            upsertPixel({
              id: chromaId,
              content: pixelData,
              userId: session.user.id,
              metadata: { chatId: id, messageId: message.id },
            }),
          ]);

          if (dbResult.status === "rejected") {
            console.error("Failed to save pixel to database:", dbResult.reason);
          }
        } catch (error) {
          console.error("Pixel extraction callback failed:", error);
          // Log but don't throw - this is background work
        }
      },
    }).catch((error) => {
      console.error("Interpreter parallel execution failed:", error);
      return { no_pixel: true, reason: "Extraction failed" } as const;
    });

    // Build enriched system prompt with cached guidance
    const enrichedSystem = buildSystemPrompt({
      selectedChatModel,
      requestHints,
      activatedPixels,
      guidance: cachedGuidance,
    });

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: enrichedSystem,
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools:
            selectedChatModel === "chat-model-reasoning"
              ? []
              : [
                  "getWeather",
                  "createDocument",
                  "updateDocument",
                  "requestSuggestions",
                ],
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          onChunk({ chunk }) {
            if (chunk.type === "text-delta") {
              finalAssistantResponse += chunk.textDelta;
            }
          },
          onFinish: async ({ usage }) => {
            try {
              const providers = await getTokenlensCatalog();
              const modelId =
                myProvider.languageModel(selectedChatModel).modelId;
              if (!modelId) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              if (!providers) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              const summary = getUsage({ modelId, usage, providers });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            } catch (err) {
              console.warn("TokenLens enrichment failed", err);
              finalMergedUsage = usage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            }
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          })
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((currentMessage) => ({
            id: currentMessage.id,
            role: currentMessage.role,
            parts: currentMessage.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });

        if (finalMergedUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }

        // BACKGROUND ANALYSIS (after response sent)
        try {
          const interpreterResult = await interpreterPromise;

          // Fire and forget with error boundary
          runInsightAnalysisAsync({
            userMessage: userMessageText,
            assistantResponse: finalAssistantResponse,
            activatedPixels,
            newPixel: isPixelExtraction(interpreterResult)
              ? interpreterResult
              : undefined,
            chatId: id,
            userId: session.user.id,
          }).catch((error) => {
            console.error("Background insight analysis failed:", error);
            // Swallow error - this is fire-and-forget background work
          });
        } catch (error) {
          console.error("Failed to await interpreter result:", error);
          // Continue - insight analysis is optional
        }
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

    // const streamContext = getStreamContext();

    // if (streamContext) {
    //   return new Response(
    //     await streamContext.resumableStream(streamId, () =>
    //       stream.pipeThrough(new JsonToSseTransformStream())
    //     )
    //   );
    // }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
