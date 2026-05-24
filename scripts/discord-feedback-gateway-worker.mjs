import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";

const DISCORD_GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";
const DISCORD_GATEWAY_OPCODE = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
};
const DISCORD_GATEWAY_INTENT_GUILD_MESSAGES = 1 << 9;
const DISCORD_GATEWAY_INTENT_MESSAGE_CONTENT = 1 << 15;
const DEFAULT_MESSAGE_COMMAND_POLL_INTERVAL_MS = 5_000;
const DEFAULT_EPIC_REACTION_EMOJI = "epic:1507434865505603757";
const DEFAULT_GRAND_RISING_EMOJI = "GM:1507443437916524675";
const DEFAULT_SCHEDULED_POST_INTERVAL_MS = 60_000;
const DEFAULT_BOT_MESSAGE_REACTION_RULES = [
  {
    key: "epic",
    emoji: DEFAULT_EPIC_REACTION_EMOJI,
    pattern: /(^|[^a-z0-9])epic([^a-z0-9]|$)/i,
  },
];
const FEEDBACK_SETUP_TRIGGERS = [
  "computa feedback setup",
  "computa setup feedback",
];
const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function readEnv(name, env = process.env) {
  const value = env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumberEnv(name, env = process.env) {
  const value = readEnv(name, env);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function loadDiscordFeedbackWorkerEnvFile(env = process.env) {
  const envFilePath = resolveEnvFilePath(REPO_ROOT, env.FITNESS_ENV_FILE ?? "");
  const entries = parseDotenvFile(envFilePath);
  for (const [key, value] of Object.entries(entries)) {
    if (env[key] === undefined) {
      env[key] = value;
    }
  }

  return {
    envFilePath,
    loadedKeys: Object.keys(entries),
  };
}

export function normalizeDiscordMessageCommandContent(content) {
  return typeof content === "string"
    ? content.toLowerCase().replace(/\s+/g, " ").trim()
    : "";
}

export function getRequestedBotMessageReactions(message, rules = DEFAULT_BOT_MESSAGE_REACTION_RULES) {
  if (!message || typeof message !== "object") {
    return [];
  }

  if (message.author?.bot === true) {
    return [];
  }

  const normalizedContent = normalizeDiscordMessageCommandContent(message.content);
  return rules
    .filter((rule) => rule?.pattern instanceof RegExp && rule.pattern.test(normalizedContent))
    .map((rule) => ({
      key: String(rule.key ?? "unknown"),
      emoji: String(rule.emoji ?? ""),
    }))
    .filter((rule) => rule.emoji.length > 0);
}

export function messageRequestsBotReaction(message, rules = DEFAULT_BOT_MESSAGE_REACTION_RULES) {
  return getRequestedBotMessageReactions(message, rules).length > 0;
}

export function getDateTimePartsInTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function getTimeZoneDateKey(date, timeZone) {
  const parts = getDateTimePartsInTimeZone(date, timeZone);
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function isScheduledBotPostDue({ now = new Date(), rule, lastPostedDateKey }) {
  if (!rule?.enabled) {
    return false;
  }

  const timeZone = rule.timeZone ?? "America/New_York";
  const parts = getDateTimePartsInTimeZone(now, timeZone);
  const dateKey = getTimeZoneDateKey(now, timeZone);
  const hour = Number(rule.hour);
  const minuteStart = Number(rule.minuteStart ?? 0);
  const minuteWindow = Number(rule.minuteWindow ?? 15);
  const minuteEnd = minuteStart + Math.max(0, minuteWindow);

  return lastPostedDateKey !== dateKey
    && parts.hour === hour
    && parts.minute >= minuteStart
    && parts.minute <= minuteEnd;
}

export function messageRequestsFeedbackSetup(message, mainChannelId) {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.channel_id !== mainChannelId) {
    return false;
  }

  if (message.author?.bot === true) {
    return false;
  }

  const normalizedContent = normalizeDiscordMessageCommandContent(message.content);
  return FEEDBACK_SETUP_TRIGGERS.some((trigger) => normalizedContent.includes(trigger));
}

export function messageRequestsComputaLive(message, mainChannelId) {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.channel_id !== mainChannelId) {
    return false;
  }

  if (message.author?.bot === true) {
    return false;
  }

  const normalizedContent = normalizeDiscordMessageCommandContent(message.content);
  return normalizedContent.startsWith("computa post live");
}

export function messageRequestsComputaUpdate(message, mainChannelId) {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.channel_id !== mainChannelId) {
    return false;
  }

  if (message.author?.bot === true) {
    return false;
  }

  const normalizedContent = normalizeDiscordMessageCommandContent(message.content);
  return normalizedContent.startsWith("computa post update");
}

