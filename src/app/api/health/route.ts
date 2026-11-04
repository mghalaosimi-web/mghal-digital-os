import { NextResponse } from "next/server";

export function GET() {
  const ownerToken = process.env.OWNER_API_TOKEN?.trim();
  return NextResponse.json({
    status: "ok",
    mode: "liveness",
    service: "mghal-digital-os",
    timestamp: new Date().toISOString(),
    checks: {
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      ownerApiConfigured: Boolean(ownerToken && ownerToken.length >= 32),
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
