import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");

test("Next.js sends baseline browser security headers on every route", () => {
  assert.match(config, /source:\s*"\/:path\*"/);
  assert.match(config, /X-Content-Type-Options.*nosniff/);
  assert.match(config, /X-Frame-Options.*DENY/);
  assert.match(config, /Referrer-Policy.*strict-origin-when-cross-origin/);
  assert.match(config, /Permissions-Policy.*camera=\(\), microphone=\(\), geolocation=\(\)/);
  assert.match(config, /Strict-Transport-Security.*max-age=31536000/);
});
