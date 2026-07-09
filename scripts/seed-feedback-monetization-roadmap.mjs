#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  assertExpectedFitnessSupabaseHost,
  parseDotenvFile,
  resolveEnvFilePath,
} from "./env-file.mjs";
import {
  FEEDBACK_MONETIZATION_BOARD_STATUS,
  FEEDBACK_MONETIZATION_IMPLEMENTATION_ORDER,
  FEEDBACK_MONETIZATION_ROADMAP,
  getFeedbackMonetizationCard,
} from "./feedback-monetization-roadmap.mjs";

const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const FALLBACK_SUPABASE_URL_ENV = "SUPABASE_URL";
const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";
const DISCORD_BOT_TOKEN_ENV = "DISCORD_BOT_TOKEN";
const DISCORD_APPLICATION_ID_ENV = "DISCORD_APPLICATION_ID";
const DISCORD_FITNESS_FORUM_CHANNEL_ID_ENV = "DISCORD_FITNESS_FEEDBACK_FORUM_CHANNEL_ID";
const DISCORD_FORUM_CHANNEL_ID_ENV = "DISCORD_BUG_REPORT_FORUM_CHANNEL_ID";
const DISCORD_TESTING_FORUM_CHANNEL_ID_ENV = "DISCORD_FEEDBACK_TESTING_FORUM_CHANNEL_ID";
const DISCORD_FORUM_MAX_APPLIED_TAGS = 5;
const ROADMAP_SELECT_COLUMNS = [
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
  "reporter_user_kind",
  "duplicate_count",
  "discord_forum_channel_id",
  "discord_forum_thread_id",
  "discord_forum_message_id",
  "discord_forum_applied_tag_ids",
  "discord_forum_title",
  "completion_review_status",
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
    cardIds: [],
    forumChannelId: null,
    useTestingForum: false,
    skipSync: false,
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

    if (token === "--card-id") {
      args.cardIds = String(argv[index + 1] ?? "")
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (token === "--forum-channel-id") {
      const value = String(argv[index + 1] ?? "").trim();
      args.forumChannelId = value || null;
      index += 1;
      continue;
    }

    if (token === "--testing-forum") {
      args.useTestingForum = true;
      continue;
    }

    if (token === "--skip-sync") {
      args.skipSync = true;
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

function getTargetForumChannelId(args) {
  if (args.forumChannelId) {
    return args.forumChannelId;
  }

  if (args.useTestingForum) {
    return getRequiredEnv(DISCORD_TESTING_FORUM_CHANNEL_ID_ENV);
  }

  const fitnessForumChannelId = getOptionalEnv(DISCORD_FITNESS_FORUM_CHANNEL_ID_ENV);
  if (fitnessForumChannelId) {
    return fitnessForumChannelId;
  }

  return getRequiredEnv(DISCORD_FORUM_CHANNEL_ID_ENV);
}

function createServiceClient() {
  assertExpectedFitnessSupabaseHost({
    env: process.env,
    commandName: "feedback:monetization:seed",
  });

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
    return { message: responseText.slice(0, 200) };
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
          "User-Agent": "fawxzzy-fitness-feedback-monetization-seed/1.0",
        },
      });
      const data = await parseDiscordJson(response);

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          message: data && typeof data === "object" && "message" in data ? String(data.message ?? response.statusText) : response.statusText,
          retryAfterMs: response.status === 429 ? getDiscordRetryAfterMs(data) : null,
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
          "User-Agent": "fawxzzy-fitness-feedback-monetization-seed/1.0",
        },
        body: JSON.stringify({
          name: threadName,
          message: {
            content: messageContent,
            allowed_mentions: buildAllowedMentions(),
          },
          applied_tags: Array.isArray(appliedTagIds) ? appliedTagIds.slice(0, DISCORD_FORUM_MAX_APPLIED_TAGS) : undefined,
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
  };
}

async function callDiscordWithRetry(action, maxAttempts = 4) {
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt += 1;
    const result = await action();
    if (result.ok || result.status !== 429 || attempt >= maxAttempts) {
      return result;
    }

    await sleep(result.retryAfterMs ?? attempt * 1500);
  }

  return action();
}

