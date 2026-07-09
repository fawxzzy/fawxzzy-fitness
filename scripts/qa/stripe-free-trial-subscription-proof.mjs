#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Stripe from "stripe";
import {
  createServiceRoleClient,
  getOptionalEnv,
  getQaCredentials,
  resolveBaseUrl,
  runtimeRoot,
} from "./fitness-qa-config.mjs";

const QA_EMAIL = "atlas-fitness-billing-free-trial-qa@fawxzzy.test";
const QA_DISPLAY_NAME = "Fitness Billing Free Trial QA";
const DEFAULT_TRIAL_DAYS = 1;
const POLL_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 1_500;
const RECEIPT_PATH = path.join(runtimeRoot, "stripe-free-trial-subscription-proof.latest.json");

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    apply: false,
    cleanup: false,
    cleanupOnly: false,
    json: false,
    localReplay: false,
    allowLiveNoCharge: false,
    trialDays: DEFAULT_TRIAL_DAYS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

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
      continue;
    }

    if (token === "--local-replay") {
      args.localReplay = true;
      continue;
    }

    if (token === "--allow-live-no-charge") {
      args.allowLiveNoCharge = true;
      continue;
    }

    if (token === "--trial-days") {
      const parsed = Number.parseInt(String(argv[index + 1] ?? ""), 10);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 30) {
        throw new Error("--trial-days must be an integer between 1 and 30.");
      }
      args.trialDays = parsed;
      index += 1;
    }
  }

  return args;
}

function normalizeEnv(value) {
  return String(value ?? "").replace(/(?:\\r|\\n)+$/g, "").trim();
}

function getRequiredStripeSecretKey({ allowLiveNoCharge = false } = {}) {
  const secretKey = normalizeEnv(getOptionalEnv("STRIPE_SECRET_KEY"));
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required for Stripe free-trial proof.");
  }

  if (secretKey.startsWith("sk_test_")) {
    return {
      keyMode: "test",
      secretKey,
    };
  }

  if (secretKey.startsWith("sk_live_") && allowLiveNoCharge) {
    return {
      keyMode: "live",
      secretKey,
    };
  }

  throw new Error(
    "Stripe free-trial proof is test-mode by default. " +
    "Pass --allow-live-no-charge only for an approved live no-charge trial proof.",
  );
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

  if (!activeMode && foundingPriceId) {
    return {
      activeMode: "founding",
      priceId: foundingPriceId,
    };
  }

  if (!activeMode && standardPriceId) {
    return {
      activeMode: "standard",
      priceId: standardPriceId,
    };
  }

  throw new Error("No configured monthly Pro price found in STRIPE_PRO_* env vars.");
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
      atlas_qa_label: "Stripe free-trial subscription proof",
    },
    app_metadata: {
      atlas_qa_user: true,
      atlas_qa_scope: "stripe-free-trial-subscription-proof",
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

async function resetQaRows(client, userId) {
  const tables = [
    "user_entitlements",
    "billing_purchases",
    "billing_customers",
  ];

  for (const table of tables) {
    const { error } = await client.from(table).delete().eq("user_id", userId);
    if (error && error.code !== "42P01") {
      throw new Error(`Unable to clear ${table} for ${QA_EMAIL}: ${error.message ?? "Unknown Supabase error"}`);
    }
  }

  const { error: profileError } = await client.from("profiles").delete().eq("id", userId);
  if (profileError && profileError.code !== "42P01") {
    throw new Error(`Unable to clear profiles for ${QA_EMAIL}: ${profileError.message ?? "Unknown Supabase error"}`);
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

  const customerLookupFilters = [
    {
      column: "billing_email",
      value: QA_EMAIL,
    },
    ...customerIds.map((customerId) => ({
      column: "stripe_customer_id",
      value: customerId,
    })),
  ];

  for (const filter of customerLookupFilters) {
    if (!filter.value) {
      continue;
    }

    const result = await client
      .from("billing_customers")
      .select("user_id")
      .eq(filter.column, filter.value);

    if (result.error && result.error.code !== "42P01") {
      throw new Error(`Unable to discover QA billing customers by ${filter.column}: ${result.error.message ?? "Unknown Supabase error"}`);
    }

    for (const row of result.data ?? []) {
      if (typeof row.user_id === "string") {
        discoveredUserIds.add(row.user_id);
      }
    }
  }

  for (const userId of discoveredUserIds) {
    await resetQaRows(client, userId);
  }

  await deleteRowsByFilters(client, "user_entitlements", [
    ...subscriptionIds.map((subscriptionId) => ({
      column: "source_subscription_id",
      value: subscriptionId,
    })),
  ]);
  await deleteRowsByFilters(client, "billing_purchases", [
    ...customerIds.map((customerId) => ({
      column: "stripe_customer_id",
      value: customerId,
    })),
    ...subscriptionIds.map((subscriptionId) => ({
      column: "stripe_subscription_id",
      value: subscriptionId,
    })),
  ]);
  await deleteRowsByFilters(client, "billing_customers", [
    {
      column: "billing_email",
      value: QA_EMAIL,
    },
    ...customerIds.map((customerId) => ({
      column: "stripe_customer_id",
      value: customerId,
    })),
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
    query: "metadata['atlas_qa_scope']:'stripe-free-trial-subscription-proof'",
    limit: 20,
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

    if (customer.deleted) {
      continue;
    }

    let subscriptions;
    try {
      subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 20,
        status: "all",
      });
    } catch (error) {
      if (error?.code === "resource_missing") {
        continue;
      }
      throw error;
    }

    for (const subscription of subscriptions.data) {
      seenSubscriptionIds.push(subscription.id);
      if (typeof subscription.metadata?.fitness_user_id === "string") {
        seenUserIds.push(subscription.metadata.fitness_user_id);
      }

      if (subscription.status !== "canceled") {
        await stripe.subscriptions.cancel(subscription.id);
      }
    }

    try {
      await stripe.customers.del(customer.id);
      deletedCustomerIds.push(customer.id);
    } catch (error) {
      if (error?.code !== "resource_missing") {
        throw error;
      }
    }
  }

  return {
    deletedCustomerIds,
    seenCustomerIds: [...new Set(seenCustomerIds)],
    seenSubscriptionIds: [...new Set(seenSubscriptionIds)],
    seenUserIds: [...new Set(seenUserIds)],
  };
}

async function pollProofRows(client, subscriptionId) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const purchaseResult = await client
      .from("billing_purchases")
      .select("id, status, stripe_subscription_id, stripe_price_id, amount_total, currency, billing_interval, period_end")
      .eq("stripe_subscription_id", subscriptionId)
      .order("created_at", { ascending: false })
      .limit(5);

    assertSuccess(purchaseResult.error, "Unable to poll billing purchase proof");

    const entitlementResult = await client
      .from("user_entitlements")
      .select("id, entitlement_key, status, expires_at, source_subscription_id")
      .eq("source_subscription_id", subscriptionId)
      .maybeSingle();

    assertSuccess(entitlementResult.error, "Unable to poll Pro entitlement proof");

    const purchaseRows = Array.isArray(purchaseResult.data) ? purchaseResult.data : [];
    const purchase = purchaseRows.find((row) => row.status === "completed")
      ?? purchaseRows[0]
      ?? null;

    if (purchase && entitlementResult.data) {
      return {
        received: true,
        purchase,
        purchaseRowCount: purchaseRows.length,
        entitlement: entitlementResult.data,
      };
    }

    await sleep(POLL_INTERVAL_MS);
  }

  return {
    received: false,
    purchase: null,
    entitlement: null,
  };
}

