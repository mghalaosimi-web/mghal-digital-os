import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let aiLimiter: Ratelimit | null | undefined;

function getAILimiter(): Ratelimit | null {
  if (aiLimiter !== undefined) return aiLimiter;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    aiLimiter = null;
    return null;
  }
  aiLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(12, "10 m"),
    prefix: "mghal:ai:generate",
    analytics: false,
  });
  return aiLimiter;
}

export async function checkAIGenerationRateLimit(request: Request) {
  const limiter = getAILimiter();
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AI generation rate limiting requires Upstash Redis.");
    }
    return { success: true, limit: 12, remaining: 12, reset: 0, configured: false };
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
