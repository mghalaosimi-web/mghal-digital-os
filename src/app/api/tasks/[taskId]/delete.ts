import { NextResponse } from "next/server";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ taskId: string }> };

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
