import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export function requireOwnerApi(request: Request): NextResponse | null {
  const configured = process.env.OWNER_API_TOKEN;
  if (!configured) {
    return NextResponse.json(
      { error: "API is not configured. Set OWNER_API_TOKEN on the server." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  const expectedBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);
  const valid =
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer);

  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
