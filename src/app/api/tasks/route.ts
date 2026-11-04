import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  projectId: z.string().trim().min(1).max(128),
  title: z.string().trim().min(2).max(180),
  description: z.string().max(5000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().datetime().optional(),
}).strict();

const querySchema = z.object({ projectId: z.string().trim().min(1).max(128) });

export async function GET(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const parsed = querySchema.safeParse({ projectId: new URL(request.url).searchParams.get("projectId") });
  if (!parsed.success) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  const tasks = await prisma.task.findMany({
    where: { projectId: parsed.data.projectId },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  return NextResponse.json({ data: tasks }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid task data", details: parsed.error.flatten() }, { status: 400 });

  const { dueDate, ...data } = parsed.data;
  const project = await prisma.project.findUnique({
    where: { id: data.projectId },
    select: { id: true, workspaceId: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: { ...data, ...(dueDate ? { dueDate: new Date(dueDate) } : {}), ...(data.status === "DONE" ? { completedAt: new Date() } : {}) },
    });
    await tx.auditEvent.create({
      data: { workspaceId: project.workspaceId, action: "task.created", resource: "Task", resourceId: created.id },
    });
    return created;
  });
  return NextResponse.json({ data: task }, { status: 201 });
}