export function messageRequestsComputaMenu(message, mainChannelId) {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.channel_id !== mainChannelId) {
    return false;
  }

  if (message.author?.bot === true) {
    return false;
  }

  return normalizeDiscordMessageCommandContent(message.content) === "computa";
}

export function messageRequestsComputaOwnerMenu(message, mainChannelId) {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.channel_id !== mainChannelId) {
    return false;
  }

  if (message.author?.bot === true) {
    return false;
  }

  return normalizeDiscordMessageCommandContent(message.content) === "computa owner";
}

export function messageRequestsComputaCommandCardRepair(message, mainChannelId) {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.channel_id !== mainChannelId) {
    return false;
  }

  if (message.author?.bot === true) {
    return false;
  }

  return [
    "computa repair command card",
    "computa repair computa",
  ].includes(normalizeDiscordMessageCommandContent(message.content));
}

export function messageRequestsComputaFeedbackLauncherRepair(message, mainChannelId) {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.channel_id !== mainChannelId) {
    return false;
  }

  if (message.author?.bot === true) {
    return false;
  }

  return [
    "computa repair feedback launcher",
    "computa repair feedback setup",
  ].some((trigger) => normalizeDiscordMessageCommandContent(message.content).includes(trigger));
}

export function messageRequestsComputaReleaseCheck(message, mainChannelId) {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.channel_id !== mainChannelId) {
    return false;
  }

  if (message.author?.bot === true) {
    return false;
  }

  const normalizedContent = normalizeDiscordMessageCommandContent(message.content);
  return [
    "computa release check",
    "computa check release",
    "computa ledger check",
    "computa check ledger",
  ].some((trigger) => normalizedContent.includes(trigger));
}

export function messageRequestsComputaArchiveCheckedCards(message, mainChannelId) {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.channel_id !== mainChannelId) {
    return false;
  }

  if (message.author?.bot === true) {
    return false;
  }

  const normalizedContent = normalizeDiscordMessageCommandContent(message.content);
  return [
    "computa archive checked cards",
    "computa archive checked",
    "computa archive resolved cards",
    "computa feedback archive checked cards",
  ].some((trigger) => normalizedContent.includes(trigger));
}

export function messageRequestsComputaFeedbackReactionSync(message, mainChannelId) {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.channel_id !== mainChannelId) {
    return false;
  }

  if (message.author?.bot === true) {
    return false;
  }

  const normalizedContent = normalizeDiscordMessageCommandContent(message.content);
  return [
    "computa sync feedback reactions",
    "computa feedback sync reactions",
    "computa sync checked cards",
  ].some((trigger) => normalizedContent.includes(trigger));
}

export function messageRequestsDiscordMessageCommand(message, mainChannelId) {
  return messageRequestsComputaMenu(message, mainChannelId)
    || messageRequestsComputaOwnerMenu(message, mainChannelId)
    || messageRequestsComputaCommandCardRepair(message, mainChannelId)
    || messageRequestsComputaFeedbackLauncherRepair(message, mainChannelId)
    || messageRequestsComputaReleaseCheck(message, mainChannelId)
    || messageRequestsFeedbackSetup(message, mainChannelId)
    || messageRequestsComputaArchiveCheckedCards(message, mainChannelId)
    || messageRequestsComputaFeedbackReactionSync(message, mainChannelId)
    || messageRequestsComputaUpdate(message, mainChannelId)
    || messageRequestsComputaLive(message, mainChannelId);
}

