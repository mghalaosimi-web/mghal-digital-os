import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransitionVariantStatus,
  isManualVariantStatus,
  validateVariantSchedule,
} from "../src/lib/content-variant.ts";

const statuses = [
  "DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED",
  "PUBLISHING", "PUBLISHED", "FAILED", "CANCELLED",
];

const allowedTransitions = [
  ["DRAFT", "IN_REVIEW"], ["DRAFT", "CANCELLED"],
  ["IN_REVIEW", "DRAFT"], ["IN_REVIEW", "APPROVED"], ["IN_REVIEW", "CANCELLED"],
  ["APPROVED", "DRAFT"], ["APPROVED", "SCHEDULED"], ["APPROVED", "CANCELLED"],
  ["SCHEDULED", "APPROVED"], ["SCHEDULED", "CANCELLED"],
  ["PUBLISHING", "PUBLISHED"], ["PUBLISHING", "FAILED"],
  ["FAILED", "APPROVED"], ["FAILED", "CANCELLED"],
  ["CANCELLED", "DRAFT"],
];

test("variant lifecycle allows exactly the declared state transitions", () => {
  for (const from of statuses) {
    for (const to of statuses) {
      assert.equal(
        canTransitionVariantStatus(from, to),
        allowedTransitions.some(([source, target]) => source === from && target === to),
        `${from} -> ${to}`,
      );
    }
  }
});

test("publishing and published states cannot be assigned manually", () => {
  for (const status of statuses) {
    assert.equal(isManualVariantStatus(status), !["PUBLISHING", "PUBLISHED"].includes(status));
  }
});

test("scheduled variants require a future date", () => {
  assert.match(validateVariantSchedule("SCHEDULED", null) ?? "", /موعد/);
  assert.match(
    validateVariantSchedule("SCHEDULED", new Date("2000-01-01T00:00:00.000Z")) ?? "",
    /المستقبل/,
  );
  assert.equal(validateVariantSchedule("SCHEDULED", new Date(Date.now() + 60_000)), null);
});

test("only scheduled variants may have a scheduled date", () => {
  const future = new Date(Date.now() + 60_000);
  for (const status of statuses.filter((value) => value !== "SCHEDULED")) {
    assert.match(validateVariantSchedule(status, future) ?? "", /فقط/);
  }
  assert.equal(validateVariantSchedule("APPROVED", null), null);
});

test("scheduled variants reject a date at the current instant", () => {
  assert.match(validateVariantSchedule("SCHEDULED", new Date(0)) ?? "", /المستقبل/);
});


test("missing ContentVariant production schema is identified without masking unrelated database errors", async () => {
  const { isContentVariantSchemaUnavailable } = await import("../src/lib/content-variant-db.ts");
  assert.equal(isContentVariantSchemaUnavailable({ code: "P2021", meta: { table: "public.ContentVariant" } }), true);
  assert.equal(isContentVariantSchemaUnavailable({ code: "P2022", meta: { column: "ContentVariant.scheduledAt" } }), true);
  assert.equal(isContentVariantSchemaUnavailable({ code: "P2010", meta: { code: "42P01", message: 'relation "ContentVariant" does not exist' } }), true);
  assert.equal(isContentVariantSchemaUnavailable({ code: "P2021", meta: { table: "public.ContentItem" } }), false);
  assert.equal(isContentVariantSchemaUnavailable({ code: "P2002" }), false);
  assert.equal(isContentVariantSchemaUnavailable(new Error("database unavailable")), false);
});
