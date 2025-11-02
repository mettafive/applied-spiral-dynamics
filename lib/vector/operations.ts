import { getOrCreatePixelCollection } from "./client";
import { generateEmbedding } from "./embeddings";

export async function retrieveRelevantPixels(
  query: string,
  options: {
    topK?: number;
    userId?: string;
    minSimilarity?: number;
    includeArchived?: boolean;
  } = {}
): Promise<
  Array<{
    id: string;
    content: unknown;
    distance: number;
    similarity: number;
  }>
> {
  const {
    topK = 10,
    userId,
    minSimilarity = 0.7,
    includeArchived = false,
  } = options;

  if (!process.env.CHROMA_URL) {
    return [];
  }

  try {
    const collection = await getOrCreatePixelCollection();
    const queryEmbedding = await generateEmbedding(query);

    const whereFilter: Record<string, any> = {};
    if (userId) {
      whereFilter.userId = userId;
    }
    if (!includeArchived) {
      whereFilter.archived = false;
    }

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK * 2,
      where: Object.keys(whereFilter).length > 0 ? whereFilter : undefined,
    });

    const documents = results.documents?.[0] ?? [];
    const ids = results.ids?.[0] ?? [];
    const distances = results.distances?.[0] ?? [];

    return ids
      .map((id, i) => {
        const distance = distances[i] ?? 1;
        const similarity = 1 - distance;
        return {
          id,
          content: JSON.parse(documents[i] ?? "{}"),
          distance,
          similarity,
        };
      })
      .filter((pixel) => pixel.similarity >= minSimilarity)
      .slice(0, topK);
  } catch (error) {
    console.error("RAG retrieval failed:", error);
    return [];
  }
}

export async function upsertPixel(params: {
  id: string;
  content: unknown;
  userId: string;
  metadata?: Record<string, string | number>;
}): Promise<void> {
  const { id, content, userId, metadata = {} } = params;

  if (!process.env.CHROMA_URL) {
    return;
  }

  try {
    const collection = await getOrCreatePixelCollection();
    const contentString = JSON.stringify(content);
    const embedding = await generateEmbedding(contentString);

    await collection.upsert({
      ids: [id],
      embeddings: [embedding],
      documents: [contentString],
      metadatas: [
        {
          userId,
          timestamp: Date.now(),
          ...metadata,
        },
      ],
    });
  } catch (error) {
    console.error("Pixel upsert failed:", error);
  }
}
