import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { isContentVariantSchemaUnavailable } from "@/lib/content-variant-db";
import {
  canTransitionVariantStatus,
  isManualVariantStatus,
  validateVariantSchedule,
  type VariantStatus,
} from "@/lib/content-variant";

export const runtime = "nodejs";

const updateSchema = z.object({
  body: z.string().trim().min(1).max(30000).optional(),
  status: z.enum([
    "DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHING", "PUBLISHED", "FAILED", "CANCELLED",
  ]).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
}).strict();

type Context = { params: Promise<{ variantId: string }> };

export async function PATCH(request: Request, context: Context) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const { variantId } = await context.params;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return NextResponse.json(
      { error: "Invalid variant update", details: parsed.success ? undefined : parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.contentVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        contentItemId: true,
        platform: true,
        body: true,
        status: true,
        scheduledAt: true,
        contentItem: { select: { workspaceId: true } },
      },
    });
    if (!existing) return { error: "not_found" as const };

    if (existing.status === "PUBLISHED" || existing.status === "PUBLISHING") {
      return { error: "locked" as const };
    }

    const nextStatus = (parsed.data.status ?? existing.status) as VariantStatus;
    if (!isManualVariantStatus(nextStatus)) return { error: "system_status" as const };

    if (parsed.data.status && parsed.data.status !== existing.status) {
      if (!canTransitionVariantStatus(existing.status as VariantStatus, nextStatus)) {
        return { error: "invalid_transition" as const };
      }
    }

    let nextScheduledAt: Date | null;
    if (nextStatus !== "SCHEDULED") {
      nextScheduledAt = null;
    } else if (parsed.data.scheduledAt !== undefined) {
      nextScheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
    } else {
      nextScheduledAt = existing.scheduledAt;
    }

    const scheduleError = validateVariantSchedule(nextStatus, nextScheduledAt);
    if (scheduleError) return { error: "invalid_schedule" as const, message: scheduleError };

    const updated = await tx.contentVariant.update({
      where: { id: variantId },
      data: {
        ...(parsed.data.body !== undefined ? { body: parsed.data.body } : {}),
        status: nextStatus,
        scheduledAt: nextScheduledAt,
      },
    });
    await tx.auditEvent.create({
      data: {
        workspaceId: existing.contentItem.workspaceId,
        action: "content.variant.updated",
        resource: "ContentVariant",
        resourceId: updated.id,
        metadata: { platform: updated.platform, previousStatus: existing.status, status: updated.status },
      },
    });
    return { data: updated };
  }).catch((error: unknown) => {
    if (isContentVariantSchemaUnavailable(error)) return { error: "schema_unavailable" as const };
    throw error;
  });

  if ("data" in result) return NextResponse.json({ data: result.data });
  if (result.error === "schema_unavailable") return NextResponse.json(
    { error: "ميزة نسخ القنوات غير مفعلة في قاعدة الإنتاج بعد. بيانات المحتوى الأساسية لم تتأثر.", code: "CONTENT_VARIANTS_MIGRATION_REQUIRED" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
  if (result.error === "not_found") return NextResponse.json({ error: "Content variant not found" }, { status: 404 });
  if (result.error === "locked") return NextResponse.json({ error: "لا يمكن تعديل نسخة قيد النشر أو منشورة." }, { status: 409 });
  if (result.error === "system_status") return NextResponse.json({ error: "هذه الحالة لا يمكن تعيينها يدوياً." }, { status: 400 });
  if (result.error === "invalid_transition") return NextResponse.json({ error: "انتقال الحالة غير مسموح." }, { status: 409 });
  return NextResponse.json({ error: result.message }, { status: 400 });
}

export async function DELETE(request: Request, context: Context) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const { variantId } = await context.params;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.contentVariant.findUnique({
      where: { id: variantId },
      select: { id: true, status: true, platform: true, contentItem: { select: { workspaceId: true } } },
    });
    if (!existing) return { error: "not_found" as const };
    if (existing.status === "PUBLISHED" || existing.status === "PUBLISHING") return { error: "locked" as const };

    await tx.contentVariant.delete({ where: { id: variantId } });
    await tx.auditEvent.create({
      data: {
        workspaceId: existing.contentItem.workspaceId,
        action: "content.variant.deleted",
        resource: "ContentVariant",
        resourceId: existing.id,
        metadata: { platform: existing.platform },
      },
    });
    return { success: true as const };
  }).catch((error: unknown) => {
    if (isContentVariantSchemaUnavailable(error)) return { error: "schema_unavailable" as const };
    throw error;
  });

  if ("success" in result) return NextResponse.json({ success: true });
  if (result.error === "schema_unavailable") return NextResponse.json(
    { error: "ميزة نسخ القنوات غير مفعلة في قاعدة الإنتاج بعد. بيانات المحتوى الأساسية لم تتأثر.", code: "CONTENT_VARIANTS_MIGRATION_REQUIRED" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
  if (result.error === "not_found") return NextResponse.json({ error: "Content variant not found" }, { status: 404 });
  return NextResponse.json({ error: "لا يمكن حذف نسخة قيد النشر أو منشورة." }, { status: 409 });
}
