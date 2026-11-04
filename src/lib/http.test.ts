import { describe, expect, it } from "vitest";
import { readJsonBody } from "./http";

function jsonRequest(body: string, contentType = "application/json") {
  return new Request("http://localhost/api/content", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

describe("readJsonBody", () => {
  it("parses valid JSON", async () => {
    const result = await readJsonBody(jsonRequest('{"title":"Draft"}'));

    expect(result).toEqual({ ok: true, data: { title: "Draft" } });
  });

  it("rejects a non-JSON content type", async () => {
    const result = await readJsonBody(jsonRequest("title=Draft", "application/x-www-form-urlencoded"));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(415);
  });

  it("rejects malformed JSON", async () => {
    const result = await readJsonBody(jsonRequest("{broken"));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("rejects bodies above the configured byte limit", async () => {
    const result = await readJsonBody(jsonRequest('{"value":"12345"}'), 8);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });
});
