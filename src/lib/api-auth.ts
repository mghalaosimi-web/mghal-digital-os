import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { readOwnerSessionCookie, verifyOwnerSession } from "@/lib/owner-session";

const MIN_TOKEN_LENGTH = 32;

export function requireOwnerApi(request: Request): NextResponse | null {
  const configured = process.env.OWNER_API_TOKEN?.trim();
  if (!configured || configured.length < MIN_TOKEN_LENGTH) {
    return NextResponse.json(
      { error: "API is not configured securely. Set a random OWNER_API_TOKEN with at least 32 characters." },
      { status: 503 },
    );
  }

  if (verifyOwnerSession(readOwnerSessionCookie(request))) {
    return null;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  const expectedBuffer = Buffer.from(configured, "utf8");
  const suppliedBuffer = Buffer.from(supplied, "utf8");
  const valid =
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer);

  if (!valid) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "WWW-Authenticate": "Bearer" },
      },
    );
  }

  return null;
}
