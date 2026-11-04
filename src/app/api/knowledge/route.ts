import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().trim().min(2).max(180),
  content: z.string().min(1).max(50000),
  type: z.enum(["NOTE", "LINK", "DOCUMENT", "REFERENCE"]).default("NOTE"),
  sourceUrl: z.string().url().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export async function GET(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const query = searchParams.get("q")?.trim();
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  const items = await prisma.knowledgeItem.findMany({
    where: {
      workspaceId,
      ...(query ? { OR: [{ title: { contains: query, mode: "insensitive" } }, { content: { contains: query, mode: "insensitive" } }] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ data: items });
}

export async function POST(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Invalid knowledge item", details: parsed.error.flatten() }, { status: 400 });
  const { workspaceId, ...data } = parsed.data;
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
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
