import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const createProjectSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  description: z.string().max(5000).optional(),
  dueDate: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const projects = await prisma.project.findMany({
    where: { workspaceId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: projects });
}

export async function POST(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = createProjectSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid project data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { workspaceId, dueDate, ...data } = parsed.data;
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        ...data,
        workspaceId,
        ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId,
        action: "project.created",
        resource: "Project",
        resourceId: created.id,
      },
    });
    return created;
  });

  return NextResponse.json({ data: project }, { status: 201 });
}
