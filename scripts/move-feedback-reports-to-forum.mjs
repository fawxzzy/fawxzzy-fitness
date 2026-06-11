#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";

const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const FALLBACK_SUPABASE_URL_ENV = "SUPABASE_URL";
const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";
const DISCORD_BOT_TOKEN_ENV = "DISCORD_BOT_TOKEN";
const DISCORD_FORUM_MAX_APPLIED_TAGS = 5;
const SELECT_COLUMNS = [
  "id",
  "report_type",
  "status",
  "severity",
  "effort_points",
  "card_id",
  "card_phase",
  "card_priority",
  "depends_on",
  "dependency_notes",
  "area",
  "summary",
  "details",
  "steps_to_reproduce",
  "screenshot_url",
  "attachment_count",
  "attachment_metadata",
  "attachment_pruned",
  "reporter_discord_user_id",
  "reporter_discord_username",
  "reporter_member_number",
  "duplicate_count",
  "discord_forum_channel_id",
  "discord_forum_thread_id",
  "discord_forum_message_id",
  "discord_forum_applied_tag_ids",
  "discord_forum_title",
  "created_at",
  "updated_at",
  "last_seen_at",
].join(", ");

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

let feedbackHelpersPromise = null;

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    apply: false,
    debug: false,
    archiveSource: false,
    targetForumId: null,
    reportIds: [],
    cardIds: [],
    cardIdPrefixes: [],
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

    if (token === "--archive-source") {
      args.archiveSource = true;
      continue;
    }

    if (token === "--target-forum-id") {
      const value = String(argv[index + 1] ?? "").trim();
      args.targetForumId = value || null;
      index += 1;
      continue;
    }

    if (token === "--report-id") {
      args.reportIds.push(
        ...String(argv[index + 1] ?? "")
          .split(",")
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean),
      );
      index += 1;
      continue;
    }

    if (token === "--card-id") {
      args.cardIds.push(
        ...String(argv[index + 1] ?? "")
          .split(",")
          .map((value) => value.trim().toUpperCase())
          .filter(Boolean),
      );
      index += 1;
      continue;
    }

    if (token === "--card-id-prefix") {
      args.cardIdPrefixes.push(
        ...String(argv[index + 1] ?? "")
          .split(",")
          .map((value) => value.trim().toUpperCase())
          .filter(Boolean),
      );
      index += 1;
      continue;
    }
  }

  args.reportIds = [...new Set(args.reportIds)];
  args.cardIds = [...new Set(args.cardIds)];
  args.cardIdPrefixes = [...new Set(args.cardIdPrefixes)];
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

async function loadFeedbackForumHelpers() {
  if (!feedbackHelpersPromise) {
    register("./test-alias-loader.mjs", pathToFileURL(`${scriptDir}${path.sep}`));
    feedbackHelpersPromise = import(pathToFileURL(path.join(repoRoot, "src", "lib", "discord", "bug-reports.ts")).href)
      .then((module) => ({
        buildBody: module.buildDiscordBugForumThreadBody,
        buildReporterLabel: module.buildDiscordBugReporterLabel,
        buildTagNames: module.buildDiscordBugForumTagNames,
        buildTitle: module.buildDiscordBugForumThreadTitle,
        formatShortId: module.formatDiscordBugReportShortId,
        shouldApplyBacklogTag: module.shouldApplyDiscordFeedbackBacklogTag,
      }));
  }

  return feedbackHelpersPromise;
}

function buildAllowedMentions() {
  return {
    parse: [],
    users: [],
    roles: [],
    replied_user: false,
  };
}

async function parseDiscordJson(response) {
  const responseText = await response.text();
  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return { message: responseText.slice(0, 300) };
  }
}

