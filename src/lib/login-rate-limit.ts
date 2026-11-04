import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let loginLimiter: Ratelimit | null | undefined;

function getLoginLimiter(): Ratelimit | null {
  if (loginLimiter !== undefined) return loginLimiter;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    loginLimiter = null;
    return null;
  }
  loginLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(8, "15 m"),
    prefix: "mghal:auth:login",
    analytics: false,
  });
  return loginLimiter;
}

export async function checkLoginRateLimit(request: Request) {
  const limiter = getLoginLimiter();
  if (!limiter) {
    // Never silently disable brute-force protection on a public production deployment.
    if (process.env.NODE_ENV === "production") {
      throw new Error("Login rate limiting requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
    }
    return { success: true, limit: 8, remaining: 8, reset: 0, configured: false };
  }
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientIp =
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    forwarded ||
    "unknown";
  const result = await limiter.limit(clientIp);
  return { ...result, configured: true };
}
