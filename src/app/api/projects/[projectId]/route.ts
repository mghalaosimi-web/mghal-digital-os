import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

type Context = { params: Promise<{ projectId: string }> };

export async function PATCH(request: Request, context: Context) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;

  const { projectId } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid project data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.project.findUnique({ where: { id: projectId } });
  if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const { dueDate, ...fields } = parsed.data;
  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...fields,
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
    },
  });

  await prisma.auditEvent.create({
    data: {
      workspaceId: project.workspaceId,
      action: "project.updated",
      resource: "Project",
      resourceId: project.id,
    },
  });

  return NextResponse.json({ data: project });
}

export async function DELETE(request: Request, context: Context) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;

  const { projectId } = await context.params;
  const existing = await prisma.project.findUnique({ where: { id: projectId } });
  if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  await prisma.project.delete({ where: { id: projectId } });
  await prisma.auditEvent.create({
    data: {
      workspaceId: existing.workspaceId,
      action: "project.deleted",
      resource: "Project",
      resourceId: existing.id,
    },
  });

  return NextResponse.json({ success: true });
}
