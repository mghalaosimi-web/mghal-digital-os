export const VARIANT_STATUSES = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
  "CANCELLED",
] as const;

export type VariantStatus = (typeof VARIANT_STATUSES)[number];

const transitions: Record<VariantStatus, readonly VariantStatus[]> = {
  DRAFT: ["IN_REVIEW", "CANCELLED"],
  IN_REVIEW: ["DRAFT", "APPROVED", "CANCELLED"],
  APPROVED: ["DRAFT", "SCHEDULED", "CANCELLED"],
  SCHEDULED: ["APPROVED", "CANCELLED"],
  PUBLISHING: ["PUBLISHED", "FAILED"],
  PUBLISHED: [],
  FAILED: ["APPROVED", "CANCELLED"],
  CANCELLED: ["DRAFT"],
};

export function canTransitionVariantStatus(from: VariantStatus, to: VariantStatus): boolean {
  return transitions[from].includes(to);
}

export function isManualVariantStatus(status: VariantStatus): boolean {
  return status !== "PUBLISHING" && status !== "PUBLISHED";
}

export function validateVariantSchedule(status: VariantStatus, scheduledAt: Date | null): string | null {
  if (status === "SCHEDULED" && !scheduledAt) {
    return "يجب تحديد موعد مستقبلي قبل جدولة النسخة.";
  }
  if (status !== "SCHEDULED" && scheduledAt) {
    return "موعد النشر مسموح فقط عندما تكون النسخة مجدولة.";
  }
  if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
    return "يجب أن يكون موعد النشر في المستقبل.";
  }
  return null;
}