function buildRoadmapDetails(card) {
  return `Roadmap Type: ${card.typeLabel}\n\n${card.description}`;
}

export function buildRoadmapStepsToReproduce(card) {
  const lines = [];

  if (card.userStory) {
    lines.push("User Story:");
    lines.push(card.userStory);
  }

  if (Array.isArray(card.acceptanceCriteria) && card.acceptanceCriteria.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push("Acceptance Criteria:");
    for (const criterion of card.acceptanceCriteria) {
      lines.push(`- ${criterion}`);
    }
  }

  return lines.join("\n");
}

export function buildRoadmapInsertValues(card, options = {}) {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const forumChannelId = options.forumChannelId ?? null;
  const reporterDiscordUserId = options.reporterDiscordUserId ?? getRequiredEnv(DISCORD_APPLICATION_ID_ENV);
  const boardStatus = card.boardStatus ?? FEEDBACK_MONETIZATION_BOARD_STATUS;

  return {
    source: "discord",
    report_type: "feature",
    status: boardStatus,
    severity: "medium",
    effort_points: card.effortPoints,
    card_id: card.cardId,
    card_phase: card.phase,
    card_priority: card.priority,
    depends_on: [...card.dependsOn],
    dependency_notes: card.notes,
    area: card.area,
    summary: card.title,
    details: buildRoadmapDetails(card),
    steps_to_reproduce: buildRoadmapStepsToReproduce(card),
    screenshot_url: null,
    attachment_count: 0,
    attachment_metadata: null,
    attachment_pruned: false,
    reporter_discord_user_id: reporterDiscordUserId,
    reporter_discord_username: "Fawx Security",
    reporter_user_kind: "automation",
    duplicate_count: 1,
    discord_forum_channel_id: forumChannelId,
    last_seen_at: nowIso,
    updated_at: nowIso,
  };
}

function buildRoadmapUpdateValues(card, options = {}) {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const forumChannelId = options.forumChannelId ?? null;
  const boardStatus = card.boardStatus ?? FEEDBACK_MONETIZATION_BOARD_STATUS;

  return {
    status: boardStatus,
    severity: "medium",
    effort_points: card.effortPoints,
    card_id: card.cardId,
    card_phase: card.phase,
    card_priority: card.priority,
    depends_on: [...card.dependsOn],
    dependency_notes: card.notes,
    area: card.area,
    summary: card.title,
    details: buildRoadmapDetails(card),
    steps_to_reproduce: buildRoadmapStepsToReproduce(card),
    last_seen_at: nowIso,
    updated_at: nowIso,
    ...(forumChannelId ? { discord_forum_channel_id: forumChannelId } : {}),
  };
}

function buildCardFilterSet(cardIds) {
  return new Set(cardIds.map((value) => value.trim().toUpperCase()).filter(Boolean));
}

function filterRoadmapCards(args) {
  if (!Array.isArray(args.cardIds) || args.cardIds.length === 0) {
    return FEEDBACK_MONETIZATION_IMPLEMENTATION_ORDER
      .map((cardId) => getFeedbackMonetizationCard(cardId))
      .filter(Boolean);
  }

  const filterSet = buildCardFilterSet(args.cardIds);
  return FEEDBACK_MONETIZATION_IMPLEMENTATION_ORDER
    .filter((cardId) => filterSet.has(cardId))
    .map((cardId) => getFeedbackMonetizationCard(cardId))
    .filter(Boolean);
}

