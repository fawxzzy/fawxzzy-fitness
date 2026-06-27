#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import fs from "node:fs/promises";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
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
const DISCORD_API_USER_AGENT = "fawxzzy-fitness-feedback-board-repair/1.0";
const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const FALLBACK_SUPABASE_URL_ENV = "SUPABASE_URL";
const COMPLETED_FORUM_NAME = "completed";
const DISCORD_FORUM_MAX_APPLIED_TAGS = 5;
const DEFAULT_LIMIT = 200;
export const DEFAULT_STATUSES = [
  "new",
  "needs_info",
  "confirmed",
  "fawxzzy_review",
  "in_progress",
  "fixed",
  "closed",
  "duplicate",
  "withdrawn",
];
export const DISCORD_SUCCESS_REACTION_EMOJI_NAME = "fawxzzy";
export const DISCORD_SUCCESS_REACTION_EMOJI_ID = "1507384062166302851";
export const DISCORD_FAILURE_REACTION_EMOJI_NAME = "fawxzzy";
export const DISCORD_FAILURE_REACTION_EMOJI_ID = "1507384094424694785";
export const DISCORD_SUCCESS_REACTION_EMOJI = `${DISCORD_SUCCESS_REACTION_EMOJI_NAME}:${DISCORD_SUCCESS_REACTION_EMOJI_ID}`;
export const DISCORD_FAILURE_REACTION_EMOJI = `${DISCORD_FAILURE_REACTION_EMOJI_NAME}:${DISCORD_FAILURE_REACTION_EMOJI_ID}`;
export const DISCORD_LEGACY_SUCCESS_REACTION = "\u2705";

let feedbackHelpersPromise = null;

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
  return createClient(getSupabaseUrl(), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
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

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    apply: false,
    debug: false,
    includeTesting: false,
    limit: DEFAULT_LIMIT,
    reportId: null,
    rowsFile: null,
    syncBody: false,
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
        args.limit = Math.min(value, 500);
      }
      index += 1;
      continue;
    }

    if (token === "--report-id") {
      args.reportId = (argv[index + 1] ?? "").trim() || null;
      index += 1;
      continue;
    }

    if (token === "--rows-file") {
      args.rowsFile = (argv[index + 1] ?? "").trim() || null;
      index += 1;
      continue;
    }

    if (token === "--sync-body") {
      args.syncBody = true;
      continue;
    }

    if (token === "--status") {
      const parsedStatuses = (argv[index + 1] ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      if (parsedStatuses.length > 0) {
        args.statuses = [...new Set(parsedStatuses)];
      }
      index += 1;
      continue;
    }
  }

  return args;
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
        recordForumState: module.recordDiscordBugReportForumState,
        shouldApplyBacklogTag: module.shouldApplyDiscordFeedbackBacklogTag,
        isTestingCard: module.isDiscordFeedbackTestingCard,
      }));
  }

  return feedbackHelpersPromise;
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

