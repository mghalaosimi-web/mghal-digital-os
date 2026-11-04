import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  body: z.string().max(30000).optional(),
  channel: z.string().trim().max(60).nullable().optional(),
  status: z.enum(["IDEA", "DRAFT", "REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"]).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
}).strict();

type Context = { params: Promise<{ itemId: string }> };

export async function PATCH(request: Request, context: Context) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const { itemId } = await context.params;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return NextResponse.json({ error: "Invalid content update", details: parsed.success ? undefined : parsed.error.flatten() }, { status: 400 });
  }

  const { scheduledAt, status, ...fields } = parsed.data;
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.contentItem.findUnique({
      where: { id: itemId },
      select: { id: true, workspaceId: true, status: true, scheduledAt: true },
    });
    if (!existing) return { error: "not_found" as const };

    const effectiveStatus = status ?? existing.status;
    const effectiveScheduledAt = scheduledAt !== undefined
      ? scheduledAt
      : existing.scheduledAt?.toISOString() ?? null;

    if (effectiveStatus === "SCHEDULED" && !effectiveScheduledAt) {
      return { error: "schedule_required" as const };
    }
    if (effectiveStatus !== "SCHEDULED" && scheduledAt) {
      return { error: "schedule_status_mismatch" as const };
    }

    const updated = await tx.contentItem.update({
      where: { id: itemId },
      data: {
        ...fields,
        ...(status ? {
          status,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
        } : {}),
        ...(effectiveStatus !== "SCHEDULED"
          ? { scheduledAt: null }
          : scheduledAt !== undefined
            ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }
            : {}),
      },
    });
    await tx.auditEvent.create({
      data: { workspaceId: existing.workspaceId, action: "content.updated", resource: "ContentItem", resourceId: itemId },
    });
    return { item: updated };
  });

  if ("error" in result) {
    if (result.error === "not_found") return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    if (result.error === "schedule_required") {
      return NextResponse.json({ error: "يجب تحديد موعد قبل جدولة المحتوى." }, { status: 400 });
    }
    return NextResponse.json({ error: "لا يمكن تعيين موعد إلا للمحتوى المجدول." }, { status: 400 });
  }
  return NextResponse.json({ data: result.item });
}

export async function DELETE(request: Request, context: Context) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const { itemId } = await context.params;

  const existing = await prisma.contentItem.findUnique({
    where: { id: itemId },
    select: { id: true, workspaceId: true },
  });
  if (!existing) return NextResponse.json({ error: "Content item not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.contentItem.delete({ where: { id: itemId } });
    await tx.auditEvent.create({
      data: { workspaceId: existing.workspaceId, action: "content.deleted", resource: "ContentItem", resourceId: itemId },
    });
  });
  return NextResponse.json({ success: true });
}
