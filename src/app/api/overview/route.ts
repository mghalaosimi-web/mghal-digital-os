import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  workspaceId: z.string().trim().min(1).max(128),
});

export async function GET(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ workspaceId: searchParams.get("workspaceId") });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "workspaceId is required", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { workspaceId } = parsed.data;
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, slug: true },
  });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const [projects, activeProjects, tasks, completedTasks, overdueTasks, knowledgeItems, contentItems, recentActivity] =
    await Promise.all([
      prisma.project.count({ where: { workspaceId } }),
      prisma.project.count({ where: { workspaceId, status: "ACTIVE" } }),
      prisma.task.count({ where: { project: { workspaceId } } }),
      prisma.task.count({ where: { project: { workspaceId }, status: "DONE" } }),
      prisma.task.count({
        where: {
          project: { workspaceId },
          status: { notIn: ["DONE", "CANCELLED"] },
          dueDate: { lt: new Date() },
        },
      }),
      prisma.knowledgeItem.count({ where: { workspaceId } }),
      prisma.contentItem.count({ where: { workspaceId } }),
      prisma.auditEvent.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          actor: true,
          action: true,
          resource: true,
          resourceId: true,
          createdAt: true,
        },
      }),
    ]);

  return NextResponse.json(
    {
      data: {
        workspace,
        metrics: {
          projects,
          activeProjects,
          tasks,
          completedTasks,
          overdueTasks,
          knowledgeItems,
          contentItems,
        },
        recentActivity,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
