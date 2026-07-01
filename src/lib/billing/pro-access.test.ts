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
  checkoutConfigured: true,
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
  assert.equal(getProAccessOfferLabel("founding"), "Founding offer");
  assert.equal(getProAccessOfferLabel("standard"), "Standard offer");
  assert.equal(getProAccessOfferLabel(null), "Offer not configured");
});

test("buildFallbackProAccessSnapshot exposes schema fallback truth without implying access", () => {
  const snapshot = buildFallbackProAccessSnapshot("schema", configuredBillingSnapshot);

  assert.equal(snapshot.schemaReady, false);
  assert.equal(snapshot.accessState, "free");
  assert.equal(snapshot.checkoutConfigured, true);
  assert.match(snapshot.supportNote, /Billing migrations have not been applied yet/i);
});

test("buildResolvedProAccessSnapshot reports active Lifetime Pro access deterministically", () => {
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
  });

  assert.equal(snapshot.accessState, "lifetime_pro");
  assert.equal(snapshot.accessLabel, "Lifetime Pro");
  assert.equal(snapshot.lastPurchaseStatus, "completed");
  assert.match(snapshot.supportNote, /already has active Lifetime Pro access/i);
});

test("buildResolvedProAccessSnapshot keeps free users on the hosted-checkout readiness note until purchase is complete", () => {
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
  });

  assert.equal(snapshot.accessState, "free");
  assert.equal(snapshot.lastPurchaseStatus, "pending");
  assert.match(snapshot.supportNote, /hosted checkout lane is the next implementation slice/i);
});
