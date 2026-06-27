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

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;
export const DEFAULT_STATUSES = ["new", "needs_info", "confirmed", "fawxzzy_review", "in_progress", "fixed", "closed"];
const DISCORD_FORUM_MAX_APPLIED_TAGS = 5;
const VALID_STATUSES = new Set(DEFAULT_STATUSES);
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

const DISCORD_FORUM_SYNC_SELECT_COLUMNS = [
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
  "updated_at",
  "last_seen_at",
].join(", ");

let feedbackHelpersPromise = null;

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    apply: false,
    limit: DEFAULT_LIMIT,
    statuses: [...DEFAULT_STATUSES],
    reportId: null,
    debug: false,
    includeTesting: false,
    noAuditComment: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--apply") {
      args.apply = true;
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

    if (token === "--status") {
      const parsedStatuses = String(argv[index + 1] ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter((value) => VALID_STATUSES.has(value));
      if (parsedStatuses.length > 0) {
        args.statuses = [...new Set(parsedStatuses)];
      }
      index += 1;
      continue;
    }

    if (token === "--report-id") {
      args.reportId = String(argv[index + 1] ?? "").trim() || null;
      index += 1;
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

    if (token === "--no-audit-comment") {
      args.noAuditComment = true;
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

async function persistForumState({ client, reportId, forumTitle, forumAppliedTagIds, fallbackPersist = null }) {
  const normalizedTagIds = Array.isArray(forumAppliedTagIds)
    ? forumAppliedTagIds.filter((value) => typeof value === "string")
    : null;

  try {
    const clientHandle = client?.from?.("discord_feedback_reports");
    if (clientHandle?.update) {
      const { error } = await clientHandle
        .update({
          discord_forum_title: forumTitle,
          discord_forum_applied_tag_ids: normalizedTagIds,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId);
      if (!error) {
        return { ok: true };
      }

      return { ok: false, code: error.message ?? "forum-state-update-failed" };
    }
  } catch {
    // Fall back to the app helper below when a lightweight test client lacks update support.
  }

  if (typeof fallbackPersist === "function") {
    return fallbackPersist({
      reportId,
      forumTitle,
      forumAppliedTagIds: normalizedTagIds,
    });
  }

  return { ok: true };
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
        buildAuditComment: module.buildFeedbackCardAuditComment,
        formatShortId: module.formatDiscordBugReportShortId,
        recordForumState: module.recordDiscordBugReportForumState,
        shouldApplyBacklogTag: module.shouldApplyDiscordFeedbackBacklogTag,
        isTestingCard: module.isDiscordFeedbackTestingCard,
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
    return { message: responseText.slice(0, 200) };
  }
}

function createDiscordApi(fetchImpl = globalThis.fetch) {
  return {
    async patchStarterMessage({ channelId, messageId, content }) {
      const response = await fetchImpl(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${getRequiredEnv(DISCORD_BOT_TOKEN_ENV)}`,
          "Content-Type": "application/json",
          "User-Agent": "fawxzzy-fitness-feedback-sync/1.0",
        },
        body: JSON.stringify({
          content,
          allowed_mentions: buildAllowedMentions(),
        }),
      });
      const data = await parseDiscordJson(response);

      return response.ok
        ? { ok: true }
        : {
          ok: false,
          status: response.status,
          message: data && typeof data === "object" && "message" in data ? String(data.message ?? response.statusText) : response.statusText,
        };
    },
    async updateThreadTitle({ threadId, title }) {
      const response = await fetchImpl(`https://discord.com/api/v10/channels/${threadId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${getRequiredEnv(DISCORD_BOT_TOKEN_ENV)}`,
          "Content-Type": "application/json",
          "User-Agent": "fawxzzy-fitness-feedback-sync/1.0",
        },
        body: JSON.stringify({ name: title }),
      });
      const data = await parseDiscordJson(response);

      return response.ok
        ? { ok: true }
        : {
          ok: false,
          status: response.status,
          message: data && typeof data === "object" && "message" in data ? String(data.message ?? response.statusText) : response.statusText,
        };
    },
    async resolveTagIdsByName({ channelId, tagNames }) {
      const response = await fetchImpl(`https://discord.com/api/v10/channels/${channelId}`, {
        method: "GET",
        headers: {
          Authorization: `Bot ${getRequiredEnv(DISCORD_BOT_TOKEN_ENV)}`,
          "Content-Type": "application/json",
          "User-Agent": "fawxzzy-fitness-feedback-sync/1.0",
        },
      });
      const data = await parseDiscordJson(response);

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          message: data && typeof data === "object" && "message" in data ? String(data.message ?? response.statusText) : response.statusText,
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
    async updateThreadTags({ threadId, appliedTagIds }) {
      const response = await fetchImpl(`https://discord.com/api/v10/channels/${threadId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${getRequiredEnv(DISCORD_BOT_TOKEN_ENV)}`,
          "Content-Type": "application/json",
          "User-Agent": "fawxzzy-fitness-feedback-sync/1.0",
        },
        body: JSON.stringify({
          applied_tags: appliedTagIds.slice(0, DISCORD_FORUM_MAX_APPLIED_TAGS),
        }),
      });
      const data = await parseDiscordJson(response);

      return response.ok
        ? { ok: true }
        : {
          ok: false,
          status: response.status,
          message: data && typeof data === "object" && "message" in data ? String(data.message ?? response.statusText) : response.statusText,
        };
    },
    async postThreadMessage({ threadId, content }) {
      const response = await fetchImpl(`https://discord.com/api/v10/channels/${threadId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${getRequiredEnv(DISCORD_BOT_TOKEN_ENV)}`,
          "Content-Type": "application/json",
          "User-Agent": "fawxzzy-fitness-feedback-sync/1.0",
        },
        body: JSON.stringify({
          content,
          allowed_mentions: buildAllowedMentions(),
        }),
      });
      const data = await parseDiscordJson(response);

      return response.ok
        ? { ok: true }
        : {
          ok: false,
          status: response.status,
          message: data && typeof data === "object" && "message" in data ? String(data.message ?? response.statusText) : response.statusText,
        };
    },
  };
}

