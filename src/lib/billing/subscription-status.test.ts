import assert from "node:assert/strict";
import test from "node:test";

import {
  mapSubscriptionStatusToPurchaseStatus,
  shouldKeepProEntitlement,
} from "@/lib/billing/subscription-status";

const referenceNow = new Date("2026-07-07T12:00:00.000Z");
const futurePeriodEnd = "2026-08-01T12:00:00.000Z";
const expiredPeriodEnd = "2026-07-01T12:00:00.000Z";

test("subscription cancellation keeps Pro through the already-paid period", () => {
  assert.equal(mapSubscriptionStatusToPurchaseStatus("canceled", futurePeriodEnd, referenceNow), "completed");
  assert.equal(shouldKeepProEntitlement("canceled", futurePeriodEnd, referenceNow), true);
});

test("subscription cancellation removes Pro after the paid period expires", () => {
  assert.equal(mapSubscriptionStatusToPurchaseStatus("canceled", expiredPeriodEnd, referenceNow), "cancelled");
  assert.equal(shouldKeepProEntitlement("canceled", expiredPeriodEnd, referenceNow), false);
});

test("active subscription still requires a valid future entitlement window", () => {
  assert.equal(mapSubscriptionStatusToPurchaseStatus("active", futurePeriodEnd, referenceNow), "completed");
  assert.equal(shouldKeepProEntitlement("active", futurePeriodEnd, referenceNow), true);
  assert.equal(shouldKeepProEntitlement("active", expiredPeriodEnd, referenceNow), false);
});

test("past-due subscription is pending but keeps access during the billing grace window", () => {
  assert.equal(mapSubscriptionStatusToPurchaseStatus("past_due", futurePeriodEnd, referenceNow), "pending");
  assert.equal(shouldKeepProEntitlement("past_due", futurePeriodEnd, referenceNow), true);
});

test("past-due subscription does not keep access after the billing window expires", () => {
  assert.equal(mapSubscriptionStatusToPurchaseStatus("past_due", expiredPeriodEnd, referenceNow), "pending");
  assert.equal(shouldKeepProEntitlement("past_due", expiredPeriodEnd, referenceNow), false);
});

test("failed subscription states do not keep Pro entitlement", () => {
  assert.equal(mapSubscriptionStatusToPurchaseStatus("unpaid", futurePeriodEnd, referenceNow), "failed");
  assert.equal(shouldKeepProEntitlement("unpaid", futurePeriodEnd, referenceNow), false);
  assert.equal(mapSubscriptionStatusToPurchaseStatus("incomplete_expired", futurePeriodEnd, referenceNow), "failed");
  assert.equal(shouldKeepProEntitlement("incomplete_expired", futurePeriodEnd, referenceNow), false);
});

test("invoice payment failure policy keeps access only when Stripe still exposes a future paid window", () => {
  const failedInvoiceGraceStates = ["past_due", "paused"] as const;

  for (const status of failedInvoiceGraceStates) {
    assert.equal(mapSubscriptionStatusToPurchaseStatus(status, futurePeriodEnd, referenceNow), "pending");
    assert.equal(shouldKeepProEntitlement(status, futurePeriodEnd, referenceNow), true);
    assert.equal(shouldKeepProEntitlement(status, expiredPeriodEnd, referenceNow), false);
  }
});

test("invoice payment failure terminal states never keep Pro even if a stale period end exists", () => {
  const terminalFailureStates = ["unpaid", "incomplete_expired"] as const;

  for (const status of terminalFailureStates) {
    assert.equal(mapSubscriptionStatusToPurchaseStatus(status, futurePeriodEnd, referenceNow), "failed");
    assert.equal(shouldKeepProEntitlement(status, futurePeriodEnd, referenceNow), false);
    assert.equal(mapSubscriptionStatusToPurchaseStatus(status, expiredPeriodEnd, referenceNow), "failed");
    assert.equal(shouldKeepProEntitlement(status, expiredPeriodEnd, referenceNow), false);
  }
});

test("incomplete subscription is pending setup state without Pro access", () => {
  assert.equal(mapSubscriptionStatusToPurchaseStatus("incomplete", futurePeriodEnd, referenceNow), "pending");
  assert.equal(shouldKeepProEntitlement("incomplete", futurePeriodEnd, referenceNow), false);
});
