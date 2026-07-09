import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFallbackProAccessSnapshot,
  buildResolvedProAccessSnapshot,
  getProAccessOfferLabel,
  isMissingBillingSchemaError,
} from "@/lib/billing/pro-access-snapshot";
import type { BillingPurchaseRow, UserEntitlementRow } from "@/types/db";

const configuredBillingSnapshot = {
  secretKeyConfigured: true,
  publishableKeyConfigured: true,
  webhookSecretConfigured: true,
  foundingPriceConfigured: true,
  standardPriceConfigured: true,
  activePriceMode: "founding" as const,
  activePriceId: "price_founding",
  paidLaunchEnabled: true,
  checkoutTechnicallyConfigured: true,
  checkoutConfigured: true,
  recurringInterval: "month" as const,
};

test("isMissingBillingSchemaError detects missing billing-table failures only", () => {
  assert.equal(
    isMissingBillingSchemaError({
      message: 'relation "public.user_entitlements" does not exist in schema cache',
    }),
    true,
  );
  assert.equal(
    isMissingBillingSchemaError({
      message: "network timeout talking to billing service",
    }),
    false,
  );
});

test("getProAccessOfferLabel keeps offer copy stable", () => {
  assert.equal(getProAccessOfferLabel("founding"), "Monthly Pro");
  assert.equal(getProAccessOfferLabel("standard"), "Monthly Pro");
  assert.equal(getProAccessOfferLabel(null), "Plan not configured");
});

test("buildFallbackProAccessSnapshot exposes schema fallback truth without implying access", () => {
  const snapshot = buildFallbackProAccessSnapshot("schema", configuredBillingSnapshot);

  assert.equal(snapshot.schemaReady, false);
  assert.equal(snapshot.accessState, "free");
  assert.equal(snapshot.checkoutConfigured, true);
  assert.equal(snapshot.cancellationScheduledFor, null);
  assert.match(snapshot.supportNote, /Billing migrations have not been applied yet/i);
});

test("buildFallbackProAccessSnapshot distinguishes disabled launch from missing Stripe setup", () => {
  const snapshot = buildFallbackProAccessSnapshot("setup", {
    ...configuredBillingSnapshot,
    paidLaunchEnabled: false,
    checkoutConfigured: false,
    checkoutTechnicallyConfigured: true,
  });

  assert.equal(snapshot.checkoutConfigured, false);
  assert.match(snapshot.supportNote, /paid launch is not enabled yet/i);
});

test("buildResolvedProAccessSnapshot reports active included Pro access deterministically", () => {
  const entitlement: UserEntitlementRow = {
    id: "entitlement-1",
    user_id: "user-1",
    entitlement_key: "pro_lifetime",
    status: "active",
    granted_at: "2026-07-01T01:00:00.000Z",
    granted_via_purchase_id: "purchase-1",
    created_at: "2026-07-01T01:00:00.000Z",
    updated_at: "2026-07-01T01:00:00.000Z",
  };
  const purchase: BillingPurchaseRow = {
    id: "purchase-1",
    user_id: "user-1",
    purchase_kind: "lifetime_pro",
    status: "completed",
    stripe_checkout_session_id: "cs_123",
    stripe_payment_intent_id: "pi_123",
    stripe_customer_id: "cus_123",
    stripe_price_id: "price_founding",
    amount_total: 14900,
    currency: "usd",
    completed_at: "2026-07-01T01:00:00.000Z",
    raw_event_id: "evt_123",
    created_at: "2026-07-01T01:00:00.000Z",
    updated_at: "2026-07-01T01:00:00.000Z",
  };

  const snapshot = buildResolvedProAccessSnapshot({
    billingConfig: configuredBillingSnapshot,
    entitlement,
    purchase,
    customerPortalAvailable: false,
  });

  assert.equal(snapshot.accessState, "pro");
  assert.equal(snapshot.accessLabel, "Pro");
  assert.equal(snapshot.accessSource, "lifetime");
  assert.equal(snapshot.cancellationScheduledFor, null);
  assert.equal(snapshot.lastPurchaseStatus, "completed");
  assert.match(snapshot.supportNote, /already has active Pro access/i);
});

