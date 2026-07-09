import { getStripeBillingConfigSnapshot, type ProPriceMode } from "@/lib/billing/stripe-config";
import type { BillingPurchaseRow, UserEntitlementRow } from "@/types/db";

export type ProAccessSource = "subscription" | "lifetime" | null;

export type ProAccessSnapshot = {
  schemaReady: boolean;
  accessState: "free" | "pro";
  accessLabel: string;
  accessSource: ProAccessSource;
  offerMode: ProPriceMode | null;
  offerLabel: string;
  checkoutConfigured: boolean;
  customerPortalAvailable: boolean;
  grantedAt: string | null;
  renewsAt: string | null;
  cancellationScheduledFor: string | null;
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

export function getProAccessOfferLabel(offerMode: ProPriceMode | null) {
  return offerMode === "founding" || offerMode === "standard" ? "Monthly Pro" : "Plan not configured";
}

function isEntitlementActive(entitlement: UserEntitlementRow | null, referenceNow = new Date()) {
  if (!entitlement || entitlement.status !== "active") {
    return false;
  }

  if (!entitlement.expires_at) {
    return true;
  }

  const expiresAt = new Date(entitlement.expires_at);
  if (Number.isNaN(expiresAt.valueOf())) {
    return false;
  }

  return expiresAt.valueOf() > referenceNow.valueOf();
}

function resolveAccessSource(entitlement: UserEntitlementRow | null): ProAccessSource {
  if (!entitlement) {
    return null;
  }

  return entitlement.entitlement_key === "pro_lifetime" ? "lifetime" : "subscription";
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
    accessSource: null,
    offerMode: billingConfig.activePriceMode,
    offerLabel,
  checkoutConfigured: billingConfig.checkoutConfigured,
    customerPortalAvailable: false,
    grantedAt: null,
    renewsAt: null,
    cancellationScheduledFor: null,
    lastPurchaseStatus: null,
    supportNote:
      reason === "schema"
        ? "Billing migrations have not been applied yet, so Pro access truth is still unavailable on this surface."
        : billingConfig.checkoutConfigured
          ? "Stripe monthly Pro checkout configuration is present and the hosted subscription flow is ready."
          : billingConfig.checkoutTechnicallyConfigured
            ? "Stripe monthly Pro checkout configuration is present, but paid launch is not enabled yet."
          : "Stripe configuration has not been added yet, so Pro checkout is not ready on this surface.",
  };
}

export function buildResolvedProAccessSnapshot({
  billingConfig,
  entitlement,
  purchase,
  customerPortalAvailable,
  cancellationScheduledFor,
}: {
  billingConfig: ReturnType<typeof getStripeBillingConfigSnapshot>;
  entitlement: UserEntitlementRow | null;
  purchase: BillingPurchaseRow | null;
  customerPortalAvailable: boolean;
  cancellationScheduledFor?: string | null;
}): ProAccessSnapshot {
  const accessIsActive = isEntitlementActive(entitlement);
  const accessState = accessIsActive ? "pro" : "free";
  const accessSource = accessIsActive ? resolveAccessSource(entitlement) : null;

  return {
    schemaReady: true,
    accessState,
    accessLabel: accessState === "pro" ? "Pro" : "Free",
    accessSource,
    offerMode: billingConfig.activePriceMode,
    offerLabel: getProAccessOfferLabel(billingConfig.activePriceMode),
    checkoutConfigured: billingConfig.checkoutConfigured,
    customerPortalAvailable,
    grantedAt: entitlement?.granted_at ?? null,
    renewsAt: accessSource === "subscription" ? (entitlement?.expires_at ?? null) : null,
    cancellationScheduledFor: accessSource === "subscription" ? (cancellationScheduledFor ?? null) : null,
    lastPurchaseStatus: purchase?.status ?? null,
    supportNote:
      accessState === "pro"
        ? accessSource === "subscription"
          ? cancellationScheduledFor
            ? "Your account keeps Pro access until the scheduled subscription end date."
            : "Your account has active Pro subscription access."
          : "Your account already has active Pro access."
        : billingConfig.checkoutConfigured
          ? "Monthly Pro checkout is ready on this surface."
          : billingConfig.checkoutTechnicallyConfigured
            ? "Monthly Pro checkout is configured, but paid launch is not enabled yet."
          : "Upgrade checkout is not configured yet, so this section is currently read-only.",
  };
}
