import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { STRIPE_WEBHOOK_SECRET_OPTIONAL } from "@/lib/env";
import { getStripeServerClient } from "@/lib/billing/stripe-server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { BillingPurchaseRow } from "@/types/db";

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

function toIsoFromUnixSeconds(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) {
    return null;
  }

  return new Date(value * 1000).toISOString();
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

function getSubscriptionId(value: string | Stripe.Subscription | null | undefined) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return typeof value.id === "string" ? value.id : null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const directSubscriptionId = getSubscriptionId(
    (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription,
  );
  if (directSubscriptionId) {
    return directSubscriptionId;
  }

  const parentSubscriptionValue = (invoice as Stripe.Invoice & {
    parent?: {
      subscription_details?: {
        subscription?: string | Stripe.Subscription | null;
      } | null;
    } | null;
  }).parent?.subscription_details?.subscription;

  return getSubscriptionId(parentSubscriptionValue);
}

function getPriceObject(value: string | Stripe.Price | null | undefined) {
  if (!value || typeof value === "string") {
    return null;
  }

  return value;
}

function getInvoiceLinePriceId(line: Stripe.InvoiceLineItem | null | undefined) {
  const pricingPrice = (line as Stripe.InvoiceLineItem & {
    pricing?: {
      price_details?: {
        price?: string | Stripe.Price | null;
      } | null;
    } | null;
    price?: string | Stripe.Price | null;
  })?.pricing?.price_details?.price;

  if (typeof pricingPrice === "string" && pricingPrice.trim().length > 0) {
    return pricingPrice.trim();
  }

  const linePriceId = typeof (line as Stripe.InvoiceLineItem & { price?: { id?: unknown } | string | null })?.price === "object"
    && (line as Stripe.InvoiceLineItem & { price?: { id?: unknown } | string | null }).price !== null
    && typeof ((line as Stripe.InvoiceLineItem & { price?: { id?: unknown } | string | null }).price as { id?: unknown }).id === "string"
      ? (((line as Stripe.InvoiceLineItem & { price?: { id?: unknown } | string | null }).price as { id: string }).id)
      : null;

  return linePriceId;
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

function mapSubscriptionStatusToPurchaseStatus(
  status: Stripe.Subscription.Status,
  currentPeriodEndIso: string | null,
): BillingPurchaseRow["status"] {
  const stillActive = currentPeriodEndIso ? new Date(currentPeriodEndIso).valueOf() > Date.now() : false;

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

function shouldKeepProEntitlement(
  status: Stripe.Subscription.Status,
  currentPeriodEndIso: string | null,
) {
  const currentPeriodEnd = currentPeriodEndIso ? new Date(currentPeriodEndIso) : null;
  const hasFutureWindow = currentPeriodEnd ? currentPeriodEnd.valueOf() > Date.now() : false;

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

function getRecurringDetailsFromPrice(price: Stripe.Price | null | undefined) {
  return {
    billing_interval:
      price?.recurring?.interval === "month" || price?.recurring?.interval === "year"
        ? price.recurring.interval
        : null,
    billing_interval_count:
      typeof price?.recurring?.interval_count === "number"
        ? price.recurring.interval_count
        : null,
  };
}

async function findPurchaseByField(admin: any, field: string, value: string | null) {
  if (!value) {
    return null;
  }

  const result = await admin
    .from("billing_purchases")
    .select("id")
    .eq(field, value)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw new Error(`Could not load billing purchase by ${field}: ${result.error.message}`);
  }

  return result.data?.id ?? null;
}

async function resolveUserIdFromStripeCustomer(admin: any, stripeCustomerId: string | null) {
  if (!stripeCustomerId) {
    return null;
  }

  const customerResult = await admin
    .from("billing_customers")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (customerResult.error) {
    throw new Error(`Could not resolve Stripe customer mapping: ${customerResult.error.message}`);
  }

  return typeof customerResult.data?.user_id === "string" ? customerResult.data.user_id : null;
}

async function syncBillingCustomer(args: {
  admin: any;
  billingEmail: string | null;
  stripeCustomerId: string;
  subscriptionId?: string | null;
  userId: string;
}) {
  const {
    admin,
    billingEmail,
    stripeCustomerId,
    subscriptionId = null,
    userId,
  } = args;

  const { error } = await admin
    .from("billing_customers")
    .upsert({
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      billing_email: billingEmail,
      latest_stripe_subscription_id: subscriptionId,
    }, {
      onConflict: "user_id",
    });

  if (error) {
    throw new Error(`Could not upsert Stripe customer mapping: ${error.message}`);
  }
}

async function upsertCompletedLifetimePurchase(args: {
  admin: any;
  completedAt: string;
  eventId: string;
  paymentIntentId: string | null;
  session: Stripe.Checkout.Session;
  stripeCustomerId: string;
  userId: string;
}) {
  const {
    admin,
    completedAt,
    eventId,
    paymentIntentId,
    session,
    stripeCustomerId,
    userId,
  } = args;

  const basePayload = {
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
    raw_event_id: eventId,
  };

  const existingPurchaseId = await findPurchaseByField(admin, "stripe_checkout_session_id", session.id);
  if (existingPurchaseId) {
    const { data, error } = await admin
      .from("billing_purchases")
      .update(basePayload)
      .eq("id", existingPurchaseId)
      .select("id")
      .single();

    if (error) {
      throw new Error(`Could not update completed purchase receipt: ${error.message}`);
    }

    return data;
  }

  const { data, error } = await admin
    .from("billing_purchases")
    .insert(basePayload)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not insert completed purchase receipt: ${error.message}`);
  }

  return data;
}

async function upsertSubscriptionPurchase(args: {
  admin: any;
  amountTotal?: number | null;
  billingInterval?: "month" | "year" | null;
  billingIntervalCount?: number | null;
  completedAt?: string | null;
  currency?: string | null;
  eventId: string;
  invoiceId?: string | null;
  periodEnd?: string | null;
  periodStart?: string | null;
  priceId?: string | null;
  purchaseStatus: BillingPurchaseRow["status"];
  sessionId?: string | null;
  stripeCustomerId: string;
  stripePaymentIntentId?: string | null;
  subscriptionId: string;
  userId: string;
}) {
  const {
    admin,
    amountTotal = null,
    billingInterval = null,
    billingIntervalCount = null,
    completedAt = null,
    currency = null,
    eventId,
    invoiceId = null,
    periodEnd = null,
    periodStart = null,
    priceId = null,
    purchaseStatus,
    sessionId = null,
    stripeCustomerId,
    stripePaymentIntentId = null,
    subscriptionId,
    userId,
  } = args;

  const basePayload = {
    user_id: userId,
    purchase_kind: "pro_subscription",
    status: purchaseStatus,
    stripe_checkout_session_id: sessionId,
    stripe_payment_intent_id: stripePaymentIntentId,
    stripe_customer_id: stripeCustomerId,
    stripe_price_id: priceId,
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoiceId,
    amount_total: amountTotal,
    currency,
    billing_interval: billingInterval,
    billing_interval_count: billingIntervalCount,
    period_start: periodStart,
    period_end: periodEnd,
    completed_at: completedAt,
    raw_event_id: eventId,
  };

  const existingPurchaseId =
    await findPurchaseByField(admin, "stripe_subscription_id", subscriptionId)
    ?? await findPurchaseByField(admin, "stripe_checkout_session_id", sessionId)
    ?? await findPurchaseByField(admin, "stripe_invoice_id", invoiceId);

  if (existingPurchaseId) {
    const existingPurchaseResult = await admin
      .from("billing_purchases")
      .select(`
        stripe_checkout_session_id,
        stripe_payment_intent_id,
        stripe_customer_id,
        stripe_price_id,
        stripe_subscription_id,
        stripe_invoice_id,
        amount_total,
        currency,
        billing_interval,
        billing_interval_count,
        period_start,
        period_end,
        completed_at
      `)
      .eq("id", existingPurchaseId)
      .single();

    if (existingPurchaseResult.error) {
      throw new Error(`Could not load existing subscription purchase receipt: ${existingPurchaseResult.error.message}`);
    }

    const existingPurchase = existingPurchaseResult.data ?? {};
    const mergedPayload = {
      ...basePayload,
      stripe_checkout_session_id: sessionId ?? existingPurchase.stripe_checkout_session_id ?? null,
      stripe_payment_intent_id: stripePaymentIntentId ?? existingPurchase.stripe_payment_intent_id ?? null,
      stripe_customer_id: stripeCustomerId ?? existingPurchase.stripe_customer_id ?? null,
      stripe_price_id: priceId ?? existingPurchase.stripe_price_id ?? null,
      stripe_subscription_id: subscriptionId ?? existingPurchase.stripe_subscription_id ?? null,
      stripe_invoice_id: invoiceId ?? existingPurchase.stripe_invoice_id ?? null,
      amount_total: amountTotal ?? existingPurchase.amount_total ?? null,
      currency: currency ?? existingPurchase.currency ?? null,
      billing_interval: billingInterval ?? existingPurchase.billing_interval ?? null,
      billing_interval_count: billingIntervalCount ?? existingPurchase.billing_interval_count ?? null,
      period_start: periodStart ?? existingPurchase.period_start ?? null,
      period_end: periodEnd ?? existingPurchase.period_end ?? null,
      completed_at: completedAt ?? existingPurchase.completed_at ?? null,
    };

    const { data, error } = await admin
      .from("billing_purchases")
      .update(mergedPayload)
      .eq("id", existingPurchaseId)
      .select("id")
      .single();

    if (error) {
      throw new Error(`Could not update subscription purchase receipt: ${error.message}`);
    }

    return data;
  }

  const { data, error } = await admin
    .from("billing_purchases")
    .insert(basePayload)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not insert subscription purchase receipt: ${error.message}`);
  }

  return data;
}