function getDiscordRetryAfterMs(data) {
  const retryAfterSeconds = typeof data?.retry_after === "number" ? data.retry_after : null;
  if (retryAfterSeconds === null || Number.isNaN(retryAfterSeconds)) {
    return null;
  }

  return Math.max(250, Math.ceil(retryAfterSeconds * 1000));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createDiscordApi(fetchImpl = globalThis.fetch) {
  return {
    async resolveTagIdsByName({ channelId, tagNames }) {
      const response = await fetchImpl(`https://discord.com/api/v10/channels/${channelId}`, {
        method: "GET",
        headers: {
          Authorization: `Bot ${getRequiredEnv(DISCORD_BOT_TOKEN_ENV)}`,
          "Content-Type": "application/json",
          "User-Agent": "fawxzzy-fitness-feedback-move/1.0",
        },
      });
      const data = await parseDiscordJson(response);

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          message: data && typeof data === "object" && "message" in data ? String(data.message ?? response.statusText) : response.statusText,
          retryAfterMs: response.status === 429 ? getDiscordRetryAfterMs(data) : null,
          matchedTagIds: [],
          missingTagNames: [],
        };
      }

      const availableTags = Array.isArray(data?.available_tags)
        ? data.available_tags.filter((tag) => typeof tag?.id === "string" && typeof tag?.name === "string")
        : [];
      const matchedTagIds = [];
      const missingTagNames = [];

      for (const tagName of tagNames) {
        const normalizedTagName = String(tagName ?? "").trim().toLowerCase();
        if (!normalizedTagName) {
          continue;
        }

        const match = availableTags.find((tag) => tag.name.trim().toLowerCase() === normalizedTagName);
        if (match) {
          matchedTagIds.push(match.id);
        } else {
          missingTagNames.push(tagName);
        }
      }

      return {
        ok: true,
        matchedTagIds: [...new Set(matchedTagIds)].slice(0, DISCORD_FORUM_MAX_APPLIED_TAGS),
        missingTagNames,
      };
    },
    async createForumThread({ channelId, threadName, messageContent, appliedTagIds }) {
      const response = await fetchImpl(`https://discord.com/api/v10/channels/${channelId}/threads`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${getRequiredEnv(DISCORD_BOT_TOKEN_ENV)}`,
          "Content-Type": "application/json",
          "User-Agent": "fawxzzy-fitness-feedback-move/1.0",
        },
        body: JSON.stringify({
          name: threadName,
          message: {
            content: messageContent,
            allowed_mentions: buildAllowedMentions(),
          },
          applied_tags: Array.isArray(appliedTagIds) && appliedTagIds.length > 0
            ? appliedTagIds.slice(0, DISCORD_FORUM_MAX_APPLIED_TAGS)
            : undefined,
        }),
      });
      const data = await parseDiscordJson(response);

      return response.ok
        ? {
          ok: true,
          threadId: typeof data?.id === "string" ? data.id : null,
          messageId: typeof data?.last_message_id === "string" ? data.last_message_id : null,
        }
        : {
          ok: false,
          status: response.status,
          message: data && typeof data === "object" && "message" in data ? String(data.message ?? response.statusText) : response.statusText,
          retryAfterMs: response.status === 429 ? getDiscordRetryAfterMs(data) : null,
        };
    },
    async archiveThread({ threadId }) {
      const response = await fetchImpl(`https://discord.com/api/v10/channels/${threadId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${getRequiredEnv(DISCORD_BOT_TOKEN_ENV)}`,
          "Content-Type": "application/json",
          "User-Agent": "fawxzzy-fitness-feedback-move/1.0",
        },
        body: JSON.stringify({
          archived: true,
          locked: true,
        }),
      });
      const data = await parseDiscordJson(response);

      return response.ok
        ? { ok: true }
        : {
          ok: false,
          status: response.status,
          message: data && typeof data === "object" && "message" in data ? String(data.message ?? response.statusText) : response.statusText,
          retryAfterMs: response.status === 429 ? getDiscordRetryAfterMs(data) : null,
        };
    },
  };
}

async function callDiscordWithRetry(action, maxAttempts = 4) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await action();
    if (result.ok || result.status !== 429 || attempt === maxAttempts) {
      return result;
    }

    await sleep(result.retryAfterMs ?? attempt * 1500);
  }

  return { ok: false, status: 429, message: "Discord rate limit retries exhausted." };
}

export function matchesMoveSelection(row, args) {
  const reportId = typeof row?.id === "string" ? row.id.toLowerCase() : "";
  const cardId = typeof row?.card_id === "string" ? row.card_id.toUpperCase() : "";
  const wantsReportIds = args.reportIds.length > 0;
  const wantsCardIds = args.cardIds.length > 0;
  const wantsCardPrefixes = args.cardIdPrefixes.length > 0;

  if (!wantsReportIds && !wantsCardIds && !wantsCardPrefixes) {
    return false;
  }

  if (wantsReportIds && args.reportIds.some((value) => reportId.startsWith(value))) {
    return true;
  }

  if (cardId) {
    if (wantsCardIds && args.cardIds.includes(cardId)) {
      return true;
    }
    if (wantsCardPrefixes && args.cardIdPrefixes.some((value) => cardId.startsWith(value))) {
      return true;
    }
  }

  return false;
}

async function fetchCandidateRows(client) {
  const { data, error } = await client
    .from("discord_feedback_reports")
    .select(SELECT_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(`Unable to load discord_feedback_reports: ${error.message}`);
  }

  return Array.isArray(data) ? data.filter((row) => typeof row?.id === "string") : [];
}