async function discordRequest(pathname, { method = "GET", body } = {}, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${DISCORD_API_BASE_URL}${pathname}`, {
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

function buildAllowedMentions() {
  return {
    parse: [],
    users: [],
    roles: [],
    replied_user: false,
  };
}

function isResolvedStatus(status) {
  return status === "fixed" || status === "closed";
}

function normalizeStatusFilter(statuses) {
  return [...new Set(statuses.map((status) => String(status ?? "").trim().toLowerCase()).filter(Boolean))];
}

function reactionMatches(reaction, emoji) {
  if (!reaction || typeof reaction !== "object") {
    return false;
  }

  const candidate = reaction;
  const emojiCandidate = candidate.emoji && typeof candidate.emoji === "object" ? candidate.emoji : null;
  if (!emojiCandidate) {
    return false;
  }

  if (emoji === DISCORD_SUCCESS_REACTION_EMOJI) {
    return emojiCandidate.id === DISCORD_SUCCESS_REACTION_EMOJI_ID
      || (emojiCandidate.name === DISCORD_SUCCESS_REACTION_EMOJI_NAME && emojiCandidate.id === DISCORD_SUCCESS_REACTION_EMOJI_ID);
  }

  if (emoji === DISCORD_FAILURE_REACTION_EMOJI) {
    return emojiCandidate.id === DISCORD_FAILURE_REACTION_EMOJI_ID
      || (emojiCandidate.name === DISCORD_FAILURE_REACTION_EMOJI_NAME && emojiCandidate.id === DISCORD_FAILURE_REACTION_EMOJI_ID);
  }

  if (emoji === DISCORD_LEGACY_SUCCESS_REACTION) {
    return emojiCandidate.name === DISCORD_LEGACY_SUCCESS_REACTION;
  }

  return false;
}

export function planFeedbackStateReactions({ status, reactions }) {
  const resolved = isResolvedStatus(String(status ?? "").trim().toLowerCase());
  const expectedEmoji = resolved ? DISCORD_SUCCESS_REACTION_EMOJI : DISCORD_FAILURE_REACTION_EMOJI;
  const staleEmoji = resolved ? DISCORD_FAILURE_REACTION_EMOJI : DISCORD_SUCCESS_REACTION_EMOJI;
  const reactionList = Array.isArray(reactions) ? reactions : [];
  const hasExpected = reactionList.some((reaction) => reactionMatches(reaction, expectedEmoji));
  const hasStale = reactionList.some((reaction) => reactionMatches(reaction, staleEmoji));
  const hasLegacySuccess = reactionList.some((reaction) => reactionMatches(reaction, DISCORD_LEGACY_SUCCESS_REACTION));

  return {
    resolved,
    expectedEmoji,
    add: hasExpected ? [] : [expectedEmoji],
    remove: [
      ...(hasStale ? [staleEmoji] : []),
      ...(hasLegacySuccess ? [DISCORD_LEGACY_SUCCESS_REACTION] : []),
    ],
  };
}

export function buildRepairTargets({ row, completedCopies, shortId }) {
  const seen = new Set();
  const targets = [];

  if (
    typeof row?.discord_forum_thread_id === "string"
    && row.discord_forum_thread_id.trim().length > 0
    && typeof row?.discord_forum_message_id === "string"
    && row.discord_forum_message_id.trim().length > 0
  ) {
    const key = `${row.discord_forum_thread_id}:${row.discord_forum_message_id}`;
    seen.add(key);
    targets.push({
      kind: "linked",
      shortId,
      threadId: row.discord_forum_thread_id,
      messageId: row.discord_forum_message_id,
    });
  }

  for (const copy of completedCopies) {
    if (!copy?.threadId || !copy?.messageId) {
      continue;
    }

    const key = `${copy.threadId}:${copy.messageId}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    targets.push({
      kind: "completed_copy",
      shortId,
      threadId: copy.threadId,
      messageId: copy.messageId,
    });
  }

  return targets;
}

async function fetchGuildChannels(guildId, options) {
  const result = await discordRequest(`/guilds/${guildId}/channels`, {}, options);
  if (!result.ok || !Array.isArray(result.data)) {
    throw new Error(`Failed to fetch guild channels (${result.status}): ${result.message}`);
  }

  return result.data;
}

async function fetchDiscordChannel(channelId, options) {
  return discordRequest(`/channels/${channelId}`, {}, options);
}

async function fetchDiscordMessage(channelId, messageId, options) {
  return discordRequest(`/channels/${channelId}/messages/${messageId}`, {}, options);
}

async function resolveCompletedForumId({ guildId }, options) {
  const channels = await fetchGuildChannels(guildId, options);
  const completedForum = channels.find((channel) => channel?.type === 15 && String(channel?.name ?? "").trim().toLowerCase() === COMPLETED_FORUM_NAME);
  return typeof completedForum?.id === "string" ? completedForum.id : null;
}

