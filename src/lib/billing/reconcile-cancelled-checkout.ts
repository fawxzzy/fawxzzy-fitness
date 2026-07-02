import "server-only";

import type Stripe from "stripe";
import { getStripeServerClient } from "@/lib/billing/stripe-server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { BillingPurchaseRow } from "@/types/db";

type BillingAdminClient = ReturnType<typeof supabaseAdmin>;
type StripeServerClient = ReturnType<typeof getStripeServerClient>;

type ReconcileCancelledCheckoutDeps = {
  admin: BillingAdminClient;
  stripe: StripeServerClient;
};

export type ReconcileCancelledCheckoutResult =
  | { ok: true; status: "noop" | "cancelled" | "completed"; purchaseId: string | null }
  | { ok: false; status: "error"; purchaseId: string | null; message: string };

async function markPurchaseCancelled(admin: BillingAdminClient, purchaseId: string) {
  const billingPurchasesTable = admin.from("billing_purchases") as any;
  const { error } = await billingPurchasesTable
    .update({
      status: "cancelled",
    })
    .eq("id", purchaseId)
    .eq("status", "pending");

  if (error) {
    throw new Error(`Could not mark cancelled checkout receipt: ${error.message}`);
  }
}

async function loadLatestPendingSubscriptionPurchase(admin: BillingAdminClient, userId: string) {
  const billingPurchasesTable = admin.from("billing_purchases") as any;
  const { data, error } = await billingPurchasesTable
    .select("id, user_id, purchase_kind, status, stripe_checkout_session_id, created_at, updated_at")
    .eq("user_id", userId)
    .eq("purchase_kind", "pro_subscription")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load pending checkout receipt: ${error.message}`);
  }

  return (data ?? null) as BillingPurchaseRow | null;
}

function getCheckoutSessionStatus(checkoutSession: Stripe.Checkout.Session) {
  return typeof checkoutSession.status === "string" ? checkoutSession.status : null;
}

export async function reconcileCancelledProCheckoutWithDeps(
  userId: string,
  deps: ReconcileCancelledCheckoutDeps,
): Promise<ReconcileCancelledCheckoutResult> {
  try {
    const pendingPurchase = await loadLatestPendingSubscriptionPurchase(deps.admin, userId);

    if (!pendingPurchase) {
      return {
        ok: true,
        status: "noop",
        purchaseId: null,
      };
    }

    const checkoutSessionId = pendingPurchase.stripe_checkout_session_id?.trim() ?? "";
    if (!checkoutSessionId) {
      await markPurchaseCancelled(deps.admin, pendingPurchase.id);
      return {
        ok: true,
        status: "cancelled",
        purchaseId: pendingPurchase.id,
      };
    }

    const checkoutSession = await deps.stripe.checkout.sessions.retrieve(checkoutSessionId);
    const checkoutStatus = getCheckoutSessionStatus(checkoutSession);

    if (checkoutStatus === "complete" || checkoutSession.payment_status === "paid") {
      return {
        ok: true,
        status: "completed",
        purchaseId: pendingPurchase.id,
      };
    }

    if (checkoutStatus === "open") {
      await deps.stripe.checkout.sessions.expire(checkoutSessionId);
    }

    await markPurchaseCancelled(deps.admin, pendingPurchase.id);
    return {
      ok: true,
      status: "cancelled",
      purchaseId: pendingPurchase.id,
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      purchaseId: null,
      message: error instanceof Error ? error.message : "Unknown checkout cancel reconciliation failure",
    };
  }
}

export async function reconcileCancelledProCheckout(userId: string) {
  return reconcileCancelledProCheckoutWithDeps(userId, {
    admin: supabaseAdmin(),
    stripe: getStripeServerClient(),
  });
}
