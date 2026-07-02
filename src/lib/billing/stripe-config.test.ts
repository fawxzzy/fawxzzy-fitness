import assert from "node:assert/strict";
import test from "node:test";

import { getStripeBillingConfigSnapshot } from "@/lib/billing/stripe-config";

function withEnv<T>(overrides: Record<string, string | undefined>, run: () => T): T {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("getStripeBillingConfigSnapshot defaults to an unconfigured state when Stripe envs are absent", () => {
  const snapshot = withEnv(
    {
      STRIPE_SECRET_KEY: undefined,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: undefined,
      STRIPE_WEBHOOK_SECRET: undefined,
      STRIPE_LIFETIME_PRO_FOUNDING_PRICE_ID: undefined,
      STRIPE_LIFETIME_PRO_STANDARD_PRICE_ID: undefined,
      STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE: undefined,
    },
    () => getStripeBillingConfigSnapshot(),
  );

  assert.deepEqual(snapshot, {
    secretKeyConfigured: false,
    publishableKeyConfigured: false,
    webhookSecretConfigured: false,
    foundingPriceConfigured: false,
    standardPriceConfigured: false,
    activePriceMode: null,
    activePriceId: null,
    checkoutConfigured: false,
    recurringInterval: "month",
  });
});

test("getStripeBillingConfigSnapshot prefers the founding offer when only the founding price is configured", () => {
  const snapshot = withEnv(
    {
      STRIPE_SECRET_KEY: "sk_test_founding",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_founding",
      STRIPE_WEBHOOK_SECRET: "whsec_founding",
      STRIPE_LIFETIME_PRO_FOUNDING_PRICE_ID: "price_founding",
      STRIPE_LIFETIME_PRO_STANDARD_PRICE_ID: undefined,
      STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE: undefined,
    },
    () => getStripeBillingConfigSnapshot(),
  );

  assert.equal(snapshot.activePriceMode, "founding");
  assert.equal(snapshot.activePriceId, "price_founding");
  assert.equal(snapshot.checkoutConfigured, true);
});

test("getStripeBillingConfigSnapshot honors an explicit standard offer selection when both price ids exist", () => {
  const snapshot = withEnv(
    {
      STRIPE_SECRET_KEY: "sk_test_standard",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_standard",
      STRIPE_WEBHOOK_SECRET: "whsec_standard",
      STRIPE_LIFETIME_PRO_FOUNDING_PRICE_ID: "price_founding",
      STRIPE_LIFETIME_PRO_STANDARD_PRICE_ID: "price_standard",
      STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE: "standard",
    },
    () => getStripeBillingConfigSnapshot(),
  );

  assert.equal(snapshot.activePriceMode, "standard");
  assert.equal(snapshot.activePriceId, "price_standard");
  assert.equal(snapshot.checkoutConfigured, true);
});

test("getStripeBillingConfigSnapshot fails closed on an invalid active price mode", () => {
  assert.throws(
    () =>
      withEnv(
        {
          STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE: "legacy",
        },
        () => getStripeBillingConfigSnapshot(),
      ),
    /Invalid environment variable: STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE/,
  );
});
