#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Stripe from "stripe";
import {
  createAnonClient,
  createServiceRoleClient,
  getOptionalEnv,
  getQaCredentials,
  resolveBaseUrl,
  runtimeRoot,
} from "./fitness-qa-config.mjs";

const QA_EMAIL = "atlas-fitness-billing-lifecycle-qa@fawxzzy.test";
const QA_DISPLAY_NAME = "Fitness Billing Lifecycle QA";
const QA_SCOPE = "stripe-subscription-lifecycle-proof";
const RECEIPT_PATH = path.join(runtimeRoot, "stripe-subscription-lifecycle-proof.latest.json");
const CLEANUP_RECEIPT_PATH = path.join(runtimeRoot, "stripe-subscription-lifecycle-proof.cleanup.latest.json");
const POLL_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 1_500;

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    apply: false,
    cleanup: false,
    cleanupOnly: false,
    json: false,
  };

  for (const token of argv) {
    if (token === "--apply") {
      args.apply = true;
      continue;
    }

    if (token === "--cleanup") {
      args.cleanup = true;
      continue;
    }

    if (token === "--cleanup-only") {
      args.cleanupOnly = true;
      args.cleanup = true;
      continue;
    }

    if (token === "--json") {
      args.json = true;
    }
  }

  return args;
}

function normalizeEnv(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").replace(/(?:\\r|\\n|\r|\n)+$/g, "").trim();
}

function getRequiredStripeSecretKey() {
  const secretKey = normalizeEnv(getOptionalEnv("STRIPE_SECRET_KEY"));
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required for Stripe subscription lifecycle proof.");
  }

  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("Stripe lifecycle proof is sandbox/test-mode only. Live keys are intentionally refused.");
  }

  return secretKey;
}

function getConfiguredMonthlyPriceId() {
  const activeMode = normalizeEnv(getOptionalEnv("STRIPE_PRO_ACTIVE_PRICE_MODE"));
  const foundingPriceId = normalizeEnv(getOptionalEnv("STRIPE_PRO_FOUNDING_PRICE_ID"));
  const standardPriceId = normalizeEnv(getOptionalEnv("STRIPE_PRO_STANDARD_PRICE_ID"));

  if (activeMode === "founding" && foundingPriceId) {
    return {
      activeMode,
      priceId: foundingPriceId,
    };
  }

  if (activeMode === "standard" && standardPriceId) {
    return {
      activeMode,
      priceId: standardPriceId,
    };
  }

  if (standardPriceId) {
    return {
      activeMode: "standard",
      priceId: standardPriceId,
    };
  }

  if (foundingPriceId) {
    return {
      activeMode: "founding",
      priceId: foundingPriceId,
    };
  }

  throw new Error("No configured recurring Pro price found in STRIPE_PRO_* env vars.");
}