export function resolveDiscordMessageCommandPollUrl(env = process.env) {
  const explicitUrl = readEnv("DISCORD_MESSAGE_COMMAND_POLL_URL", env);
  if (explicitUrl) {
    return explicitUrl;
  }

  const siteUrl = readEnv("NEXT_PUBLIC_SITE_URL", env)
    ?? readEnv("VERCEL_PROJECT_PRODUCTION_URL", env)
    ?? "https://fawxzzy-fitness-local.vercel.app";
  const baseUrl = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
  return `${baseUrl.replace(/\/+$/, "")}/api/discord/interactions`;
}

export function resolveDiscordMessageCommandPollSecret(env = process.env) {
  return readEnv("DISCORD_MESSAGE_COMMAND_POLL_SECRET", env) ?? readEnv("CRON_SECRET", env);
}

export function resolveDiscordMessageCommandPollIntervalMs(env = process.env) {
  const rawValue = readEnv("DISCORD_MESSAGE_COMMAND_POLL_INTERVAL_MS", env);
  const intervalMs = Number(rawValue);
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return DEFAULT_MESSAGE_COMMAND_POLL_INTERVAL_MS;
  }

  return Math.max(5_000, Math.min(Math.floor(intervalMs), 120_000));
}

export function resolveScheduledPostIntervalMs(env = process.env) {
  const rawValue = readNumberEnv("DISCORD_SCHEDULED_POST_INTERVAL_MS", env);
  if (!rawValue || rawValue <= 0) {
    return DEFAULT_SCHEDULED_POST_INTERVAL_MS;
  }

  return Math.max(30_000, Math.min(Math.floor(rawValue), 15 * 60_000));
}

export function resolveDiscordWorkerStatePath(env = process.env) {
  const configuredPath = readEnv("DISCORD_FEEDBACK_WORKER_STATE_PATH", env);
  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  return path.resolve(REPO_ROOT, "..", "..", "runtime", "state", "discord-feedback-worker-state.json");
}

export function trimDiscordWorkerRecentMessageIds(messageIds, limit = 500) {
  if (!Array.isArray(messageIds)) {
    return [];
  }

  const normalized = messageIds
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());

  if (normalized.length <= limit) {
    return normalized;
  }

  return normalized.slice(normalized.length - limit);
}

export function normalizeDiscordWorkerMessageActivityState(state) {
  const root = state && typeof state === "object" ? state : {};
  const messageActivity = root.messageActivity && typeof root.messageActivity === "object"
    ? root.messageActivity
    : {};
  const lastSeenByChannelInput = messageActivity.lastSeenByChannel && typeof messageActivity.lastSeenByChannel === "object"
    ? messageActivity.lastSeenByChannel
    : {};
  const lastSeenByChannel = {};

  for (const [channelId, checkpoint] of Object.entries(lastSeenByChannelInput)) {
    if (typeof channelId !== "string" || channelId.trim().length === 0 || !checkpoint || typeof checkpoint !== "object") {
      continue;
    }

    const messageId = typeof checkpoint.messageId === "string" && checkpoint.messageId.trim().length > 0
      ? checkpoint.messageId.trim()
      : null;
    const timestamp = typeof checkpoint.timestamp === "string" && Number.isFinite(Date.parse(checkpoint.timestamp))
      ? checkpoint.timestamp
      : null;

    if (!messageId && !timestamp) {
      continue;
    }

    lastSeenByChannel[channelId.trim()] = {
      ...(messageId ? { messageId } : {}),
      ...(timestamp ? { timestamp } : {}),
    };
  }

  return {
    recentMessageIds: trimDiscordWorkerRecentMessageIds(messageActivity.recentMessageIds),
    lastSeenByChannel,
  };
}

