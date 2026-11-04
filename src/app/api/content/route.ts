import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().trim().min(2).max(180),
  body: z.string().max(30000).default(""),
  channel: z.string().trim().max(60).optional(),
  status: z.enum(["IDEA", "DRAFT", "REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"]).default("IDEA"),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  const items = await prisma.contentItem.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ data: items });
}

export async function POST(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid content item", details: parsed.error.flatten() }, { status: 400 });
  const { workspaceId, scheduledAt, ...data } = parsed.data;
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const item = await prisma.contentItem.create({
    data: { ...data, workspaceId, ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}) },
  });
  await prisma.auditEvent.create({
    data: { workspaceId, action: "content.created", resource: "ContentItem", resourceId: item.id },
  });
  return NextResponse.json({ data: item }, { status: 201 });
}
