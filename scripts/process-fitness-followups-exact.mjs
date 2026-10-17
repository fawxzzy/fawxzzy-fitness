#!/usr/bin/env node
import process from "node:process";
import {
  NEXT_PUBLIC_SUPABASE_URL_ENV,
  createServiceRoleClient,
  getOptionalEnv,
} from "./qa/fitness-qa-config.mjs";
import { processExactPendingSessionFollowUpGroup } from "../src/lib/session-follow-up-jobs.ts";

const MASTER_HOST = "bxtcuhkotumitoqtrcej.supabase.co";
const INCIDENT_CREATED_AT = "2026-10-17T03:09:55.111465Z";

async function main() {
  const [mode, createdAt, ...extra] = process.argv.slice(2);
  if (mode !== "--execute-exact-incident" || extra.length || createdAt !== INCIDENT_CREATED_AT) {
    throw new Error("EXACT_FOLLOW_UP_USAGE_HOLD");
  }
  const url = getOptionalEnv(NEXT_PUBLIC_SUPABASE_URL_ENV);
  if (!url || new URL(url).hostname !== MASTER_HOST) {
    throw new Error("EXACT_FOLLOW_UP_TARGET_HOLD");
  }
  const result = await processExactPendingSessionFollowUpGroup({
    client: createServiceRoleClient(),
    createdAt: INCIDENT_CREATED_AT,
  });
  process.stdout.write(`${JSON.stringify({
    outcome: result.ok ? "COMPLETED" : "PARTIAL_HOLD",
    claimedJobCount: result.claimedJobCount,
    hadFailures: result.hadFailures,
    results: result.results,
  })}\n`);
  if (!result.ok) process.exitCode = 1;
}

main().catch(() => {
  process.stderr.write("EXACT_FOLLOW_UP_ATTEMPT_UNCERTAIN_OR_HELD\n");
  process.exitCode = 1;
});