export function isDiscordMessageAtOrBeforeCheckpoint(message, checkpoint) {
  if (!checkpoint || typeof checkpoint !== "object") {
    return false;
  }

  const messageId = typeof message?.id === "string" ? message.id : null;
  const checkpointMessageId = typeof checkpoint.messageId === "string" ? checkpoint.messageId : null;
  if (messageId && checkpointMessageId && messageId === checkpointMessageId) {
    return true;
  }

  const messageTimestampRaw = typeof message?.timestamp === "string" ? message.timestamp : null;
  const checkpointTimestampRaw = typeof checkpoint.timestamp === "string" ? checkpoint.timestamp : null;
  if (!messageTimestampRaw || !checkpointTimestampRaw) {
    return false;
  }

  const messageTimestamp = Date.parse(messageTimestampRaw);
  const checkpointTimestamp = Date.parse(checkpointTimestampRaw);
  if (!Number.isFinite(messageTimestamp) || !Number.isFinite(checkpointTimestamp)) {
    return false;
  }

  if (messageTimestamp < checkpointTimestamp) {
    return true;
  }

  if (messageTimestamp > checkpointTimestamp) {
    return false;
  }

  return Boolean(messageId && checkpointMessageId && messageId === checkpointMessageId);
}

export async function readDiscordWorkerState(statePath) {
  try {
    const body = await fs.readFile(statePath, "utf8");
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function writeDiscordWorkerState(statePath, state) {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function callDiscordMessageCommandPoll({
  fetchImpl = globalThis.fetch,
  pollUrl,
  secret,
}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("Global fetch is not available.");
  }

  if (!pollUrl) {
    throw new Error("Missing Discord message command poll URL.");
  }

  if (!secret) {
    throw new Error("Missing DISCORD_MESSAGE_COMMAND_POLL_SECRET or CRON_SECRET.");
  }

  const response = await fetchImpl(pollUrl, {
    method: "GET",
    headers: {
      authorization: `Bearer ${secret}`,
      "cache-control": "no-cache",
    },
  });

  const bodyText = await response.text();
  let body = null;
  if (bodyText.trim().startsWith("{") || bodyText.trim().startsWith("[")) {
    body = JSON.parse(bodyText);
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
    bodyText,
  };
}

export async function createDiscordGatewayChannelMessage({
  fetchImpl = globalThis.fetch,
  token,
  channelId,
  body,
}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("Global fetch is not available.");
  }

  if (!token) {
    throw new Error("Missing DISCORD_BOT_TOKEN.");
  }

  if (!channelId) {
    throw new Error("Missing Discord message channel.");
  }

  const response = await fetchImpl(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bot ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const bodyText = await response.text();
  let responseBody = null;
  if (bodyText.trim().startsWith("{")) {
    responseBody = JSON.parse(bodyText);
  }

  return {
    ok: response.ok,
    status: response.status,
    body: responseBody,
    bodyText,
  };
}

export async function createDiscordGatewayMessageReaction({
  fetchImpl = globalThis.fetch,
  token,
  channelId,
  messageId,
  emoji,
}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("Global fetch is not available.");
  }

  if (!token) {
    throw new Error("Missing DISCORD_BOT_TOKEN.");
  }

  if (!channelId || !messageId || !emoji) {
    throw new Error("Missing Discord reaction target.");
  }

  const response = await fetchImpl(
    `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`,
    {
      method: "PUT",
      headers: {
        authorization: `Bot ${token}`,
      },
    },
  );

  const bodyText = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    bodyText,
  };
}

export function calculateDiscordGatewayReconnectDelayMs(attempt) {
  const boundedAttempt = Math.max(0, Math.min(Number(attempt) || 0, 6));
  return Math.min(30_000, 1_000 * (2 ** boundedAttempt));
}

