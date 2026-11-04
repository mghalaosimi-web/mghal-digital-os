import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60),
});

export async function GET(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true, createdAt: true },
  });
  return NextResponse.json({ data: workspaces });
}

export async function POST(request: Request) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workspace data", details: parsed.error.flatten() }, { status: 400 });
  }
  const workspace = await prisma.workspace.create({ data: parsed.data });
  await prisma.auditEvent.create({
    data: { workspaceId: workspace.id, action: "workspace.created", resource: "Workspace", resourceId: workspace.id },
  });
  return NextResponse.json({ data: workspace }, { status: 201 });
}