async function fetchSyncRows({ client, args }) {
  let query = client
    .from("discord_feedback_reports")
    .select(DISCORD_FORUM_SYNC_SELECT_COLUMNS);

  if (args.reportId) {
    query = query.eq("id", args.reportId);
  }

  if (args.statuses.length === 1) {
    query = query.eq("status", args.statuses[0]);
  } else {
    query = query.in("status", args.statuses);
  }

  const { data, error } = await query
    .order("last_seen_at", { ascending: false })
    .limit(args.limit);

  if (error) {
    throw new Error(`Unable to load discord_feedback_reports: ${error.message}`);
  }

  return Array.isArray(data)
    ? data.filter((row) => typeof row?.discord_forum_thread_id === "string" && row.discord_forum_thread_id.trim().length > 0)
    : [];
}

function buildRowDescriptor({ shortId, row, debug, title }) {
  const base = `${shortId} [${row.report_type}/${row.status}]`;
  return debug ? `${base} ${title}` : base;
}

export async function runSyncFeedbackForumPosts({
  client = createServiceClient(),
  args = parseArgs(),
  helpers = null,
  discordApi = createDiscordApi(),
} = {}) {
  const resolvedHelpers = helpers ?? await loadFeedbackForumHelpers();
  const rows = await fetchSyncRows({ client, args });
  const filteredRows = args.includeTesting
    ? rows
    : rows.filter((row) => !resolvedHelpers.isTestingCard(row));
  const notes = [];
  let dryRunCount = 0;
  let updatedCount = 0;
  let skippedMissingMessageId = 0;
  let failedCount = 0;

  for (const row of filteredRows) {
    const shortId = resolvedHelpers.formatShortId(row.id);

    if (typeof row.discord_forum_message_id !== "string" || row.discord_forum_message_id.trim().length === 0) {
      skippedMissingMessageId += 1;
      notes.push(`SKIP ${shortId}: missing discord_forum_message_id`);
      continue;
    }

    const reporterLabel = resolvedHelpers.buildReporterLabel({
      reporterDiscordUsername: row.reporter_discord_username ?? null,
      reporterMemberNumber: row.reporter_member_number ?? null,
    });
    const tagNames = resolvedHelpers.buildTagNames({
      reportType: row.report_type,
      status: row.status,
      severity: row.severity,
      includeBacklog: resolvedHelpers.shouldApplyBacklogTag(row),
    });
    const title = resolvedHelpers.buildTitle({
      reportType: row.report_type,
      area: row.area ?? null,
      summary: row.summary,
    });
    const content = resolvedHelpers.buildBody({
      report: row,
      reporterLabel,
    });
    let matchedTagIds = [];
    const descriptor = buildRowDescriptor({
      shortId,
      row,
      debug: args.debug,
      title,
    });

    if (!args.apply) {
      dryRunCount += 1;
      notes.push(`DRY-RUN ${descriptor}`);
      continue;
    }

    if (typeof row.discord_forum_channel_id === "string" && row.discord_forum_channel_id.trim().length > 0) {
      const tagResolutionResult = await discordApi.resolveTagIdsByName({
        channelId: row.discord_forum_channel_id,
        tagNames,
      });

      if (!tagResolutionResult.ok) {
        failedCount += 1;
        notes.push(`FAIL ${shortId}: forum tag resolution returned ${tagResolutionResult.status ?? "unknown"}${tagResolutionResult.message ? ` (${tagResolutionResult.message})` : ""}`);
        continue;
      }

      const tagUpdateResult = await discordApi.updateThreadTags({
        threadId: row.discord_forum_thread_id,
        appliedTagIds: tagResolutionResult.matchedTagIds,
      });

      if (!tagUpdateResult.ok) {
        failedCount += 1;
        notes.push(`FAIL ${shortId}: forum tag update returned ${tagUpdateResult.status ?? "unknown"}${tagUpdateResult.message ? ` (${tagUpdateResult.message})` : ""}`);
        continue;
      }

      if (tagResolutionResult.missingTagNames.length > 0) {
        notes.push(`WARN ${shortId}: missing forum tags ${tagResolutionResult.missingTagNames.join(", ")}`);
      }

      matchedTagIds = [...tagResolutionResult.matchedTagIds];
    }

    const titleResult = await discordApi.updateThreadTitle({
      threadId: row.discord_forum_thread_id,
      title,
    });
    if (!titleResult.ok) {
      failedCount += 1;
      notes.push(`FAIL ${shortId}: thread title update returned ${titleResult.status ?? "unknown"}${titleResult.message ? ` (${titleResult.message})` : ""}`);
      continue;
    }

    if (typeof resolvedHelpers.recordForumState === "function" || client?.from) {
      const recordForumStateResult = await persistForumState({
        client,
        reportId: row.id,
        forumTitle: title,
        forumAppliedTagIds: matchedTagIds.length > 0 ? matchedTagIds : null,
        fallbackPersist: resolvedHelpers.recordForumState,
      });
      if (!recordForumStateResult?.ok) {
        failedCount += 1;
        notes.push(`FAIL ${shortId}: forum state persistence returned ${recordForumStateResult?.code ?? "unknown"}`);
        continue;
      }
    }

    const messageResult = await discordApi.patchStarterMessage({
      channelId: row.discord_forum_thread_id,
      messageId: row.discord_forum_message_id,
      content,
    });
    if (!messageResult.ok) {
      failedCount += 1;
      notes.push(`FAIL ${shortId}: starter message patch returned ${messageResult.status ?? "unknown"}${messageResult.message ? ` (${messageResult.message})` : ""}`);
      continue;
    }

    if (!args.noAuditComment) {
      const auditCommentResult = await discordApi.postThreadMessage({
        threadId: row.discord_forum_thread_id,
        content: resolvedHelpers.buildAuditComment({
          action: "sync_format",
          actorLabel: "Fawx Security",
          reportType: row.report_type,
          note: "Applied Feedback Card Structure v3.",
          reportId: row.id,
        }),
      });

      if (!auditCommentResult.ok) {
        failedCount += 1;
        notes.push(`FAIL ${shortId}: audit comment returned ${auditCommentResult.status ?? "unknown"}${auditCommentResult.message ? ` (${auditCommentResult.message})` : ""}`);
        continue;
      }
    }

    updatedCount += 1;
    notes.push(`SYNCED ${descriptor}`);
  }

  console.log(`Feedback forum sync mode: ${args.apply ? "apply" : "dry-run"}`);
  console.log(`Status filter: ${args.statuses.join(", ")}`);
  console.log(`Limit: ${args.limit}`);
  if (args.reportId) {
    console.log(`Report ID filter: ${args.reportId}`);
  }
  if (args.apply) {
  console.log(`Audit comments: ${args.noAuditComment ? "disabled" : "enabled"}`);
  }
  console.log(`Rows with forum threads: ${rows.length}`);
  console.log(`Rows after testing filter: ${filteredRows.length}`);
  console.log(`Dry-run candidates: ${dryRunCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped missing starter message id: ${skippedMissingMessageId}`);
  console.log(`Failures: ${failedCount}`);
  for (const note of notes) {
    console.log(note);
  }
  if (!args.apply) {
    console.log("Dry run only. Re-run with --apply to edit Discord forum starter posts.");
  }

  return {
    apply: args.apply,
    rows: filteredRows,
    totalRows: rows.length,
    notes,
    dryRunCount,
    updatedCount,
    skippedMissingMessageId,
    failedCount,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runSyncFeedbackForumPosts().catch((error) => {
    console.error(`sync-feedback-forum-posts failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