export class DiscordFeedbackGatewayWorker {
  constructor({
    token,
    mainChannelId,
    pollUrl,
    pollSecret,
    WebSocketImpl = globalThis.WebSocket,
    fetchImpl = globalThis.fetch,
    logger = console,
    pollIntervalMs = DEFAULT_MESSAGE_COMMAND_POLL_INTERVAL_MS,
    botMessageReactionRules = DEFAULT_BOT_MESSAGE_REACTION_RULES,
    scheduledPostRules = [],
    scheduledPostIntervalMs = DEFAULT_SCHEDULED_POST_INTERVAL_MS,
    scheduledPostStatePath = resolveDiscordWorkerStatePath(),
    now = () => new Date(),
  }) {
    this.token = token;
    this.mainChannelId = mainChannelId;
    this.pollUrl = pollUrl;
    this.pollSecret = pollSecret;
    this.WebSocketImpl = WebSocketImpl;
    this.fetchImpl = fetchImpl;
    this.logger = logger;
    this.pollIntervalMs = pollIntervalMs;
    this.socket = null;
    this.sequence = null;
    this.heartbeatTimer = null;
    this.pollTimer = null;
    this.reconnectAttempt = 0;
    this.stopped = false;
    this.seenMessageIds = new Set();
    this.pollInFlight = false;
    this.workerState = {};
    this.workerStateReady = null;
    this.botMessageReactionRules = botMessageReactionRules;
    this.scheduledPostRules = scheduledPostRules;
    this.scheduledPostIntervalMs = scheduledPostIntervalMs;
    this.scheduledPostStatePath = scheduledPostStatePath;
    this.now = now;
    this.scheduledPostTimer = null;
    this.scheduledPostInFlight = false;
  }

  start() {
    if (!this.token) {
      throw new Error("Missing DISCORD_BOT_TOKEN.");
    }
    if (!this.mainChannelId) {
      throw new Error("Missing DISCORD_MAIN_CHANNEL_ID.");
    }
    if (!this.pollUrl) {
      throw new Error("Missing Discord message command poll URL.");
    }
    if (!this.pollSecret) {
      throw new Error("Missing DISCORD_MESSAGE_COMMAND_POLL_SECRET or CRON_SECRET.");
    }
    if (typeof this.WebSocketImpl !== "function") {
      throw new Error("WebSocket is not available. Run this worker on Node 22+ or provide a WebSocket runtime.");
    }

    this.stopped = false;
    this.workerStateReady = this.loadWorkerState();
    this.connect();
    this.startPeriodicPoll();
    this.startScheduledBotPosts();
  }

  stop() {
    this.stopped = true;
    this.clearHeartbeat();
    this.clearPeriodicPoll();
    this.clearScheduledBotPosts();
    if (this.socket) {
      this.socket.close(1000, "worker stopped");
      this.socket = null;
    }
  }

  startPeriodicPoll() {
    this.clearPeriodicPoll();
    this.pollTimer = setInterval(() => {
      void this.runMessageCommandPoll({
        reason: "interval",
        messageId: null,
      });
    }, this.pollIntervalMs);
  }

  clearPeriodicPoll() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  startScheduledBotPosts() {
    this.clearScheduledBotPosts();
    if (this.scheduledPostRules.length === 0) {
      return;
    }

    void this.runScheduledBotPosts("startup");
    this.scheduledPostTimer = setInterval(() => {
      void this.runScheduledBotPosts("interval");
    }, this.scheduledPostIntervalMs);
  }

  clearScheduledBotPosts() {
    if (this.scheduledPostTimer) {
      clearInterval(this.scheduledPostTimer);
      this.scheduledPostTimer = null;
    }
  }

  async loadWorkerState() {
    const state = await readDiscordWorkerState(this.scheduledPostStatePath);
    this.workerState = state && typeof state === "object" ? state : {};

    const messageActivity = normalizeDiscordWorkerMessageActivityState(this.workerState);
    this.seenMessageIds = new Set(messageActivity.recentMessageIds);
  }

  async ensureWorkerStateReady() {
    if (this.workerStateReady) {
      await this.workerStateReady;
      this.workerStateReady = null;
    }
  }

  getPersistedMessageCheckpoint(channelId) {
    const messageActivity = normalizeDiscordWorkerMessageActivityState(this.workerState);
    return channelId ? (messageActivity.lastSeenByChannel[channelId] ?? null) : null;
  }