async function upsertProEntitlement(args: {
  admin: any;
  active: boolean;
  expiresAt: string | null;
  grantedAt: string;
  purchaseId: string | null;
  subscriptionId: string;
  userId: string;
}) {
  const {
    admin,
    active,
    expiresAt,
    grantedAt,
    purchaseId,
    subscriptionId,
    userId,
  } = args;

  const { error } = await admin
    .from("user_entitlements")
    .upsert({
      user_id: userId,
      entitlement_key: "pro",
      status: active ? "active" : "revoked",
      granted_at: grantedAt,
      expires_at: expiresAt,
      granted_via_purchase_id: purchaseId,
      source_subscription_id: subscriptionId,
    }, {
      onConflict: "user_id,entitlement_key",
    });

  if (error) {
    throw new Error(`Could not upsert Pro entitlement: ${error.message}`);
  }
}

async function syncSubscriptionState(args: {
  admin: any;
  eventId: string;
  stripeCustomerId: string;
  subscription: Stripe.Subscription;
  userId: string;
}) {
  const {
    admin,
    eventId,
    stripeCustomerId,
    subscription,
    userId,
  } = args;

  const firstItem = subscription.items.data[0];
  const price = getPriceObject(firstItem?.price ?? null);
  const billing = getRecurringDetailsFromPrice(price);
  const periodStart = toIsoFromUnixSeconds(firstItem?.current_period_start);
  const periodEnd = toIsoFromUnixSeconds(firstItem?.current_period_end);
  const purchaseStatus = mapSubscriptionStatusToPurchaseStatus(subscription.status, periodEnd);
  const purchase = await upsertSubscriptionPurchase({
    admin,
    billingInterval: billing.billing_interval,
    billingIntervalCount: billing.billing_interval_count,
    completedAt: purchaseStatus === "completed" ? new Date().toISOString() : null,
    eventId,
    periodEnd,
    periodStart,
    priceId: price?.id ?? null,
    purchaseStatus,
    stripeCustomerId,
    subscriptionId: subscription.id,
    userId,
  });

  await syncBillingCustomer({
    admin,
    billingEmail: null,
    stripeCustomerId,
    subscriptionId: subscription.id,
    userId,
  });

  await upsertProEntitlement({
    admin,
    active: shouldKeepProEntitlement(subscription.status, periodEnd),
    expiresAt: periodEnd,
    grantedAt: toIsoFromUnixSeconds(subscription.created) ?? new Date().toISOString(),
    purchaseId: typeof purchase?.id === "string" ? purchase.id : null,
    subscriptionId: subscription.id,
    userId,
  });
}