function assertSuccess(error, message) {
  if (!error) {
    return;
  }

  throw new Error(`${message}: ${error.message ?? "Unknown Supabase error"}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toIsoFromUnixSeconds(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function getSubscriptionPeriodEnd(subscription) {
  const itemPeriodEnd = subscription?.items?.data?.[0]?.current_period_end;
  if (Number.isFinite(itemPeriodEnd)) {
    return itemPeriodEnd;
  }

  if (Number.isFinite(subscription?.current_period_end)) {
    return subscription.current_period_end;
  }

  throw new Error(`Stripe subscription ${subscription?.id ?? "(unknown)"} is missing current_period_end.`);
}

async function listAllUsers(adminClient) {
  const users = [];
  let page = 1;
  let nextPage = 1;

  while (nextPage) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
    assertSuccess(error, "Unable to list Supabase auth users");
    users.push(...(data?.users ?? []));
    nextPage = data?.nextPage ?? null;
    page = nextPage ?? 0;
  }

  return users;
}

async function ensureQaUser(adminClient) {
  const users = await listAllUsers(adminClient);
  const existing = users.find((user) => String(user.email ?? "").toLowerCase() === QA_EMAIL);
  const attributes = {
    email: QA_EMAIL,
    password: getQaCredentials().password,
    email_confirm: true,
    user_metadata: {
      display_name: QA_DISPLAY_NAME,
      atlas_qa_label: "Stripe subscription lifecycle proof",
    },
    app_metadata: {
      atlas_qa_user: true,
      atlas_qa_scope: QA_SCOPE,
    },
  };

  if (!existing) {
    const { data, error } = await adminClient.auth.admin.createUser(attributes);
    assertSuccess(error, `Unable to create ${QA_EMAIL}`);
    if (!data.user) {
      throw new Error(`Supabase did not return created user ${QA_EMAIL}.`);
    }
    return data.user;
  }

  const { data, error } = await adminClient.auth.admin.updateUserById(existing.id, attributes);
  assertSuccess(error, `Unable to sync ${QA_EMAIL}`);
  if (!data.user) {
    throw new Error(`Supabase did not return updated user ${QA_EMAIL}.`);
  }
  return data.user;
}

async function deleteRowsByUserId(client, userId) {
  for (const table of ["user_entitlements", "billing_purchases", "billing_customers"]) {
    const { error } = await client.from(table).delete().eq("user_id", userId);
    if (error && error.code !== "42P01") {
      throw new Error(`Unable to clear ${table} for ${QA_EMAIL}: ${error.message ?? "Unknown Supabase error"}`);
    }
  }

  const { error: profileError } = await client.from("profiles").delete().eq("id", userId);
  if (profileError && profileError.code !== "42P01") {
    throw new Error(`Unable to clear profile for ${QA_EMAIL}: ${profileError.message ?? "Unknown Supabase error"}`);
  }
}

async function deleteRowsByFilters(client, table, filters) {
  for (const filter of filters) {
    if (!filter.value) {
      continue;
    }

    const { error } = await client.from(table).delete().eq(filter.column, filter.value);
    if (error && error.code !== "42P01") {
      throw new Error(`Unable to clear ${table}.${filter.column}=${filter.value}: ${error.message ?? "Unknown Supabase error"}`);
    }
  }
}

async function cleanupQaDatabaseRows(client, {
  customerIds = [],
  subscriptionIds = [],
  userIds = [],
} = {}) {
  const discoveredUserIds = new Set(userIds.filter(Boolean));

  const byEmail = await client
    .from("billing_customers")
    .select("user_id")
    .eq("billing_email", QA_EMAIL);
  if (byEmail.error && byEmail.error.code !== "42P01") {
    throw new Error(`Unable to discover QA billing customers: ${byEmail.error.message ?? "Unknown Supabase error"}`);
  }
  for (const row of byEmail.data ?? []) {
    if (typeof row.user_id === "string") {
      discoveredUserIds.add(row.user_id);
    }
  }

  for (const customerId of customerIds) {
    const byCustomer = await client
      .from("billing_customers")
      .select("user_id")
      .eq("stripe_customer_id", customerId);
    if (byCustomer.error && byCustomer.error.code !== "42P01") {
      throw new Error(`Unable to discover QA customer ${customerId}: ${byCustomer.error.message ?? "Unknown Supabase error"}`);
    }
    for (const row of byCustomer.data ?? []) {
      if (typeof row.user_id === "string") {
        discoveredUserIds.add(row.user_id);
      }
    }
  }

  for (const userId of discoveredUserIds) {
    await deleteRowsByUserId(client, userId);
  }

  await deleteRowsByFilters(client, "user_entitlements", [
    ...subscriptionIds.map((value) => ({ column: "source_subscription_id", value })),
  ]);
  await deleteRowsByFilters(client, "billing_purchases", [
    ...customerIds.map((value) => ({ column: "stripe_customer_id", value })),
    ...subscriptionIds.map((value) => ({ column: "stripe_subscription_id", value })),
  ]);
  await deleteRowsByFilters(client, "billing_customers", [
    { column: "billing_email", value: QA_EMAIL },
    ...customerIds.map((value) => ({ column: "stripe_customer_id", value })),
  ]);

  return [...discoveredUserIds];
}

async function deleteQaUserIfPresent(adminClient) {
  const users = await listAllUsers(adminClient);
  const existing = users.find((user) => String(user.email ?? "").toLowerCase() === QA_EMAIL);
  if (!existing) {
    return null;
  }

  const { error } = await adminClient.auth.admin.deleteUser(existing.id);
  assertSuccess(error, `Unable to delete ${QA_EMAIL}`);
  return existing.id;
}

async function cleanupStripeQaCustomers(stripe) {
  const customers = await stripe.customers.search({
    query: `metadata['atlas_qa_scope']:'${QA_SCOPE}'`,
    limit: 100,
  });
  const deletedCustomerIds = [];
  const seenCustomerIds = [];
  const seenSubscriptionIds = [];
  const seenUserIds = [];

  for (const customer of customers.data) {
    seenCustomerIds.push(customer.id);
    if (typeof customer.metadata?.fitness_user_id === "string") {
      seenUserIds.push(customer.metadata.fitness_user_id);
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 100,
      status: "all",
    }).catch((error) => {
      if (error?.code === "resource_missing") {
        return { data: [] };
      }
      throw error;
    });

    for (const subscription of subscriptions.data) {
      seenSubscriptionIds.push(subscription.id);
      if (typeof subscription.metadata?.fitness_user_id === "string") {
        seenUserIds.push(subscription.metadata.fitness_user_id);
      }

      if (subscription.status !== "canceled") {
        await stripe.subscriptions.cancel(subscription.id).catch((error) => {
          if (error?.code !== "resource_missing") {
            throw error;
          }
        });
      }
    }

    await stripe.customers.del(customer.id).then(() => {
      deletedCustomerIds.push(customer.id);
    }).catch((error) => {
      if (error?.code !== "resource_missing") {
        throw error;
      }
    });
  }

  return {
    deletedCustomerIds,
    seenCustomerIds: [...new Set(seenCustomerIds)],
    seenSubscriptionIds: [...new Set(seenSubscriptionIds)],
    seenUserIds: [...new Set(seenUserIds)],
  };
}

async function cleanupTestClocks(stripe) {
  const clocks = await stripe.testHelpers.testClocks.list({ limit: 100 });
  const deletedClockIds = [];

  for (const clock of clocks.data) {
    if (clock.name?.includes(QA_SCOPE)) {
      await stripe.testHelpers.testClocks.del(clock.id).then(() => {
        deletedClockIds.push(clock.id);
      }).catch((error) => {
        if (error?.code !== "resource_missing") {
          throw error;
        }
      });
    }
  }

  return deletedClockIds;
}

async function resetQaRows(client, userId) {
  await cleanupQaDatabaseRows(client, { userIds: [userId] });
}

async function storeStripeCustomerMapping(client, userId, customerId) {
  const { error } = await client.from("billing_customers").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    billing_email: QA_EMAIL,
  }, {
    onConflict: "user_id",
  });
  assertSuccess(error, "Unable to store QA Stripe customer mapping");
}

async function waitTestClockReady(stripe, clockId) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const clock = await stripe.testHelpers.testClocks.retrieve(clockId);
    if (clock.status === "ready") {
      return clock;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for test clock ${clockId} to become ready.`);
}

