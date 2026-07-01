import "server-only";

import { getStripeBillingConfigSnapshot } from "@/lib/billing/stripe-config";
import {
  buildFallbackProAccessSnapshot,
  buildResolvedProAccessSnapshot,
  isMissingBillingSchemaError,
  type ProAccessSnapshot,
} from "@/lib/billing/pro-access-snapshot";
import { supabaseServer } from "@/lib/supabase/server";
import type { BillingPurchaseRow, UserEntitlementRow } from "@/types/db";

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
      return buildFallbackProAccessSnapshot("schema", billingConfig);
    }

    return {
      ...buildFallbackProAccessSnapshot("setup", billingConfig),
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
      return buildFallbackProAccessSnapshot("schema", billingConfig);
    }

    return {
      ...buildFallbackProAccessSnapshot("setup", billingConfig),
      supportNote: "Purchase history could not be loaded right now.",
    };
  }

  return buildResolvedProAccessSnapshot({
    billingConfig,
    entitlement: entitlementResponse.data,
    purchase: purchaseResponse.data,
  });
}
