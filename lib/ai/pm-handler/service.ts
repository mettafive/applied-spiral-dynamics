import { getPixelsByIds } from "@/lib/db/queries";
import type { Pixel } from "@/lib/db/schema";
import { retrieveRelevantPixels } from "@/lib/vector/operations";

export type ActivatedPixel = Pixel & {
  similarity: number;
};

export type InsightOutput = {
  guidance: string;
  context_summary: string;
  confidence_adjustments: Array<{
    pixel_id: string;
    new_score: number;
    reason: string;
  }>;
  pixels_to_archive: string[];
  suggested_question?: string;
};

// PRODUCTION WARNING: This in-memory cache will NOT work in serverless environments
// In production, replace with Redis or another distributed cache
// Set REDIS_URL environment variable to enable Redis caching
const guidanceCache = new Map<
  string,
  {
    guidance: InsightOutput;
    timestamp: number;
  }
>();

const GUIDANCE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Warn on first use if Redis is not configured
let hasWarnedAboutCache = false;

function warnAboutInMemoryCache() {
  if (!hasWarnedAboutCache && !process.env.REDIS_URL) {
    console.warn(
      "⚠️  WARNING: Using in-memory cache for guidance storage. " +
        "This will NOT work correctly in serverless/multi-instance deployments. " +
        "Set REDIS_URL to enable distributed caching."
    );
    hasWarnedAboutCache = true;
  }
}

export async function retrieveContextForTurn(params: {
  userMessage: string;
  userId: string;
  chatId: string;
}): Promise<{
  activatedPixels: ActivatedPixel[];
  cachedGuidance?: InsightOutput;
}> {
  const { userMessage, userId, chatId } = params;

  const [searchResults, cached] = await Promise.all([
    retrieveRelevantPixels(userMessage, {
      topK: 10,
      userId,
      minSimilarity: 0.7,
      includeArchived: false,
    }),
    getCachedGuidance(chatId),
  ]);

  if (searchResults.length === 0) {
    return { activatedPixels: [], cachedGuidance: cached };
  }

  const pixelIds = searchResults.map((r) => r.id);
  const pixels = await getPixelsByIds({ ids: pixelIds });

  const activatedPixels: ActivatedPixel[] = pixels.map((pixel) => ({
    ...pixel,
    similarity: searchResults.find((r) => r.id === pixel.id)?.similarity ?? 0,
  }));

  return {
    activatedPixels: activatedPixels.sort(
      (a, b) => b.similarity - a.similarity
    ),
    cachedGuidance: cached,
  };
}

function getCachedGuidance(chatId: string): InsightOutput | undefined {
  warnAboutInMemoryCache();

  const entry = guidanceCache.get(chatId);
  if (!entry) {
    return;
  }

  if (Date.now() - entry.timestamp > GUIDANCE_TTL) {
    guidanceCache.delete(chatId);
    return;
  }

  return entry.guidance;
}

export function cacheGuidance(chatId: string, guidance: InsightOutput) {
  warnAboutInMemoryCache();

  guidanceCache.set(chatId, {
    guidance,
    timestamp: Date.now(),
  });

  // Trigger cleanup periodically (simple approach for in-memory cache)
  scheduleCleanup();
}

// Cleanup expired entries periodically
let cleanupScheduled = false;

function scheduleCleanup() {
  if (cleanupScheduled) {
    return;
  }

  cleanupScheduled = true;
  setTimeout(() => {
    cleanupScheduled = false;
    const now = Date.now();

    for (const [chatId, entry] of guidanceCache.entries()) {
      if (now - entry.timestamp > GUIDANCE_TTL) {
        guidanceCache.delete(chatId);
      }
    }

    if (guidanceCache.size > 0) {
      console.log(
        `🧹 Cleaned up guidance cache. ${guidanceCache.size} entries remaining.`
      );
    }
  }, CACHE_CLEANUP_INTERVAL);
}