async function createClockedCustomer(stripe, {
  clockTime,
  label,
  userId,
}) {
  const clock = await stripe.testHelpers.testClocks.create({
    frozen_time: clockTime,
    name: `${QA_SCOPE} ${label}`,
  });
  const customer = await stripe.customers.create({
    email: QA_EMAIL,
    name: QA_DISPLAY_NAME,
    test_clock: clock.id,
    metadata: {
      fitness_user_id: userId,
      atlas_qa_scope: QA_SCOPE,
      atlas_qa_lane: label,
    },
  });

  return {
    clock,
    customer,
  };
}

async function attachPaymentMethod(stripe, customerId, paymentMethodId) {
  const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethod.id,
    },
  });
  return paymentMethod;
}

async function createMonthlySubscription(stripe, {
  customerId,
  lane,
  price,
  userId,
}) {
  return stripe.subscriptions.create({
    customer: customerId,
    items: [{
      price: price.priceId,
    }],
    metadata: {
      fitness_user_id: userId,
      purchase_kind: "pro_subscription",
      price_mode: price.activeMode,
      stripe_price_id: price.priceId,
      atlas_qa_scope: QA_SCOPE,
      atlas_qa_lane: lane,
    },
    payment_settings: {
      save_default_payment_method: "on_subscription",
    },
    expand: ["items.data.price", "latest_invoice.payment_intent"],
  });
}

