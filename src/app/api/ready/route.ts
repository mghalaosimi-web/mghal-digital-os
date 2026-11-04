import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());
  const ownerToken = process.env.OWNER_API_TOKEN?.trim();
  const ownerApiConfigured = Boolean(ownerToken && ownerToken.length >= 32);
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const redisConfigured = Boolean(redisUrl && redisToken);

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
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let databaseStatus: "reachable" | "unreachable" = "unreachable";
  let redisStatus: "reachable" | "unreachable" = "unreachable";

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseStatus = "reachable";
  } catch {
    // Keep readiness output free of connection strings and provider details.
  }

  try {
    const redis = new Redis({ url: redisUrl!, token: redisToken! });
    const pong = await redis.ping();
    redisStatus = pong === "PONG" ? "reachable" : "unreachable";
  } catch {
    // A configured but unreachable limiter must not be reported as ready.
  }

  const ready = databaseStatus === "reachable" && redisStatus === "reachable";
  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      checks: {
        database: databaseStatus,
        ownerApi: "configured",
        loginRateLimit: redisStatus,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
