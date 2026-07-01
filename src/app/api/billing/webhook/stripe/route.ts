import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { STRIPE_WEBHOOK_SECRET_OPTIONAL } from "@/lib/env";
import { getStripeServerClient } from "@/lib/billing/stripe-server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

function getCustomerId(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null && "id" in value && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }

  return null;
}

function getPaymentIntentId(value: string | Stripe.PaymentIntent | null | undefined) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return typeof value.id === "string" ? value.id : null;
}

function getUserIdFromCheckoutSession(session: Stripe.Checkout.Session) {
  const metadataUserId = session.metadata?.fitness_user_id?.trim();
  if (metadataUserId) {
    return metadataUserId;
  }

  const clientReferenceId = typeof session.client_reference_id === "string"
    ? session.client_reference_id.trim()
    : "";
  return clientReferenceId || null;
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const webhookSecret = STRIPE_WEBHOOK_SECRET_OPTIONAL();

  if (!webhookSecret) {
    return buildJsonResponse({
      ok: false,
      code: "BILLING_WEBHOOK_NOT_CONFIGURED",
      error: "Stripe webhook handling is not configured yet.",
      requestId,
    }, { status: 503 });
  }

  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return buildJsonResponse({
        ok: false,
        code: "BILLING_WEBHOOK_SIGNATURE_MISSING",
        error: "Missing Stripe signature header.",
        requestId,
      }, { status: 400 });
    }

    const rawBody = await request.text();
    const stripe = getStripeServerClient();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    const admin = supabaseAdmin() as any;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = getUserIdFromCheckoutSession(session);
      const stripeCustomerId = getCustomerId(session.customer);

      if (!userId || !stripeCustomerId) {
        return buildJsonResponse({
          ok: false,
          code: "BILLING_WEBHOOK_MISSING_METADATA",
          error: "Stripe checkout session is missing Fitness user metadata.",
          requestId,
        }, { status: 400 });
      }

      const paymentIntentId = getPaymentIntentId(session.payment_intent);
      const completedAt = new Date(event.created * 1000).toISOString();

      const { data: purchaseRow, error: purchaseError } = await admin
        .from("billing_purchases")
        .upsert({
          user_id: userId,
          purchase_kind: "lifetime_pro",
          status: "completed",
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
          stripe_customer_id: stripeCustomerId,
          stripe_price_id:
            typeof session.metadata?.stripe_price_id === "string" && session.metadata.stripe_price_id.trim().length > 0
              ? session.metadata.stripe_price_id.trim()
              : null,
          amount_total: session.amount_total ?? null,
          currency: session.currency ?? null,
          completed_at: completedAt,
          raw_event_id: event.id,
        }, {
          onConflict: "stripe_checkout_session_id",
        })
        .select("id")
        .single();

      if (purchaseError) {
        throw new Error(`Could not upsert completed purchase receipt: ${purchaseError.message}`);
      }

      const { error: customerUpsertError } = await admin
        .from("billing_customers")
        .upsert({
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          billing_email: session.customer_details?.email ?? null,
        }, {
          onConflict: "user_id",
        });

      if (customerUpsertError) {
        throw new Error(`Could not upsert Stripe customer mapping: ${customerUpsertError.message}`);
      }

      const { error: entitlementError } = await admin
        .from("user_entitlements")
        .upsert({
          user_id: userId,
          entitlement_key: "pro_lifetime",
          status: "active",
          granted_at: completedAt,
          granted_via_purchase_id: purchaseRow?.id ?? null,
        }, {
          onConflict: "user_id,entitlement_key",
        });

      if (entitlementError) {
        throw new Error(`Could not upsert Lifetime Pro entitlement: ${entitlementError.message}`);
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { error } = await admin
        .from("billing_purchases")
        .update({
          status: "cancelled",
          raw_event_id: event.id,
        })
        .eq("stripe_checkout_session_id", session.id)
        .eq("status", "pending");

      if (error) {
        throw new Error(`Could not mark expired checkout session as cancelled: ${error.message}`);
      }
    }

    return buildJsonResponse({
      ok: true,
      received: true,
      requestId,
    });
  } catch (error) {
    console.error("[billing-webhook-stripe] failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return buildJsonResponse({
      ok: false,
      code: "BILLING_WEBHOOK_FAILED",
      error: "Unable to process the Stripe billing webhook.",
      requestId,
    }, { status: 400 });
  }
}
