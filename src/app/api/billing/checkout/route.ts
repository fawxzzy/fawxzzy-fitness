import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getStripeBillingConfigSnapshot } from "@/lib/billing/stripe-config";
import { getStripeServerClient } from "@/lib/billing/stripe-server";
import { getRequestOrigin } from "@/lib/request-origin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { BillingCustomerRow, UserEntitlementRow } from "@/types/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
};

function buildJsonResponse(body: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

function isMissingBillingSchemaError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    (message.includes("billing_customers") || message.includes("billing_purchases") || message.includes("user_entitlements"))
    && (message.includes("does not exist") || message.includes("schema cache"))
  );
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

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const user = await requireUser({
    route: "/api/billing/checkout",
    gate: "billing.checkout.start",
    blockingReason: "Waiting for an authenticated user before opening the Pro subscription checkout flow.",
  });

  const billingConfig = getStripeBillingConfigSnapshot();
  if (!billingConfig.checkoutConfigured || !billingConfig.activePriceId || !billingConfig.activePriceMode) {
    return buildJsonResponse({
      ok: false,
      code: "BILLING_CHECKOUT_NOT_CONFIGURED",
      error: "Monthly Pro checkout is not configured yet.",
      requestId,
    }, { status: 503 });
  }

  try {
    const admin = supabaseAdmin();
    const entitlementsTable = admin.from("user_entitlements") as any;
    const billingCustomersTable = admin.from("billing_customers") as any;
    const billingPurchasesTable = admin.from("billing_purchases") as any;

    const entitlementResult = await entitlementsTable
      .select("id, user_id, entitlement_key, status, granted_at, expires_at, granted_via_purchase_id, source_subscription_id, created_at, updated_at")
      .eq("user_id", user.id)
      .in("entitlement_key", ["pro", "pro_lifetime"])
      .order("granted_at", { ascending: false });

    if (entitlementResult.error) {
      if (isMissingBillingSchemaError(entitlementResult.error)) {
        return buildJsonResponse({
          ok: false,
          code: "BILLING_SCHEMA_NOT_READY",
          error: "Billing schema is not available yet.",
          requestId,
        }, { status: 503 });
      }

      throw new Error(`Could not load entitlement state: ${entitlementResult.error.message}`);
    }

    const entitlement = resolveBestEntitlement((entitlementResult.data ?? []) as UserEntitlementRow[]);

    if (isEntitlementActive(entitlement)) {
      return buildJsonResponse({
        ok: false,
        code: "BILLING_ALREADY_PRO",
        error: "This account already has active Pro access.",
        requestId,
      }, { status: 409 });
    }

    const customerResult = await billingCustomersTable
      .select("id, user_id, stripe_customer_id, billing_email, latest_stripe_subscription_id, created_at, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerResult.error) {
      if (isMissingBillingSchemaError(customerResult.error)) {
        return buildJsonResponse({
          ok: false,
          code: "BILLING_SCHEMA_NOT_READY",
          error: "Billing schema is not available yet.",
          requestId,
        }, { status: 503 });
      }

      throw new Error(`Could not load billing customer mapping: ${customerResult.error.message}`);
    }

    const stripe = getStripeServerClient();
    const billingCustomer = customerResult.data as BillingCustomerRow | null;
    let stripeCustomerId = billingCustomer?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          fitness_user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      const { error: upsertCustomerError } = await billingCustomersTable
        .upsert({
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          billing_email: user.email ?? null,
        }, {
          onConflict: "user_id",
        });

      if (upsertCustomerError) {
        throw new Error(`Could not store Stripe customer mapping: ${upsertCustomerError.message}`);
      }
    }

    const origin = getRequestOrigin(request);
    const successUrl = `${origin}/settings?section=pro&billing=success`;
    const cancelUrl = `${origin}/settings?section=pro&billing=cancel`;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      client_reference_id: user.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [{
        price: billingConfig.activePriceId,
        quantity: 1,
      }],
      subscription_data: {
        metadata: {
          fitness_user_id: user.id,
          purchase_kind: "pro_subscription",
          price_mode: billingConfig.activePriceMode,
          stripe_price_id: billingConfig.activePriceId,
        },
      },
      metadata: {
        fitness_user_id: user.id,
        purchase_kind: "pro_subscription",
        price_mode: billingConfig.activePriceMode,
        stripe_price_id: billingConfig.activePriceId,
      },
    });

    if (!checkoutSession.url) {
      throw new Error("Stripe checkout session returned without a redirect URL.");
    }

    const { error: insertPurchaseError } = await billingPurchasesTable
      .insert({
        user_id: user.id,
        purchase_kind: "pro_subscription",
        status: "pending",
        stripe_checkout_session_id: checkoutSession.id,
        stripe_customer_id: stripeCustomerId,
        stripe_price_id: billingConfig.activePriceId,
        stripe_subscription_id: typeof checkoutSession.subscription === "string" ? checkoutSession.subscription : null,
        amount_total: checkoutSession.amount_total ?? null,
        currency: checkoutSession.currency ?? null,
        billing_interval: billingConfig.recurringInterval,
        billing_interval_count: 1,
      });

    if (insertPurchaseError) {
      if (isMissingBillingSchemaError(insertPurchaseError)) {
        return buildJsonResponse({
          ok: false,
          code: "BILLING_SCHEMA_NOT_READY",
          error: "Billing schema is not available yet.",
          requestId,
        }, { status: 503 });
      }

      throw new Error(`Could not store pending purchase receipt: ${insertPurchaseError.message}`);
    }

    return buildJsonResponse({
      ok: true,
      url: checkoutSession.url,
      requestId,
    });
  } catch (error) {
    console.error("[billing-checkout] failed", {
      requestId,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return buildJsonResponse({
      ok: false,
      code: "BILLING_CHECKOUT_CREATE_FAILED",
      error: "Unable to start the Monthly Pro checkout right now.",
      requestId,
    }, { status: 500 });
  }
}
