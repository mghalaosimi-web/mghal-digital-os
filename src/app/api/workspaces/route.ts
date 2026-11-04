import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60),
}).strict();

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid workspace data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const workspace = await prisma.$transaction(async (tx) => {
      const created = await tx.workspace.create({ data: parsed.data });
      await tx.auditEvent.create({
        data: {
          workspaceId: created.id,
          action: "workspace.created",
          resource: "Workspace",
          resourceId: created.id,
        },
      });
      return created;
    });

    return NextResponse.json({ data: workspace }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Workspace slug already exists" }, { status: 409 });
    }
    throw error;
  }
}
