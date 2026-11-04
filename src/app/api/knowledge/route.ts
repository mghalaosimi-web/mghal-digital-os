import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  workspaceId: z.string().trim().min(1).max(128),
  title: z.string().trim().min(2).max(180),
  content: z.string().min(1).max(50000),
  type: z.enum(["NOTE", "LINK", "DOCUMENT", "REFERENCE"]).default("NOTE"),
  sourceUrl: z.string().url().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
}).strict();

const querySchema = z.object({
  workspaceId: z.string().trim().min(1).max(128),
  q: z.string().trim().max(200).optional(),
});

export async function GET(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    workspaceId: params.get("workspaceId"),
    q: params.get("q") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid knowledge query", details: parsed.error.flatten() }, { status: 400 });
  const { workspaceId, q } = parsed.data;
  const items = await prisma.knowledgeItem.findMany({
    where: {
      workspaceId,
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ data: items }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid knowledge item", details: parsed.error.flatten() }, { status: 400 });

  const { workspaceId, ...data } = parsed.data;
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } });
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.knowledgeItem.create({ data: { ...data, workspaceId } });
    await tx.auditEvent.create({
      data: { workspaceId, action: "knowledge.created", resource: "KnowledgeItem", resourceId: created.id },
    });
    return created;
  });
  return NextResponse.json({ data: item }, { status: 201 });
}
