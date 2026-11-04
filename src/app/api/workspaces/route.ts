import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { readJsonBody } from "@/lib/http";
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
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workspace data", details: parsed.error.flatten() }, { status: 400 });
  }
  const workspace = await prisma.$transaction(async (tx) => {
    const created = await tx.workspace.create({ data: parsed.data });
    await tx.auditEvent.create({
      data: { workspaceId: created.id, action: "workspace.created", resource: "Workspace", resourceId: created.id },
    });
    return created;
  });
  return NextResponse.json({ data: workspace }, { status: 201 });
}
