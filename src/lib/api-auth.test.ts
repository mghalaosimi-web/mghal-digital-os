import { afterEach, describe, expect, it, vi } from "vitest";
import { requireOwnerApi } from "./api-auth";

const validToken = "test-only-owner-token-with-more-than-32-characters";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireOwnerApi", () => {
  it("rejects an unconfigured owner token", () => {
    vi.stubEnv("OWNER_API_TOKEN", "");

    const response = requireOwnerApi(new Request("http://localhost/api/projects"));

    expect(response?.status).toBe(503);
  });

  it("rejects a token shorter than 32 characters", () => {
    vi.stubEnv("OWNER_API_TOKEN", "too-short");

    const response = requireOwnerApi(new Request("http://localhost/api/projects"));

    expect(response?.status).toBe(503);
  });

  it("rejects a missing or incorrect bearer token", () => {
    vi.stubEnv("OWNER_API_TOKEN", validToken);

    const response = requireOwnerApi(new Request("http://localhost/api/projects", {
      headers: { authorization: "Bearer incorrect-token" },
    }));

    expect(response?.status).toBe(401);
  });

  it("allows the configured bearer token", () => {
    vi.stubEnv("OWNER_API_TOKEN", validToken);

    const response = requireOwnerApi(new Request("http://localhost/api/projects", {
      headers: { authorization: `Bearer ${validToken}` },
    }));

    expect(response).toBeNull();
  });
});
