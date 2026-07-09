import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  STRIPE_TEST_WEBHOOK_SECRET_OPTIONAL,
  STRIPE_WEBHOOK_SECRET_OPTIONAL,
} from "@/lib/env";
import { getStripeServerClient } from "@/lib/billing/stripe-server";
import {
  StripeWebhookNotConfiguredError,
  buildStripeWebhookSecretCandidates,
  constructStripeWebhookEvent,
} from "@/lib/billing/stripe-webhook-signature";
import {
  mapSubscriptionStatusToPurchaseStatus,
  shouldKeepProEntitlement,
} from "@/lib/billing/subscription-status";
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

function getInvoiceSubscriptionMetadata(invoice: Stripe.Invoice) {
  return (invoice as Stripe.Invoice & {
    parent?: {
      subscription_details?: {
        metadata?: Record<string, string | null | undefined> | null;
      } | null;
    } | null;
  }).parent?.subscription_details?.metadata ?? {};
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

const SUBSCRIPTION_PURCHASE_SELECT = `
  id,
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
  completed_at,
  created_at
`;

type SubscriptionPurchaseCandidate = {
  id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_customer_id: string | null;
  stripe_price_id: string | null;
  stripe_subscription_id: string | null;
  stripe_invoice_id: string | null;
  amount_total: number | null;
  currency: string | null;
  billing_interval: "month" | "year" | null;
  billing_interval_count: number | null;
  period_start: string | null;
  period_end: string | null;
  completed_at: string | null;
  created_at: string | null;
};

async function findSubscriptionPurchaseCandidates(args: {
  admin: any;
  invoiceId: string | null;
  sessionId: string | null;
  subscriptionId: string;
}) {
  const {
    admin,
    invoiceId,
    sessionId,
    subscriptionId,
  } = args;
  const byId = new Map<string, SubscriptionPurchaseCandidate>();

  async function collect(field: "stripe_subscription_id" | "stripe_checkout_session_id" | "stripe_invoice_id", value: string | null) {
    if (!value) return;

    const result = await admin
      .from("billing_purchases")
      .select(SUBSCRIPTION_PURCHASE_SELECT)
      .eq(field, value)
      .eq("purchase_kind", "pro_subscription")
      .order("created_at", { ascending: true });

    if (result.error) {
      throw new Error(`Could not load billing purchase candidates by ${field}: ${result.error.message}`);
    }

    for (const row of result.data ?? []) {
      if (typeof row?.id === "string") {
        byId.set(row.id, row as SubscriptionPurchaseCandidate);
      }
    }
  }

  await collect("stripe_subscription_id", subscriptionId);
  await collect("stripe_checkout_session_id", sessionId);
  await collect("stripe_invoice_id", invoiceId);

  return Array.from(byId.values()).sort((a, b) => {
    const sessionScore = Number(Boolean(b.stripe_checkout_session_id)) - Number(Boolean(a.stripe_checkout_session_id));
    if (sessionScore !== 0) return sessionScore;

    const paidScore = Number(Boolean(b.amount_total && b.currency)) - Number(Boolean(a.amount_total && a.currency));
    if (paidScore !== 0) return paidScore;

    return new Date(a.created_at ?? 0).valueOf() - new Date(b.created_at ?? 0).valueOf();
  });
}

function firstDefined<T>(...values: Array<T | null | undefined>) {
  return values.find((value): value is T => value !== null && value !== undefined) ?? null;
}

function mergeSubscriptionPurchasePayload(
  basePayload: Record<string, unknown>,
  candidates: SubscriptionPurchaseCandidate[],
) {
  return {
    ...basePayload,
    stripe_checkout_session_id: firstDefined(
      basePayload.stripe_checkout_session_id as string | null,
      ...candidates.map((candidate) => candidate.stripe_checkout_session_id),
    ),
    stripe_payment_intent_id: firstDefined(
      basePayload.stripe_payment_intent_id as string | null,
      ...candidates.map((candidate) => candidate.stripe_payment_intent_id),
    ),
    stripe_customer_id: firstDefined(
      basePayload.stripe_customer_id as string | null,
      ...candidates.map((candidate) => candidate.stripe_customer_id),
    ),
    stripe_price_id: firstDefined(
      basePayload.stripe_price_id as string | null,
      ...candidates.map((candidate) => candidate.stripe_price_id),
    ),
    stripe_subscription_id: firstDefined(
      basePayload.stripe_subscription_id as string | null,
      ...candidates.map((candidate) => candidate.stripe_subscription_id),
    ),
    stripe_invoice_id: firstDefined(
      basePayload.stripe_invoice_id as string | null,
      ...candidates.map((candidate) => candidate.stripe_invoice_id),
    ),
    amount_total: firstDefined(
      basePayload.amount_total as number | null,
      ...candidates.map((candidate) => candidate.amount_total),
    ),
    currency: firstDefined(
      basePayload.currency as string | null,
      ...candidates.map((candidate) => candidate.currency),
    ),
    billing_interval: firstDefined(
      basePayload.billing_interval as "month" | "year" | null,
      ...candidates.map((candidate) => candidate.billing_interval),
    ),
    billing_interval_count: firstDefined(
      basePayload.billing_interval_count as number | null,
      ...candidates.map((candidate) => candidate.billing_interval_count),
    ),
    period_start: firstDefined(
      basePayload.period_start as string | null,
      ...candidates.map((candidate) => candidate.period_start),
    ),
    period_end: firstDefined(
      basePayload.period_end as string | null,
      ...candidates.map((candidate) => candidate.period_end),
    ),
    completed_at: firstDefined(
      basePayload.completed_at as string | null,
      ...candidates.map((candidate) => candidate.completed_at),
    ),
  };
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

  const payload: {
    user_id: string;
    stripe_customer_id: string;
    latest_stripe_subscription_id: string | null;
    billing_email?: string;
  } = {
    user_id: userId,
    stripe_customer_id: stripeCustomerId,
    latest_stripe_subscription_id: subscriptionId,
  };

  if (billingEmail) {
    payload.billing_email = billingEmail;
  }

  const { error } = await admin
    .from("billing_customers")
    .upsert(payload, {
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

  const candidates = await findSubscriptionPurchaseCandidates({
    admin,
    invoiceId,
    sessionId,
    subscriptionId,
  });
  const existingPurchaseId = candidates[0]?.id ?? null;

  if (existingPurchaseId) {
    const duplicateIds = candidates
      .map((candidate) => candidate.id)
      .filter((id) => id !== existingPurchaseId);
    const mergedPayload = mergeSubscriptionPurchasePayload(basePayload, candidates);

    const { data, error } = await admin
      .from("billing_purchases")
      .update(mergedPayload)
      .eq("id", existingPurchaseId)
      .select("id")
      .single();

    if (error) {
      throw new Error(`Could not update subscription purchase receipt: ${error.message}`);
    }

    if (duplicateIds.length > 0) {
      const { error: deleteError } = await admin
        .from("billing_purchases")
        .delete()
        .in("id", duplicateIds);

      if (deleteError) {
        throw new Error(`Could not delete duplicate subscription purchase receipts: ${deleteError.message}`);
      }
    }

    return data;
  }

  const { data, error } = await admin
    .from("billing_purchases")
    .insert(basePayload)
    .select("id")
    .single();

  if (error) {
    const message = error.message?.toLowerCase?.() ?? "";
    const isSubscriptionDuplicate =
      error.code === "23505"
      || (message.includes("duplicate") && message.includes("subscription"));

    if (isSubscriptionDuplicate) {
      const retryCandidates = await findSubscriptionPurchaseCandidates({
        admin,
        invoiceId,
        sessionId,
        subscriptionId,
      });
      const retryPurchaseId = retryCandidates[0]?.id ?? null;

      if (retryPurchaseId) {
        const duplicateIds = retryCandidates
          .map((candidate) => candidate.id)
          .filter((id) => id !== retryPurchaseId);
        const mergedPayload = mergeSubscriptionPurchasePayload(basePayload, retryCandidates);
        const retryResult = await admin
          .from("billing_purchases")
          .update(mergedPayload)
          .eq("id", retryPurchaseId)
          .select("id")
          .single();

        if (retryResult.error) {
          throw new Error(`Could not recover duplicate subscription purchase receipt: ${retryResult.error.message}`);
        }

        if (duplicateIds.length > 0) {
          const { error: deleteError } = await admin
            .from("billing_purchases")
            .delete()
            .in("id", duplicateIds);

          if (deleteError) {
            throw new Error(`Could not delete duplicate subscription purchase receipts: ${deleteError.message}`);
          }
        }

        return retryResult.data;
      }
    }

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

  const subscriptionMetadata = getInvoiceSubscriptionMetadata(invoice);
  const metadataUserId = subscriptionMetadata.fitness_user_id?.trim() || null;
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
  const price = linePrice;
  const metadataPriceId =
    typeof subscriptionMetadata.stripe_price_id === "string"
      ? subscriptionMetadata.stripe_price_id.trim() || null
      : null;
  const billing = getRecurringDetailsFromPrice(price);
  const periodStart = toIsoFromUnixSeconds(firstLine?.period?.start);
  const periodEnd = toIsoFromUnixSeconds(firstLine?.period?.end);
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
    grantedAt: toIsoFromUnixSeconds(event.created) ?? new Date().toISOString(),
    purchaseId: typeof purchase?.id === "string" ? purchase.id : null,
    subscriptionId,
    userId,
  });
}

async function handleInvoicePaymentFailed(args: {
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
    throw new Error("Invoice payment failed event is missing Stripe customer or subscription id.");
  }

  const subscriptionMetadata = getInvoiceSubscriptionMetadata(invoice);
  const metadataUserId = subscriptionMetadata.fitness_user_id?.trim() || null;
  const userId = metadataUserId || await resolveUserIdFromStripeCustomer(admin, stripeCustomerId);
  if (!userId) {
    throw new Error("Could not resolve the Fitness user for the failed subscription invoice.");
  }

  const firstLine = invoice.lines.data[0];
  const linePrice = getPriceObject((firstLine as Stripe.InvoiceLineItem & {
    pricing?: {
      price_details?: {
        price?: string | Stripe.Price | null;
      } | null;
    } | null;
  })?.pricing?.price_details?.price ?? null);
  const price = linePrice;
  const billing = getRecurringDetailsFromPrice(price);
  const periodStart = toIsoFromUnixSeconds(firstLine?.period?.start);
  const periodEnd = toIsoFromUnixSeconds(firstLine?.period?.end);
  const hasFutureWindow = periodEnd ? new Date(periodEnd).valueOf() > Date.now() : false;
  const purchase = await upsertSubscriptionPurchase({
    admin,
    amountTotal: invoice.amount_due ?? null,
    billingInterval: billing.billing_interval,
    billingIntervalCount: billing.billing_interval_count,
    completedAt: null,
    currency: invoice.currency ?? null,
    eventId: event.id,
    invoiceId: invoice.id,
    periodEnd,
    periodStart,
    priceId: getInvoiceLinePriceId(firstLine) ?? price?.id ?? (
      typeof subscriptionMetadata.stripe_price_id === "string"
        ? subscriptionMetadata.stripe_price_id.trim() || null
        : null
    ),
    purchaseStatus: hasFutureWindow ? "pending" : "failed",
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
    active: hasFutureWindow,
    expiresAt: periodEnd,
    grantedAt: toIsoFromUnixSeconds(event.created) ?? new Date().toISOString(),
    purchaseId: typeof purchase?.id === "string" ? purchase.id : null,
    subscriptionId,
    userId,
  });
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const webhookSecretCandidates = buildStripeWebhookSecretCandidates({
    primarySecret: STRIPE_WEBHOOK_SECRET_OPTIONAL(),
    testSecret: STRIPE_TEST_WEBHOOK_SECRET_OPTIONAL(),
  });

  if (webhookSecretCandidates.length === 0) {
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
    const { event } = constructStripeWebhookEvent({
      rawBody,
      secrets: webhookSecretCandidates,
      signature,
      stripe,
    });
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
          throw new Error(`Could not upsert included Pro entitlement: ${entitlementError.message}`);
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

    if (event.type === "invoice.payment_failed") {
      await handleInvoicePaymentFailed({
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
    const notConfigured = error instanceof StripeWebhookNotConfiguredError;
    console.error("[billing-webhook-stripe] failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return buildJsonResponse({
      ok: false,
      code: notConfigured ? "BILLING_WEBHOOK_NOT_CONFIGURED" : "BILLING_WEBHOOK_FAILED",
      error: notConfigured
        ? "Stripe webhook handling is not configured yet."
        : "Unable to process the Stripe billing webhook.",
      requestId,
    }, { status: notConfigured ? 503 : 400 });
  }
}
