#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envPath = resolveEnvFilePath(repoRoot);
const fileEnv = parseDotenvFile(envPath);

for (const [key, value] of Object.entries(fileEnv)) {
  process.env[key] = value.replace(/\\r\\n/g, "").replace(/\\n/g, "");
}

export const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
export const DISCORD_API_USER_AGENT = "fawxzzy-fitness-completed-feedback-board/1.0";
export const COMPLETED_FORUM_NAME = "completed";
export const COMPLETED_FORUM_TOPIC = "Completed Fitness feedback cards recovered from archived or deleted board state. New member submissions stay on the active feedback board.";
export const RESOLVED_FEEDBACK_STATUSES = new Set(["fixed", "closed"]);
export const DEFAULT_LIMIT = 100;
const DISCORD_FORUM_MAX_APPLIED_TAGS = 5;

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

function buildSupabaseAdmin() {
  return createClient(getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function parseDiscordJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

async function discordRequest(pathname, { method = "GET", body } = {}) {
  const response = await fetch(`${DISCORD_API_BASE_URL}${pathname}`, {
    method,
    headers: {
      Authorization: `Bot ${getRequiredEnv("DISCORD_BOT_TOKEN")}`,
      "Content-Type": "application/json",
      "User-Agent": DISCORD_API_USER_AGENT,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await parseDiscordJson(response);
  return {
    ok: response.ok,
    status: response.status,
    data,
    message: !response.ok && data && typeof data === "object" && "message" in data
      ? String(data.message ?? response.statusText)
      : !response.ok
        ? response.statusText
        : null,
  };
}

function readArgValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  const value = argv[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const parsedLimit = Number.parseInt(readArgValue(argv, "--limit") ?? "", 10);
  return {
    apply: argv.includes("--apply"),
    debug: argv.includes("--debug"),
    reportId: readArgValue(argv, "--report-id"),
    limit: Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_LIMIT,
  };
}

function normalizeChannelName(value) {
  return String(value ?? "").trim().toLowerCase();
}

function buildAllowedMentions() {
  return {
    parse: [],
    users: [],
    roles: [],
    replied_user: false,
  };
}

function cloneForumTag(tag) {
  return {
    name: typeof tag?.name === "string" ? tag.name : "Unnamed",
    moderated: Boolean(tag?.moderated),
    ...(typeof tag?.emoji_id === "string" ? { emoji_id: tag.emoji_id } : {}),
    ...(typeof tag?.emoji_name === "string" ? { emoji_name: tag.emoji_name } : {}),
  };
}

export function buildCompletedForumCloneBody(sourceForum) {
  return {
    name: COMPLETED_FORUM_NAME,
    type: 15,
    parent_id: typeof sourceForum?.parent_id === "string" ? sourceForum.parent_id : undefined,
    topic: COMPLETED_FORUM_TOPIC,
    nsfw: Boolean(sourceForum?.nsfw),
    rate_limit_per_user: typeof sourceForum?.rate_limit_per_user === "number" ? sourceForum.rate_limit_per_user : undefined,
    default_thread_rate_limit_per_user: typeof sourceForum?.default_thread_rate_limit_per_user === "number"
      ? sourceForum.default_thread_rate_limit_per_user
      : undefined,
    default_sort_order: typeof sourceForum?.default_sort_order === "number" ? sourceForum.default_sort_order : undefined,
    default_forum_layout: typeof sourceForum?.default_forum_layout === "number" ? sourceForum.default_forum_layout : undefined,
    default_reaction_emoji: sourceForum?.default_reaction_emoji && typeof sourceForum.default_reaction_emoji === "object"
      ? sourceForum.default_reaction_emoji
      : undefined,
    permission_overwrites: Array.isArray(sourceForum?.permission_overwrites)
      ? sourceForum.permission_overwrites
      : undefined,
    available_tags: Array.isArray(sourceForum?.available_tags)
      ? sourceForum.available_tags.map(cloneForumTag)
      : undefined,
  };
}

export function shouldRecoverCompletedFeedbackReport(row, inspection) {
  if (!RESOLVED_FEEDBACK_STATUSES.has(String(row?.status ?? ""))) {
    return { recover: false, reason: "not_resolved" };
  }

  if (Boolean(inspection?.isTestingCard)) {
    return { recover: false, reason: "testing_card" };
  }

  if (Boolean(inspection?.alreadyCompletedBoard) && !Boolean(inspection?.messageMissing) && !Boolean(inspection?.threadMissing)) {
    return { recover: false, reason: "already_completed_board" };
  }

  if (Boolean(inspection?.missingForumRefs)) {
    return { recover: true, reason: "missing_forum_refs" };
  }

  if (Boolean(inspection?.threadMissing)) {
    return { recover: true, reason: "thread_missing" };
  }

  if (Boolean(inspection?.messageMissing)) {
    return { recover: true, reason: "starter_message_missing" };
  }

  if (Boolean(inspection?.threadArchived)) {
    return { recover: true, reason: "archived_source_thread" };
  }

  return { recover: false, reason: "active_thread_intact" };
}

async function loadFeedbackForumHelpers() {
  register("./test-alias-loader.mjs", pathToFileURL(`${scriptDir}${path.sep}`));
  const module = await import(pathToFileURL(path.join(repoRoot, "src", "lib", "discord", "bug-reports.ts")).href);
  return {
    buildBody: module.buildDiscordBugForumThreadBody,
    buildReporterLabel: module.buildDiscordBugReporterLabel,
    buildTagNames: module.buildDiscordBugForumTagNames,
    buildTitle: module.buildDiscordBugForumThreadTitle,
    formatShortId: module.formatDiscordBugReportShortId,
    shouldApplyBacklogTag: module.shouldApplyDiscordFeedbackBacklogTag,
    isTestingCard: module.isDiscordFeedbackTestingCard,
  };
}

async function fetchGuildChannels(guildId) {
  const result = await discordRequest(`/guilds/${guildId}/channels`);
  if (!result.ok || !Array.isArray(result.data)) {
    throw new Error(`Failed to fetch guild channels (${result.status}): ${result.message}`);
  }

  return result.data;
}

async function fetchDiscordChannel(channelId) {
  const result = await discordRequest(`/channels/${channelId}`);
  if (!result.ok) {
    return result;
  }

  return result;
}

async function fetchDiscordMessage(channelId, messageId) {
  return discordRequest(`/channels/${channelId}/messages/${messageId}`);
}

async function ensureCompletedForum({ guildId, sourceForumId, apply, debug }) {
  const channels = await fetchGuildChannels(guildId);
  const sourceForum = channels.find((channel) => channel?.id === sourceForumId && channel?.type === 15);
  if (!sourceForum) {
    throw new Error(`Configured feedback forum ${sourceForumId} was not found in the guild channel list.`);
  }

  const existing = channels.find((channel) => channel?.type === 15 && normalizeChannelName(channel?.name) === COMPLETED_FORUM_NAME);
  const body = buildCompletedForumCloneBody(sourceForum);

  if (existing?.id) {
    if (!apply) {
      return { forumId: existing.id, created: false, pending: false, synced: true };
    }

    const patchResult = await discordRequest(`/channels/${existing.id}`, {
      method: "PATCH",
      body,
    });
    if (!patchResult.ok) {
      throw new Error(`Failed to sync completed forum ${existing.id} (${patchResult.status}): ${patchResult.message}`);
    }
    if (debug) {
      console.log(`Completed forum already exists and was synced: ${existing.id}`);
    }
    return { forumId: existing.id, created: false, pending: false, synced: true };
  }

  if (!apply) {
    return { forumId: null, created: false, pending: true, synced: false };
  }

  const createResult = await discordRequest(`/guilds/${guildId}/channels`, {
    method: "POST",
    body,
  });
  if (!createResult.ok || !createResult.data?.id) {
    throw new Error(`Failed to create completed forum (${createResult.status}): ${createResult.message}`);
  }

  if (debug) {
    console.log(`Created completed forum: ${createResult.data.id}`);
  }
  return { forumId: createResult.data.id, created: true, pending: false, synced: true };
}

async function resolveTagIdsByName({ channelId, tagNames }) {
  const channelResult = await fetchDiscordChannel(channelId);
  if (!channelResult.ok) {
    throw new Error(`Failed to fetch forum tags from ${channelId} (${channelResult.status}): ${channelResult.message}`);
  }

  const availableTags = Array.isArray(channelResult.data?.available_tags)
    ? channelResult.data.available_tags.filter((tag) => typeof tag?.id === "string" && typeof tag?.name === "string")
    : [];

  const matchedTagIds = [];
  const missingTagNames = [];
  for (const tagName of tagNames) {
    const normalizedTagName = String(tagName ?? "").trim().toLowerCase();
    if (!normalizedTagName) {
      continue;
    }

    const match = availableTags.find((tag) => String(tag.name).trim().toLowerCase() === normalizedTagName);
    if (match) {
      matchedTagIds.push(match.id);
    } else {
      missingTagNames.push(tagName);
    }
  }

  return {
    matchedTagIds: [...new Set(matchedTagIds)].slice(0, DISCORD_FORUM_MAX_APPLIED_TAGS),
    missingTagNames,
  };
}

async function createForumThread({ forumId, threadName, content, appliedTagIds }) {
  const result = await discordRequest(`/channels/${forumId}/threads`, {
    method: "POST",
    body: {
      name: threadName,
      message: {
        content,
        allowed_mentions: buildAllowedMentions(),
      },
      applied_tags: Array.isArray(appliedTagIds) && appliedTagIds.length > 0
        ? appliedTagIds.slice(0, DISCORD_FORUM_MAX_APPLIED_TAGS)
        : undefined,
    },
  });

  if (!result.ok || !result.data?.id) {
    throw new Error(`Failed to create completed forum thread (${result.status}): ${result.message}`);
  }

  return {
    threadId: result.data.id ?? null,
    messageId: result.data.last_message_id ?? null,
  };
}

async function fetchResolvedRows({ client, args }) {
  let query = client
    .from("discord_feedback_reports")
    .select([
      "id",
      "report_type",
      "status",
      "severity",
      "effort_points",
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
      "discord_forum_title",
      "discord_forum_applied_tag_ids",
      "completion_review_status",
      "updated_at",
      "last_seen_at",
    ].join(", "));

  if (args.reportId) {
    query = query.eq("id", args.reportId);
  } else {
    query = query.in("status", Array.from(RESOLVED_FEEDBACK_STATUSES));
  }

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(args.limit);

  if (error) {
    throw new Error(`Unable to load resolved discord_feedback_reports: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

async function inspectReportDiscordState({ row, completedForumId, helpers }) {
  const inspection = {
    isTestingCard: helpers.isTestingCard(row),
    alreadyCompletedBoard: String(row.discord_forum_channel_id ?? "") === completedForumId,
    missingForumRefs: !row.discord_forum_thread_id || !row.discord_forum_message_id,
    threadMissing: false,
    messageMissing: false,
    threadArchived: false,
    threadParentId: null,
  };

  if (inspection.missingForumRefs) {
    return inspection;
  }

  const threadResult = await fetchDiscordChannel(row.discord_forum_thread_id);
  if (!threadResult.ok) {
    if (threadResult.status === 404) {
      inspection.threadMissing = true;
      return inspection;
    }

    throw new Error(`Failed to inspect thread ${row.discord_forum_thread_id} for report ${row.id} (${threadResult.status}): ${threadResult.message}`);
  }

  inspection.threadParentId = typeof threadResult.data?.parent_id === "string" ? threadResult.data.parent_id : null;
  inspection.threadArchived = Boolean(threadResult.data?.thread_metadata?.archived);
  inspection.alreadyCompletedBoard = inspection.threadParentId === completedForumId;

  const messageResult = await fetchDiscordMessage(row.discord_forum_thread_id, row.discord_forum_message_id);
  if (!messageResult.ok) {
    if (messageResult.status === 404) {
      inspection.messageMissing = true;
      return inspection;
    }

    throw new Error(`Failed to inspect starter message ${row.discord_forum_message_id} for report ${row.id} (${messageResult.status}): ${messageResult.message}`);
  }

  return inspection;
}

async function recordRecoveredForumThread({ client, reportId, forumId, threadId, messageId, forumTitle, forumAppliedTagIds }) {
  const { error } = await client
    .from("discord_feedback_reports")
    .update({
      discord_forum_channel_id: forumId,
      discord_forum_thread_id: threadId,
      discord_forum_message_id: messageId,
      discord_forum_title: forumTitle,
      discord_forum_applied_tag_ids: forumAppliedTagIds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    throw new Error(`Unable to record recovered forum thread for ${reportId}: ${error.message}`);
  }
}

function renderSummary(summary) {
  const lines = [
    `Mode: ${summary.apply ? "apply" : "dry-run"}`,
    `Source forum: ${summary.sourceForumId}`,
    `Completed forum: ${summary.completedForumId ?? "(would create)"}`,
    `Rows scanned: ${summary.scannedCount}`,
    `Recovered: ${summary.recovered.length}`,
    `Skipped: ${summary.skipped.length}`,
    `Failures: ${summary.failures.length}`,
  ];

  if (summary.createdForum) {
    lines.push("Completed forum created: yes");
  }

  if (summary.recovered.length > 0) {
    lines.push("");
    lines.push("Recovered reports:");
    for (const entry of summary.recovered) {
      lines.push(`- ${entry.shortId} -> ${entry.threadId ?? "(pending)"} (${entry.reason})`);
    }
  }

  if (summary.skipped.length > 0) {
    lines.push("");
    lines.push("Skipped reports:");
    for (const entry of summary.skipped) {
      lines.push(`- ${entry.shortId} (${entry.reason})`);
    }
  }

  if (summary.failures.length > 0) {
    lines.push("");
    lines.push("Failures:");
    for (const entry of summary.failures) {
      lines.push(`- ${entry.shortId}: ${entry.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export async function runSetupDiscordCompletedBoard({
  client = buildSupabaseAdmin(),
  args = parseArgs(),
  helpers = null,
} = {}) {
  const resolvedHelpers = helpers ?? await loadFeedbackForumHelpers();
  const guildId = getRequiredEnv("DISCORD_GUILD_ID");
  const sourceForumId = getRequiredEnv("DISCORD_BUG_REPORT_FORUM_CHANNEL_ID");

  const forumResult = await ensureCompletedForum({
    guildId,
    sourceForumId,
    apply: args.apply,
    debug: args.debug,
  });
  const completedForumId = forumResult.forumId;
  const rows = await fetchResolvedRows({ client, args });
  const recovered = [];
  const skipped = [];
  const failures = [];

  for (const row of rows) {
    const shortId = resolvedHelpers.formatShortId(row.id);
    try {
      const inspection = await inspectReportDiscordState({
        row,
        completedForumId: completedForumId ?? "__pending__",
        helpers: resolvedHelpers,
      });
      const decision = shouldRecoverCompletedFeedbackReport(row, inspection);

      if (!decision.recover) {
        skipped.push({ shortId, reason: decision.reason });
        continue;
      }

      if (!args.apply || !completedForumId) {
        recovered.push({ shortId, threadId: null, reason: decision.reason });
        continue;
      }

      const reporterLabel = resolvedHelpers.buildReporterLabel({
        reporterDiscordUsername: row.reporter_discord_username ?? null,
        reporterMemberNumber: row.reporter_member_number ?? null,
      });
      const forumTitle = resolvedHelpers.buildTitle({
        reportType: row.report_type,
        area: row.area ?? null,
        summary: row.summary,
      });
      const forumContent = resolvedHelpers.buildBody({
        report: row,
        reporterLabel,
      });
      const tagNames = resolvedHelpers.buildTagNames({
        reportType: row.report_type,
        status: row.status,
        severity: row.severity,
        includeBacklog: resolvedHelpers.shouldApplyBacklogTag(row),
      });
      const tagResolution = await resolveTagIdsByName({
        channelId: completedForumId,
        tagNames,
      });
      const created = await createForumThread({
        forumId: completedForumId,
        threadName: forumTitle,
        content: forumContent,
        appliedTagIds: tagResolution.matchedTagIds,
      });

      await recordRecoveredForumThread({
        client,
        reportId: row.id,
        forumId: completedForumId,
        threadId: created.threadId,
        messageId: created.messageId,
        forumTitle,
        forumAppliedTagIds: tagResolution.matchedTagIds,
      });

      recovered.push({
        shortId,
        threadId: created.threadId,
        reason: decision.reason,
      });
    } catch (error) {
      failures.push({
        shortId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    apply: args.apply,
    sourceForumId,
    completedForumId,
    createdForum: forumResult.created,
    scannedCount: rows.length,
    recovered,
    skipped,
    failures,
  };
}

async function main() {
  const summary = await runSetupDiscordCompletedBoard();
  process.stdout.write(renderSummary(summary));
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error(`discord:feedback:completed-board failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
