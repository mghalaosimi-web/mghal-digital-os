import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

type Context = { params: Promise<{ taskId: string }> };

export async function PATCH(request: Request, context: Context) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const { taskId } = await context.params;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid task data", details: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { workspaceId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  const { dueDate, status, ...fields } = parsed.data;

  const task = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        ...fields,
        ...(status ? { status, completedAt: status === "DONE" ? new Date() : null } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: existing.project.workspaceId,
        action: "task.updated",
        resource: "Task",
        resourceId: updated.id,
      },
    });
    return updated;
  });
  return NextResponse.json({ data: task });
}

export async function DELETE(request: Request, context: Context) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const { taskId } = await context.params;

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { workspaceId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.task.delete({ where: { id: taskId } });
    await tx.auditEvent.create({
      data: {
        workspaceId: existing.project.workspaceId,
        action: "task.deleted",
        resource: "Task",
        resourceId: taskId,
      },
    });
  });
  return NextResponse.json({ success: true });
}
