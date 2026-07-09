#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import {
  parseDotenvFiles,
  resolveEnvFilePaths,
} from "../env-file.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const envPaths = resolveEnvFilePaths(repoRoot);
const fileEnv = parseDotenvFiles(envPaths);

for (const [key, value] of Object.entries(fileEnv)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

const DEFAULT_ENDPOINT_URL = "https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe";
const DEFAULT_REQUIRED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.expired",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
];

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    expectedMode: "any",
    endpointUrl: DEFAULT_ENDPOINT_URL,
    json: false,
    requiredEvents: [...DEFAULT_REQUIRED_EVENTS],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--json") {
      args.json = true;
      continue;
    }

    if (token === "--mode") {
      args.expectedMode = String(argv[index + 1] ?? "").trim().toLowerCase() || "any";
      index += 1;
      continue;
    }

    if (token === "--url") {
      args.endpointUrl = String(argv[index + 1] ?? "").trim() || DEFAULT_ENDPOINT_URL;
      index += 1;
      continue;
    }

    if (token === "--require-event") {
      const value = String(argv[index + 1] ?? "").trim();
      if (value) {
        args.requiredEvents.push(value);
      }
      index += 1;
    }
  }

  return args;
}

function normalizeSecret(value) {
  return String(value ?? "").replace(/(?:\\r|\\n)+$/g, "").trim();
}

function getKeyMode(secretKey) {
  if (secretKey.startsWith("sk_live_")) {
    return "live";
  }

  if (secretKey.startsWith("sk_test_")) {
    return "test";
  }

  return "unknown";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

const args = parseArgs();
const secretKey = normalizeSecret(process.env.STRIPE_SECRET_KEY);

if (!secretKey) {
  throw new Error(`Missing STRIPE_SECRET_KEY in ${envPaths.join(", ")} or current shell.`);
}

const keyMode = getKeyMode(secretKey);
if (args.expectedMode !== "any" && args.expectedMode !== keyMode) {
  throw new Error(`Stripe key mode mismatch. Expected ${args.expectedMode}, received ${keyMode}.`);
}

const stripe = new Stripe(secretKey);
const account = await stripe.accounts.retrieve();
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
const matchingEndpoint = endpoints.data.find((endpoint) => endpoint.url === args.endpointUrl) ?? null;
const requiredEvents = unique(args.requiredEvents);
const enabledEvents = matchingEndpoint?.enabled_events ?? [];
const missingEvents = requiredEvents.filter((eventName) => !enabledEvents.includes(eventName));
const unexpectedMode = args.expectedMode !== "any" && args.expectedMode !== keyMode;
const ready = Boolean(matchingEndpoint)
  && matchingEndpoint.status === "enabled"
  && missingEvents.length === 0
  && !unexpectedMode;

const result = {
  ok: ready,
  keyMode,
  accountId: account.id,
  endpointUrl: args.endpointUrl,
  endpointFound: Boolean(matchingEndpoint),
  endpointId: matchingEndpoint?.id ?? null,
  endpointStatus: matchingEndpoint?.status ?? null,
  requiredEvents,
  enabledEvents,
  missingEvents,
};

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Stripe webhook readiness: ${ready ? "PASS" : "FAIL"}`);
  console.log(`Mode: ${keyMode}`);
  console.log(`Account: ${account.id}`);
  console.log(`Endpoint: ${matchingEndpoint?.id ?? "not found"}`);
  console.log(`URL: ${args.endpointUrl}`);
  console.log(`Missing events: ${missingEvents.length > 0 ? missingEvents.join(", ") : "none"}`);
}

if (!ready) {
  process.exitCode = 1;
}
