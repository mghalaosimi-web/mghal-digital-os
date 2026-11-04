import test from "node:test";
import { createHmac } from "node:crypto";
import assert from "node:assert/strict";

import {
  createOwnerSession,
  OWNER_SESSION_COOKIE,
  OWNER_SESSION_TTL,
  readOwnerSessionCookie,
  verifyOwnerSession,
} from "../src/lib/owner-session.ts";

const originalToken = process.env.OWNER_API_TOKEN;

test("owner sessions are signed and valid for the configured TTL", () => {
  process.env.OWNER_API_TOKEN = "unit-test-owner-token-with-at-least-32-characters";
  const session = createOwnerSession();
  assert.equal(typeof session, "string");
  assert.equal(verifyOwnerSession(session), true);
  assert.equal(OWNER_SESSION_TTL, 60 * 60 * 24 * 7);
});

test("owner sessions reject expired payloads", () => {
  const secret = "unit-test-owner-token-with-at-least-32-characters";
  process.env.OWNER_API_TOKEN = secret;
  const payload = Buffer.from(JSON.stringify({ sub: "owner", exp: Math.floor(Date.now() / 1000) - 60 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  assert.equal(verifyOwnerSession(payload + "." + signature), false);
});

test("owner sessions reject missing, malformed, and tampered values", () => {
  process.env.OWNER_API_TOKEN = "unit-test-owner-token-with-at-least-32-characters";
  const session = createOwnerSession();
  assert.equal(verifyOwnerSession(undefined), false);
  assert.equal(verifyOwnerSession(""), false);
  assert.equal(verifyOwnerSession("not.a.valid.session.extra"), false);
  assert.equal(verifyOwnerSession(session + "tampered"), false);
});

test("owner sessions are invalidated when the owner token rotates", () => {
  process.env.OWNER_API_TOKEN = "unit-test-owner-token-with-at-least-32-characters";
  const session = createOwnerSession();
  process.env.OWNER_API_TOKEN = "rotated-owner-token-with-at-least-32-characters";
  assert.equal(verifyOwnerSession(session), false);
});

test("cookie parser extracts only the owner session cookie", () => {
  process.env.OWNER_API_TOKEN = "unit-test-owner-token-with-at-least-32-characters";
  const session = createOwnerSession();
  const request = new Request("https://example.test", {
    headers: { cookie: "theme=dark; "+OWNER_SESSION_COOKIE+"="+session+"; other=value" },
  });
  assert.equal(readOwnerSessionCookie(request), session);
  assert.equal(readOwnerSessionCookie(new Request("https://example.test")), undefined);
});

test("owner sessions cannot be created or verified with a short secret", () => {
  process.env.OWNER_API_TOKEN = "too-short";
  assert.equal(createOwnerSession(), null);
  assert.equal(verifyOwnerSession("anything"), false);
});

test.after(() => {
  if (originalToken === undefined) delete process.env.OWNER_API_TOKEN;
  else process.env.OWNER_API_TOKEN = originalToken;
});
