import { NextResponse } from "next/server";
import { db } from "@/lib/db/queries";
import { getChromaClient } from "@/lib/vector/client";

export const dynamic = "force-dynamic";

/**
 * Basic health check endpoint
 * Returns 200 if service is alive
 */
export async function GET() {
  try {
    // Quick database check
    await db.query.user.findFirst();

    // Check optional services
    const chromaStatus = checkChromaStatus();
    const redisStatus = checkRedisStatus();

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "ok",
        chromadb: chromaStatus,
        redis: redisStatus,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

function checkChromaStatus(): string {
  if (!process.env.CHROMA_URL) {
    return "disabled";
  }

  try {
    getChromaClient();
    return "configured";
  } catch {
    return "error";
  }
}

function checkRedisStatus(): string {
  if (!process.env.REDIS_URL) {
    return "disabled";
  }

  return "configured";
}