async function loadExistingRows(client) {
  const { data, error } = await client
    .from("discord_feedback_reports")
    .select(ROADMAP_SELECT_COLUMNS)
    .eq("report_type", "feature")
    .limit(500);

  if (error) {
    throw new Error(`Unable to load existing roadmap rows: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

export function findMatchingRoadmapRow(existingRows, card) {
  const byCardId = existingRows.filter((row) => String(row.card_id ?? "").trim().toUpperCase() === card.cardId);
  if (byCardId.length > 1) {
    throw new Error(`Multiple feedback rows already use card_id ${card.cardId}. Resolve duplicates before seeding.`);
  }
  if (byCardId.length === 1) {
    return byCardId[0] ?? null;
  }

  const byTitle = existingRows.filter((row) => String(row.summary ?? "").trim() === card.title);
  if (byTitle.length > 1) {
    throw new Error(`Multiple feedback rows already use title "${card.title}". Add a stable card_id manually before seeding.`);
  }

  return byTitle[0] ?? null;
}

async function insertRoadmapRow(client, values) {
  const { data, error } = await client
    .from("discord_feedback_reports")
    .insert(values)
    .select(ROADMAP_SELECT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`Unable to insert roadmap row ${values.card_id}: ${error?.message ?? "unknown error"}`);
  }

  return data;
}

async function updateRoadmapRow(client, rowId, values) {
  const { data, error } = await client
    .from("discord_feedback_reports")
    .update(values)
    .eq("id", rowId)
    .select(ROADMAP_SELECT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`Unable to update roadmap row ${rowId}: ${error?.message ?? "unknown error"}`);
  }

  return data;
}

async function recordForumThread(client, row, values) {
  const { data, error } = await client
    .from("discord_feedback_reports")
    .update({
      discord_forum_channel_id: values.forumChannelId,
      discord_forum_thread_id: values.threadId,
      discord_forum_message_id: values.messageId,
      discord_forum_title: values.threadTitle,
      discord_forum_applied_tag_ids: values.appliedTagIds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select(ROADMAP_SELECT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`Unable to store forum thread ids for ${row.card_id ?? row.summary}: ${error?.message ?? "unknown error"}`);
  }

  return data;
}

function buildSyncArgs(reportId, status, apply) {
  return {
    apply,
    limit: 1,
    statuses: [status],
    reportId,
    debug: false,
    includeTesting: true,
    noAuditComment: true,
  };
}

async function loadDefaultSyncRunner() {
  const module = await import("./sync-feedback-forum-posts.mjs");
  return module.runSyncFeedbackForumPosts;
}

export async function runSeedFeedbackMonetizationRoadmap({
  client = createServiceClient(),
  args = parseArgs(),
  helpers = null,
  discordApi = createDiscordApi(),
  syncRunner = null,
  now = new Date(),
  logger = console,
  reporterDiscordUserId = null,
  forumChannelId = null,
} = {}) {
  const resolvedHelpers = helpers ?? await loadFeedbackForumHelpers();
  const nowIso = now.toISOString();
  const resolvedForumChannelId = forumChannelId ?? getTargetForumChannelId(args);
  const resolvedReporterDiscordUserId = reporterDiscordUserId ?? getRequiredEnv(DISCORD_APPLICATION_ID_ENV);
  const cards = filterRoadmapCards(args);
  const existingRows = await loadExistingRows(client);
  const notes = [];
  const warnings = [];
  const rowsForSync = [];
  let createdRows = 0;
  let updatedRows = 0;
  let createdThreads = 0;
  let syncedThreads = 0;

  for (const card of cards) {
    const existingRow = findMatchingRoadmapRow(existingRows, card);
    const shortLabel = card.cardId;

    if (!args.apply) {
      notes.push(`DRY-RUN ${existingRow ? "update" : "insert"} ${shortLabel} -> ${card.title}`);
      if (!existingRow?.discord_forum_thread_id) {
        notes.push(`DRY-RUN create forum thread for ${shortLabel}`);
      } else if (!args.skipSync) {
        notes.push(`DRY-RUN sync linked forum thread for ${shortLabel}`);
      }
      continue;
    }

    let row = existingRow
      ? await updateRoadmapRow(client, existingRow.id, buildRoadmapUpdateValues(card, {
        nowIso,
        forumChannelId: existingRow.discord_forum_channel_id ?? resolvedForumChannelId,
      }))
      : await insertRoadmapRow(client, buildRoadmapInsertValues(card, {
        nowIso,
        forumChannelId: resolvedForumChannelId,
        reporterDiscordUserId: resolvedReporterDiscordUserId,
      }));

    if (existingRow) {
      updatedRows += 1;
      notes.push(`UPDATED ${shortLabel} -> ${row.id}`);
    } else {
      createdRows += 1;
      notes.push(`CREATED ${shortLabel} -> ${row.id}`);
    }

    if (!row.discord_forum_thread_id) {
      const reporterLabel = resolvedHelpers.buildReporterLabel({
        reporterDiscordUsername: row.reporter_discord_username ?? "Fawx Security",
        reporterMemberNumber: row.reporter_member_number ?? null,
      });
      const tagNames = resolvedHelpers.buildTagNames({
        reportType: row.report_type,
        status: row.status,
        severity: row.severity,
        includeBacklog: resolvedHelpers.shouldApplyBacklogTag(row),
      });
      const tagResolution = await callDiscordWithRetry(() => discordApi.resolveTagIdsByName({
        channelId: resolvedForumChannelId,
        tagNames,
      }));
      if (!tagResolution.ok) {
        throw new Error(`Unable to resolve forum tags for ${shortLabel}: ${tagResolution.message ?? tagResolution.status ?? "unknown error"}`);
      }
      if (tagResolution.missingTagNames.length > 0) {
        warnings.push(`${shortLabel}: missing forum tags ${tagResolution.missingTagNames.join(", ")}`);
      }

      const threadTitle = resolvedHelpers.buildTitle({
        reportType: row.report_type,
        area: row.area ?? null,
        summary: row.summary,
      });
      const body = resolvedHelpers.buildBody({
        report: row,
        reporterLabel,
      });
      const threadResult = await callDiscordWithRetry(() => discordApi.createForumThread({
        channelId: resolvedForumChannelId,
        threadName: threadTitle,
        messageContent: body,
        appliedTagIds: tagResolution.matchedTagIds,
      }));
      if (!threadResult.ok || !threadResult.threadId) {
        throw new Error(`Unable to create forum thread for ${shortLabel}: ${threadResult.message ?? threadResult.status ?? "unknown error"}`);
      }

      row = await recordForumThread(client, row, {
        forumChannelId: resolvedForumChannelId,
        threadId: threadResult.threadId,
        messageId: threadResult.messageId,
        threadTitle,
        appliedTagIds: tagResolution.matchedTagIds,
      });
      createdThreads += 1;
      notes.push(`CREATED THREAD ${shortLabel} -> ${threadResult.threadId}`);
    }

    rowsForSync.push(row);
  }

  if (args.apply && !args.skipSync) {
    const resolvedSyncRunner = syncRunner ?? await loadDefaultSyncRunner();
    for (const row of rowsForSync) {
      const syncResult = await resolvedSyncRunner({
        client,
        args: buildSyncArgs(row.id, row.status, true),
      });
      syncedThreads += syncResult.updatedCount;
      for (const note of syncResult.notes) {
        if (/^WARN /.test(note)) {
          warnings.push(note);
        } else if (!/^SYNCED /.test(note)) {
          notes.push(note);
        }
      }
    }
  }

  logger.log(`Feedback monetization roadmap seed mode: ${args.apply ? "apply" : "dry-run"}`);
  logger.log(`Target forum: ${args.useTestingForum ? "testing" : "default"} (${resolvedForumChannelId})`);
  logger.log(`Cards selected: ${cards.length}`);
  logger.log(`Rows created: ${createdRows}`);
  logger.log(`Rows updated: ${updatedRows}`);
  logger.log(`Threads created: ${createdThreads}`);
  logger.log(`Threads synced: ${syncedThreads}`);
  for (const note of notes) {
    logger.log(note);
  }
  for (const warning of warnings) {
    logger.log(`WARN ${warning}`);
  }
  if (!args.apply) {
    logger.log("Dry run only. Re-run with --apply to seed rows and create Discord forum threads.");
  }

  return {
    apply: args.apply,
    cardCount: cards.length,
    createdRows,
    updatedRows,
    createdThreads,
    syncedThreads,
    notes,
    warnings,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runSeedFeedbackMonetizationRoadmap().catch((error) => {
    console.error(`seed-feedback-monetization-roadmap failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