async function fetchCompletedForumExistingThreads({ guildId, forumId }, options) {
  const threads = [];

  const activeThreadsResult = await discordRequest(`/guilds/${guildId}/threads/active`, {}, options);
  if (activeThreadsResult.ok && Array.isArray(activeThreadsResult.data?.threads)) {
    for (const thread of activeThreadsResult.data.threads) {
      if (thread?.parent_id === forumId && typeof thread?.id === "string") {
        threads.push(thread);
      }
    }
  }

  const archivedThreadsResult = await discordRequest(`/channels/${forumId}/threads/archived/public?limit=100`, {}, options);
  if (archivedThreadsResult.ok && Array.isArray(archivedThreadsResult.data?.threads)) {
    for (const thread of archivedThreadsResult.data.threads) {
      if (thread?.parent_id === forumId && typeof thread?.id === "string") {
        threads.push(thread);
      }
    }
  }

  const byShortId = new Map();
  for (const thread of threads) {
    const starterMessageId = typeof thread?.id === "string" ? thread.id : null;
    if (!starterMessageId) {
      continue;
    }

    const messageResult = await fetchDiscordMessage(thread.id, starterMessageId, options);
    if (!messageResult.ok || typeof messageResult.data?.content !== "string") {
      continue;
    }

    const shortIdMatch = messageResult.data.content.match(/Report ID:\s*`([a-f0-9]{8})`/i);
    if (!shortIdMatch?.[1]) {
      continue;
    }

    const shortId = shortIdMatch[1].toLowerCase();
    const existing = byShortId.get(shortId) ?? [];
    existing.push({
      threadId: thread.id,
      messageId: starterMessageId,
      archived: Boolean(thread?.thread_metadata?.archived),
    });
    byShortId.set(shortId, existing);
  }

  return byShortId;
}

async function resolveTagIdsByName({ channelId, tagNames }, options) {
  const channelResult = await fetchDiscordChannel(channelId, options);
  if (!channelResult.ok) {
    return {
      ok: false,
      status: channelResult.status,
      message: channelResult.message,
      matchedTagIds: [],
      missingTagNames: [],
    };
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
    ok: true,
    matchedTagIds: [...new Set(matchedTagIds)].slice(0, DISCORD_FORUM_MAX_APPLIED_TAGS),
    missingTagNames,
  };
}

async function updateThreadTags({ threadId, appliedTagIds }, options) {
  return discordRequest(`/channels/${threadId}`, {
    method: "PATCH",
    body: {
      applied_tags: appliedTagIds.slice(0, DISCORD_FORUM_MAX_APPLIED_TAGS),
    },
  }, options);
}

async function updateThreadTitle({ threadId, title }, options) {
  return discordRequest(`/channels/${threadId}`, {
    method: "PATCH",
    body: { name: title },
  }, options);
}

async function patchStarterMessage({ channelId, messageId, content }, options) {
  return discordRequest(`/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: {
      content,
      allowed_mentions: buildAllowedMentions(),
    },
  }, options);
}

async function createReaction({ channelId, messageId, emoji }, options) {
  return discordRequest(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`, {
    method: "PUT",
  }, options);
}

