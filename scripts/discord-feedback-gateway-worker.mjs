import path from "node:path";
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
const FEEDBACK_SETUP_TRIGGERS = [
  "bot feedback setup",
  "bot setup feedback",
];
const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function readEnv(name, env = process.env) {
  const value = env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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
  }) {
    this.token = token;
    this.mainChannelId = mainChannelId;
    this.pollUrl = pollUrl;
    this.pollSecret = pollSecret;
    this.WebSocketImpl = WebSocketImpl;
    this.fetchImpl = fetchImpl;
    this.logger = logger;
    this.socket = null;
    this.sequence = null;
    this.heartbeatTimer = null;
    this.reconnectAttempt = 0;
    this.stopped = false;
    this.seenMessageIds = new Set();
    this.pollInFlight = false;
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
    this.connect();
  }

  stop() {
    this.stopped = true;
    this.clearHeartbeat();
    if (this.socket) {
      this.socket.close(1000, "worker stopped");
      this.socket = null;
    }
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
    if (!messageRequestsFeedbackSetup(message, this.mainChannelId)) {
      return;
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

    if (this.pollInFlight) {
      this.logger.info("[discord-feedback-worker] poll already in flight", { messageId });
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
          messageId,
          status: result.status,
          body: result.body ?? result.bodyText,
        });
        return;
      }

      this.logger.info("[discord-feedback-worker] feedback setup poll completed", {
        messageId,
        processed: result.body?.processed ?? null,
      });
    } catch (error) {
      this.logger.error("[discord-feedback-worker] feedback setup poll threw", {
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
