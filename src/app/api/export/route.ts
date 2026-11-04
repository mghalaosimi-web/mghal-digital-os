import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const querySchema = z.object({
  workspaceId: z.string().trim().min(1).max(128),
});

const EXPORT_LIMIT = 5000;

export async function GET(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;

  const parsed = querySchema.safeParse({
    workspaceId: new URL(request.url).searchParams.get("workspaceId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const { workspaceId } = parsed.data;
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, slug: true, createdAt: true, updatedAt: true },
  });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const [projects, tasks, knowledge, content, auditEvents, counts] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      take: EXPORT_LIMIT,
    }),
    prisma.task.findMany({
      where: { project: { workspaceId } },
      orderBy: { createdAt: "asc" },
      take: EXPORT_LIMIT,
    }),
    prisma.knowledgeItem.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      take: EXPORT_LIMIT,
    }),
    prisma.contentItem.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      take: EXPORT_LIMIT,
    }),
    prisma.auditEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      take: EXPORT_LIMIT,
    }),
    Promise.all([
      prisma.project.count({ where: { workspaceId } }),
      prisma.task.count({ where: { project: { workspaceId } } }),
      prisma.knowledgeItem.count({ where: { workspaceId } }),
      prisma.contentItem.count({ where: { workspaceId } }),
      prisma.auditEvent.count({ where: { workspaceId } }),
    ]),
  ]);

  const exportedCounts = {
    projects: projects.length,
    tasks: tasks.length,
    knowledge: knowledge.length,
    content: content.length,
    auditEvents: auditEvents.length,
  };
  const totalCounts = {
    projects: counts[0],
    tasks: counts[1],
    knowledge: counts[2],
    content: counts[3],
    auditEvents: counts[4],
  };
  const truncated = Object.keys(totalCounts).some(
    (key) => totalCounts[key as keyof typeof totalCounts] > exportedCounts[key as keyof typeof exportedCounts],
  );

  const payload = {
    format: "mghal-digital-os-export",
    version: 1,
    generatedAt: new Date().toISOString(),
    workspace,
    counts: { exported: exportedCounts, total: totalCounts },
    truncated,
    data: { projects, tasks, knowledge, content, auditEvents },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mghal-${workspace.slug}-export.json"`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
