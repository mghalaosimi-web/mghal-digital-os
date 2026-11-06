import { NextResponse } from "next/server";

const SITE_ORIGIN = "https://mghal-release-current.onrender.com";
const WORKER_ORIGIN = "https://mghal-api.m-gh-alaosimi.workers.dev";
const NO_STORE = { "Cache-Control": "no-store", Vary: "Origin" };

function cors(request: Request, response: NextResponse) {
  const origin = request.headers.get("origin");
  if (origin === SITE_ORIGIN) {
    response.headers.set("Access-Control-Allow-Origin", SITE_ORIGIN);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("Access-Control-Max-Age", "600");
  }
  response.headers.set("Vary", "Origin");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function reject(request: Request, message: string, status: number) {
  return cors(request, NextResponse.json({ error: message }, { status, headers: NO_STORE }));
}

function validOrigin(request: Request) {
  return request.headers.get("origin") === SITE_ORIGIN;
}

function validReadOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === SITE_ORIGIN;
}

async function upstream(request: Request, path: string, init: RequestInit = {}) {
  const response = await fetch(WORKER_ORIGIN + path, {
    ...init,
    headers: {
      ...(init.headers || {}),
      // The Worker validates the original public site against ALLOWED_ORIGINS.
      Origin: SITE_ORIGIN,
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.text();
  return cors(
    request,
    new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json; charset=utf-8",
        ...NO_STORE,
      },
    }),
  );
}

export async function OPTIONS(request: Request) {
  if (!validOrigin(request)) return reject(request, "Origin not allowed", 403);
  return cors(request, new NextResponse(null, { status: 204, headers: NO_STORE }));
}

export async function GET(request: Request, context: { params: Promise<{ segments: string[] }> }) {
  // Health and bootstrap status are read-only public metadata; allow server-side probes without Origin.
  if (!validReadOrigin(request)) return reject(request, "Origin not allowed", 403);
  const { segments } = await context.params;
  const key = segments.join("/");
  const target =
    key === "health" ? "/health" :
    key === "bootstrap/status" ? "/api/admin/bootstrap/status" :
    null;
  if (!target) return reject(request, "Not found", 404);

  try {
    return await upstream(request, target, { method: "GET" });
  } catch {
    return reject(request, "تعذر الاتصال بخدمة الإدارة. حاول مجدداً بعد قليل.", 502);
  }
}

export async function POST(request: Request, context: { params: Promise<{ segments: string[] }> }) {
  if (!validOrigin(request)) return reject(request, "Origin not allowed", 403);
  const { segments } = await context.params;
  if (segments.join("/") !== "bootstrap") return reject(request, "Not found", 404);

  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > 16_384) return reject(request, "Request too large", 413);

  let payload: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 16_384) return reject(request, "Request too large", 413);
    payload = JSON.parse(raw);
  } catch {
    return reject(request, "Request body must be valid JSON", 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return reject(request, "Invalid request body", 400);
  }

  const value = payload as Record<string, unknown>;
  const token = typeof value.token === "string" ? value.token : "";
  const email = typeof value.email === "string" ? value.email.trim() : "";
  const password = typeof value.password === "string" ? value.password : "";
  const displayName = typeof value.displayName === "string" ? value.displayName.trim() : "";

  if (token.length < 32 || token.length > 512) return reject(request, "رمز التهيئة غير صالح.", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return reject(request, "البريد الإلكتروني غير صالح.", 400);
  }
  if (password.length < 12 || password.length > 200) {
    return reject(request, "كلمة المرور يجب أن تكون بين 12 و200 حرف.", 400);
  }
  if (!displayName || displayName.length > 120) return reject(request, "اسم المالك غير صالح.", 400);

  try {
    return await upstream(request, "/api/admin/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email, password, displayName }),
    });
  } catch {
    return reject(request, "تعذر الاتصال بخدمة الإدارة. لم يتم تأكيد إنشاء الحساب.", 502);
  }
}
