import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(2).max(180),
  description: z.string().max(5000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  return NextResponse.json({ data: tasks });
}

export async function POST(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid task data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { dueDate, ...data } = parsed.data;
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const task = await prisma.task.create({
    data: { ...data, ...(dueDate ? { dueDate: new Date(dueDate) } : {}) },
  });
  await prisma.auditEvent.create({
    data: {
      workspaceId: project.workspaceId,
      action: "task.created",
      resource: "Task",
      resourceId: task.id,
    },
  });
  return NextResponse.json({ data: task }, { status: 201 });
}
