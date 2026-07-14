import assert from "node:assert/strict";
import test from "node:test";

import {
  COMMUNITY_PRICE_CONFIRMATION_DAYS,
  COMMUNITY_PRICE_MILESTONES,
  countCommunityPricingSubscribers,
  getCommunityPriceMilestoneForCount,
  resolveCommunityPriceMilestone,
  type CommunityPriceSnapshot,
  type CommunityPricingSubscriptionCandidate,
} from "@/lib/billing/community-pricing-policy";

const referenceNow = new Date("2026-07-14T12:00:00.000Z");

function candidate(
  overrides: Partial<CommunityPricingSubscriptionCandidate> = {},
): CommunityPricingSubscriptionCandidate {
  return {
    userId: "user-1",
    subscriptionId: "sub-1",
    status: "active",
    currentPeriodEnd: "2026-08-14T12:00:00.000Z",
    cancelAtPeriodEnd: false,
    successfulPaidInvoiceAmountCents: 500,
    refunded: false,
    disputed: false,
    fullyDiscounted: false,
    accessSource: "subscription",
    ...overrides,
  };
}

function dailySnapshots(
  count: number,
  days = COMMUNITY_PRICE_CONFIRMATION_DAYS,
  endDate = "2026-07-14",
): CommunityPriceSnapshot[] {
  const end = new Date(`${endDate}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (days - index - 1));
    return {
      capturedOn: date.toISOString().slice(0, 10),
      activePaidSubscriberCount: count,
    };
  });
}

test("counts one active renewing paid subscription per user", () => {
  const result = countCommunityPricingSubscribers([
    candidate(),
    candidate({ userId: "user-2", subscriptionId: "sub-2" }),
  ], referenceNow);

  assert.equal(result.activePaidSubscriberCount, 2);
  assert.deepEqual(result.countedUserIds, ["user-1", "user-2"]);
  assert.ok(result.decisions.every((decision) => decision.counted));
});

test("excludes non-renewing, unpaid, refunded, disputed, discounted, and non-subscription access", () => {
  const excludedStatuses = [
    "trialing",
    "past_due",
    "paused",
    "unpaid",
    "incomplete",
    "incomplete_expired",
    "canceled",
  ] as const;
  const excludedAccessSources = ["gift", "lifetime", "fixture", "administrative"] as const;
  const candidates = [
    ...excludedStatuses.map((status) => candidate({ subscriptionId: `sub-${status}`, status })),
    candidate({ subscriptionId: "sub-cancel", cancelAtPeriodEnd: true }),
    candidate({ subscriptionId: "sub-expired", currentPeriodEnd: "2026-07-01T00:00:00.000Z" }),
    candidate({ subscriptionId: "sub-zero", successfulPaidInvoiceAmountCents: 0 }),
    candidate({ subscriptionId: "sub-fractional", successfulPaidInvoiceAmountCents: 0.5 }),
    candidate({ subscriptionId: "sub-refund", refunded: true }),
    candidate({ subscriptionId: "sub-dispute", disputed: true }),
    candidate({ subscriptionId: "sub-discount", fullyDiscounted: true }),
    ...excludedAccessSources.map((accessSource) => candidate({
      subscriptionId: `sub-${accessSource}`,
      accessSource,
    })),
  ];
  const result = countCommunityPricingSubscribers(candidates, referenceNow);

  assert.equal(result.activePaidSubscriberCount, 0);
  assert.ok(result.decisions.slice(0, excludedStatuses.length).every(
    (decision) => decision.exclusionReasons.includes("status_not_active"),
  ));
  assert.ok(result.decisions.slice(-excludedAccessSources.length).every(
    (decision) => decision.exclusionReasons.includes("access_source_not_subscription"),
  ));
  assert.ok(result.decisions.some(
    (decision) => decision.exclusionReasons.includes("cancel_at_period_end"),
  ));
  assert.ok(result.decisions.some(
    (decision) => decision.exclusionReasons.includes("paid_period_not_future"),
  ));
  assert.ok(result.decisions.filter(
    (decision) => decision.exclusionReasons.includes("successful_nonzero_invoice_missing"),
  ).length >= 2);
  assert.ok(result.decisions.some((decision) => decision.exclusionReasons.includes("refunded")));
  assert.ok(result.decisions.some((decision) => decision.exclusionReasons.includes("disputed")));
  assert.ok(result.decisions.some(
    (decision) => decision.exclusionReasons.includes("fully_discounted"),
  ));
});

test("deduplicates subscription records before deduplicating users", () => {
  const result = countCommunityPricingSubscribers([
    candidate({ userId: "user-2", subscriptionId: "sub-shared" }),
    candidate({ userId: "user-1", subscriptionId: "sub-shared" }),
    candidate({ userId: "user-1", subscriptionId: "sub-extra" }),
  ], referenceNow);

  assert.equal(result.activePaidSubscriberCount, 1);
  assert.deepEqual(result.countedUserIds, ["user-1"]);
  assert.equal(result.decisions[0].exclusionReasons[0], "duplicate_subscription");
  assert.equal(result.decisions[1].exclusionReasons[0], "duplicate_subscription");
  assert.equal(result.decisions[2].counted, true);
});

test("counts one row when duplicate subscription records belong to the same user", () => {
  const result = countCommunityPricingSubscribers([
    candidate(),
    candidate(),
  ], referenceNow);

  assert.equal(result.activePaidSubscriberCount, 1);
  assert.equal(result.decisions[0].counted, true);
  assert.equal(result.decisions[1].exclusionReasons[0], "duplicate_subscription");
});

test("counts only one subscription when a user has multiple eligible subscriptions", () => {
  const result = countCommunityPricingSubscribers([
    candidate({ subscriptionId: "sub-2" }),
    candidate({ subscriptionId: "sub-1" }),
  ], referenceNow);

  assert.equal(result.activePaidSubscriberCount, 1);
  assert.equal(result.decisions[0].exclusionReasons[0], "duplicate_user");
  assert.equal(result.decisions[1].counted, true);
});

test("normalizes surrounding identifier whitespace for deduplication", () => {
  const result = countCommunityPricingSubscribers([
    candidate({ userId: " user-1 ", subscriptionId: " sub-1 " }),
    candidate({ userId: "user-1", subscriptionId: "sub-2" }),
  ], referenceNow);

  assert.equal(result.activePaidSubscriberCount, 1);
  assert.deepEqual(result.countedUserIds, ["user-1"]);
  assert.equal(result.decisions[1].exclusionReasons[0], "duplicate_user");
});

test("preserves the approved immutable milestone ladder and exact boundaries", () => {
  assert.deepEqual(
    COMMUNITY_PRICE_MILESTONES.map((milestone) => [
      milestone.subscriberThreshold,
      milestone.monthlyAmountCents,
    ]),
    [
      [0, 500],
      [1_250, 400],
      [1_667, 300],
      [2_500, 200],
      [5_000, 100],
      [10_000, 50],
    ],
  );
  assert.equal(Object.isFrozen(COMMUNITY_PRICE_MILESTONES), true);
  assert.ok(COMMUNITY_PRICE_MILESTONES.every((milestone) => Object.isFrozen(milestone)));
  assert.equal(getCommunityPriceMilestoneForCount(1_249).monthlyAmountCents, 500);
  assert.equal(getCommunityPriceMilestoneForCount(1_250).monthlyAmountCents, 400);
  assert.equal(getCommunityPriceMilestoneForCount(10_000).monthlyAmountCents, 50);
});

test("requires seven consecutive UTC daily snapshots before lowering price", () => {
  const insufficient = resolveCommunityPriceMilestone({
    snapshots: dailySnapshots(1_250, 6),
    previousMilestoneId: "initial",
  });
  assert.equal(insufficient.changed, false);
  assert.equal(insufficient.reason, "insufficient_daily_snapshots");
  assert.equal(insufficient.selectedMilestone.id, "initial");

  const confirmed = resolveCommunityPriceMilestone({
    snapshots: dailySnapshots(1_250).reverse(),
    previousMilestoneId: "initial",
  });
  assert.equal(confirmed.changed, true);
  assert.equal(confirmed.reason, "threshold_confirmed");
  assert.equal(confirmed.selectedMilestone.id, "members_1250");
  assert.equal(confirmed.confirmationWindow.length, COMMUNITY_PRICE_CONFIRMATION_DAYS);
});

test("a missing day or one below-threshold day prevents a milestone unlock", () => {
  const missingDay = dailySnapshots(1_250).filter((snapshot) => snapshot.capturedOn !== "2026-07-11");
  const missingResult = resolveCommunityPriceMilestone({
    snapshots: missingDay,
    previousMilestoneId: "initial",
  });
  assert.equal(missingResult.reason, "insufficient_daily_snapshots");

  const belowThreshold = dailySnapshots(1_250);
  belowThreshold[3] = { ...belowThreshold[3], activePaidSubscriberCount: 1_249 };
  const belowResult = resolveCommunityPriceMilestone({
    snapshots: belowThreshold,
    previousMilestoneId: "initial",
  });
  assert.equal(belowResult.changed, false);
  assert.equal(belowResult.selectedMilestone.id, "initial");
});

test("duplicate daily snapshots use the conservative lower count", () => {
  const snapshots = [
    ...dailySnapshots(1_667),
    { capturedOn: "2026-07-12", activePaidSubscriberCount: 1_250 },
  ];
  const result = resolveCommunityPriceMilestone({
    snapshots,
    previousMilestoneId: "initial",
  });

  assert.equal(result.selectedMilestone.id, "members_1250");
  assert.equal(result.confirmationWindow.find((snapshot) => snapshot.capturedOn === "2026-07-12")?.activePaidSubscriberCount, 1_250);
});

test("a previously unlocked lower price never moves upward", () => {
  const result = resolveCommunityPriceMilestone({
    snapshots: dailySnapshots(100),
    previousMilestoneId: "members_5000",
  });

  assert.equal(result.changed, false);
  assert.equal(result.reason, "permanent_ratchet_retained");
  assert.equal(result.qualifyingMilestone?.id, "initial");
  assert.equal(result.selectedMilestone.id, "members_5000");
});
