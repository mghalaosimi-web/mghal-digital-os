import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkLoginRateLimit } from "@/lib/login-rate-limit";
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
    const originUrl = new URL(origin);
    // Render terminates TLS and forwards requests to the Node process. In that
    // setup request.url may contain an internal host, so compare Origin with
    // the externally-facing forwarded host rather than the internal URL host.
    const forwardedHost = request.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim();
    const requestHost = forwardedHost || request.headers.get("host");
    if (!requestHost) return false;

    return originUrl.host.toLowerCase() === requestHost.toLowerCase();
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

  try {
    const rateLimit = await checkLoginRateLimit(request);
    if (!rateLimit.success) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "محاولات تسجيل الدخول كثيرة. انتظر قليلاً ثم حاول مجدداً." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "RateLimit-Limit": String(rateLimit.limit),
            "RateLimit-Remaining": String(rateLimit.remaining),
            "Cache-Control": "no-store",
          },
        },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "خدمة الحماية من محاولات الدخول غير متاحة مؤقتاً. حاول لاحقاً." },
      { status: 503 },
    );
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