async function handleSubscriptionCheckoutCompleted(args: {
  admin: any;
  event: Stripe.Event;
  session: Stripe.Checkout.Session;
  stripeCustomerId: string;
  userId: string;
}) {
  const {
    admin,
    event,
    session,
    stripeCustomerId,
    userId,
  } = args;

  const subscriptionId = getSubscriptionId(session.subscription);
  if (!subscriptionId) {
    throw new Error("Subscription checkout completed without a Stripe subscription id.");
  }

  const stripe = getStripeServerClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  await syncBillingCustomer({
    admin,
    billingEmail: session.customer_details?.email ?? null,
    stripeCustomerId,
    subscriptionId: subscription.id,
    userId,
  });

  const firstItem = subscription.items.data[0];
  const price = getPriceObject(firstItem?.price ?? null);
  const billing = getRecurringDetailsFromPrice(price);
  const periodStart = toIsoFromUnixSeconds(firstItem?.current_period_start);
  const periodEnd = toIsoFromUnixSeconds(firstItem?.current_period_end);
  const purchaseStatus = mapSubscriptionStatusToPurchaseStatus(subscription.status, periodEnd);
  const purchase = await upsertSubscriptionPurchase({
    admin,
    amountTotal: session.amount_total ?? null,
    billingInterval: billing.billing_interval,
    billingIntervalCount: billing.billing_interval_count,
    completedAt: purchaseStatus === "completed" ? new Date(event.created * 1000).toISOString() : null,
    currency: session.currency ?? null,
    eventId: event.id,
    periodEnd,
    periodStart,
    priceId: price?.id ?? (typeof session.metadata?.stripe_price_id === "string" ? session.metadata.stripe_price_id : null),
    purchaseStatus,
    sessionId: session.id,
    stripeCustomerId,
    stripePaymentIntentId: getPaymentIntentId(session.payment_intent),
    subscriptionId,
    userId,
  });

  await upsertProEntitlement({
    admin,
    active: shouldKeepProEntitlement(subscription.status, periodEnd),
    expiresAt: periodEnd,
    grantedAt: toIsoFromUnixSeconds(subscription.created) ?? new Date(event.created * 1000).toISOString(),
    purchaseId: typeof purchase?.id === "string" ? purchase.id : null,
    subscriptionId,
    userId,
  });
}

