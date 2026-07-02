import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getStripeServerClient } from "@/lib/billing/stripe-server";
import { getRequestOrigin } from "@/lib/request-origin";
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

function isMissingBillingSchemaError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    (message.includes("billing_customers") || message.includes("billing_purchases") || message.includes("user_entitlements"))
    && (message.includes("does not exist") || message.includes("schema cache"))
  );
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const user = await requireUser({
    route: "/api/billing/portal",
    gate: "billing.portal.start",
    blockingReason: "Waiting for an authenticated user before opening billing management.",
  });

  try {
    const admin = supabaseAdmin() as any;
    const customerResult = await admin
      .from("billing_customers")
      .select("stripe_customer_id")
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

    const stripeCustomerId = typeof customerResult.data?.stripe_customer_id === "string"
      ? customerResult.data.stripe_customer_id
      : null;

    if (!stripeCustomerId) {
      return buildJsonResponse({
        ok: false,
        code: "BILLING_PORTAL_NOT_READY",
        error: "No Stripe billing customer exists for this account yet.",
        requestId,
      }, { status: 409 });
    }

    const stripe = getStripeServerClient();
    const origin = getRequestOrigin(request);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/settings?section=pro`,
    });

    if (!portalSession.url) {
      throw new Error("Stripe billing portal session returned without a redirect URL.");
    }

    return buildJsonResponse({
      ok: true,
      url: portalSession.url,
      requestId,
    });
  } catch (error) {
    console.error("[billing-portal] failed", {
      requestId,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return buildJsonResponse({
      ok: false,
      code: "BILLING_PORTAL_CREATE_FAILED",
      error: "Unable to open billing management right now.",
      requestId,
    }, { status: 500 });
  }
}
