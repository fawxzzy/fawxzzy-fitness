#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envPath = resolveEnvFilePath(repoRoot);
const fileEnv = parseDotenvFile(envPath);

for (const [key, value] of Object.entries(fileEnv)) {
  if (!process.env[key]) {
    process.env[key] = value.replace(/\\r\\n/g, "").replace(/\\n/g, "");
  }
}

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_API_USER_AGENT = "fawxzzy-fitness-archive-completed-duplicates/1.0";
export const COMPLETED_FORUM_NAME = "completed";

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}. Set it in ${envPath} or the current shell.`);
  }

  return value;
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

export function parseArgs(argv = process.argv.slice(2)) {
  return {
    apply: argv.includes("--apply"),
    debug: argv.includes("--debug"),
  };
}

export function parseReportShortIdFromContent(content) {
  if (typeof content !== "string") {
    return null;
  }

  const match = content.match(/Report ID:\s*`([a-f0-9]{8})`/i);
  return match?.[1] ? match[1].toLowerCase() : null;
}

export function shouldArchiveCompletedDuplicateThread({ thread, completedForumId, completedShortIds, starterMessageContent }) {
  if (!thread || typeof thread !== "object") {
    return { archive: false, reason: "invalid_thread" };
  }

  if (thread.archived === true) {
    return { archive: false, reason: "already_archived" };
  }

  if (typeof thread.parent_id !== "string" || thread.parent_id === completedForumId) {
    return { archive: false, reason: "completed_board_thread" };
  }

  const shortId = parseReportShortIdFromContent(starterMessageContent);
  if (!shortId) {
    return { archive: false, reason: "missing_report_id" };
  }

  if (!completedShortIds.has(shortId)) {
    return { archive: false, reason: "not_completed_duplicate", shortId };
  }

  return { archive: true, reason: "completed_board_duplicate", shortId };
}

async function fetchGuildChannels(guildId, options) {
  const result = await discordRequest(`/guilds/${guildId}/channels`, {}, options);
  if (!result.ok || !Array.isArray(result.data)) {
    throw new Error(`Failed to fetch guild channels (${result.status}): ${result.message}`);
  }

  return result.data;
}

async function fetchDiscordMessage(channelId, messageId, options) {
  return discordRequest(`/channels/${channelId}/messages/${messageId}`, {}, options);
}

async function fetchCompletedForumId({ guildId }, options) {
  const channels = await fetchGuildChannels(guildId, options);
  const forum = channels.find((channel) => channel?.type === 15 && String(channel?.name ?? "").trim().toLowerCase() === COMPLETED_FORUM_NAME);
  if (!forum?.id || typeof forum.id !== "string") {
    throw new Error(`Unable to find Discord forum named "${COMPLETED_FORUM_NAME}".`);
  }

  return forum.id;
}

async function fetchCompletedBoardShortIds({ guildId, forumId }, options) {
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

  const shortIds = new Set();
  for (const thread of threads) {
    const messageResult = await fetchDiscordMessage(thread.id, thread.id, options);
    if (!messageResult.ok || typeof messageResult.data?.content !== "string") {
      continue;
    }

    const shortId = parseReportShortIdFromContent(messageResult.data.content);
    if (shortId) {
      shortIds.add(shortId);
    }
  }

  return shortIds;
}

async function fetchGuildActiveThreads(guildId, options) {
  const result = await discordRequest(`/guilds/${guildId}/threads/active`, {}, options);
  if (!result.ok || !Array.isArray(result.data?.threads)) {
    throw new Error(`Failed to fetch guild active threads (${result.status}): ${result.message}`);
  }

  return result.data.threads;
}

async function archiveThread(threadId, options) {
  return discordRequest(`/channels/${threadId}`, {
    method: "PATCH",
    body: {
      archived: true,
      locked: true,
    },
  }, options);
}

function renderSummary(summary) {
  const lines = [
    `Mode: ${summary.apply ? "apply" : "dry-run"}`,
    `Completed board short IDs: ${summary.completedShortIds}`,
    `Active threads scanned: ${summary.scannedThreads}`,
    `Duplicate completed targets: ${summary.duplicateTargets}`,
    `Archived threads: ${summary.archivedThreads}`,
    `Skipped threads: ${summary.skippedThreads}`,
    `Failures: ${summary.failures.length}`,
  ];

  if (summary.archived.length > 0) {
    lines.push("");
    lines.push("Archived:");
    for (const entry of summary.archived) {
      lines.push(`- ${entry.shortId} -> ${entry.threadId} (${entry.parentId})`);
    }
  }

  if (summary.skipped.length > 0) {
    lines.push("");
    lines.push("Skipped:");
    for (const entry of summary.skipped) {
      lines.push(`- ${entry.threadId} (${entry.reason}${entry.shortId ? ` ${entry.shortId}` : ""})`);
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

export async function runArchiveDuplicateCompletedFeedbackThreads({
  args = parseArgs(),
  fetchImpl = fetch,
  logger = console,
} = {}) {
  const guildId = getRequiredEnv("DISCORD_GUILD_ID");
  const options = { fetchImpl };
  const completedForumId = await fetchCompletedForumId({ guildId }, options);
  const completedShortIds = await fetchCompletedBoardShortIds({ guildId, forumId: completedForumId }, options);
  const activeThreads = await fetchGuildActiveThreads(guildId, options);

  const summary = {
    apply: args.apply,
    completedShortIds: completedShortIds.size,
    scannedThreads: 0,
    duplicateTargets: 0,
    archivedThreads: 0,
    skippedThreads: 0,
    archived: [],
    skipped: [],
    failures: [],
  };

  for (const thread of activeThreads) {
    if (typeof thread?.id !== "string") {
      continue;
    }

    summary.scannedThreads += 1;

    try {
      const starterMessageResult = await fetchDiscordMessage(thread.id, thread.id, options);
      if (!starterMessageResult.ok || typeof starterMessageResult.data?.content !== "string") {
        summary.skippedThreads += 1;
        summary.skipped.push({
          threadId: thread.id,
          reason: "starter_message_unavailable",
          shortId: null,
        });
        continue;
      }

      const decision = shouldArchiveCompletedDuplicateThread({
        thread,
        completedForumId,
        completedShortIds,
        starterMessageContent: starterMessageResult.data.content,
      });

      if (!decision.archive) {
        summary.skippedThreads += 1;
        if (args.debug) {
          summary.skipped.push({
            threadId: thread.id,
            reason: decision.reason,
            shortId: decision.shortId ?? null,
          });
        }
        continue;
      }

      summary.duplicateTargets += 1;
      if (!args.apply) {
        summary.archived.push({
          shortId: decision.shortId,
          threadId: thread.id,
          parentId: typeof thread.parent_id === "string" ? thread.parent_id : "(unknown)",
        });
        continue;
      }

      const archiveResult = await archiveThread(thread.id, options);
      if (!archiveResult.ok) {
        summary.failures.push(`${decision.shortId}:${thread.id} archive failed (${archiveResult.status ?? "unknown"}${archiveResult.message ? ` ${archiveResult.message}` : ""})`);
        continue;
      }

      summary.archivedThreads += 1;
      summary.archived.push({
        shortId: decision.shortId,
        threadId: thread.id,
        parentId: typeof thread.parent_id === "string" ? thread.parent_id : "(unknown)",
      });
    } catch (error) {
      summary.failures.push(`${thread.id} ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  logger.log(renderSummary(summary));
  return summary;
}

async function main() {
  await runArchiveDuplicateCompletedFeedbackThreads();
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error(`archive-duplicate-completed-feedback-threads failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