  async persistMessageActivity(message) {
    const channelId = typeof message?.channel_id === "string" ? message.channel_id : null;
    const messageId = typeof message?.id === "string" ? message.id : null;
    const timestamp = typeof message?.timestamp === "string" && Number.isFinite(Date.parse(message.timestamp))
      ? message.timestamp
      : null;
    if (!channelId || !messageId) {
      return;
    }

    const normalized = normalizeDiscordWorkerMessageActivityState(this.workerState);
    const recentMessageIds = trimDiscordWorkerRecentMessageIds([
      ...normalized.recentMessageIds,
      messageId,
    ]);
    const lastSeenByChannel = {
      ...normalized.lastSeenByChannel,
      [channelId]: {
        messageId,
        ...(timestamp ? { timestamp } : {}),
      },
    };

    this.workerState = {
      ...this.workerState,
      messageActivity: {
        recentMessageIds,
        lastSeenByChannel,
      },
    };

    await writeDiscordWorkerState(this.scheduledPostStatePath, this.workerState);
  }

  connect() {
    this.socket = new this.WebSocketImpl(DISCORD_GATEWAY_URL);
    this.socket.addEventListener("open", () => {
      this.logger.info("[discord-feedback-worker] gateway socket open");
    });
    this.socket.addEventListener("message", (event) => {
      void this.handleSocketMessage(event.data);
    });
    this.socket.addEventListener("close", (event) => {
      this.logger.warn("[discord-feedback-worker] gateway socket closed", {
        code: event.code,
        reason: event.reason,
      });
      this.clearHeartbeat();
      this.socket = null;
      if (!this.stopped) {
        this.scheduleReconnect();
      }
    });
    this.socket.addEventListener("error", (event) => {
      this.logger.error("[discord-feedback-worker] gateway socket error", {
        message: event?.message ?? "WebSocket error",
      });
    });
  }

  send(payload) {
    if (!this.socket || this.socket.readyState !== this.WebSocketImpl.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify(payload));
  }

  identify() {
    this.send({
      op: DISCORD_GATEWAY_OPCODE.IDENTIFY,
      d: {
        token: this.token,
        intents: DISCORD_GATEWAY_INTENT_GUILD_MESSAGES | DISCORD_GATEWAY_INTENT_MESSAGE_CONTENT,
        properties: {
          os: process.platform,
          browser: "fawxzzy-feedback-worker",
          device: "fawxzzy-feedback-worker",
        },
      },
    });
  }

