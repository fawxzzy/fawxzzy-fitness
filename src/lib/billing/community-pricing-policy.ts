export const COMMUNITY_PRICE_CONFIRMATION_DAYS = 7;

export type CommunityPriceMilestoneId =
  | "initial"
  | "members_1250"
  | "members_1667"
  | "members_2500"
  | "members_5000"
  | "members_10000";

export type CommunityPricingSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "paused"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "canceled";

export type CommunityPricingAccessSource =
  | "subscription"
  | "gift"
  | "lifetime"
  | "fixture"
  | "administrative";

export type CommunityPricingExclusionReason =
  | "user_missing"
  | "subscription_missing"
  | "status_not_active"
  | "cancel_at_period_end"
  | "paid_period_not_future"
  | "successful_nonzero_invoice_missing"
  | "refunded"
  | "disputed"
  | "fully_discounted"
  | "access_source_not_subscription"
  | "duplicate_subscription"
  | "duplicate_user";

export interface CommunityPricingSubscriptionCandidate {
  userId: string;
  subscriptionId: string;
  status: CommunityPricingSubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  successfulPaidInvoiceAmountCents: number | null;
  refunded: boolean;
  disputed: boolean;
  fullyDiscounted: boolean;
  accessSource: CommunityPricingAccessSource;
}

export interface CommunityPricingCandidateDecision {
  candidate: CommunityPricingSubscriptionCandidate;
  counted: boolean;
  exclusionReasons: readonly CommunityPricingExclusionReason[];
}

export interface CommunityPricingCountResult {
  activePaidSubscriberCount: number;
  countedUserIds: readonly string[];
  decisions: readonly CommunityPricingCandidateDecision[];
}

export interface CommunityPriceMilestone {
  id: CommunityPriceMilestoneId;
  subscriberThreshold: number;
  monthlyAmountCents: number;
}

export interface CommunityPriceSnapshot {
  capturedOn: string;
  activePaidSubscriberCount: number;
}

export type CommunityPriceResolutionReason =
  | "insufficient_daily_snapshots"
  | "threshold_confirmed"
  | "permanent_ratchet_retained"
  | "milestone_unchanged";

export interface CommunityPriceResolution {
  previousMilestone: CommunityPriceMilestone;
  qualifyingMilestone: CommunityPriceMilestone | null;
  selectedMilestone: CommunityPriceMilestone;
  confirmationWindow: readonly CommunityPriceSnapshot[];
  changed: boolean;
  reason: CommunityPriceResolutionReason;
}

const COMMUNITY_PRICE_MILESTONE_VALUES: readonly CommunityPriceMilestone[] = [
  { id: "initial", subscriberThreshold: 0, monthlyAmountCents: 500 },
  { id: "members_1250", subscriberThreshold: 1_250, monthlyAmountCents: 400 },
  { id: "members_1667", subscriberThreshold: 1_667, monthlyAmountCents: 300 },
  { id: "members_2500", subscriberThreshold: 2_500, monthlyAmountCents: 200 },
  { id: "members_5000", subscriberThreshold: 5_000, monthlyAmountCents: 100 },
  { id: "members_10000", subscriberThreshold: 10_000, monthlyAmountCents: 50 },
];

export const COMMUNITY_PRICE_MILESTONES = Object.freeze(
  COMMUNITY_PRICE_MILESTONE_VALUES.map((milestone) => Object.freeze({ ...milestone })),
);

function hasFuturePaidPeriod(currentPeriodEnd: string | null, referenceNow: Date) {
  if (!currentPeriodEnd) {
    return false;
  }

  const periodEnd = new Date(currentPeriodEnd);
  return !Number.isNaN(periodEnd.valueOf()) && periodEnd.valueOf() > referenceNow.valueOf();
}

