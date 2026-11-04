import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());
  const ownerToken = process.env.OWNER_API_TOKEN?.trim();
  const ownerApiConfigured = Boolean(ownerToken && ownerToken.length >= 32);
  const redisConfigured = Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );

  if (!databaseConfigured || !ownerApiConfigured || !redisConfigured) {
    return NextResponse.json(
      {
        status: "not_ready",
        checks: {
          database: databaseConfigured ? "configured" : "not_configured",
          ownerApi: ownerApiConfigured ? "configured" : "not_configured",
          loginRateLimit: redisConfigured ? "configured" : "not_configured",
        },
      },
      { status: 503 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ready",
      checks: {
        database: "reachable",
        ownerApi: "configured",
        loginRateLimit: "configured",
      },
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "not_ready",
        checks: {
          database: "unreachable",
          ownerApi: "configured",
          loginRateLimit: "configured",
        },
      },
      { status: 503 },
    );
  }
}
