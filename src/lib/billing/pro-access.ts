import "server-only";

import { getStripeBillingConfigSnapshot } from "@/lib/billing/stripe-config";
import {
  buildFallbackProAccessSnapshot,
  buildResolvedProAccessSnapshot,
  isMissingBillingSchemaError,
  type ProAccessSnapshot,
} from "@/lib/billing/pro-access-snapshot";
import { supabaseServer } from "@/lib/supabase/server";
import type { BillingCustomerRow, BillingPurchaseRow, UserEntitlementRow } from "@/types/db";

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

function resolveBestEntitlement(entitlements: UserEntitlementRow[]) {
  const activeSubscription = entitlements.find((entry) => entry.entitlement_key === "pro" && isEntitlementActive(entry));
  if (activeSubscription) {
    return activeSubscription;
  }

  const activeLifetime = entitlements.find((entry) => entry.entitlement_key === "pro_lifetime" && isEntitlementActive(entry));
  if (activeLifetime) {
    return activeLifetime;
  }

  return entitlements[0] ?? null;
}

export async function loadProAccessSnapshot(userId: string): Promise<ProAccessSnapshot> {
  const billingConfig = getStripeBillingConfigSnapshot();
  const supabase = supabaseServer();

  const entitlementResponse = await supabase
    .from("user_entitlements")
    .select("id, user_id, entitlement_key, status, granted_at, expires_at, granted_via_purchase_id, source_subscription_id, created_at, updated_at")
    .eq("user_id", userId)
    .in("entitlement_key", ["pro", "pro_lifetime"])
    .order("granted_at", { ascending: false });

  if (entitlementResponse.error) {
    if (isMissingBillingSchemaError(entitlementResponse.error)) {
      return buildFallbackProAccessSnapshot("schema", billingConfig);
    }

    return {
      ...buildFallbackProAccessSnapshot("setup", billingConfig),
      supportNote: "Pro access status could not be loaded right now.",
    };
  }

  const purchaseKinds: BillingPurchaseRow["purchase_kind"][] = ["pro_subscription", "lifetime_pro"];
  const purchaseResponse = await supabase
    .from("billing_purchases")
    .select("id, user_id, purchase_kind, status, stripe_checkout_session_id, stripe_payment_intent_id, stripe_customer_id, stripe_price_id, stripe_subscription_id, stripe_invoice_id, amount_total, currency, billing_interval, billing_interval_count, period_start, period_end, completed_at, raw_event_id, created_at, updated_at")
    .eq("user_id", userId)
    .in("purchase_kind", purchaseKinds)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<BillingPurchaseRow>();

  if (purchaseResponse.error) {
    if (isMissingBillingSchemaError(purchaseResponse.error)) {
      return buildFallbackProAccessSnapshot("schema", billingConfig);
    }

    return {
      ...buildFallbackProAccessSnapshot("setup", billingConfig),
      supportNote: "Purchase history could not be loaded right now.",
    };
  }

  const customerResponse = await supabase
    .from("billing_customers")
    .select("id, user_id, stripe_customer_id, billing_email, latest_stripe_subscription_id, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle<BillingCustomerRow>();

  if (customerResponse.error) {
    if (isMissingBillingSchemaError(customerResponse.error)) {
      return buildFallbackProAccessSnapshot("schema", billingConfig);
    }

    return {
      ...buildFallbackProAccessSnapshot("setup", billingConfig),
      supportNote: "Billing customer state could not be loaded right now.",
    };
  }

  return buildResolvedProAccessSnapshot({
    billingConfig,
    entitlement: resolveBestEntitlement((entitlementResponse.data ?? []) as UserEntitlementRow[]),
    purchase: purchaseResponse.data,
    customerPortalAvailable: Boolean(customerResponse.data?.stripe_customer_id),
  });
}