function getBaseExclusionReasons(
  candidate: CommunityPricingSubscriptionCandidate,
  referenceNow: Date,
) {
  const reasons: CommunityPricingExclusionReason[] = [];

  if (!candidate.userId.trim()) reasons.push("user_missing");
  if (!candidate.subscriptionId.trim()) reasons.push("subscription_missing");
  if (candidate.status !== "active") reasons.push("status_not_active");
  if (candidate.cancelAtPeriodEnd) reasons.push("cancel_at_period_end");
  if (!hasFuturePaidPeriod(candidate.currentPeriodEnd, referenceNow)) {
    reasons.push("paid_period_not_future");
  }
  if (
    candidate.successfulPaidInvoiceAmountCents === null
    || !Number.isInteger(candidate.successfulPaidInvoiceAmountCents)
    || candidate.successfulPaidInvoiceAmountCents <= 0
  ) {
    reasons.push("successful_nonzero_invoice_missing");
  }
  if (candidate.refunded) reasons.push("refunded");
  if (candidate.disputed) reasons.push("disputed");
  if (candidate.fullyDiscounted) reasons.push("fully_discounted");
  if (candidate.accessSource !== "subscription") {
    reasons.push("access_source_not_subscription");
  }

  return reasons;
}

export function countCommunityPricingSubscribers(
  candidates: readonly CommunityPricingSubscriptionCandidate[],
  referenceNow = new Date(),
): CommunityPricingCountResult {
  const evaluated = candidates.map((candidate, index) => ({
    candidate,
    index,
    exclusionReasons: getBaseExclusionReasons(candidate, referenceNow),
    counted: false,
  }));
  const eligibleDecisions = evaluated
    .filter((decision) => decision.exclusionReasons.length === 0)
    .sort((left, right) => {
      const subscriptionOrder = left.candidate.subscriptionId.localeCompare(right.candidate.subscriptionId);
      if (subscriptionOrder !== 0) return subscriptionOrder;
      const userOrder = left.candidate.userId.localeCompare(right.candidate.userId);
      return userOrder !== 0 ? userOrder : left.index - right.index;
    });
  const decisionsBySubscriptionId = new Map<string, typeof eligibleDecisions>();

  for (const decision of eligibleDecisions) {
    const subscriptionId = decision.candidate.subscriptionId.trim();
    const group = decisionsBySubscriptionId.get(subscriptionId) ?? [];
    group.push(decision);
    decisionsBySubscriptionId.set(subscriptionId, group);
  }

  const uniqueSubscriptionDecisions: typeof eligibleDecisions = [];
  for (const group of decisionsBySubscriptionId.values()) {
    const userIds = new Set(group.map((decision) => decision.candidate.userId.trim()));
    if (userIds.size > 1) {
      group.forEach((decision) => decision.exclusionReasons.push("duplicate_subscription"));
      continue;
    }

    uniqueSubscriptionDecisions.push(group[0]);
    group.slice(1).forEach((decision) => {
      decision.exclusionReasons.push("duplicate_subscription");
    });
  }

  const seenUserIds = new Set<string>();
  uniqueSubscriptionDecisions
    .sort((left, right) => {
      const userOrder = left.candidate.userId.trim().localeCompare(right.candidate.userId.trim());
      if (userOrder !== 0) return userOrder;
      return left.candidate.subscriptionId.trim().localeCompare(right.candidate.subscriptionId.trim());
    })
    .forEach((decision) => {
      const userId = decision.candidate.userId.trim();
      if (seenUserIds.has(userId)) {
        decision.exclusionReasons.push("duplicate_user");
        return;
      }
      seenUserIds.add(userId);
      decision.counted = true;
    });

  const decisions = evaluated
    .sort((left, right) => left.index - right.index)
    .map(({ candidate, counted, exclusionReasons }) => ({
      candidate,
      counted,
      exclusionReasons: Object.freeze([...exclusionReasons]),
    }));
  const countedUserIds = decisions
    .filter((decision) => decision.counted)
    .map((decision) => decision.candidate.userId.trim())
    .sort();

  return {
    activePaidSubscriberCount: countedUserIds.length,
    countedUserIds: Object.freeze(countedUserIds),
    decisions: Object.freeze(decisions),
  };
}

