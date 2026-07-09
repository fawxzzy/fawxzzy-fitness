import assert from "node:assert/strict";
import test from "node:test";

import Stripe from "stripe";

import {
  StripeWebhookNotConfiguredError,
  buildStripeWebhookSecretCandidates,
  constructStripeWebhookEvent,
} from "@/lib/billing/stripe-webhook-signature";

const stripe = new Stripe("sk_test_signature_helper");

function buildPayload() {
  return JSON.stringify({
    id: "evt_signature_helper",
    object: "event",
    api_version: "2025-10-29.clover",
    created: 1_788_300_000,
    data: {
      object: {
        id: "sub_signature_helper",
        object: "subscription",
      },
    },
    livemode: false,
    pending_webhooks: 1,
    type: "customer.subscription.created",
  });
}

function signPayload(payload: string, secret: string) {
  return stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
}

test("constructStripeWebhookEvent verifies with the primary webhook secret first", () => {
  const payload = buildPayload();
  const signature = signPayload(payload, "whsec_primary");

  const result = constructStripeWebhookEvent({
    rawBody: payload,
    secrets: buildStripeWebhookSecretCandidates({
      primarySecret: "whsec_primary",
      testSecret: "whsec_test",
    }),
    signature,
    stripe,
  });

  assert.equal(result.event.id, "evt_signature_helper");
  assert.equal(result.matchedSecretLabel, "primary");
});

test("constructStripeWebhookEvent accepts the test webhook secret when primary does not match", () => {
  const payload = buildPayload();
  const signature = signPayload(payload, "whsec_test");

  const result = constructStripeWebhookEvent({
    rawBody: payload,
    secrets: buildStripeWebhookSecretCandidates({
      primarySecret: "whsec_primary",
      testSecret: "whsec_test",
    }),
    signature,
    stripe,
  });

  assert.equal(result.event.id, "evt_signature_helper");
  assert.equal(result.matchedSecretLabel, "test");
});

test("constructStripeWebhookEvent fails closed when no webhook secret is configured", () => {
  assert.throws(
    () =>
      constructStripeWebhookEvent({
        rawBody: buildPayload(),
        secrets: buildStripeWebhookSecretCandidates({
          primarySecret: null,
          testSecret: null,
        }),
        signature: "t=1,v1=bad",
        stripe,
      }),
    StripeWebhookNotConfiguredError,
  );
});

test("constructStripeWebhookEvent rejects signatures that match neither configured secret", () => {
  const payload = buildPayload();
  const signature = signPayload(payload, "whsec_other");

  assert.throws(
    () =>
      constructStripeWebhookEvent({
        rawBody: payload,
        secrets: buildStripeWebhookSecretCandidates({
          primarySecret: "whsec_primary",
          testSecret: "whsec_test",
        }),
        signature,
        stripe,
      }),
    /No signatures found matching the expected signature/,
  );
});
