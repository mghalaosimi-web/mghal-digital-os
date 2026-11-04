import { createHmac, timingSafeEqual } from "node:crypto";

export const OWNER_SESSION_COOKIE = "mghal_owner_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const MIN_TOKEN_LENGTH = 32;

function getSecret(): string | null {
  const secret = process.env.OWNER_API_TOKEN?.trim();
  return secret && secret.length >= MIN_TOKEN_LENGTH ? secret : null;
}

export function createOwnerSession(): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const payload = Buffer.from(
    JSON.stringify({
      sub: "owner",
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    }),
  ).toString("base64url");

  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyOwnerSession(value: string | undefined): boolean {
  const secret = getSecret();
  if (!secret || !value) return false;

  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra !== undefined) return false;

  const expected = createHmac("sha256", secret).update(payload).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return false;
  }

  try {
    const decoded: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("sub" in decoded) ||
      !("exp" in decoded) ||
      decoded.sub !== "owner" ||
      typeof decoded.exp !== "number"
    ) {
      return false;
    }
    return decoded.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function readOwnerSessionCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === OWNER_SESSION_COOKIE) {
      return part.slice(separator + 1).trim();
    }
  }
  return undefined;
}

export const OWNER_SESSION_TTL = SESSION_TTL_SECONDS;