async function updateForumRefs(client, rowId, values) {
  const { data, error } = await client
    .from("discord_feedback_reports")
    .update(values)
    .eq("id", rowId)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Unable to update forum refs for ${rowId}: ${error?.message ?? "unknown error"}`);
  }
}

export async function runMoveFeedbackReportsToForum({
  client = createServiceClient(),
  args = parseArgs(),
  helpers = null,
  discordApi = createDiscordApi(),
  now = new Date(),
  logger = console,
} = {}) {
  if (!args.targetForumId) {
    throw new Error("Missing required argument: --target-forum-id");
  }

  const resolvedHelpers = helpers ?? await loadFeedbackForumHelpers();
  const candidates = await fetchCandidateRows(client);
  const rows = candidates.filter((row) => matchesMoveSelection(row, args));
  const nowIso = now.toISOString();
  const summary = {
    apply: args.apply,
    targetForumId: args.targetForumId,
    scannedRows: candidates.length,
    selectedRows: rows.length,
    movedRows: 0,
    skippedRows: 0,
    warnings: [],
    failures: [],
    movedReportIds: [],
  };

  for (const row of rows) {
    const shortId = resolvedHelpers.formatShortId(row.id);
    const alreadyTargeted = row.discord_forum_channel_id === args.targetForumId
      && typeof row.discord_forum_thread_id === "string"
      && row.discord_forum_thread_id.trim().length > 0
      && typeof row.discord_forum_message_id === "string"
      && row.discord_forum_message_id.trim().length > 0;

    if (alreadyTargeted) {
      summary.skippedRows += 1;
      if (args.debug) {
        logger.log(`skip ${shortId}: already linked to target forum ${args.targetForumId}`);
      }
      continue;
    }

    const title = resolvedHelpers.buildTitle({
      reportType: row.report_type,
      area: row.area ?? null,
      summary: row.summary,
    });
    const body = resolvedHelpers.buildBody({
      report: row,
      reporterLabel: resolvedHelpers.buildReporterLabel({
        reporterDiscordUsername: row.reporter_discord_username ?? null,
        reporterMemberNumber: row.reporter_member_number ?? null,
      }),
    });
    const tagNames = resolvedHelpers.buildTagNames({
      reportType: row.report_type,
      status: row.status,
      severity: row.severity,
      includeBacklog: resolvedHelpers.shouldApplyBacklogTag(row),
    });
    const tagResolution = await callDiscordWithRetry(() => discordApi.resolveTagIdsByName({
      channelId: args.targetForumId,
      tagNames,
    }));

    if (!tagResolution.ok) {
      summary.failures.push(`${shortId}: target tag resolution failed (${tagResolution.status ?? "unknown"}${tagResolution.message ? ` ${tagResolution.message}` : ""})`);
      continue;
    }

    if (tagResolution.missingTagNames.length > 0) {
      summary.warnings.push(`${shortId}: missing target tags ${tagResolution.missingTagNames.join(", ")}`);
    }

    if (!args.apply) {
      logger.log(`DRY-RUN move ${shortId} (${row.card_id ?? row.summary}) -> ${args.targetForumId}`);
      continue;
    }

    const createResult = await callDiscordWithRetry(() => discordApi.createForumThread({
      channelId: args.targetForumId,
      threadName: title,
      messageContent: body,
      appliedTagIds: tagResolution.matchedTagIds,
    }));

    if (!createResult.ok || !createResult.threadId || !createResult.messageId) {
      summary.failures.push(`${shortId}: target thread create failed (${createResult.status ?? "unknown"}${createResult.message ? ` ${createResult.message}` : ""})`);
      continue;
    }

    try {
      await updateForumRefs(client, row.id, {
        discord_forum_channel_id: args.targetForumId,
        discord_forum_thread_id: createResult.threadId,
        discord_forum_message_id: createResult.messageId,
        discord_forum_title: title,
        discord_forum_applied_tag_ids: tagResolution.matchedTagIds,
        updated_at: nowIso,
        last_seen_at: nowIso,
      });
    } catch (error) {
      summary.failures.push(`${shortId}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    if (
      args.archiveSource
      && typeof row.discord_forum_thread_id === "string"
      && row.discord_forum_thread_id.trim().length > 0
      && row.discord_forum_thread_id !== createResult.threadId
    ) {
      const archiveResult = await callDiscordWithRetry(() => discordApi.archiveThread({
        threadId: row.discord_forum_thread_id,
      }));

      if (!archiveResult.ok) {
        summary.warnings.push(`${shortId}: source archive failed (${archiveResult.status ?? "unknown"}${archiveResult.message ? ` ${archiveResult.message}` : ""})`);
      }
    }

    summary.movedRows += 1;
    summary.movedReportIds.push(row.id);
    if (args.debug) {
      logger.log(`moved ${shortId} -> thread ${createResult.threadId}`);
    }
  }

  logger.log(`feedback:move-to-forum ${args.apply ? "apply" : "dry-run"} -> selected ${summary.selectedRows}, moved ${summary.movedRows}, skipped ${summary.skippedRows}, failures ${summary.failures.length}`);
  if (summary.warnings.length > 0) {
    for (const warning of summary.warnings) {
      logger.warn(warning);
    }
  }
  if (summary.failures.length > 0) {
    for (const failure of summary.failures) {
      logger.error(failure);
    }
  }

  return summary;
}

async function main() {
  await runMoveFeedbackReportsToForum();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`move-feedback-reports-to-forum failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