async function findStripeEvent(stripe, {
  predicate = null,
  subscriptionId,
  type,
}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const events = await stripe.events.list({ limit: 100 });
    const event = events.data.find((candidate) => {
      if (type && candidate.type !== type) {
        return false;
      }

      if (!JSON.stringify(candidate.data?.object ?? {}).includes(subscriptionId)) {
        return false;
      }

      return predicate ? predicate(candidate) : true;
    });

    if (event) {
      return event;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Could not find Stripe ${type ?? "event"} for subscription ${subscriptionId}.`);
}

async function replayEventToLocalWebhook(stripe, event) {
  const webhookSecret = normalizeEnv(getOptionalEnv("STRIPE_WEBHOOK_SECRET"));
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required for local webhook replay.");
  }

  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });
  const baseUrl = resolveBaseUrl();
  const response = await fetch(`${baseUrl}/api/billing/webhook/stripe`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Local webhook replay failed for ${event.type} ${event.id}: HTTP ${response.status} ${body}`);
  }

  return {
    baseUrl,
    eventId: event.id,
    eventType: event.type,
    status: response.status,
    body,
  };
}

async function replayEvents(stripe, events) {
  const results = [];
  for (const event of events) {
    results.push(await replayEventToLocalWebhook(stripe, event));
  }
  return results;
}

async function loadProofRows(client, subscriptionId) {
  const purchaseResult = await client
    .from("billing_purchases")
    .select("id, status, stripe_subscription_id, stripe_invoice_id, stripe_price_id, amount_total, currency, billing_interval, billing_interval_count, period_start, period_end, completed_at, raw_event_id")
    .eq("stripe_subscription_id", subscriptionId)
    .order("created_at", { ascending: false })
    .limit(10);
  assertSuccess(purchaseResult.error, `Unable to load purchase rows for ${subscriptionId}`);

  const entitlementResult = await client
    .from("user_entitlements")
    .select("id, entitlement_key, status, expires_at, source_subscription_id")
    .eq("source_subscription_id", subscriptionId)
    .maybeSingle();
  assertSuccess(entitlementResult.error, `Unable to load entitlement row for ${subscriptionId}`);

  return {
    purchases: purchaseResult.data ?? [],
    entitlement: entitlementResult.data ?? null,
  };
}

async function pollProofRows(client, subscriptionId, predicate) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const rows = await loadProofRows(client, subscriptionId);
    if (predicate(rows)) {
      return rows;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  const rows = await loadProofRows(client, subscriptionId);
  throw new Error(`Timed out waiting for subscription proof rows for ${subscriptionId}. Last rows: ${JSON.stringify(rows)}`);
}

async function signInQaUser() {
  const anonClient = createAnonClient();
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: QA_EMAIL,
    password: getQaCredentials().password,
  });
  assertSuccess(error, `Unable to sign in ${QA_EMAIL}`);
  if (!data.session) {
    throw new Error(`Supabase did not return a session for ${QA_EMAIL}.`);
  }
  return data.session;
}

