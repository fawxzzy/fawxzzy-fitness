#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDotenvFiles, resolveEnvFilePaths } from "./env-file.mjs";
import { processExactPendingSessionFollowUpGroup } from "../src/lib/session-follow-up-jobs.ts";

const MASTER_HOST = "bxtcuhkotumitoqtrcej.supabase.co";
const INCIDENT_CREATED_AT = "2026-10-17T03:09:55.111465Z";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";
const REQUIRED_ALIASES = [
  "lib/exercise-stats.ts",
  "lib/feature-flags.ts",
  "lib/ecosystem/fitness-integration-server.ts",
];
let providerBoundaryEntered = false;

function assertRuntimeAliases() {
  for (const sourcePath of REQUIRED_ALIASES) {
    const specifier = `@/${sourcePath.replace(/\.ts$/, "")}`;
    const expected = pathToFileURL(path.join(REPO_ROOT, "src", sourcePath)).href;
    let resolved;
    try {
      resolved = import.meta.resolve(specifier);
    } catch {
      throw new Error("EXACT_FOLLOW_UP_RUNTIME_ALIAS_HOLD");
    }
    if (resolved !== expected) {
      throw new Error("EXACT_FOLLOW_UP_RUNTIME_ALIAS_HOLD");
    }
  }
}

async function assertHandlerImportsReady() {
  await Promise.all([
    import("@/lib/ecosystem/fitness-integration-server"),
    import("@/lib/exercise-stats"),
    import("@/lib/feature-flags"),
    import("@/lib/workout-recap"),
  ]);
}

async function main() {
  const [mode, createdAt, ...extra] = process.argv.slice(2);
  if (path.resolve(process.cwd()) !== REPO_ROOT) {
    throw new Error("EXACT_FOLLOW_UP_WORKDIR_HOLD");
  }
  if (mode === "--preflight-runtime" && createdAt === undefined && extra.length === 0) {
    assertRuntimeAliases();
    await assertHandlerImportsReady();
    process.stdout.write("EXACT_FOLLOW_UP_RUNTIME_READY\n");
    return;
  }
  if (mode !== "--execute-exact-incident" || extra.length || createdAt !== INCIDENT_CREATED_AT) {
    throw new Error("EXACT_FOLLOW_UP_USAGE_HOLD");
  }
  // Resolve every handler alias before the first service-role job claim.
  assertRuntimeAliases();
  await assertHandlerImportsReady();
  const env = { ...process.env, ...parseDotenvFiles(resolveEnvFilePaths(REPO_ROOT)) };
  const url = env[SUPABASE_URL_ENV]?.trim();
  if (!url || new URL(url).hostname !== MASTER_HOST) {
    throw new Error("EXACT_FOLLOW_UP_TARGET_HOLD");
  }
  const key = env[SERVICE_ROLE_KEY_ENV]?.trim();
  if (!key) throw new Error("EXACT_FOLLOW_UP_CREDENTIAL_HOLD");
  // This runner must never invoke the QA helper's dependency installer before a claim.
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, key, {
    db: { schema: "fitness" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  providerBoundaryEntered = true;
  const result = await processExactPendingSessionFollowUpGroup({
    client,
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

main().catch((error) => {
  process.stderr.write(error instanceof Error && error.message === "EXACT_FOLLOW_UP_RUNTIME_ALIAS_HOLD"
    ? "EXACT_FOLLOW_UP_RUNTIME_ALIAS_HOLD\n"
    : providerBoundaryEntered ? "EXACT_FOLLOW_UP_ATTEMPT_UNCERTAIN_OR_HELD\n"
      : "EXACT_FOLLOW_UP_PRECLAIM_HOLD\n");
  process.exitCode = 1;
});
