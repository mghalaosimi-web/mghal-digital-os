import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  content: z.string().min(1).max(50000).optional(),
  type: z.enum(["NOTE", "LINK", "DOCUMENT", "REFERENCE"]).optional(),
  sourceUrl: z.string().url().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
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
    return NextResponse.json({ error: "Invalid knowledge item update", details: parsed.success ? undefined : parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.knowledgeItem.findUnique({
    where: { id: itemId },
    select: { id: true, workspaceId: true },
  });
  if (!existing) return NextResponse.json({ error: "Knowledge item not found" }, { status: 404 });

  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.knowledgeItem.update({ where: { id: itemId }, data: parsed.data });
    await tx.auditEvent.create({
      data: { workspaceId: existing.workspaceId, action: "knowledge.updated", resource: "KnowledgeItem", resourceId: itemId },
    });
    return updated;
  });
  return NextResponse.json({ data: item });
}

export async function DELETE(request: Request, context: Context) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const { itemId } = await context.params;

  const existing = await prisma.knowledgeItem.findUnique({
    where: { id: itemId },
    select: { id: true, workspaceId: true },
  });
  if (!existing) return NextResponse.json({ error: "Knowledge item not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.knowledgeItem.delete({ where: { id: itemId } });
    await tx.auditEvent.create({
      data: { workspaceId: existing.workspaceId, action: "knowledge.deleted", resource: "KnowledgeItem", resourceId: itemId },
    });
  });
  return NextResponse.json({ success: true });
}