async function callPortalRoute(session) {
  const baseUrl = resolveBaseUrl();
  const response = await fetch(`${baseUrl}/api/billing/portal`, {
    method: "POST",
    headers: {
      "x-atlas-access-token": session.access_token,
      "x-atlas-refresh-token": session.refresh_token,
      "cookie": `sb-access-token=${encodeURIComponent(session.access_token)}; sb-refresh-token=${encodeURIComponent(session.refresh_token)}`,
    },
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Billing portal route failed: HTTP ${response.status} ${body}`);
  }

  let parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = null;
  }

  if (!parsed?.ok || typeof parsed.url !== "string" || !parsed.url.startsWith("https://billing.stripe.com/")) {
    throw new Error(`Billing portal route returned invalid payload: ${body}`);
  }

  return {
    baseUrl,
    status: response.status,
    ok: parsed.ok,
    urlPrefix: "https://billing.stripe.com/",
    requestId: typeof parsed.requestId === "string" ? parsed.requestId : null,
  };
}

async function runPortalCancelLane({
  adminClient,
  price,
  stripe,
  user,
}) {
  await resetQaRows(adminClient, user.id);

  const now = Math.floor(Date.now() / 1000);
  const runId = crypto.randomUUID();
  const { clock, customer } = await createClockedCustomer(stripe, {
    clockTime: now,
    label: `portal-cancel ${runId}`,
    userId: user.id,
  });
  await storeStripeCustomerMapping(adminClient, user.id, customer.id);
  const successPaymentMethod = await attachPaymentMethod(stripe, customer.id, "pm_card_visa");
  const subscription = await createMonthlySubscription(stripe, {
    customerId: customer.id,
    lane: "portal-cancel",
    price,
    userId: user.id,
  });
  await waitTestClockReady(stripe, clock.id);

  const createdEvent = await findStripeEvent(stripe, {
    subscriptionId: subscription.id,
    type: "customer.subscription.created",
  });
  const paidEvent = await findStripeEvent(stripe, {
    subscriptionId: subscription.id,
    type: "invoice.paid",
  });
  const initialReplay = await replayEvents(stripe, [createdEvent, paidEvent]);
  const activeRows = await pollProofRows(adminClient, subscription.id, (rows) => (
    rows.purchases.some((purchase) => purchase.status === "completed")
      && rows.entitlement?.entitlement_key === "pro"
      && rows.entitlement?.status === "active"
  ));

  const portalProof = await callPortalRoute(await signInQaUser());
  const cancelUpdated = await stripe.subscriptions.update(subscription.id, {
    cancel_at_period_end: true,
    expand: ["items.data.price"],
  });
  const cancelEvent = await findStripeEvent(stripe, {
    subscriptionId: subscription.id,
    type: "customer.subscription.updated",
    predicate: (event) => event.data?.object?.cancel_at_period_end === true,
  });
  const cancelReplay = await replayEventToLocalWebhook(stripe, cancelEvent);
  const cancelRows = await pollProofRows(adminClient, subscription.id, (rows) => (
    rows.purchases.some((purchase) => purchase.status === "completed")
      && rows.entitlement?.entitlement_key === "pro"
      && rows.entitlement?.status === "active"
  ));

  return {
    lane: "sandbox-paid-customer-portal-cancel-at-period-end",
    runId,
    clockId: clock.id,
    customerId: customer.id,
    subscriptionId: subscription.id,
    successPaymentMethodId: successPaymentMethod.id,
    subscriptionStatusBeforeCancel: subscription.status,
    cancelAtPeriodEnd: cancelUpdated.cancel_at_period_end,
    currentPeriodEnd: toIsoFromUnixSeconds(getSubscriptionPeriodEnd(cancelUpdated)),
    createdEvent: {
      id: createdEvent.id,
      type: createdEvent.type,
      pendingWebhooks: createdEvent.pending_webhooks,
    },
    paidEvent: {
      id: paidEvent.id,
      type: paidEvent.type,
      pendingWebhooks: paidEvent.pending_webhooks,
    },
    cancelEvent: {
      id: cancelEvent.id,
      type: cancelEvent.type,
      pendingWebhooks: cancelEvent.pending_webhooks,
    },
    localReplay: {
      initial: initialReplay,
      cancel: cancelReplay,
    },
    activeRows,
    cancelRows,
    portalProof,
  };
}

async function runFailedPaymentDowngradeLane({
  adminClient,
  price,
  stripe,
  user,
}) {
  await resetQaRows(adminClient, user.id);

  const runId = crypto.randomUUID();
  const startTime = Math.floor((Date.now() - (70 * 24 * 60 * 60 * 1000)) / 1000);
  const { clock, customer } = await createClockedCustomer(stripe, {
    clockTime: startTime,
    label: `failed-payment ${runId}`,
    userId: user.id,
  });
  await storeStripeCustomerMapping(adminClient, user.id, customer.id);
  await attachPaymentMethod(stripe, customer.id, "pm_card_visa");
  const subscription = await createMonthlySubscription(stripe, {
    customerId: customer.id,
    lane: "failed-payment-downgrade",
    price,
    userId: user.id,
  });
  await waitTestClockReady(stripe, clock.id);

  const paidEvent = await findStripeEvent(stripe, {
    subscriptionId: subscription.id,
    type: "invoice.paid",
  });
  const paidReplay = await replayEventToLocalWebhook(stripe, paidEvent);
  const activeRows = await pollProofRows(adminClient, subscription.id, (rows) => (
    rows.purchases.some((purchase) => purchase.status === "completed")
      && rows.entitlement?.entitlement_key === "pro"
      && rows.entitlement?.status === "active"
  ));

  const failPaymentMethod = await attachPaymentMethod(stripe, customer.id, "pm_card_chargeCustomerFail");
  await stripe.subscriptions.update(subscription.id, {
    default_payment_method: failPaymentMethod.id,
  });
  const refreshed = await stripe.subscriptions.retrieve(subscription.id, {
    expand: ["items.data.price"],
  });
  const firstPeriodEnd = getSubscriptionPeriodEnd(refreshed);
  await stripe.testHelpers.testClocks.advance(clock.id, {
    frozen_time: firstPeriodEnd + 7200,
  });
  await waitTestClockReady(stripe, clock.id);

  const failedSubscription = await stripe.subscriptions.retrieve(subscription.id, {
    expand: ["items.data.price", "latest_invoice.payment_intent"],
  });
  const failedEvent = await findStripeEvent(stripe, {
    subscriptionId: subscription.id,
    type: "invoice.payment_failed",
  });
  const failedReplay = await replayEventToLocalWebhook(stripe, failedEvent);
  const downgradedRows = await pollProofRows(adminClient, subscription.id, (rows) => (
    rows.purchases.some((purchase) => purchase.status === "pending" || purchase.status === "failed")
      && rows.entitlement?.entitlement_key === "pro"
      && rows.entitlement?.status === "revoked"
  ));

  return {
    lane: "sandbox-test-clock-failed-payment-downgrade",
    runId,
    clockId: clock.id,
    clockStart: toIsoFromUnixSeconds(startTime),
    customerId: customer.id,
    subscriptionId: subscription.id,
    failedPaymentMethodId: failPaymentMethod.id,
    subscriptionStatusBeforeFailure: subscription.status,
    subscriptionStatusAfterFailure: failedSubscription.status,
    failurePeriodEnd: toIsoFromUnixSeconds(getSubscriptionPeriodEnd(failedSubscription)),
    realNowAtProof: new Date().toISOString(),
    paidEvent: {
      id: paidEvent.id,
      type: paidEvent.type,
      pendingWebhooks: paidEvent.pending_webhooks,
    },
    failedEvent: {
      id: failedEvent.id,
      type: failedEvent.type,
      pendingWebhooks: failedEvent.pending_webhooks,
    },
    localReplay: {
      paid: paidReplay,
      failed: failedReplay,
    },
    activeRows,
    downgradedRows,
  };
}

async function cleanupCreatedStripeObjects(stripe, receipt) {
  const customerIds = [
    receipt?.portalCancel?.customerId,
    receipt?.failedPaymentDowngrade?.customerId,
  ].filter(Boolean);
  const subscriptionIds = [
    receipt?.portalCancel?.subscriptionId,
    receipt?.failedPaymentDowngrade?.subscriptionId,
  ].filter(Boolean);
  const clockIds = [
    receipt?.portalCancel?.clockId,
    receipt?.failedPaymentDowngrade?.clockId,
  ].filter(Boolean);

  const cancelledSubscriptionIds = [];
  for (const subscriptionId of subscriptionIds) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId).catch((error) => {
      if (error?.code === "resource_missing") {
        return null;
      }
      throw error;
    });
    if (subscription && subscription.status !== "canceled") {
      await stripe.subscriptions.cancel(subscriptionId).catch((error) => {
        if (error?.code !== "resource_missing") {
          throw error;
        }
      });
      cancelledSubscriptionIds.push(subscriptionId);
    }
  }

  const deletedCustomerIds = [];
  for (const customerId of customerIds) {
    await stripe.customers.del(customerId).then(() => {
      deletedCustomerIds.push(customerId);
    }).catch((error) => {
      if (error?.code !== "resource_missing") {
        throw error;
      }
    });
  }

  const deletedClockIds = [];
  for (const clockId of clockIds) {
    await stripe.testHelpers.testClocks.del(clockId).then(() => {
      deletedClockIds.push(clockId);
    }).catch((error) => {
      if (error?.code !== "resource_missing") {
        throw error;
      }
    });
  }

  return {
    cancelledSubscriptionIds,
    deletedCustomerIds,
    deletedClockIds,
  };
}

async function writeReceipt(receipt) {
  fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
  fs.writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
}

async function writeCleanupReceipt(receipt) {
  fs.mkdirSync(path.dirname(CLEANUP_RECEIPT_PATH), { recursive: true });
  fs.writeFileSync(CLEANUP_RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
}

function readExistingReceipt() {
  try {
    if (!fs.existsSync(RECEIPT_PATH)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(RECEIPT_PATH, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs();
  const secretKey = getRequiredStripeSecretKey();
  const stripe = new Stripe(secretKey);
  const account = await stripe.accounts.retrieve();
  const price = getConfiguredMonthlyPriceId();
  const adminClient = createServiceRoleClient();

  if (args.cleanupOnly) {
    const previousReceipt = readExistingReceipt();
    const stripeCleanup = await cleanupStripeQaCustomers(stripe);
    const clockCleanup = await cleanupTestClocks(stripe);
    const users = await listAllUsers(adminClient);
    const existingUser = users.find((user) => String(user.email ?? "").toLowerCase() === QA_EMAIL);
    const cleanedDatabaseUserIds = await cleanupQaDatabaseRows(adminClient, {
      customerIds: [
        ...stripeCleanup.seenCustomerIds,
        previousReceipt?.portalCancel?.customerId,
        previousReceipt?.failedPaymentDowngrade?.customerId,
      ],
      subscriptionIds: [
        ...stripeCleanup.seenSubscriptionIds,
        previousReceipt?.portalCancel?.subscriptionId,
        previousReceipt?.failedPaymentDowngrade?.subscriptionId,
      ],
      userIds: [
        ...stripeCleanup.seenUserIds,
        previousReceipt?.userId,
        existingUser?.id,
      ],
    });
    const deletedUserId = await deleteQaUserIfPresent(adminClient);
    const receipt = {
      ok: true,
      mode: "cleanup",
      accountId: account.id,
      qaEmail: QA_EMAIL,
      deletedStripeCustomers: stripeCleanup.deletedCustomerIds,
      deletedStripeClocks: clockCleanup,
      cleanedDatabaseUserIds,
      deletedUserId,
      receiptPath: CLEANUP_RECEIPT_PATH,
      proofReceiptPath: RECEIPT_PATH,
    };
    await writeCleanupReceipt(receipt);
    console.log(JSON.stringify(receipt, null, 2));
    return;
  }

  const planned = {
    ok: true,
    mode: args.apply ? "apply" : "dry-run",
    accountId: account.id,
    stripeMode: "test",
    qaEmail: QA_EMAIL,
    priceMode: price.activeMode,
    priceId: price.priceId,
    cleanupAfterProof: args.cleanup,
    receiptPath: RECEIPT_PATH,
    lanes: [
      "sandbox paid subscription -> app billing portal -> cancel_at_period_end still keeps Pro active",
      "sandbox test-clock renewal failure -> invoice.payment_failed -> expired-window downgrade revokes Pro",
    ],
    safety: "Refuses live Stripe keys. Uses Stripe test PaymentMethod ids only. Creates no real charges.",
  };

  if (!args.apply) {
    console.log(JSON.stringify(planned, null, 2));
    return;
  }

  const user = await ensureQaUser(adminClient);
  await resetQaRows(adminClient, user.id);
  await cleanupStripeQaCustomers(stripe);
  await cleanupTestClocks(stripe);

  const receipt = {
    ...planned,
    userId: user.id,
    startedAt: new Date().toISOString(),
    portalCancel: null,
    failedPaymentDowngrade: null,
  };

  try {
    receipt.portalCancel = await runPortalCancelLane({
      adminClient,
      price,
      stripe,
      user,
    });
    receipt.failedPaymentDowngrade = await runFailedPaymentDowngradeLane({
      adminClient,
      price,
      stripe,
      user,
    });
    receipt.completedAt = new Date().toISOString();
    receipt.ok = true;
  } finally {
    if (args.cleanup) {
      const stripeCleanup = await cleanupCreatedStripeObjects(stripe, receipt);
      const discoveredStripeCleanup = await cleanupStripeQaCustomers(stripe);
      const clockCleanup = await cleanupTestClocks(stripe);
      const cleanedDatabaseUserIds = await cleanupQaDatabaseRows(adminClient, {
        customerIds: [
          receipt.portalCancel?.customerId,
          receipt.failedPaymentDowngrade?.customerId,
          ...discoveredStripeCleanup.seenCustomerIds,
        ],
        subscriptionIds: [
          receipt.portalCancel?.subscriptionId,
          receipt.failedPaymentDowngrade?.subscriptionId,
          ...discoveredStripeCleanup.seenSubscriptionIds,
        ],
        userIds: [
          user.id,
          ...discoveredStripeCleanup.seenUserIds,
        ],
      });
      const deletedUserId = await deleteQaUserIfPresent(adminClient);
      receipt.cleanup = {
        ...stripeCleanup,
        discoveredDeletedCustomerIds: discoveredStripeCleanup.deletedCustomerIds,
        discoveredDeletedClockIds: clockCleanup,
        cleanedDatabaseUserIds,
        deletedUserId,
      };
    }
  }

  await writeReceipt(receipt);
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
