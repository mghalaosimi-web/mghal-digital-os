import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  workspaceId: z.string().trim().min(1).max(128),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().trim().min(1).max(128).optional(),
  action: z.string().trim().min(1).max(120).optional(),
  resource: z.string().trim().min(1).max(80).optional(),
});

export async function GET(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    workspaceId: searchParams.get("workspaceId"),
    limit: searchParams.get("limit") ?? "30",
    cursor: searchParams.get("cursor") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    resource: searchParams.get("resource") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid audit query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { workspaceId, limit, cursor, action, resource } = parsed.data;
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  if (cursor) {
    const cursorEvent = await prisma.auditEvent.findFirst({
      where: { id: cursor, workspaceId },
      select: { id: true },
    });
    if (!cursorEvent) {
      return NextResponse.json({ error: "Invalid audit cursor" }, { status: 400 });
    }
  }

  const events = await prisma.auditEvent.findMany({
    where: {
      workspaceId,
      ...(action ? { action } : {}),
      ...(resource ? { resource } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      actor: true,
      action: true,
      resource: true,
      resourceId: true,
      metadata: true,
      createdAt: true,
    },
  });

  const hasMore = events.length > limit;
  const data = hasMore ? events.slice(0, limit) : events;
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

  return NextResponse.json(
    { data, pagination: { limit, hasMore, nextCursor } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