  startHeartbeat(intervalMs) {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({
        op: DISCORD_GATEWAY_OPCODE.HEARTBEAT,
        d: this.sequence,
      });
    }, intervalMs);
  }

  clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  scheduleReconnect() {
    const delayMs = calculateDiscordGatewayReconnectDelayMs(this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.logger.warn("[discord-feedback-worker] reconnect scheduled", { delayMs });
    setTimeout(() => {
      if (!this.stopped) {
        this.connect();
      }
    }, delayMs);
  }

  async handleSocketMessage(rawData) {
    let payload;
    try {
      payload = JSON.parse(String(rawData));
    } catch {
      this.logger.warn("[discord-feedback-worker] ignored non-json gateway payload");
      return;
    }

    if (typeof payload.s === "number") {
      this.sequence = payload.s;
    }

    if (payload.op === DISCORD_GATEWAY_OPCODE.HELLO) {
      const interval = Number(payload.d?.heartbeat_interval);
      this.startHeartbeat(Number.isFinite(interval) && interval > 0 ? interval : 45_000);
      this.identify();
      return;
    }

    if (payload.op === DISCORD_GATEWAY_OPCODE.HEARTBEAT_ACK) {
      return;
    }

    if (payload.op === DISCORD_GATEWAY_OPCODE.RECONNECT || payload.op === DISCORD_GATEWAY_OPCODE.INVALID_SESSION) {
      this.socket?.close(4000, "gateway requested reconnect");
      return;
    }

    if (payload.op === DISCORD_GATEWAY_OPCODE.DISPATCH) {
      this.reconnectAttempt = 0;
      if (payload.t === "READY") {
        this.logger.info("[discord-feedback-worker] gateway ready", {
          sessionId: payload.d?.session_id ?? null,
        });
        return;
      }

      if (payload.t === "MESSAGE_CREATE") {
        await this.handleMessageCreate(payload.d);
      }
    }
  }

  async handleMessageCreate(message) {
    await this.ensureWorkerStateReady();

    const channelId = typeof message.channel_id === "string" ? message.channel_id : null;
    if (channelId) {
      const checkpoint = this.getPersistedMessageCheckpoint(channelId);
      if (checkpoint && isDiscordMessageAtOrBeforeCheckpoint(message, checkpoint)) {
        return;
      }
    }

    const messageId = typeof message.id === "string" ? message.id : null;
    if (messageId) {
      if (this.seenMessageIds.has(messageId)) {
        return;
      }
      this.seenMessageIds.add(messageId);
      if (this.seenMessageIds.size > 500) {
        const first = this.seenMessageIds.values().next().value;
        this.seenMessageIds.delete(first);
      }
    }

    const botReactions = getRequestedBotMessageReactions(message, this.botMessageReactionRules);
    if (botReactions.length > 0) {
      await this.reactToBotMessage(message, botReactions);
    }

    const requestedMessageCommand = messageRequestsDiscordMessageCommand(message, this.mainChannelId);
    if (requestedMessageCommand) {
      await this.runMessageCommandPoll({
        reason: "message-create",
        messageId,
      });
    }

    if (botReactions.length > 0 || requestedMessageCommand) {
      await this.persistMessageActivity(message);
    }
  }

  async reactToBotMessage(message, reactions) {
    const channelId = typeof message.channel_id === "string" ? message.channel_id : null;
    const messageId = typeof message.id === "string" ? message.id : null;
    if (!channelId || !messageId) {
      return;
    }

    for (const reaction of reactions) {
      try {
        const result = await createDiscordGatewayMessageReaction({
          fetchImpl: this.fetchImpl,
          token: this.token,
          channelId,
          messageId,
          emoji: reaction.emoji,
        });
        if (!result.ok) {
          this.logger.warn("[discord-feedback-worker] bot reaction failed", {
            channelId,
            messageId,
            reactionKey: reaction.key,
            status: result.status,
            body: result.bodyText,
          });
        }
      } catch (error) {
        this.logger.warn("[discord-feedback-worker] bot reaction threw", {
          channelId,
          messageId,
          reactionKey: reaction.key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  async runScheduledBotPosts(reason) {
    if (this.scheduledPostInFlight) {
      this.logger.info("[discord-feedback-worker] scheduled post already in flight", { reason });
      return;
    }

    this.scheduledPostInFlight = true;
    try {
      const now = this.now();
      const state = await readDiscordWorkerState(this.scheduledPostStatePath);
      const dailyPosts = state.dailyPosts && typeof state.dailyPosts === "object" ? state.dailyPosts : {};
      let changed = false;

      for (const rule of this.scheduledPostRules) {
        const dateKey = getTimeZoneDateKey(now, rule.timeZone ?? "America/New_York");
        if (!isScheduledBotPostDue({
          now,
          rule,
          lastPostedDateKey: dailyPosts[rule.key],
        })) {
          continue;
        }

        const channelId = rule.channelId ?? this.mainChannelId;
        const result = await createDiscordGatewayChannelMessage({
          fetchImpl: this.fetchImpl,
          token: this.token,
          channelId,
          body: {
            content: rule.content,
            allowed_mentions: { parse: [] },
          },
        });

        if (!result.ok) {
          this.logger.warn("[discord-feedback-worker] scheduled post failed", {
            reason,
            ruleKey: rule.key,
            status: result.status,
            body: result.body ?? result.bodyText,
          });
          continue;
        }

        dailyPosts[rule.key] = dateKey;
        changed = true;
        this.logger.info("[discord-feedback-worker] scheduled post completed", {
          reason,
          ruleKey: rule.key,
          channelId,
          messageId: result.body?.id ?? null,
          dateKey,
        });
      }

      if (changed) {
        await writeDiscordWorkerState(this.scheduledPostStatePath, {
          ...state,
          dailyPosts,
        });
      }
    } catch (error) {
      this.logger.warn("[discord-feedback-worker] scheduled post threw", {
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.scheduledPostInFlight = false;
    }
  }

  async runMessageCommandPoll({ reason, messageId }) {
    if (this.pollInFlight) {
      this.logger.info("[discord-feedback-worker] poll already in flight", { reason, messageId });
      return;
    }

    this.pollInFlight = true;
    try {
      const result = await callDiscordMessageCommandPoll({
        fetchImpl: this.fetchImpl,
        pollUrl: this.pollUrl,
        secret: this.pollSecret,
      });
      if (!result.ok) {
        this.logger.error("[discord-feedback-worker] feedback setup poll failed", {
          reason,
          messageId,
          status: result.status,
          body: result.body ?? result.bodyText,
        });
        return;
      }

      this.logger.info("[discord-feedback-worker] feedback setup poll completed", {
        reason,
        messageId,
        processed: result.body?.processed ?? null,
      });
    } catch (error) {
      this.logger.error("[discord-feedback-worker] feedback setup poll threw", {
        reason,
        messageId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.pollInFlight = false;
    }
  }
}

export function buildDiscordFeedbackGatewayWorkerFromEnv(env = process.env) {
  return new DiscordFeedbackGatewayWorker({
    token: readEnv("DISCORD_BOT_TOKEN", env),
    mainChannelId: readEnv("DISCORD_MAIN_CHANNEL_ID", env),
    pollUrl: resolveDiscordMessageCommandPollUrl(env),
    pollSecret: resolveDiscordMessageCommandPollSecret(env),
    pollIntervalMs: resolveDiscordMessageCommandPollIntervalMs(env),
    botMessageReactionRules: [
      {
        key: "epic",
        emoji: readEnv("DISCORD_EPIC_REACTION_EMOJI", env) ?? DEFAULT_EPIC_REACTION_EMOJI,
        pattern: /(^|[^a-z0-9])epic([^a-z0-9]|$)/i,
      },
    ],
    scheduledPostRules: [
      {
        key: "grand-rising",
        enabled: readEnv("DISCORD_GRAND_RISING_ENABLED", env) !== "false",
        channelId: readEnv("DISCORD_GRAND_RISING_CHANNEL_ID", env) ?? readEnv("DISCORD_MAIN_CHANNEL_ID", env),
        timeZone: readEnv("DISCORD_GRAND_RISING_TIME_ZONE", env) ?? "America/New_York",
        hour: readNumberEnv("DISCORD_GRAND_RISING_HOUR", env) ?? 10,
        minuteStart: readNumberEnv("DISCORD_GRAND_RISING_MINUTE_START", env) ?? 0,
        minuteWindow: readNumberEnv("DISCORD_GRAND_RISING_MINUTE_WINDOW", env) ?? 15,
        content: `<:${readEnv("DISCORD_GRAND_RISING_EMOJI", env) ?? DEFAULT_GRAND_RISING_EMOJI}> Grand Rising`,
      },
    ],
    scheduledPostIntervalMs: resolveScheduledPostIntervalMs(env),
    scheduledPostStatePath: resolveDiscordWorkerStatePath(env),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const envFile = loadDiscordFeedbackWorkerEnvFile();
  if (envFile.loadedKeys.length > 0) {
    console.info("[discord-feedback-worker] loaded env file", {
      envFilePath: envFile.envFilePath,
      keyCount: envFile.loadedKeys.length,
    });
  }

  const worker = buildDiscordFeedbackGatewayWorkerFromEnv();
  worker.start();

  process.once("SIGINT", () => {
    worker.stop();
    process.exit(0);
  });
  process.once("SIGTERM", () => {
    worker.stop();
    process.exit(0);
  });
}