test("buildResolvedProAccessSnapshot keeps free users on the checkout-ready note until purchase is complete", () => {
  const snapshot = buildResolvedProAccessSnapshot({
    billingConfig: configuredBillingSnapshot,
    entitlement: null,
    purchase: {
      id: "purchase-2",
      user_id: "user-1",
      purchase_kind: "lifetime_pro",
      status: "pending",
      stripe_checkout_session_id: "cs_pending",
      created_at: "2026-07-01T01:00:00.000Z",
      updated_at: "2026-07-01T01:00:00.000Z",
    } as BillingPurchaseRow,
    customerPortalAvailable: false,
  });

  assert.equal(snapshot.accessState, "free");
  assert.equal(snapshot.lastPurchaseStatus, "pending");
  assert.match(snapshot.supportNote, /Monthly Pro checkout is ready on this surface/i);
});

test("buildResolvedProAccessSnapshot keeps free users blocked when paid launch is disabled", () => {
  const snapshot = buildResolvedProAccessSnapshot({
    billingConfig: {
      ...configuredBillingSnapshot,
      paidLaunchEnabled: false,
      checkoutConfigured: false,
      checkoutTechnicallyConfigured: true,
    },
    entitlement: null,
    purchase: null,
    customerPortalAvailable: false,
  });

  assert.equal(snapshot.accessState, "free");
  assert.equal(snapshot.checkoutConfigured, false);
  assert.match(snapshot.supportNote, /paid launch is not enabled yet/i);
});

test("buildResolvedProAccessSnapshot reflects scheduled subscription cancellation while access remains active", () => {
  const entitlement: UserEntitlementRow = {
    id: "entitlement-sub-1",
    user_id: "user-1",
    entitlement_key: "pro",
    status: "active",
    granted_at: "2026-07-01T01:00:00.000Z",
    expires_at: "2026-08-01T01:00:00.000Z",
    source_subscription_id: "sub_123",
    granted_via_purchase_id: "purchase-sub-1",
    created_at: "2026-07-01T01:00:00.000Z",
    updated_at: "2026-07-01T01:00:00.000Z",
  };

  const snapshot = buildResolvedProAccessSnapshot({
    billingConfig: configuredBillingSnapshot,
    entitlement,
    purchase: {
      id: "purchase-sub-1",
      user_id: "user-1",
      purchase_kind: "pro_subscription",
      status: "completed",
      stripe_subscription_id: "sub_123",
      stripe_price_id: "price_standard",
      billing_interval: "month",
      billing_interval_count: 1,
      created_at: "2026-07-01T01:00:00.000Z",
      updated_at: "2026-07-01T01:00:00.000Z",
    } as BillingPurchaseRow,
    customerPortalAvailable: true,
    cancellationScheduledFor: "2026-08-01T01:00:00.000Z",
  });

  assert.equal(snapshot.accessState, "pro");
  assert.equal(snapshot.accessSource, "subscription");
  assert.equal(snapshot.cancellationScheduledFor, "2026-08-01T01:00:00.000Z");
  assert.match(snapshot.supportNote, /keeps Pro access until the scheduled subscription end date/i);
});

test("buildResolvedProAccessSnapshot treats expired subscription entitlement as Free", () => {
  const expiredEntitlement: UserEntitlementRow = {
    id: "entitlement-expired-1",
    user_id: "user-1",
    entitlement_key: "pro",
    status: "active",
    granted_at: "2026-01-01T01:00:00.000Z",
    expires_at: "2026-02-01T01:00:00.000Z",
    source_subscription_id: "sub_expired",
    created_at: "2026-01-01T01:00:00.000Z",
    updated_at: "2026-02-01T01:00:00.000Z",
  };

  const snapshot = buildResolvedProAccessSnapshot({
    billingConfig: configuredBillingSnapshot,
    entitlement: expiredEntitlement,
    purchase: null,
    customerPortalAvailable: true,
  });

  assert.equal(snapshot.accessState, "free");
});
