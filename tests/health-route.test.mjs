import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const routeSource = await readFile(
  new URL("../src/app/api/health/route.ts", import.meta.url),
  "utf8",
);

test("liveness endpoint explicitly disables HTTP caching", () => {
  assert.match(routeSource, /export function GET\s*\(/);
  assert.match(routeSource, /"Cache-Control"\s*:\s*"no-store"/);
});
