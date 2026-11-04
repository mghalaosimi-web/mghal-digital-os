import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
}).strict();

type Context = { params: Promise<{ projectId: string }> };

export async function PATCH(request: Request, context: Context) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const { projectId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return NextResponse.json(
      { error: "Invalid project update", details: parsed.success ? undefined : parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true },
  });
  if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const { dueDate, ...fields } = parsed.data;

  const project = await prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: projectId },
      data: {
        ...fields,
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: updated.workspaceId,
        action: "project.updated",
        resource: "Project",
        resourceId: updated.id,
      },
    });
    return updated;
  });
  return NextResponse.json({ data: project });
}

export async function DELETE(request: Request, context: Context) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const { projectId } = await context.params;
  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true },
  });
  if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.project.delete({ where: { id: projectId } });
    await tx.auditEvent.create({
      data: {
        workspaceId: existing.workspaceId,
        action: "project.deleted",
        resource: "Project",
        resourceId: existing.id,
      },
    });
  });
  return NextResponse.json({ success: true });
}
