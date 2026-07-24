#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  assertExpectedFitnessSupabaseHost,
  mergeEnvFileWithShell,
  parseDotenvFile,
  resolveEnvFilePath,
} from "./env-file.mjs";

const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const FALLBACK_SUPABASE_URL_ENV = "SUPABASE_URL";
const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";
export const DEFAULT_STATUS = "new";
export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;
export const DEFAULT_MARKDOWN_OUT = "runtime/discord-feedback/latest.md";
export const DEFAULT_JSON_OUT = "runtime/discord-feedback/latest.json";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..");
export const DISCORD_FEEDBACK_EXPORTS_DOC_PATH = path.join(repoRoot, "docs", "ops", "FITNESS-DISCORD-FEEDBACK-EXPORTS.md");
const envPath = resolveEnvFilePath(repoRoot);
const fileEnv = parseDotenvFile(envPath);
const resolvedEnv = mergeEnvFileWithShell({ fileEnv, shellEnv: process.env });

Object.assign(process.env, resolvedEnv);

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    status: DEFAULT_STATUS,
    limit: DEFAULT_LIMIT,
    format: "markdown",
    out: null,
    debug: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--status") {
      args.status = argv[index + 1] ?? DEFAULT_STATUS;
      index += 1;
      continue;
    }

    if (token === "--limit") {
      const parsedLimit = Number.parseInt(argv[index + 1] ?? "", 10);
      if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
        args.limit = Math.min(parsedLimit, MAX_LIMIT);
      }
      index += 1;
      continue;
    }

    if (token === "--json") {
      args.format = "json";
      continue;
    }

    if (token === "--markdown") {
      args.format = "markdown";
      continue;
    }

    if (token === "--out") {
      args.out = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (token === "--debug") {
      args.debug = true;
    }
  }

  return args;
}

function getRequiredEnv(name) {
  const value = getOptionalEnv(name);
  if (!value) {
    throw new Error(`Missing required env: ${name}. Set it in ${envPath} or the current shell.`);
  }

  return value;
}

function getOptionalEnv(name) {
  const fileValue = resolvedEnv[name]?.trim();
  if (fileValue) {
    return fileValue;
  }
  return null;
}

function getOptionalGuildId() {
  const value = getOptionalEnv("DISCORD_GUILD_ID");
  return value && /^[0-9]{5,32}$/.test(value) ? value : null;
}

function getSupabaseUrl() {
  const value = getOptionalEnv(SUPABASE_URL_ENV) || getOptionalEnv(FALLBACK_SUPABASE_URL_ENV);
  if (!value) {
    throw new Error(`Missing required env: ${SUPABASE_URL_ENV} or ${FALLBACK_SUPABASE_URL_ENV}. Set it in ${envPath} or the current shell.`);
  }

  return value;
}

