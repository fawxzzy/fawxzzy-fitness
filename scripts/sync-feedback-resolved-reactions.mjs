#!/usr/bin/env node
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envPath = resolveEnvFilePath(repoRoot);
const fileEnv = parseDotenvFile(envPath);

for (const [key, value] of Object.entries(fileEnv)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_API_USER_AGENT = "fawxzzy-fitness-feedback-reaction-sync/1.0";
export const DISCORD_RESOLVED_REACTION_EMOJI = String.fromCodePoint(0x2705);
export const DEFAULT_STATUSES = ["fixed", "closed"];

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

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    apply: false,
    debug: false,
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

function buildSupabaseReportsUrl(baseUrl, args) {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/rest/v1/discord_feedback_reports`);
  url.searchParams.set("select", "id,status,discord_forum_thread_id,discord_forum_message_id");
  url.searchParams.set("order", "updated_at.desc");
  url.searchParams.set("limit", String(args.limit));

  if (args.reportId && isUuidLike(args.reportId)) {
    url.searchParams.set("id", `eq.${args.reportId}`);
  } else if (args.statuses.length === 1) {
    url.searchParams.set("status", `eq.${args.statuses[0]}`);
  } else {
    url.searchParams.set("status", `in.(${args.statuses.join(",")})`);
  }

  return url.toString();
}

export async function loadResolvedReports(args, { fetchImpl = fetch } = {}) {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetchImpl(buildSupabaseReportsUrl(supabaseUrl, args), {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
    },
  });

  const data = await parseJson(response);
  if (!response.ok || !Array.isArray(data)) {
    throw new Error(`Unable to load discord_feedback_reports: ${response.status} ${response.statusText}`);
  }

  let reports = data
    .filter((report) => typeof report?.id === "string")
    .map((report) => ({
      id: report.id,
      status: typeof report.status === "string" ? report.status : null,
      threadId: typeof report.discord_forum_thread_id === "string" ? report.discord_forum_thread_id : null,
      messageId: typeof report.discord_forum_message_id === "string" ? report.discord_forum_message_id : null,
    }));

  if (args.reportId && !isUuidLike(args.reportId)) {
    const prefix = args.reportId.toLowerCase();
    reports = reports.filter((report) => report.id.toLowerCase().startsWith(prefix));
  }

  return reports;
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

export async function syncResolvedReactions(args, { fetchImpl = fetch, logger = console } = {}) {
  const reports = await loadResolvedReports(args, { fetchImpl });
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
