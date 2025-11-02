import { generateObject } from "ai";
import { myProvider } from "../providers";
import { createInterpreterPrompt, interpreterSystemPrompt } from "./prompt";
import {
  type InterpreterOutput,
  interpreterOutputSchema,
  type PixelExtraction,
} from "./schema";

// Simple in-memory rate limit tracking (use Redis in production)
const interpreterCallTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_CALLS_PER_WINDOW = 20; // Max 20 interpreter calls per minute per user

function checkRateLimit(userId?: string): void {
  if (!userId) {
    return; // Skip rate limiting for anonymous users in dev
  }

  const now = Date.now();
  const userCalls = interpreterCallTimestamps.get(userId) ?? [];

  // Remove calls outside the window
  const recentCalls = userCalls.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW
  );

  if (recentCalls.length >= MAX_CALLS_PER_WINDOW) {
    console.warn(
      `⚠️  Rate limit warning: User ${userId} has made ${recentCalls.length} interpreter calls in the last minute`
    );
    // In production, you might want to throw an error here or implement exponential backoff
  }

  recentCalls.push(now);
  interpreterCallTimestamps.set(userId, recentCalls);

  // Cleanup old entries periodically
  if (interpreterCallTimestamps.size > 1000) {
    for (const [id, timestamps] of interpreterCallTimestamps.entries()) {
      if (timestamps.every((t) => now - t > RATE_LIMIT_WINDOW)) {
        interpreterCallTimestamps.delete(id);
      }
    }
  }
}

export async function runInterpreterParallel(params: {
  userMessage: string;
  userId?: string;
  onPixelExtracted?: (pixel: PixelExtraction) => void;
}): Promise<InterpreterOutput> {
  const { userMessage, userId, onPixelExtracted } = params;

  checkRateLimit(userId);

  try {
    const { object: result } = await generateObject({
      model: myProvider.languageModel("chat-model"),
      schema: interpreterOutputSchema,
      system: interpreterSystemPrompt,
      prompt: createInterpreterPrompt(userMessage),
      temperature: 0.3,
    });

    if (isPixelExtraction(result) && onPixelExtracted) {
      onPixelExtracted(result);
    }

    return result;
  } catch (error) {
    console.error("Interpreter failed:", error);
    return {
      no_pixel: true,
      reason: "Processing failed",
    };
  }
}

export function isPixelExtraction(
  result: InterpreterOutput
): result is PixelExtraction {
  return "pixel" in result;
}
