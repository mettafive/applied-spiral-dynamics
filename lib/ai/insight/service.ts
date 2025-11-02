import { generateObject } from "ai";
import { archivePixel, updatePixelConfidence } from "@/lib/db/queries";
import type { PixelExtraction } from "../interpreter/schema";
import type { ActivatedPixel } from "../pm-handler/service";
import { cacheGuidance } from "../pm-handler/service";
import { myProvider } from "../providers";
import { createInsightPrompt, insightSystemPrompt } from "./prompt";
import { type InsightOutput, insightOutputSchema } from "./schema";

export async function runInsightAnalysisAsync(params: {
  userMessage: string;
  assistantResponse: string;
  activatedPixels: ActivatedPixel[];
  newPixel?: PixelExtraction;
  chatId: string;
  userId: string;
}): Promise<InsightOutput> {
  const { userMessage, assistantResponse, activatedPixels, newPixel, chatId } =
    params;

  try {
    const { object: guidance } = await generateObject({
      model: myProvider.languageModel("chat-model"),
      schema: insightOutputSchema,
      system: insightSystemPrompt,
      prompt: createInsightPrompt({
        userMessage,
        assistantResponse,
        activatedPixels,
        newPixel,
      }),
      temperature: 0.4,
    });

    cacheGuidance(chatId, guidance);

    applySideEffects(guidance);

    return guidance;
  } catch (error) {
    console.error("Insight analysis failed:", error);
    return {
      guidance: "Continue natural conversation.",
      context_summary: "Analysis unavailable.",
      confidence_adjustments: [],
      pixels_to_archive: [],
    };
  }
}

async function applySideEffects(guidance: InsightOutput) {
  const errors: Array<{ operation: string; pixelId: string; error: unknown }> =
    [];

  // Apply confidence adjustments
  const adjustmentPromises = guidance.confidence_adjustments.map(
    async (adj) => {
      try {
        await updatePixelConfidence({
          pixelId: adj.pixel_id,
          confidenceScore: adj.new_score,
          reason: adj.reason,
        });
      } catch (err) {
        errors.push({
          operation: "confidence_update",
          pixelId: adj.pixel_id,
          error: err,
        });
      }
    }
  );

  // Apply pixel archiving
  const archivePromises = guidance.pixels_to_archive.map(async (pixelId) => {
    try {
      await archivePixel({ pixelId });
    } catch (err) {
      errors.push({
        operation: "archive",
        pixelId,
        error: err,
      });
    }
  });

  // Wait for all side effects to complete
  await Promise.all([...adjustmentPromises, ...archivePromises]);

  // Report aggregated errors if any occurred
  if (errors.length > 0) {
    console.error(
      `⚠️  Insight side effects completed with ${errors.length} error(s):`,
      errors.map((e) => `${e.operation} on ${e.pixelId}: ${e.error}`)
    );
  } else if (adjustmentPromises.length > 0 || archivePromises.length > 0) {
    console.log(
      `✅ Applied ${adjustmentPromises.length} confidence adjustment(s) and ${archivePromises.length} archive(s)`
    );
  }
}
