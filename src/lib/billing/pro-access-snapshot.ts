import { getStripeBillingConfigSnapshot, type LifetimeProPriceMode } from "@/lib/billing/stripe-config";
import type { BillingPurchaseRow, UserEntitlementRow } from "@/types/db";

export type ProAccessSnapshot = {
  schemaReady: boolean;
  accessState: "free" | "lifetime_pro";
  accessLabel: string;
  offerMode: LifetimeProPriceMode | null;
  offerLabel: string;
  checkoutConfigured: boolean;
  grantedAt: string | null;
  lastPurchaseStatus: BillingPurchaseRow["status"] | null;
  supportNote: string;
};

export function isMissingBillingSchemaError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  if (!message) {
    return false;
  }

  return (
    (message.includes("billing_customers") || message.includes("billing_purchases") || message.includes("user_entitlements"))
    && (message.includes("does not exist") || message.includes("schema cache"))
  );
}

export function getProAccessOfferLabel(offerMode: LifetimeProPriceMode | null) {
  return offerMode === "founding"
    ? "Founding offer"
    : offerMode === "standard"
      ? "Standard offer"
      : "Offer not configured";
}

export function buildFallbackProAccessSnapshot(
  reason: "schema" | "setup",
  billingConfig = getStripeBillingConfigSnapshot(),
): ProAccessSnapshot {
  const offerLabel = getProAccessOfferLabel(billingConfig.activePriceMode);

  return {
    schemaReady: reason !== "schema",
    accessState: "free",
    accessLabel: "Free",
    offerMode: billingConfig.activePriceMode,
    offerLabel,
    checkoutConfigured: billingConfig.checkoutConfigured,
    grantedAt: null,
    lastPurchaseStatus: null,
    supportNote:
      reason === "schema"
        ? "Billing migrations have not been applied yet, so Pro access truth is still unavailable on this surface."
        : billingConfig.checkoutConfigured
          ? "Checkout configuration is present. The hosted purchase flow is the next implementation slice."
          : "Stripe configuration has not been added yet, so upgrade checkout is not ready on this surface.",
  };
}

export function buildResolvedProAccessSnapshot({
  billingConfig,
  entitlement,
  purchase,
}: {
  billingConfig: ReturnType<typeof getStripeBillingConfigSnapshot>;
  entitlement: UserEntitlementRow | null;
  purchase: BillingPurchaseRow | null;
}): ProAccessSnapshot {
  const accessState = entitlement?.status === "active" ? "lifetime_pro" : "free";

  return {
    schemaReady: true,
    accessState,
    accessLabel: accessState === "lifetime_pro" ? "Lifetime Pro" : "Free",
    offerMode: billingConfig.activePriceMode,
    offerLabel: getProAccessOfferLabel(billingConfig.activePriceMode),
    checkoutConfigured: billingConfig.checkoutConfigured,
    grantedAt: entitlement?.granted_at ?? null,
    lastPurchaseStatus: purchase?.status ?? null,
    supportNote:
      accessState === "lifetime_pro"
        ? "Your account already has active Lifetime Pro access."
        : billingConfig.checkoutConfigured
          ? "The hosted checkout lane is the next implementation slice for this surface."
          : "Upgrade checkout is not configured yet, so this section is currently read-only.",
  };
}
