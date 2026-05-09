#!/usr/bin/env node
import process from "node:process";
import {
  SUPABASE_SERVICE_ROLE_KEY_ENV,
  NEXT_PUBLIC_SUPABASE_URL_ENV,
  createServiceRoleClient,
  envPath,
  getOptionalEnv,
} from "./qa/fitness-qa-config.mjs";
import { processSessionFollowUpJobBatch } from "../src/lib/session-follow-up-jobs.ts";

function parseArgs(argv = process.argv.slice(2)) {
  const flags = new Set();
  const values = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (!entry.startsWith("--")) {
      continue;
    }

    const body = entry.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      values.set(body, next);
      index += 1;
    } else {
      flags.add(body);
    }
  }

  return { flags, values };
}

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function missingEnv() {
  return [NEXT_PUBLIC_SUPABASE_URL_ENV, SUPABASE_SERVICE_ROLE_KEY_ENV].filter((name) => !getOptionalEnv(name));
}

async function main() {
  const args = parseArgs();
  const limitValue = Number.parseInt(String(args.values.get("limit") ?? "10"), 10);
  const limit = Number.isInteger(limitValue) && limitValue > 0 ? limitValue : 10;
  const dryRun = args.flags.has("dry-run");
  const missing = missingEnv();

  if (dryRun) {
    printJson({
      command: "fitness:followups:process",
      dryRun: true,
      limit,
      localEnvPath: envPath,
      requiredEnvMissing: missing,
      behavior: [
        "Claim pending, failed, or stale processing jobs.",
        "Process a bounded batch.",
        "Record individual job failures in session_follow_up_jobs.",
        "Exit nonzero only for processor/system failure.",
      ],
    });
    return;
  }

  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}. Set them in ${envPath} or the current shell.`);
  }

  const client = createServiceRoleClient();
  const result = await processSessionFollowUpJobBatch({
    client,
    limit,
  });

  printJson({
    command: "fitness:followups:process",
    ...result,
  });
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
