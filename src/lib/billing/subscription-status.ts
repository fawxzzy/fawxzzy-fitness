import type Stripe from "stripe";
import type { BillingPurchaseRow } from "@/types/db";

function hasFuturePeriodEnd(currentPeriodEndIso: string | null, referenceNow = new Date()) {
  if (!currentPeriodEndIso) {
    return false;
  }

  const currentPeriodEnd = new Date(currentPeriodEndIso);
  if (Number.isNaN(currentPeriodEnd.valueOf())) {
    return false;
  }

  return currentPeriodEnd.valueOf() > referenceNow.valueOf();
}

export function mapSubscriptionStatusToPurchaseStatus(
  status: Stripe.Subscription.Status,
  currentPeriodEndIso: string | null,
  referenceNow = new Date(),
): BillingPurchaseRow["status"] {
  const stillActive = hasFuturePeriodEnd(currentPeriodEndIso, referenceNow);

  switch (status) {
    case "active":
    case "trialing":
      return "completed";
    case "past_due":
    case "paused":
    case "incomplete":
      return "pending";
    case "canceled":
      return stillActive ? "completed" : "cancelled";
    case "unpaid":
    case "incomplete_expired":
      return "failed";
    default:
      return "pending";
  }
}

export function shouldKeepProEntitlement(
  status: Stripe.Subscription.Status,
  currentPeriodEndIso: string | null,
  referenceNow = new Date(),
) {
  const hasFutureWindow = hasFuturePeriodEnd(currentPeriodEndIso, referenceNow);

  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "paused":
      return hasFutureWindow;
    case "canceled":
      return hasFutureWindow;
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    default:
      return false;
  }
}
