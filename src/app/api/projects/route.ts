import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const createProjectSchema = z.object({
  workspaceId: z.string().trim().min(1).max(128),
  name: z.string().trim().min(2).max(120),
  description: z.string().max(5000).optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).default("PLANNING"),
  dueDate: z.string().datetime().optional(),
}).strict();

const querySchema = z.object({ workspaceId: z.string().trim().min(1).max(128) });

export async function GET(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const parsed = querySchema.safeParse({ workspaceId: new URL(request.url).searchParams.get("workspaceId") });
  if (!parsed.success) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  const projects = await prisma.project.findMany({
    where: { workspaceId: parsed.data.workspaceId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ data: projects }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid project data", details: parsed.error.flatten() }, { status: 400 });

  const { workspaceId, dueDate, ...data } = parsed.data;
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } });
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: { ...data, workspaceId, ...(dueDate ? { dueDate: new Date(dueDate) } : {}) },
    });
    await tx.auditEvent.create({
      data: { workspaceId, action: "project.created", resource: "Project", resourceId: created.id },
    });
    return created;
  });
  return NextResponse.json({ data: project }, { status: 201 });
}
