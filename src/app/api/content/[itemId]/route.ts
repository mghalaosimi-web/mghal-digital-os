import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  body: z.string().max(30000).optional(),
  channel: z.string().trim().max(60).nullable().optional(),
  status: z.enum(["IDEA", "DRAFT", "REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"]).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
}).strict();

type Context = { params: Promise<{ itemId: string }> };

export async function PATCH(request: Request, context: Context) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const { itemId } = await context.params;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return NextResponse.json({ error: "Invalid content update", details: parsed.success ? undefined : parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.contentItem.findUnique({
    where: { id: itemId },
    select: { id: true, workspaceId: true },
  });
  if (!existing) return NextResponse.json({ error: "Content item not found" }, { status: 404 });

  const { scheduledAt, status, ...fields } = parsed.data;
  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.contentItem.update({
      where: { id: itemId },
      data: {
        ...fields,
        ...(status ? {
          status,
          ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
        } : {}),
        ...(scheduledAt !== undefined ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null } : {}),
      },
    });
    await tx.auditEvent.create({
      data: { workspaceId: existing.workspaceId, action: "content.updated", resource: "ContentItem", resourceId: itemId },
    });
    return updated;
  });
  return NextResponse.json({ data: item });
}

export async function DELETE(request: Request, context: Context) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const { itemId } = await context.params;

  const existing = await prisma.contentItem.findUnique({
    where: { id: itemId },
    select: { id: true, workspaceId: true },
  });
  if (!existing) return NextResponse.json({ error: "Content item not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.contentItem.delete({ where: { id: itemId } });
    await tx.auditEvent.create({
      data: { workspaceId: existing.workspaceId, action: "content.deleted", resource: "ContentItem", resourceId: itemId },
    });
  });
  return NextResponse.json({ success: true });
}