async function handleInvoicePaid(args: {
  admin: any;
  event: Stripe.Event;
  invoice: Stripe.Invoice;
}) {
  const {
    admin,
    event,
    invoice,
  } = args;

  const stripeCustomerId = getCustomerId(invoice.customer);
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!stripeCustomerId || !subscriptionId) {
    throw new Error("Invoice paid event is missing Stripe customer or subscription id.");
  }

  const stripe = getStripeServerClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
  const metadataUserId = subscription.metadata?.fitness_user_id?.trim() || null;
  const userId = metadataUserId || await resolveUserIdFromStripeCustomer(admin, stripeCustomerId);
  if (!userId) {
    throw new Error("Could not resolve the Fitness user for the paid subscription invoice.");
  }

  const firstLine = invoice.lines.data[0];
  const linePrice = getPriceObject((firstLine as Stripe.InvoiceLineItem & {
    pricing?: {
      price_details?: {
        price?: string | Stripe.Price | null;
      } | null;
    } | null;
  })?.pricing?.price_details?.price ?? null);
  const subscriptionPrice = getPriceObject(subscription.items.data[0]?.price ?? null);
  const price = linePrice ?? subscriptionPrice;
  const metadataPriceId =
    typeof (invoice as Stripe.Invoice & {
      parent?: {
        subscription_details?: {
          metadata?: {
            stripe_price_id?: string | null;
          } | null;
        } | null;
      } | null;
    }).parent?.subscription_details?.metadata?.stripe_price_id === "string"
      ? (invoice as Stripe.Invoice & {
          parent?: {
            subscription_details?: {
              metadata?: {
                stripe_price_id?: string | null;
              } | null;
            } | null;
          } | null;
        }).parent?.subscription_details?.metadata?.stripe_price_id?.trim() || null
      : null;
  const billing = getRecurringDetailsFromPrice(price);
  const periodStart = toIsoFromUnixSeconds(firstLine?.period?.start ?? subscription.items.data[0]?.current_period_start);
  const periodEnd = toIsoFromUnixSeconds(firstLine?.period?.end ?? subscription.items.data[0]?.current_period_end);
  const purchase = await upsertSubscriptionPurchase({
    admin,
    amountTotal: invoice.amount_paid ?? invoice.amount_due ?? null,
    billingInterval: billing.billing_interval,
    billingIntervalCount: billing.billing_interval_count,
    completedAt: toIsoFromUnixSeconds(event.created),
    currency: invoice.currency ?? null,
    eventId: event.id,
    invoiceId: invoice.id,
    periodEnd,
    periodStart,
    priceId: getInvoiceLinePriceId(firstLine) ?? price?.id ?? metadataPriceId,
    purchaseStatus: "completed",
    stripeCustomerId,
    subscriptionId,
    userId,
  });

  await syncBillingCustomer({
    admin,
    billingEmail: invoice.customer_email ?? null,
    stripeCustomerId,
    subscriptionId,
    userId,
  });

  await upsertProEntitlement({
    admin,
    active: true,
    expiresAt: periodEnd,
    grantedAt: toIsoFromUnixSeconds(subscription.created) ?? toIsoFromUnixSeconds(event.created) ?? new Date().toISOString(),
    purchaseId: typeof purchase?.id === "string" ? purchase.id : null,
    subscriptionId,
    userId,
  });
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

      if (session.mode === "subscription") {
        await handleSubscriptionCheckoutCompleted({
          admin,
          event,
          session,
          stripeCustomerId,
          userId,
        });
      } else {
        const paymentIntentId = getPaymentIntentId(session.payment_intent);
        const completedAt = new Date(event.created * 1000).toISOString();

        const purchaseRow = await upsertCompletedLifetimePurchase({
          admin,
          completedAt,
          eventId: event.id,
          paymentIntentId,
          session,
          stripeCustomerId,
          userId,
        });

        await syncBillingCustomer({
          admin,
          billingEmail: session.customer_details?.email ?? null,
          stripeCustomerId,
          userId,
        });

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
    }

    if (event.type === "invoice.paid") {
      await handleInvoicePaid({
        admin,
        event,
        invoice: event.data.object as Stripe.Invoice,
      });
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = getCustomerId(subscription.customer);
      if (!stripeCustomerId) {
        throw new Error("Subscription event is missing a Stripe customer id.");
      }

      const userId = subscription.metadata?.fitness_user_id?.trim() || await resolveUserIdFromStripeCustomer(admin, stripeCustomerId);
      if (!userId) {
        throw new Error("Could not resolve the Fitness user for the subscription event.");
      }

      await syncSubscriptionState({
        admin,
        eventId: event.id,
        stripeCustomerId,
        subscription,
        userId,
      });
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const purchaseKind = typeof session.metadata?.purchase_kind === "string" ? session.metadata.purchase_kind : null;
      const { error } = await admin
        .from("billing_purchases")
        .update({
          status: "cancelled",
          raw_event_id: event.id,
        })
        .eq("stripe_checkout_session_id", session.id)
        .eq("purchase_kind", purchaseKind === "pro_subscription" ? "pro_subscription" : "lifetime_pro")
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
