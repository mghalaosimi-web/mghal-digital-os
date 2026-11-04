import { NextResponse } from "next/server";

export type JsonBodyResult =
  | { ok: true; data: unknown }
  | { ok: false; response: NextResponse };

const DEFAULT_MAX_BODY_BYTES = 512 * 1024;

function bodyError(message: string, status: number): JsonBodyResult {
  return {
    ok: false,
    response: NextResponse.json({ error: message }, { status }),
  };
}

export async function readJsonBody(
  request: Request,
  maxBytes = DEFAULT_MAX_BODY_BYTES,
): Promise<JsonBodyResult> {
  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();

  if (contentType !== "application/json") {
    return bodyError("Content-Type must be application/json", 415);
  }

  const declaredLengthHeader = request.headers.get("content-length");
  if (declaredLengthHeader !== null) {
    const declaredLength = Number(declaredLengthHeader);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      return bodyError("Request body is too large", 413);
    }
  }

  if (!request.body) {
    return bodyError("Request body must contain valid JSON", 400);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return bodyError("Request body is too large", 413);
      }

      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, data: JSON.parse(raw) as unknown };
  } catch {
    return bodyError("Request body must contain valid JSON", 400);
  } finally {
    reader.releaseLock();
  }
}