export function getCommunityPriceMilestoneForCount(activePaidSubscriberCount: number) {
  const safeCount = Number.isFinite(activePaidSubscriberCount)
    ? Math.max(0, Math.floor(activePaidSubscriberCount))
    : 0;

  return COMMUNITY_PRICE_MILESTONES.reduce(
    (selected, milestone) => (
      safeCount >= milestone.subscriberThreshold ? milestone : selected
    ),
    COMMUNITY_PRICE_MILESTONES[0],
  );
}

function parseCapturedOn(capturedOn: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(capturedOn)) {
    return null;
  }

  const date = new Date(`${capturedOn}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== capturedOn) {
    return null;
  }
  return date;
}

function shiftUtcDate(capturedOn: string, offsetDays: number) {
  const date = parseCapturedOn(capturedOn);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function buildConfirmationWindow(snapshots: readonly CommunityPriceSnapshot[]) {
  const countsByDate = new Map<string, number>();

  for (const snapshot of snapshots) {
    if (!parseCapturedOn(snapshot.capturedOn)) continue;
    if (!Number.isInteger(snapshot.activePaidSubscriberCount)) continue;
    if (snapshot.activePaidSubscriberCount < 0) continue;

    const existingCount = countsByDate.get(snapshot.capturedOn);
    countsByDate.set(
      snapshot.capturedOn,
      existingCount === undefined
        ? snapshot.activePaidSubscriberCount
        : Math.min(existingCount, snapshot.activePaidSubscriberCount),
    );
  }

  const latestDate = [...countsByDate.keys()].sort().at(-1);
  if (!latestDate) return [];

  const window: CommunityPriceSnapshot[] = [];
  for (let dayOffset = 0; dayOffset < COMMUNITY_PRICE_CONFIRMATION_DAYS; dayOffset += 1) {
    const capturedOn = shiftUtcDate(latestDate, -dayOffset);
    if (!capturedOn) break;
    const activePaidSubscriberCount = countsByDate.get(capturedOn);
    if (activePaidSubscriberCount === undefined) break;
    window.push({ capturedOn, activePaidSubscriberCount });
  }

  return window.reverse();
}

function getMilestoneIndex(milestoneId: CommunityPriceMilestoneId) {
  return COMMUNITY_PRICE_MILESTONES.findIndex((milestone) => milestone.id === milestoneId);
}

export function resolveCommunityPriceMilestone({
  snapshots,
  previousMilestoneId,
}: {
  snapshots: readonly CommunityPriceSnapshot[];
  previousMilestoneId: CommunityPriceMilestoneId;
}): CommunityPriceResolution {
  const previousIndex = getMilestoneIndex(previousMilestoneId);
  const normalizedPreviousIndex = previousIndex >= 0 ? previousIndex : 0;
  const previousMilestone = COMMUNITY_PRICE_MILESTONES[normalizedPreviousIndex];
  const confirmationWindow = buildConfirmationWindow(snapshots);

  if (confirmationWindow.length < COMMUNITY_PRICE_CONFIRMATION_DAYS) {
    return {
      previousMilestone,
      qualifyingMilestone: null,
      selectedMilestone: previousMilestone,
      confirmationWindow: Object.freeze(confirmationWindow),
      changed: false,
      reason: "insufficient_daily_snapshots",
    };
  }

  const minimumConfirmedCount = Math.min(
    ...confirmationWindow.map((snapshot) => snapshot.activePaidSubscriberCount),
  );
  const qualifyingMilestone = getCommunityPriceMilestoneForCount(minimumConfirmedCount);
  const qualifyingIndex = getMilestoneIndex(qualifyingMilestone.id);
  const selectedIndex = Math.max(normalizedPreviousIndex, qualifyingIndex);
  const selectedMilestone = COMMUNITY_PRICE_MILESTONES[selectedIndex];
  const changed = selectedIndex > normalizedPreviousIndex;

  return {
    previousMilestone,
    qualifyingMilestone,
    selectedMilestone,
    confirmationWindow: Object.freeze(confirmationWindow),
    changed,
    reason: changed
      ? "threshold_confirmed"
      : normalizedPreviousIndex > qualifyingIndex
        ? "permanent_ratchet_retained"
        : "milestone_unchanged",
  };
}
