import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { validateVariantSchedule } from "@/lib/content-variant";
import { isContentVariantSchemaUnavailable } from "@/lib/content-variant-db";

export const runtime = "nodejs";

const createSchema = z.object({
  platform: z.enum([
    "X", "LINKEDIN", "INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE",
    "THREADS", "PINTEREST", "REDDIT", "BLUESKY", "MASTODON", "TELEGRAM", "DISCORD",
  ]),
  body: z.string().trim().min(1).max(30000),
}).strict();

type Context = { params: Promise<{ itemId: string }> };

export async function GET(request: Request, context: Context) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const { itemId } = await context.params;

  const item = await prisma.contentItem.findUnique({
    where: { id: itemId },
    select: { id: true },
  });
  if (!item) return NextResponse.json({ error: "Content item not found" }, { status: 404 });

  try {
    const variants = await prisma.contentVariant.findMany({
      where: { contentItemId: itemId },
      orderBy: [{ createdAt: "asc" }],
    });
    return NextResponse.json({ data: variants }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isContentVariantSchemaUnavailable(error)) {
      return NextResponse.json(
        { error: "ميزة نسخ القنوات غير مفعلة في قاعدة الإنتاج بعد. بيانات المحتوى الأساسية لم تتأثر.", code: "CONTENT_VARIANTS_MIGRATION_REQUIRED" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    throw error;
  }
}

export async function POST(request: Request, context: Context) {
  const denied = requireOwnerApi(request);
  if (denied) return denied;
  const { itemId } = await context.params;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid content variant", details: parsed.error.flatten() }, { status: 400 });
  }

  const item = await prisma.contentItem.findUnique({
    where: { id: itemId },
    select: { id: true, workspaceId: true },
  });
  if (!item) return NextResponse.json({ error: "Content item not found" }, { status: 404 });

  try {
    const variant = await prisma.$transaction(async (tx) => {
      const created = await tx.contentVariant.create({
        data: { contentItemId: itemId, platform: parsed.data.platform, body: parsed.data.body },
      });
      await tx.auditEvent.create({
        data: {
          workspaceId: item.workspaceId,
          action: "content.variant.created",
          resource: "ContentVariant",
          resourceId: created.id,
          metadata: { platform: created.platform },
        },
      });
      return created;
    });
    return NextResponse.json({ data: variant }, { status: 201 });
  } catch (error) {
    if (isContentVariantSchemaUnavailable(error)) {
      return NextResponse.json(
        { error: "ميزة نسخ القنوات غير مفعلة في قاعدة الإنتاج بعد. بيانات المحتوى الأساسية لم تتأثر.", code: "CONTENT_VARIANTS_MIGRATION_REQUIRED" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    const knownError = error as { code?: string };
    if (knownError.code === "P2002") {
      return NextResponse.json({ error: "توجد نسخة لهذه القناة بالفعل ضمن هذا المحتوى." }, { status: 409 });
    }
    return NextResponse.json({ error: "تعذر إنشاء نسخة القناة." }, { status: 500 });
  }
}
