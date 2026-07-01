import "server-only";

import { getStripeBillingConfigSnapshot, type LifetimeProPriceMode } from "@/lib/billing/stripe-config";
import { supabaseServer } from "@/lib/supabase/server";
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

function isMissingBillingSchemaError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  if (!message) {
    return false;
  }

  return (
    (message.includes("billing_customers") || message.includes("billing_purchases") || message.includes("user_entitlements"))
    && (message.includes("does not exist") || message.includes("schema cache"))
  );
}

function buildFallbackSnapshot(reason: "schema" | "setup"): ProAccessSnapshot {
  const billingConfig = getStripeBillingConfigSnapshot();

  return {
    schemaReady: reason !== "schema",
    accessState: "free",
    accessLabel: "Free",
    offerMode: billingConfig.activePriceMode,
    offerLabel:
      billingConfig.activePriceMode === "founding"
        ? "Founding offer"
        : billingConfig.activePriceMode === "standard"
          ? "Standard offer"
          : "Offer not configured",
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

export async function loadProAccessSnapshot(userId: string): Promise<ProAccessSnapshot> {
  const billingConfig = getStripeBillingConfigSnapshot();
  const supabase = supabaseServer();

  const entitlementResponse = await supabase
    .from("user_entitlements")
    .select("id, user_id, entitlement_key, status, granted_at, granted_via_purchase_id, created_at, updated_at")
    .eq("user_id", userId)
    .eq("entitlement_key", "pro_lifetime")
    .maybeSingle<UserEntitlementRow>();

  if (entitlementResponse.error) {
    if (isMissingBillingSchemaError(entitlementResponse.error)) {
      return buildFallbackSnapshot("schema");
    }

    return {
      ...buildFallbackSnapshot("setup"),
      supportNote: "Pro access status could not be loaded right now.",
    };
  }

  const purchaseResponse = await supabase
    .from("billing_purchases")
    .select("id, user_id, purchase_kind, status, stripe_checkout_session_id, stripe_payment_intent_id, stripe_customer_id, stripe_price_id, amount_total, currency, completed_at, raw_event_id, created_at, updated_at")
    .eq("user_id", userId)
    .eq("purchase_kind", "lifetime_pro")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<BillingPurchaseRow>();

  if (purchaseResponse.error) {
    if (isMissingBillingSchemaError(purchaseResponse.error)) {
      return buildFallbackSnapshot("schema");
    }

    return {
      ...buildFallbackSnapshot("setup"),
      supportNote: "Purchase history could not be loaded right now.",
    };
  }

  const entitlement = entitlementResponse.data;
  const purchase = purchaseResponse.data;
  const accessState = entitlement?.status === "active" ? "lifetime_pro" : "free";

  return {
    schemaReady: true,
    accessState,
    accessLabel: accessState === "lifetime_pro" ? "Lifetime Pro" : "Free",
    offerMode: billingConfig.activePriceMode,
    offerLabel:
      billingConfig.activePriceMode === "founding"
        ? "Founding offer"
        : billingConfig.activePriceMode === "standard"
          ? "Standard offer"
          : "Offer not configured",
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
