#!/usr/bin/env node
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envPath = resolveEnvFilePath(repoRoot);
const fileEnv = parseDotenvFile(envPath);
const explicitEnvFileOverride = Boolean(process.env.FITNESS_ENV_FILE?.trim());

for (const [key, value] of Object.entries(fileEnv)) {
  if (explicitEnvFileOverride || !process.env[key]) {
    process.env[key] = value;
  }
}

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_API_USER_AGENT = "fawxzzy-fitness-feedback-reaction-sync/1.0";
export const DISCORD_RESOLVED_REACTION_EMOJI = String.fromCodePoint(0x2705);
export const DEFAULT_STATUSES = ["fixed"];
const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const FALLBACK_SUPABASE_URL_ENV = "SUPABASE_URL";

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    apply: false,
    debug: false,
    includeTesting: false,
    limit: 25,
    reportId: null,
    statuses: [...DEFAULT_STATUSES],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--apply") {
      args.apply = true;
      continue;
    }

    if (token === "--debug") {
      args.debug = true;
      continue;
    }

    if (token === "--include-testing") {
      args.includeTesting = true;
      continue;
    }

    if (token === "--limit") {
      const value = Number.parseInt(argv[index + 1] ?? "", 10);
      if (Number.isFinite(value) && value > 0) {
        args.limit = Math.min(value, 100);
      }
      index += 1;
      continue;
    }

    if (token === "--report-id") {
      args.reportId = (argv[index + 1] ?? "").trim() || null;
      index += 1;
      continue;
    }

    if (token === "--status") {
      args.statuses = (argv[index + 1] ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      index += 1;
      continue;
    }
  }

  if (args.statuses.length === 0) {
    args.statuses = [...DEFAULT_STATUSES];
  }

  return args;
}

function createServiceClient() {
  return createClient(getSupabaseUrl(), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function loadResolvedReports(args, { client = createServiceClient() } = {}) {
  let query = client
    .from("discord_feedback_reports")
    .select("id,status,report_type,area,summary,details,discord_forum_channel_id,discord_forum_thread_id,discord_forum_message_id,completion_review_status");

  if (args.reportId && isUuidLike(args.reportId)) {
    query = query.eq("id", args.reportId);
  } else if (args.statuses.length === 1) {
    query = query.eq("status", args.statuses[0]);
  } else {
    query = query.in("status", args.statuses);
  }

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(args.limit);

  if (error || !Array.isArray(data)) {
    throw new Error(`Unable to load discord_feedback_reports: ${error?.message ?? "unknown error"}`);
  }

  let reports = data
    .filter((report) => typeof report?.id === "string")
    .map((report) => ({
      id: report.id,
      status: typeof report.status === "string" ? report.status : null,
      reportType: typeof report.report_type === "string" ? report.report_type : null,
      area: typeof report.area === "string" ? report.area : null,
      summary: typeof report.summary === "string" ? report.summary : null,
      details: typeof report.details === "string" ? report.details : null,
      forumChannelId: typeof report.discord_forum_channel_id === "string" ? report.discord_forum_channel_id : null,
      threadId: typeof report.discord_forum_thread_id === "string" ? report.discord_forum_thread_id : null,
      messageId: typeof report.discord_forum_message_id === "string" ? report.discord_forum_message_id : null,
      completionReviewStatus: typeof report.completion_review_status === "string" ? report.completion_review_status : null,
    }));

  if (args.reportId && !isUuidLike(args.reportId)) {
    const prefix = args.reportId.toLowerCase();
    reports = reports.filter((report) => report.id.toLowerCase().startsWith(prefix));
  }

  if (!args.includeTesting) {
    reports = reports.filter((report) => !isTestingReport(report));
  }

  return reports;
}

function isTestingReport(report) {
  const testingForumChannelId = process.env.DISCORD_FEEDBACK_TESTING_FORUM_CHANNEL_ID?.trim() || null;
  if (testingForumChannelId && report.forumChannelId === testingForumChannelId) {
    return true;
  }

  const area = String(report.area ?? "").trim().toLowerCase();
  const summary = String(report.summary ?? "").trim().toLowerCase();
  const details = String(report.details ?? "").trim().toLowerCase();
  const combined = `${area} ${summary} ${details}`;

  if (area === "discord feedback qa" || area === "feedback testing") {
    return true;
  }

  return combined.includes("feedback canary") || combined.includes("canonical discord feedback canary");
}

export async function applyResolvedReaction(report, { fetchImpl = fetch } = {}) {
  const botToken = getRequiredEnv("DISCORD_BOT_TOKEN");
  const emojiPath = encodeURIComponent(DISCORD_RESOLVED_REACTION_EMOJI);
  const response = await fetchImpl(
    `${DISCORD_API_BASE_URL}/channels/${report.threadId}/messages/${report.messageId}/reactions/${emojiPath}/@me`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
        "User-Agent": DISCORD_API_USER_AGENT,
      },
    },
  );

  const data = await parseJson(response);
  return {
    ok: response.ok && response.status === 204,
    status: response.status,
    message: data && typeof data === "object" && "message" in data ? String(data.message ?? "") : null,
  };
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 300) };
  }
}

export async function syncResolvedReactions(args, { client = createServiceClient(), fetchImpl = fetch, logger = console } = {}) {
  const reports = await loadResolvedReports(args, { client });
  const actionable = reports.filter((report) => report.threadId && report.messageId);
  const skippedMissingMessageIds = reports.length - actionable.length;
  const summary = {
    apply: args.apply,
    totalReports: reports.length,
    actionableReports: actionable.length,
    skippedMissingMessageIds,
    attempted: 0,
    applied: 0,
    failed: 0,
    failures: [],
  };

  if (!args.apply) {
    logger.log(`feedback:sync-resolved-reactions dry-run -> ${actionable.length} report(s) would be checked.`);
    if (skippedMissingMessageIds > 0) {
      logger.log(`Skipped ${skippedMissingMessageIds} report(s) without both forum thread and starter message ids.`);
    }
    if (args.debug) {
      for (const report of actionable) {
        logger.log(`would-react ${report.id} status=${report.status ?? "unknown"} thread=${report.threadId} message=${report.messageId}`);
      }
    }
    return summary;
  }

  for (const report of actionable) {
    summary.attempted += 1;
    const result = await applyResolvedReaction(report, { fetchImpl });
    if (result.ok) {
      summary.applied += 1;
      if (args.debug) {
        logger.log(`applied ${report.id}`);
      }
      continue;
    }

    summary.failed += 1;
    summary.failures.push({
      reportId: report.id,
      status: result.status,
      message: result.message,
    });
    logger.warn(`resolved reaction failed for ${report.id}: ${result.status}${result.message ? ` ${result.message}` : ""}`);
  }

  logger.log(`feedback:sync-resolved-reactions applied ${summary.applied}/${summary.attempted} reaction(s).`);
  return summary;
}

async function main() {
  const args = parseArgs();
  await syncResolvedReactions(args);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`sync-feedback-resolved-reactions failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
