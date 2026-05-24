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
  process.env[key] = value.replace(/\\r\\n/g, "").replace(/\\n/g, "");
}

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_API_USER_AGENT = "fawxzzy-fitness-spotify-club-cleanup/1.0";
const MUSIC_SESH_PANEL_TITLES = new Set(["Music Sesh", "Spotify Club"]);
const SPOTIFY_ACTION_MESSAGE_PATTERNS = [
  /^Queue suggestion pending:/i,
  /^Queue approved:/i,
  /^Queue rejected:/i,
  /^Queue removed:/i,
];
const DISCORD_DELETE_RATE_LIMIT_RETRY_CAP = 5;

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}. Set it in ${envPath} or the current shell.`);
  }

  return value;
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
  return {
    apply: argv.includes("--apply"),
    debug: argv.includes("--debug"),
    limit: Number.parseInt(readArgValue(argv, "--limit") ?? "100", 10),
  };
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchChannelMessagesPage({ channelId, limit, before }) {
  const search = new URLSearchParams({ limit: String(limit) });
  if (before) {
    search.set("before", before);
  }

  const result = await discordRequest(`/channels/${channelId}/messages?${search.toString()}`);
  if (!result.ok || !Array.isArray(result.data)) {
    throw new Error(`Failed to fetch Music Sesh messages (${result.status}): ${result.message}`);
  }

  return result.data;
}

async function fetchRecentChannelMessages({ channelId, limit = 100 }) {
  const messages = [];
  let before = null;

  while (messages.length < limit) {
    const remaining = Math.max(1, Math.min(100, limit - messages.length));
    const page = await fetchChannelMessagesPage({ channelId, limit: remaining, before });
    if (page.length === 0) {
      break;
    }

    messages.push(...page);
    before = page.at(-1)?.id ?? null;
    if (page.length < remaining) {
      break;
    }
  }

  return messages;
}

export function discordMessageHasSpotifyClubPanel(message) {
  const embedTitle = message?.embeds?.[0]?.title;
  if (!MUSIC_SESH_PANEL_TITLES.has(embedTitle)) {
    return false;
  }

  const components = Array.isArray(message?.components) ? message.components : [];
  return components.some((row) => Array.isArray(row?.components) && row.components.some((component) => (
    component?.custom_id === "spotify_connect_open"
    || component?.custom_id === "spotify_status_check"
    || component?.custom_id === "spotify_disconnect"
  )));
}

export function isSpotifyClubCleanupCandidate(message, appId) {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (discordMessageHasSpotifyClubPanel(message)) {
    return false;
  }

  const authorId = typeof message.author?.id === "string" ? message.author.id : null;
  if (!authorId || authorId !== appId) {
    return false;
  }

  const content = typeof message.content === "string" ? message.content.trim() : "";
  return SPOTIFY_ACTION_MESSAGE_PATTERNS.some((pattern) => pattern.test(content));
}

export function buildCleanupPlan({ messages, applicationId }) {
  const preservedPanelIds = messages
    .filter((message) => discordMessageHasSpotifyClubPanel(message))
    .map((message) => message.id)
    .filter((id) => typeof id === "string");

  const deletableMessages = messages.filter((message) => isSpotifyClubCleanupCandidate(message, applicationId)).map((message) => ({
    id: message.id,
    content: typeof message.content === "string" ? message.content : "",
  }));

  return {
    preservedPanelIds,
    deletableMessages,
  };
}

async function deleteChannelMessage({ channelId, messageId }) {
  for (let attempt = 0; attempt <= DISCORD_DELETE_RATE_LIMIT_RETRY_CAP; attempt += 1) {
    const result = await discordRequest(`/channels/${channelId}/messages/${messageId}`, {
      method: "DELETE",
    });

    if (result.ok || result.status === 404) {
      return;
    }

    if (result.status === 429 && attempt < DISCORD_DELETE_RATE_LIMIT_RETRY_CAP) {
      const retryAfterSeconds = Number(result.data?.retry_after ?? 1);
      const retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? Math.ceil(retryAfterSeconds * 1000)
        : 1000;
      await sleep(retryAfterMs);
      continue;
    }

    throw new Error(`Failed to delete Music Sesh message ${messageId} (${result.status}): ${result.message}`);
  }
}

export async function runSpotifyClubCleanup(args = parseArgs()) {
  const channelId = getRequiredEnv("DISCORD_SPOTIFY_CLUB_CHANNEL_ID");
  const applicationId = getRequiredEnv("DISCORD_APPLICATION_ID");
  const messages = await fetchRecentChannelMessages({
    channelId,
    limit: Number.isFinite(args.limit) && args.limit > 0 ? args.limit : 100,
  });

  const plan = buildCleanupPlan({ messages, applicationId });
  const deletedMessageIds = [];

  if (args.apply) {
    for (const message of plan.deletableMessages) {
      await deleteChannelMessage({ channelId, messageId: message.id });
      deletedMessageIds.push(message.id);
    }
  }

  return {
    apply: args.apply,
    channelId,
    inspectedMessageCount: messages.length,
    preservedPanelIds: plan.preservedPanelIds,
    deletableMessages: plan.deletableMessages,
    deletedMessageIds,
  };
}

const entryFilePath = fileURLToPath(import.meta.url);

async function main() {
  const result = await runSpotifyClubCleanup(parseArgs());
  console.log(`Music Sesh cleanup mode: ${result.apply ? "apply" : "dry-run"}`);
  console.log(`- channel: ${result.channelId}`);
  console.log(`- inspected messages: ${result.inspectedMessageCount}`);
  console.log(`- preserved panel ids: ${result.preservedPanelIds.length > 0 ? result.preservedPanelIds.join(", ") : "none"}`);
  console.log(`- cleanup candidates: ${result.deletableMessages.length}`);
  if (result.deletableMessages.length > 0) {
    for (const message of result.deletableMessages) {
      console.log(`  - ${message.id}: ${message.content}`);
    }
  }
  if (result.apply) {
    console.log(`- deleted: ${result.deletedMessageIds.length}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === entryFilePath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
