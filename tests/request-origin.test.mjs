import test from "node:test";
import assert from "node:assert/strict";

import { isSameOrigin } from "../src/lib/request-origin.ts";

test("accepts the public forwarded host behind Render's reverse proxy", () => {
  const request = new Request("http://10.24.0.12:10000/api/auth/session", {
    headers: {
      origin: "https://mghal-digital-os.onrender.com",
      host: "10.24.0.12:10000",
      "x-forwarded-host": "mghal-digital-os.onrender.com",
      "x-forwarded-proto": "https",
    },
  });

  assert.equal(isSameOrigin(request), true);
});

test("uses the first forwarded host when the proxy chain contains multiple values", () => {
  const request = new Request("http://internal:10000", {
    headers: {
      origin: "https://app.example.com",
      "x-forwarded-host": "app.example.com, proxy.internal",
      "x-forwarded-proto": "https",
    },
  });

  assert.equal(isSameOrigin(request), true);
});

test("falls back to the Host header when forwarded host is absent", () => {
  const request = new Request("https://app.example.com/api/auth/session", {
    headers: {
      origin: "https://app.example.com",
      host: "app.example.com",
    },
  });

  assert.equal(isSameOrigin(request), true);
});

test("rejects a different origin host", () => {
  const request = new Request("https://app.example.com/api/auth/session", {
    headers: {
      origin: "https://attacker.example",
      host: "app.example.com",
    },
  });

  assert.equal(isSameOrigin(request), false);
});

test("rejects malformed origins and requests without a host", () => {
  const malformed = new Request("https://app.example.com", {
    headers: { origin: "not a url", host: "app.example.com" },
  });
  const missingHost = new Request("https://app.example.com", {
    headers: { origin: "https://app.example.com" },
  });

  assert.equal(isSameOrigin(malformed), false);
  assert.equal(isSameOrigin(missingHost), false);
});

test("allows requests without an Origin header", () => {
  assert.equal(isSameOrigin(new Request("https://app.example.com")), true);
});


test("rejects an origin with the correct host but a different protocol", () => {
  const request = new Request("http://internal:10000/api/workspaces", {
    headers: {
      origin: "http://mghal-digital-os.onrender.com",
      host: "internal:10000",
      "x-forwarded-host": "mghal-digital-os.onrender.com",
      "x-forwarded-proto": "https",
    },
  });
  assert.equal(isSameOrigin(request), false);
});

test("uses the first forwarded protocol in a proxy chain", () => {
  const request = new Request("http://internal:10000", {
    headers: {
      origin: "https://app.example.com",
      "x-forwarded-host": "app.example.com, proxy.internal",
      "x-forwarded-proto": "https, http",
    },
  });
  assert.equal(isSameOrigin(request), true);
});
