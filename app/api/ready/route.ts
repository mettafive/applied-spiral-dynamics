import { NextResponse } from "next/server";
import { myProvider } from "@/lib/ai/providers";
import { db } from "@/lib/db/queries";
import { getChromaClient } from "@/lib/vector/client";

export const dynamic = "force-dynamic";

/**
 * Readiness check endpoint
 * Returns 200 only if all critical services are operational
 * Used by load balancers to determine if instance can receive traffic
 */
export async function GET() {
  const checks: Array<{
    name: string;
    status: "ok" | "error";
    message?: string;
  }> = [];

  // Check database connection
  try {
    await db.query.user.findFirst();
    checks.push({ name: "database", status: "ok" });
  } catch (error) {
    checks.push({
      name: "database",
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Check LLM provider configuration
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Verify provider is properly configured
    myProvider.languageModel("chat-model");
    checks.push({ name: "llm_provider", status: "ok" });
  } catch (error) {
    checks.push({
      name: "llm_provider",
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Check ChromaDB (optional but warn if configured incorrectly)
  if (process.env.CHROMA_URL) {
    try {
      getChromaClient();
      checks.push({ name: "chromadb", status: "ok" });
    } catch (error) {
      checks.push({
        name: "chromadb",
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Determine overall readiness
  const criticalServices = ["database", "llm_provider"];
  const criticalChecks = checks.filter((c) =>
    criticalServices.includes(c.name)
  );
  const allCriticalHealthy = criticalChecks.every((c) => c.status === "ok");

  const responseCode = allCriticalHealthy ? 200 : 503;

  return NextResponse.json(
    {
      ready: allCriticalHealthy,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: responseCode }
  );
}
