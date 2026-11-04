import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createOwnerSession,
  OWNER_SESSION_COOKIE,
  OWNER_SESSION_TTL,
  readOwnerSessionCookie,
  verifyOwnerSession,
} from "@/lib/owner-session";

const loginSchema = z.object({
  token: z.string().trim().min(32).max(512),
});

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: OWNER_SESSION_TTL,
  };
}

export async function GET(request: Request) {
  const authenticated = verifyOwnerSession(readOwnerSessionCookie(request));
  return NextResponse.json(
    { authenticated },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const configured = process.env.OWNER_API_TOKEN?.trim();
  if (!configured || configured.length < 32) {
    return NextResponse.json({ error: "Owner authentication is not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const expected = Buffer.from(configured, "utf8");
  const supplied = Buffer.from(parsed.data.token, "utf8");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = createOwnerSession();
  if (!session) {
    return NextResponse.json({ error: "Owner authentication is not configured" }, { status: 503 });
  }

  const response = NextResponse.json(
    { authenticated: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(OWNER_SESSION_COOKIE, session, cookieOptions());
  return response;
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const response = NextResponse.json(
    { authenticated: false },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(OWNER_SESSION_COOKIE, "", {
    ...cookieOptions(),
    maxAge: 0,
  });
  return response;
}
