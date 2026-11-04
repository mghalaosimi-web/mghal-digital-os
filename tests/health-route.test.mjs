import test from "node:test";
import assert from "node:assert/strict";

import { GET } from "../src/app/api/health/route.ts";

test("liveness endpoint returns a non-cacheable healthy response", async () => {
  const response = GET();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(body.status, "ok");
  assert.equal(body.mode, "liveness");
  assert.equal(body.service, "mghal-digital-os");
  assert.equal(typeof body.timestamp, "string");
  assert.equal(typeof body.checks.databaseConfigured, "boolean");
  assert.equal(typeof body.checks.ownerApiConfigured, "boolean");
});
