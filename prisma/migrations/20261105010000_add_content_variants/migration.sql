CREATE TYPE "SocialPlatform" AS ENUM (
  'X',
  'LINKEDIN',
  'INSTAGRAM',
  'FACEBOOK',
  'TIKTOK',
  'YOUTUBE',
  'THREADS',
  'PINTEREST',
  'REDDIT',
  'BLUESKY',
  'MASTODON',
  'TELEGRAM',
  'DISCORD'
);

CREATE TYPE "VariantStatus" AS ENUM (
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'SCHEDULED',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "ContentVariant" (
  "id" TEXT NOT NULL,
  "contentItemId" TEXT NOT NULL,
  "platform" "SocialPlatform" NOT NULL,
  "body" TEXT NOT NULL,
  "status" "VariantStatus" NOT NULL DEFAULT 'DRAFT',
  "scheduledAt" TIMESTAMPTZ(6),
  "publishedAt" TIMESTAMPTZ(6),
  "externalPostId" TEXT,
  "lastError" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ContentVariant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentVariant_contentItemId_platform_key"
  ON "ContentVariant"("contentItemId", "platform");

CREATE INDEX "ContentVariant_status_scheduledAt_idx"
  ON "ContentVariant"("status", "scheduledAt");

CREATE INDEX "ContentVariant_contentItemId_status_idx"
  ON "ContentVariant"("contentItemId", "status");

ALTER TABLE "ContentVariant"
  ADD CONSTRAINT "ContentVariant_contentItemId_fkey"
  FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