function createServiceClient() {
  assertExpectedFitnessSupabaseHost({
    env: resolvedEnv,
    commandName: "discord feedback export",
  });

  return createClient(getSupabaseUrl(), getRequiredEnv(SUPABASE_SERVICE_ROLE_KEY_ENV), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function resolveOutputPath(out, format) {
  const target = out ?? (format === "json" ? DEFAULT_JSON_OUT : DEFAULT_MARKDOWN_OUT);
  return path.isAbsolute(target) ? target : path.join(repoRoot, target);
}

export function maskDiscordUserId(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  return normalized.length <= 4
    ? `${"*".repeat(Math.max(normalized.length - 1, 0))}${normalized.slice(-1)}`
    : `${"*".repeat(normalized.length - 4)}${normalized.slice(-4)}`;
}

export function toExportRecord(row, debug = false) {
  const guildId = getOptionalGuildId();
  const forumThreadId = typeof row.discord_forum_thread_id === "string" ? row.discord_forum_thread_id : null;

  return {
    id: row.id,
    report_type: row.report_type ?? "bug",
    created_at: row.created_at,
    last_seen_at: row.last_seen_at,
    status: row.status,
    status_updated_at: row.status_updated_at ?? null,
    severity: row.severity,
    area: row.area,
    reporter_member_number: row.reporter_member_number,
    reporter_discord_user_id: debug ? row.reporter_discord_user_id : undefined,
    reporter_discord_user_id_masked: debug ? undefined : maskDiscordUserId(row.reporter_discord_user_id),
    summary: row.summary,
    details: row.details,
    steps: row.steps_to_reproduce,
    screenshot_url: row.screenshot_url,
    duplicate_count: row.duplicate_count,
    duplicate_fingerprint: row.duplicate_fingerprint,
    discord_forum_channel_id: row.discord_forum_channel_id ?? null,
    discord_forum_thread_id: forumThreadId,
    discord_forum_title: row.discord_forum_title ?? null,
    discord_forum_thread_link: guildId && forumThreadId
      ? `https://discord.com/channels/${guildId}/${forumThreadId}`
      : null,
  };
}

export function renderMarkdown(records, filterStatus, limit) {
  const lines = [
    "# Discord feedback reports",
    "",
    `- Generated: ${new Date().toISOString()}`,
    `- Status filter: ${filterStatus}`,
    `- Limit: ${limit}`,
    "",
  ];

  if (records.length === 0) {
    lines.push("No feedback reports matched the current filter.");
    return `${lines.join("\n")}\n`;
  }

  for (const record of records) {
    lines.push(`## ${record.summary}`);
    lines.push(`- id: ${record.id}`);
    lines.push(`- report_type: ${record.report_type}`);
    lines.push(`- created_at: ${record.created_at}`);
    lines.push(`- last_seen_at: ${record.last_seen_at}`);
    lines.push(`- status: ${record.status}`);
    lines.push(`- status_updated_at: ${record.status_updated_at ?? "None"}`);
    lines.push(`- severity: ${record.severity}`);
    lines.push(`- area: ${record.area ?? "Unspecified"}`);
    lines.push(`- reporter_member_number: ${record.reporter_member_number ?? "Unlinked"}`);
    if (record.reporter_discord_user_id) {
      lines.push(`- reporter_discord_user_id: ${record.reporter_discord_user_id}`);
    }
    if (record.reporter_discord_user_id_masked) {
      lines.push(`- reporter_discord_user_id_masked: ${record.reporter_discord_user_id_masked}`);
    }
    lines.push(`- duplicate_count: ${record.duplicate_count ?? 1}`);
    lines.push(`- duplicate_fingerprint: ${record.duplicate_fingerprint ?? "None"}`);
    lines.push(`- discord_forum_title: ${record.discord_forum_title ?? "None"}`);
    lines.push(`- discord_forum_thread_id: ${record.discord_forum_thread_id ?? "None"}`);
    lines.push(`- discord_forum_thread_link: ${record.discord_forum_thread_link ?? "None"}`);
    lines.push(`- screenshot_url: ${record.screenshot_url ?? "None"}`);
    lines.push("");
    lines.push("Details:");
    lines.push(record.details ?? "None");
    lines.push("");
    lines.push("Steps:");
    lines.push(record.steps ?? "None");
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export async function exportDiscordBugReports({
  client = createServiceClient(),
  args = parseArgs(),
} = {}) {
  const { data, error } = await client
    .from("discord_feedback_reports")
    .select([
      "id",
      "report_type",
      "created_at",
      "last_seen_at",
      "status",
      "status_updated_at",
      "severity",
      "area",
      "reporter_member_number",
      "reporter_discord_user_id",
      "summary",
      "details",
      "steps_to_reproduce",
      "screenshot_url",
      "duplicate_count",
      "duplicate_fingerprint",
      "discord_forum_channel_id",
      "discord_forum_thread_id",
      "discord_forum_title",
    ].join(", "))
    .eq("status", args.status)
    .order("last_seen_at", { ascending: false })
    .limit(args.limit);

  if (error) {
    throw new Error(`Unable to load discord_feedback_reports: ${error.message}`);
  }

  const records = (data ?? []).map((row) => toExportRecord(row, args.debug));
  const outputPath = resolveOutputPath(args.out, args.format);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (args.format === "json") {
    fs.writeFileSync(outputPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  } else {
    fs.writeFileSync(outputPath, renderMarkdown(records, args.status, args.limit), "utf8");
  }

  console.log(`Exported ${records.length} Discord feedback report${records.length === 1 ? "" : "s"} to ${outputPath}`);
  return { count: records.length, outputPath, records };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  exportDiscordBugReports().catch((error) => {
    console.error(`export-discord-feedback-reports failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
