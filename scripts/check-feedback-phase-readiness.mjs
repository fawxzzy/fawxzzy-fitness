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
const discordApiBaseUrl = "https://discord.com/api/v10";
const resolvedReactionEmojiName = "fawxzzy";
const resolvedReactionEmojiId = "1507384062166302851";
const resolvedReactionLabel = `${resolvedReactionEmojiName}:${resolvedReactionEmojiId}`;

for (const [key, value] of Object.entries(fileEnv)) {
  if (explicitEnvFileOverride || !process.env[key]) {
    process.env[key] = value;
  }
}

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
  const value = getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL") || getOptionalEnv("SUPABASE_URL");
  if (!value) {
    throw new Error(`Missing required env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL. Set it in ${envPath} or the current shell.`);
  }

  return value;
}

function createServiceClient() {
  return createClient(getSupabaseUrl(), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    reportId: null,
    requires: null,
    debug: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--report-id") {
      args.reportId = (argv[index + 1] ?? "").trim() || null;
      index += 1;
      continue;
    }

    if (token === "--requires") {
      args.requires = (argv[index + 1] ?? "").trim() || null;
      index += 1;
      continue;
    }

    if (token === "--debug") {
      args.debug = true;
    }
  }

  if (!args.reportId || !args.requires) {
    throw new Error("Usage: npm run feedback:phase:check -- --report-id <next-card> --requires <previous-card>");
  }

  return args;
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

async function discordRequest(pathname, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${discordApiBaseUrl}${pathname}`, {
    method: "GET",
    headers: {
      Authorization: `Bot ${getRequiredEnv("DISCORD_BOT_TOKEN")}`,
      "Content-Type": "application/json",
      "User-Agent": "fawxzzy-fitness-feedback-phase-readiness/1.0",
    },
  });

  return {
    ok: response.ok,
    status: response.status,
    data: await parseJson(response),
  };
}

export async function loadFeedbackReportByIdOrPrefix(reportIdOrPrefix, { client = createServiceClient() } = {}) {
  const { data, error } = await client
    .from("discord_feedback_reports")
    .select("id,status,completion_review_status,discord_forum_thread_id,discord_forum_message_id,summary")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error || !Array.isArray(data)) {
    throw new Error(`Unable to load discord_feedback_reports: ${error?.message ?? "unknown error"}`);
  }

  const normalized = String(reportIdOrPrefix).trim().toLowerCase();
  const matches = data.filter((row) => {
    const id = String(row.id ?? "").toLowerCase();
    return isUuidLike(normalized) ? id === normalized : id.startsWith(normalized);
  });

  if (matches.length === 0) {
    throw new Error(`No feedback report matched ${reportIdOrPrefix}.`);
  }

  if (matches.length > 1) {
    throw new Error(`Feedback report prefix ${reportIdOrPrefix} matched multiple rows. Use the full id.`);
  }

  return matches[0];
}

export async function reportHasResolvedReaction(report, { fetchImpl = fetch } = {}) {
  if (!report.discord_forum_thread_id || !report.discord_forum_message_id) {
    return {
      ok: false,
      reason: "starter post ids are missing",
    };
  }

  const result = await discordRequest(
    `/channels/${report.discord_forum_thread_id}/messages/${report.discord_forum_message_id}`,
    { fetchImpl },
  );

  if (!result.ok) {
    return {
      ok: false,
      reason: `Discord starter post lookup failed (${result.status})`,
    };
  }

  const reactions = Array.isArray(result.data?.reactions) ? result.data.reactions : [];
  const hasResolvedReaction = reactions.some((reaction) => String(reaction?.emoji?.id ?? "") === resolvedReactionEmojiId);
  return hasResolvedReaction
    ? { ok: true, reason: null }
    : { ok: false, reason: `starter post is missing ${resolvedReactionLabel}` };
}

export async function checkFeedbackPhaseReadiness(args, { client = createServiceClient(), fetchImpl = fetch, logger = console } = {}) {
  const nextReport = await loadFeedbackReportByIdOrPrefix(args.reportId, { client });
  const requiredReport = await loadFeedbackReportByIdOrPrefix(args.requires, { client });
  const failures = [];

  if (requiredReport.status !== "fixed") {
    failures.push(`required prior card ${requiredReport.id} is not fixed/completed (status=${requiredReport.status ?? "unknown"})`);
  }

  if (requiredReport.completion_review_status !== "approved") {
    failures.push(`required prior card ${requiredReport.id} is not completion-review approved (completion_review_status=${requiredReport.completion_review_status ?? "unknown"})`);
  }

  const resolvedReactionResult = await reportHasResolvedReaction(requiredReport, { fetchImpl });
  if (!resolvedReactionResult.ok) {
    failures.push(`required prior card ${requiredReport.id} is missing the resolved ${resolvedReactionLabel} reaction: ${resolvedReactionResult.reason}`);
  }

  if (args.debug) {
    logger.log(JSON.stringify({
      nextReportId: nextReport.id,
      requiredReportId: requiredReport.id,
      requiredStatus: requiredReport.status,
      requiredCompletionReviewStatus: requiredReport.completion_review_status,
      resolvedReaction: resolvedReactionResult.ok,
      resolvedReactionReason: resolvedReactionResult.reason,
    }, null, 2));
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      logger.error(`feedback:phase:check failed -> ${failure}`);
    }

    return {
      ok: false,
      failures,
      nextReport,
      requiredReport,
    };
  }

  logger.log(`feedback:phase:check passed -> ${requiredReport.id} is fixed, reviewed, and reacted; ${nextReport.id} can advance.`);
  return {
    ok: true,
    failures: [],
    nextReport,
    requiredReport,
  };
}

async function main() {
  const args = parseArgs();
  const result = await checkFeedbackPhaseReadiness(args);
  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`check-feedback-phase-readiness failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
