import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "mghal-digital-os",
    timestamp: new Date().toISOString(),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    ownerApiConfigured: Boolean(process.env.OWNER_API_TOKEN),
  });
}