async function findSubscriptionCreatedEvent(stripe, subscriptionId) {
  const events = await stripe.events.list({ limit: 100 });
  return events.data.find((event) => {
    if (event.type !== "customer.subscription.created") {
      return false;
    }

    return JSON.stringify(event.data?.object ?? {}).includes(subscriptionId);
  }) ?? null;
}

async function replayEventToLocalWebhook(stripe, event) {
  const webhookSecret = normalizeEnv(getOptionalEnv("STRIPE_WEBHOOK_SECRET"));
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required for --local-replay.");
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

  return {
    baseUrl,
    eventId: event.id,
    eventType: event.type,
    status: response.status,
    body: await response.text(),
  };
}

async function writeReceipt(receipt) {
  fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
  fs.writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`);
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
  const {
    keyMode,
    secretKey,
  } = getRequiredStripeSecretKey({
    allowLiveNoCharge: args.allowLiveNoCharge,
  });
  const stripe = new Stripe(secretKey);
  const account = await stripe.accounts.retrieve();

  if (args.cleanupOnly) {
    const adminClient = createServiceRoleClient();
    const previousReceipt = readExistingReceipt();
    const stripeCleanup = await cleanupStripeQaCustomers(stripe);
    const users = await listAllUsers(adminClient);
    const existing = users.find((user) => String(user.email ?? "").toLowerCase() === QA_EMAIL);
    const cleanedDatabaseUserIds = await cleanupQaDatabaseRows(adminClient, {
      customerIds: [
        ...stripeCleanup.seenCustomerIds,
        typeof previousReceipt?.stripeCustomerId === "string" ? previousReceipt.stripeCustomerId : null,
      ],
      subscriptionIds: [
        ...stripeCleanup.seenSubscriptionIds,
        typeof previousReceipt?.stripeSubscriptionId === "string" ? previousReceipt.stripeSubscriptionId : null,
      ],
      userIds: [
        ...stripeCleanup.seenUserIds,
        typeof previousReceipt?.userId === "string" ? previousReceipt.userId : null,
        existing?.id,
      ],
    });
    if (existing) {
      await deleteQaUserIfPresent(adminClient);
    }

    const receipt = {
      ok: true,
      mode: "cleanup",
      accountId: account.id,
      qaEmail: QA_EMAIL,
      deletedStripeCustomers: stripeCleanup.deletedCustomerIds,
      cleanedDatabaseUserIds,
      seenStripeCustomers: stripeCleanup.seenCustomerIds,
      seenStripeSubscriptions: stripeCleanup.seenSubscriptionIds,
      deletedUserId: existing?.id ?? null,
      receiptPath: RECEIPT_PATH,
    };
    await writeReceipt(receipt);
    console.log(JSON.stringify(receipt, null, 2));
    return;
  }

  const price = getConfiguredMonthlyPriceId();
  const planned = {
    ok: true,
    mode: args.apply ? "apply" : "dry-run",
    keyMode,
    accountId: account.id,
    qaEmail: QA_EMAIL,
    priceMode: price.activeMode,
    priceId: price.priceId,
    trialDays: args.trialDays,
    cleanupAfterProof: args.cleanup,
    localReplayEnabled: args.localReplay,
    receiptPath: RECEIPT_PATH,
    note: keyMode === "live"
      ? "Uses Stripe live mode with an explicit no-charge trial subscription. It does not collect a payment method and must be cleaned up after proof."
      : "Uses Stripe test mode only. Creates a free trial subscription against the real configured monthly price without collecting a payment method.",
  };

  if (!args.apply) {
    console.log(JSON.stringify(planned, null, 2));
    return;
  }

  const adminClient = createServiceRoleClient();
  const user = await ensureQaUser(adminClient);
  await resetQaRows(adminClient, user.id);

  const runId = crypto.randomUUID();
  const customer = await stripe.customers.create({
    email: QA_EMAIL,
    name: QA_DISPLAY_NAME,
    metadata: {
      fitness_user_id: user.id,
      atlas_qa_scope: "stripe-free-trial-subscription-proof",
      atlas_qa_run_id: runId,
    },
  });

  assertSuccess((await adminClient.from("billing_customers").upsert({
    user_id: user.id,
    stripe_customer_id: customer.id,
    billing_email: QA_EMAIL,
  }, {
    onConflict: "user_id",
  })).error, "Unable to store QA Stripe customer mapping");

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{
      price: price.priceId,
    }],
    metadata: {
      fitness_user_id: user.id,
      purchase_kind: "pro_subscription",
      price_mode: price.activeMode,
      stripe_price_id: price.priceId,
      atlas_qa_scope: "stripe-free-trial-subscription-proof",
      atlas_qa_run_id: runId,
    },
    payment_settings: {
      save_default_payment_method: "on_subscription",
    },
    trial_period_days: args.trialDays,
    trial_settings: {
      end_behavior: {
        missing_payment_method: "cancel",
      },
    },
    expand: ["items.data.price"],
  });

  const stripeDeliveredProof = await pollProofRows(adminClient, subscription.id);
  let proof = stripeDeliveredProof;
  let localReplay = null;

  if (!proof.received && args.localReplay) {
    const event = await findSubscriptionCreatedEvent(stripe, subscription.id);
    if (!event) {
      throw new Error(`Could not find customer.subscription.created event for ${subscription.id}.`);
    }

    const replayResult = await replayEventToLocalWebhook(stripe, event);
    const replayProof = await pollProofRows(adminClient, subscription.id);
    localReplay = {
      ...replayResult,
      proofReceived: replayProof.received,
    };
    proof = replayProof;
  }

  const receipt = {
    ...planned,
    runId,
    userId: user.id,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: subscription.status,
    stripeDeliveredWebhookProofReceived: stripeDeliveredProof.received,
    webhookProofReceived: proof.received,
    localReplay,
    purchase: proof.purchase,
    entitlement: proof.entitlement,
  };

  if (args.cleanup) {
    if (subscription.status !== "canceled") {
      await stripe.subscriptions.cancel(subscription.id);
    }
    await stripe.customers.del(customer.id);
    await resetQaRows(adminClient, user.id);
    await deleteQaUserIfPresent(adminClient);
    receipt.cleanup = {
      deletedStripeCustomer: customer.id,
      deletedQaUserId: user.id,
      deletedDatabaseRows: true,
    };
  }

  await writeReceipt(receipt);
  console.log(JSON.stringify(receipt, null, 2));

  if (!proof.received) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
