import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransitionVariantStatus,
  isManualVariantStatus,
  validateVariantSchedule,
} from "../src/lib/content-variant.ts";

test("variant review and approval transitions follow the workflow", () => {
  assert.equal(canTransitionVariantStatus("DRAFT", "IN_REVIEW"), true);
  assert.equal(canTransitionVariantStatus("IN_REVIEW", "APPROVED"), true);
  assert.equal(canTransitionVariantStatus("APPROVED", "SCHEDULED"), true);
  assert.equal(canTransitionVariantStatus("DRAFT", "PUBLISHED"), false);
  assert.equal(canTransitionVariantStatus("PUBLISHED", "DRAFT"), false);
});

test("publishing and published states are system controlled", () => {
  assert.equal(isManualVariantStatus("DRAFT"), true);
  assert.equal(isManualVariantStatus("APPROVED"), true);
  assert.equal(isManualVariantStatus("PUBLISHING"), false);
  assert.equal(isManualVariantStatus("PUBLISHED"), false);
});

test("scheduled variants require a future date", () => {
  assert.match(validateVariantSchedule("SCHEDULED", null) ?? "", /موعد/);
  assert.match(validateVariantSchedule("SCHEDULED", new Date("2000-01-01T00:00:00.000Z")) ?? "", /المستقبل/);
  assert.equal(validateVariantSchedule("SCHEDULED", new Date("2099-01-01T00:00:00.000Z")), null);
});

test("non-scheduled variants cannot retain a scheduled date", () => {
  assert.match(validateVariantSchedule("APPROVED", new Date("2099-01-01T00:00:00.000Z")) ?? "", /فقط/);
  assert.equal(validateVariantSchedule("APPROVED", null), null);
});
