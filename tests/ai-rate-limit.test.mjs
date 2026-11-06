import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const limiterSource = await readFile(
  new URL("../src/lib/ai-rate-limit.ts", import.meta.url),
  "utf8",
);
const routeSource = await readFile(
  new URL("../src/app/api/ai/generate/route.ts", import.meta.url),
  "utf8",
);

test("AI generation uses a dedicated bounded Redis sliding window", () => {
  assert.match(limiterSource, /Ratelimit\.slidingWindow\(12,\s*"10 m"\)/);
  assert.match(limiterSource, /prefix:\s*"mghal:ai:generate"/);
  assert.match(limiterSource, /limiter\.limit\(clientIp\)/);
});

test("AI generation rate limiting fails closed in production without Redis", () => {
  assert.match(limiterSource, /process\.env\.NODE_ENV\s*===\s*"production"/);
  assert.match(limiterSource, /throw new Error\("AI generation rate limiting requires Upstash Redis\."/);
});

test("AI route checks the limiter before processing a generation request", () => {
  const authIndex = routeSource.indexOf("requireOwnerApi(request)");
  const limitIndex = routeSource.indexOf("checkAIGenerationRateLimit(request)");
  const parseIndex = routeSource.indexOf("await request.json()");
  assert.ok(authIndex >= 0 && limitIndex > authIndex && parseIndex > limitIndex);
  assert.match(routeSource, /status:\s*429/);
  assert.match(routeSource, /"Retry-After"/);
});


test("AI generation bounds provider output tokens and validates returned content", () => {
  assert.match(routeSource, /max_tokens:\s*1800/);
  assert.match(routeSource, /MAX_GENERATED_CONTENT_LENGTH\s*=\s*20_000/);
  assert.match(routeSource, /typeof rawContent !== "string"/);
  assert.match(routeSource, /content\.length > MAX_GENERATED_CONTENT_LENGTH/);
});
