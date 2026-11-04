import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { status: "not_ready", checks: { database: "not_configured" } },
      { status: 503 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ready",
      checks: { database: "reachable" },
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "not_ready", checks: { database: "unreachable" } },
      { status: 503 },
    );
  }
}