async function deleteOwnReaction({ channelId, messageId, emoji }, options) {
  return discordRequest(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`, {
    method: "DELETE",
  }, options);
}

async function deleteEmojiReactions({ channelId, messageId, emoji }, options) {
  return discordRequest(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
    method: "DELETE",
  }, options);
}

async function fetchRepairRows({ client, args }) {
  if (args.rowsFile) {
    const raw = await fs.readFile(path.resolve(args.rowsFile), "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`Rows file did not contain an array: ${args.rowsFile}`);
    }

    return parsed.filter((row) => typeof row?.id === "string");
  }

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
      "discord_forum_applied_tag_ids",
      "discord_forum_title",
      "completion_review_status",
      "updated_at",
      "last_seen_at",
    ].join(", "));

  if (args.reportId) {
    query = query.eq("id", args.reportId);
  }

  const statuses = normalizeStatusFilter(args.statuses);
  if (statuses.length === 1) {
    query = query.eq("status", statuses[0]);
  } else if (statuses.length > 1) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(args.limit);

  if (error) {
    throw new Error(`Unable to load discord_feedback_reports: ${error.message}`);
  }

  return Array.isArray(data) ? data.filter((row) => typeof row?.id === "string") : [];
}

function renderSummary(summary) {
  const lines = [
    `Mode: ${summary.apply ? "apply" : "dry-run"}`,
    `Rows scanned: ${summary.scannedRows}`,
    `Rows after testing filter: ${summary.rowsAfterTestingFilter}`,
    `Thread targets: ${summary.threadTargets}`,
    `Repaired threads: ${summary.repairedThreads}`,
    `Dry-run threads: ${summary.dryRunThreads}`,
    `Skipped rows: ${summary.skippedRows}`,
    `Warnings: ${summary.warnings.length}`,
    `Failures: ${summary.failures.length}`,
  ];

  if (summary.notes.length > 0) {
    lines.push("");
    lines.push("Notes:");
    for (const note of summary.notes) {
      lines.push(`- ${note}`);
    }
  }

  if (summary.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of summary.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  if (summary.failures.length > 0) {
    lines.push("");
    lines.push("Failures:");
    for (const failure of summary.failures) {
      lines.push(`- ${failure}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export async function runRepairFeedbackBoardState({
  client = createServiceClient(),
  args = parseArgs(),
  helpers = null,
  fetchImpl = fetch,
  logger = console,
} = {}) {
  const resolvedHelpers = helpers ?? await loadFeedbackForumHelpers();
  const guildId = getRequiredEnv("DISCORD_GUILD_ID");
  const options = { fetchImpl };
  const completedForumId = await resolveCompletedForumId({ guildId }, options);
  const completedCopies = completedForumId
    ? await fetchCompletedForumExistingThreads({ guildId, forumId: completedForumId }, options)
    : new Map();
  const rows = await fetchRepairRows({ client, args });
  const filteredRows = args.includeTesting
    ? rows
    : rows.filter((row) => !resolvedHelpers.isTestingCard(row));

  const summary = {
    apply: args.apply,
    scannedRows: rows.length,
    rowsAfterTestingFilter: filteredRows.length,
    threadTargets: 0,
    repairedThreads: 0,
    dryRunThreads: 0,
    skippedRows: 0,
    notes: [],
    warnings: [],
    failures: [],
  };

  for (const row of filteredRows) {
    const shortId = resolvedHelpers.formatShortId(row.id);
    const targets = buildRepairTargets({
      row,
      completedCopies: completedCopies.get(shortId.toLowerCase()) ?? [],
      shortId,
    });

    if (targets.length === 0) {
      summary.skippedRows += 1;
      summary.notes.push(`${shortId}: no linked or completed-board targets`);
      continue;
    }

    const title = resolvedHelpers.buildTitle({
      reportType: row.report_type,
      area: row.area ?? null,
      summary: row.summary,
    });
    const content = args.syncBody
      ? resolvedHelpers.buildBody({
        report: row,
        reporterLabel: resolvedHelpers.buildReporterLabel({
          reporterDiscordUsername: row.reporter_discord_username ?? null,
          reporterMemberNumber: row.reporter_member_number ?? null,
        }),
      })
      : null;
    const tagNames = resolvedHelpers.buildTagNames({
      reportType: row.report_type,
      status: row.status,
      severity: row.severity,
      includeBacklog: resolvedHelpers.shouldApplyBacklogTag(row),
    });

    for (const target of targets) {
      summary.threadTargets += 1;
      try {
        const threadResult = await fetchDiscordChannel(target.threadId, options);
        if (!threadResult.ok || !threadResult.data?.id) {
          if (threadResult.status === 404) {
            summary.notes.push(`${shortId}:${target.threadId} skipped missing thread target`);
            continue;
          }
          summary.failures.push(`${shortId}:${target.threadId} thread fetch failed (${threadResult.status ?? "unknown"}${threadResult.message ? ` ${threadResult.message}` : ""})`);
          continue;
        }

        const messageResult = await fetchDiscordMessage(target.threadId, target.messageId, options);
        if (!messageResult.ok || !messageResult.data?.id) {
          if (messageResult.status === 404) {
            summary.notes.push(`${shortId}:${target.threadId} skipped missing starter message`);
            continue;
          }
          summary.failures.push(`${shortId}:${target.threadId} starter message fetch failed (${messageResult.status ?? "unknown"}${messageResult.message ? ` ${messageResult.message}` : ""})`);
          continue;
        }

        const reactionPlan = planFeedbackStateReactions({
          status: row.status,
          reactions: messageResult.data.reactions,
        });
        const tagResolution = typeof threadResult.data.parent_id === "string" && threadResult.data.parent_id.trim().length > 0
          ? await resolveTagIdsByName({
            channelId: threadResult.data.parent_id,
            tagNames,
          }, options)
          : { ok: false, status: null, message: "Missing thread parent id.", matchedTagIds: [], missingTagNames: [] };

        if (!tagResolution.ok) {
          summary.warnings.push(`${shortId}:${target.threadId} tag resolution failed (${tagResolution.status ?? "unknown"}${tagResolution.message ? ` ${tagResolution.message}` : ""})`);
        } else if (tagResolution.missingTagNames.length > 0) {
          summary.warnings.push(`${shortId}:${target.threadId} missing tags: ${tagResolution.missingTagNames.join(", ")}`);
        }

        const currentTagIds = Array.isArray(threadResult.data.applied_tags)
          ? threadResult.data.applied_tags.filter((value) => typeof value === "string")
          : [];
        const expectedTagIds = tagResolution.ok ? tagResolution.matchedTagIds : [];
        const needsTagSync = tagResolution.ok
          ? currentTagIds.length !== expectedTagIds.length
            || expectedTagIds.some((value) => !currentTagIds.includes(value))
          : false;
        const currentTitle = typeof threadResult.data.name === "string" ? threadResult.data.name : "";
        const cachedRowTagIds = Array.isArray(row.discord_forum_applied_tag_ids)
          ? row.discord_forum_applied_tag_ids.filter((value) => typeof value === "string")
          : [];
        const cachedRowTitle = typeof row.discord_forum_title === "string" ? row.discord_forum_title : "";
        const needsTitleSync = currentTitle !== title;
        const needsReactionSync = reactionPlan.add.length > 0 || reactionPlan.remove.length > 0;
        const needsBodySync = typeof content === "string" && messageResult.data.content !== content;
        const persistTagIds = needsTagSync && tagResolution.ok ? expectedTagIds : currentTagIds;
        const persistTitle = needsTitleSync ? title : currentTitle;
        const needsRowForumStateSync = cachedRowTitle !== persistTitle
          || cachedRowTagIds.length !== persistTagIds.length
          || persistTagIds.some((value) => !cachedRowTagIds.includes(value));
        const needsChange = needsTagSync || needsTitleSync || needsReactionSync || needsBodySync;

        if (!args.apply) {
          if (!needsChange && !needsRowForumStateSync) {
            summary.notes.push(`${shortId}:${target.threadId} already-synced`);
            continue;
          }
          summary.dryRunThreads += 1;
          if (args.debug) {
            logger.log(`would-repair ${shortId} target=${target.kind} thread=${target.threadId} title=${needsTitleSync} tags=${needsTagSync} body=${needsBodySync} rowState=${needsRowForumStateSync} add=${reactionPlan.add.join(",") || "(none)"} remove=${reactionPlan.remove.join(",") || "(none)"} tagsExpected=${tagNames.join("|")}`);
          }
          continue;
        }

        if (!needsChange && !needsRowForumStateSync) {
          summary.notes.push(`${shortId}:${target.threadId} already-synced`);
          continue;
        }

        if (tagResolution.ok) {
          const tagUpdateResult = await updateThreadTags({
            threadId: target.threadId,
            appliedTagIds: tagResolution.matchedTagIds,
          }, options);
          if (!tagUpdateResult.ok) {
            summary.failures.push(`${shortId}:${target.threadId} tag update failed (${tagUpdateResult.status ?? "unknown"}${tagUpdateResult.message ? ` ${tagUpdateResult.message}` : ""})`);
            continue;
          }
        }

        const titleUpdateResult = await updateThreadTitle({
          threadId: target.threadId,
          title,
        }, options);
        if (!titleUpdateResult.ok) {
          summary.failures.push(`${shortId}:${target.threadId} title update failed (${titleUpdateResult.status ?? "unknown"}${titleUpdateResult.message ? ` ${titleUpdateResult.message}` : ""})`);
          continue;
        }

        if (typeof content === "string") {
          const patchResult = await patchStarterMessage({
            channelId: target.threadId,
            messageId: target.messageId,
            content,
          }, options);
          if (!patchResult.ok) {
            summary.failures.push(`${shortId}:${target.threadId} starter patch failed (${patchResult.status ?? "unknown"}${patchResult.message ? ` ${patchResult.message}` : ""})`);
            continue;
          }
        }

        if (typeof resolvedHelpers.recordForumState === "function" || client?.from) {
          const recordForumStateResult = await persistForumState({
            client,
            reportId: row.id,
            forumTitle: persistTitle,
            forumAppliedTagIds: persistTagIds.length > 0 ? persistTagIds : null,
            fallbackPersist: resolvedHelpers.recordForumState,
          });
          if (!recordForumStateResult?.ok) {
            summary.failures.push(`${shortId}:${target.threadId} forum state persistence failed (${recordForumStateResult?.code ?? "unknown"})`);
            continue;
          }
        }

        let reactionFailure = false;
        for (const emoji of reactionPlan.add) {
          const addResult = await createReaction({
            channelId: target.threadId,
            messageId: target.messageId,
            emoji,
          }, options);
          if (!addResult.ok) {
            summary.failures.push(`${shortId}:${target.threadId} add reaction ${emoji} failed (${addResult.status ?? "unknown"}${addResult.message ? ` ${addResult.message}` : ""})`);
            reactionFailure = true;
            break;
          }
        }
        if (reactionFailure) {
          continue;
        }

        for (const emoji of reactionPlan.remove) {
          const deleteResult = emoji === DISCORD_LEGACY_SUCCESS_REACTION
            ? await deleteEmojiReactions({
              channelId: target.threadId,
              messageId: target.messageId,
              emoji,
            }, options)
            : await deleteOwnReaction({
              channelId: target.threadId,
              messageId: target.messageId,
              emoji,
            }, options);

          if (!deleteResult.ok) {
            summary.failures.push(`${shortId}:${target.threadId} remove reaction ${emoji} failed (${deleteResult.status ?? "unknown"}${deleteResult.message ? ` ${deleteResult.message}` : ""})`);
            reactionFailure = true;
            break;
          }
        }
        if (reactionFailure) {
          continue;
        }

        summary.repairedThreads += 1;
        if (args.debug) {
          logger.log(`repaired ${shortId} target=${target.kind} thread=${target.threadId}`);
        }
      } catch (error) {
        summary.failures.push(`${shortId}:${target.threadId} ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  logger.log(renderSummary(summary));
  return summary;
}

async function main() {
  await runRepairFeedbackBoardState();
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error(`repair-feedback-board-state failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
