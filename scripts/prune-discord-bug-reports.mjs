#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";

const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const FALLBACK_SUPABASE_URL_ENV = "SUPABASE_URL";
const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";
export const DEFAULT_PRUNE_STATUS_DAYS = {
  spam: 7,
  duplicate: 30,
  closed: 90,
};
export const DEFAULT_LIMIT = 100;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..");
const envPath = resolveEnvFilePath(repoRoot);
const fileEnv = parseDotenvFile(envPath);
const explicitEnvFileOverride = Boolean(process.env.FITNESS_ENV_FILE?.trim());

for (const [key, value] of Object.entries(fileEnv)) {
  if (explicitEnvFileOverride || !process.env[key]) {
    process.env[key] = value;
  }
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    apply: false,
    olderThanDays: null,
    statuses: ["spam", "duplicate", "closed"],
    limit: DEFAULT_LIMIT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--apply") {
      args.apply = true;
      continue;
    }

    if (token === "--older-than-days") {
      const parsedDays = Number.parseInt(argv[index + 1] ?? "", 10);
      if (Number.isInteger(parsedDays) && parsedDays > 0) {
        args.olderThanDays = parsedDays;
      }
      index += 1;
      continue;
    }

    if (token === "--status") {
      const rawStatuses = (argv[index + 1] ?? "").split(",");
      const parsedStatuses = rawStatuses
        .map((value) => value.trim())
        .filter((value) => value === "spam" || value === "duplicate" || value === "closed");
      if (parsedStatuses.length > 0) {
        args.statuses = parsedStatuses;
      }
      index += 1;
      continue;
    }

    if (token === "--limit") {
      const parsedLimit = Number.parseInt(argv[index + 1] ?? "", 10);
      if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
        args.limit = parsedLimit;
      }
      index += 1;
    }
  }

  return args;
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}. Set it in ${envPath} or the current shell.`);
  }

  return value;
}

function getOptionalEnv(name) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function getSupabaseUrl() {
  const value = getOptionalEnv(SUPABASE_URL_ENV) || getOptionalEnv(FALLBACK_SUPABASE_URL_ENV);
  if (!value) {
    throw new Error(`Missing required env: ${SUPABASE_URL_ENV} or ${FALLBACK_SUPABASE_URL_ENV}. Set it in ${envPath} or the current shell.`);
  }

  return value;
}

function createServiceClient() {
  return createClient(getSupabaseUrl(), getRequiredEnv(SUPABASE_SERVICE_ROLE_KEY_ENV), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function resolveStatusCutoffDays(status, olderThanDays) {
  return olderThanDays ?? DEFAULT_PRUNE_STATUS_DAYS[status];
}

function buildCutoffIso(now, days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function collectPruneCandidates({ client, status, olderThanDays, limit, now }) {
  const cutoffIso = buildCutoffIso(now, resolveStatusCutoffDays(status, olderThanDays));
  const { data, error } = await client
    .from("discord_feedback_reports")
    .select("id, status, last_seen_at")
    .eq("status", status)
    .lt("last_seen_at", cutoffIso)
    .order("last_seen_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to load prune candidates for ${status}: ${error.message}`);
  }

  return {
    status,
    cutoffIso,
    rows: data ?? [],
  };
}

export async function runPruneDiscordBugReports({
  client = createServiceClient(),
  args = parseArgs(),
  now = new Date(),
} = {}) {
  const summaries = [];
  let deletedCount = 0;

  for (const status of args.statuses) {
    const summary = await collectPruneCandidates({
      client,
      status,
      olderThanDays: args.olderThanDays,
      limit: args.limit,
      now,
    });

    if (args.apply && summary.rows.length > 0) {
      const ids = summary.rows
        .map((row) => row.id)
        .filter((value) => typeof value === "string");

      if (ids.length > 0) {
        const { error } = await client
          .from("discord_feedback_reports")
          .delete()
          .in("id", ids);

        if (error) {
          throw new Error(`Unable to prune ${status} feedback reports: ${error.message}`);
        }

        deletedCount += ids.length;
      }
    }

    summaries.push({
      status,
      cutoffIso: summary.cutoffIso,
      matched: summary.rows.length,
      deleted: args.apply ? summary.rows.length : 0,
    });
  }

  console.log(`Discord feedback report prune mode: ${args.apply ? "apply" : "dry-run"}`);
  console.log(`Statuses: ${args.statuses.join(", ")}`);
  console.log(`Limit per status: ${args.limit}`);
  for (const summary of summaries) {
    console.log(`${summary.status}: matched ${summary.matched}, deleted ${summary.deleted}, cutoff ${summary.cutoffIso}`);
  }

  if (!args.apply) {
    console.log("Dry run only. Re-run with --apply to delete matching rows.");
  }

  return {
    summaries,
    deletedCount,
    apply: args.apply,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runPruneDiscordBugReports().catch((error) => {
    console.error(`prune-discord-feedback-reports failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
