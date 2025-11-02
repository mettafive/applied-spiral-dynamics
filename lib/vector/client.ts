import { ChromaClient } from "chromadb";

let chromaClient: ChromaClient | null = null;
let connectionAttempted = false;
let connectionError: Error | null = null;

export function getChromaClient(): ChromaClient {
  if (!chromaClient && !connectionAttempted) {
    connectionAttempted = true;

    const chromaUrl = process.env.CHROMA_URL;

    if (!chromaUrl) {
      connectionError = new Error(
        "CHROMA_URL environment variable is required. Pixel extraction will continue but RAG context will be disabled."
      );
      console.warn(connectionError.message);
      throw connectionError;
    }

    try {
      chromaClient = new ChromaClient({
        path: chromaUrl,
        auth: process.env.CHROMA_API_KEY
          ? { provider: "token", credentials: process.env.CHROMA_API_KEY }
          : undefined,
      });
      console.log("✅ ChromaDB client initialized successfully");
    } catch (error) {
      connectionError =
        error instanceof Error
          ? error
          : new Error("Failed to initialize ChromaDB client");
      console.error("❌ ChromaDB initialization failed:", connectionError);
      throw connectionError;
    }
  }

  if (connectionError) {
    throw connectionError;
  }

  if (!chromaClient) {
    throw new Error("ChromaDB client not initialized");
  }

  return chromaClient;
}

export async function getOrCreatePixelCollection() {
  const client = getChromaClient();

  return await client.getOrCreateCollection({
    name: "pixels",
    metadata: {
      "hnsw:space": "cosine",
      "hnsw:construction_ef": 100,
      "hnsw:search_ef": 100,
    },
  });
}
