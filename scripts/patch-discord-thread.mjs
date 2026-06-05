#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";

const DISCORD_BOT_TOKEN_ENV = "DISCORD_BOT_TOKEN";
const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_API_USER_AGENT = "fawxzzy-fitness-discord-thread-patch/1.0";
const ASCII_PRINTABLE_PATTERN = /^[\x20-\x7E]+$/;

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

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    threadId: null,
    messageId: null,
    title: null,
    titleFile: null,
    body: null,
    bodyFile: null,
    apply: false,
    json: false,
    allowUnicodeTitle: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--thread-id") {
      args.threadId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--message-id") {
      args.messageId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--title") {
      args.title = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--title-file") {
      args.titleFile = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--body") {
      args.body = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--body-file") {
      args.bodyFile = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--apply") {
      args.apply = true;
      continue;
    }
    if (token === "--json") {
      args.json = true;
      continue;
    }
    if (token === "--allow-unicode-title") {
      args.allowUnicodeTitle = true;
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

function readOptionalTextFile(filePath) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    return null;
  }

  return fs.readFileSync(filePath, "utf8");
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\r\n/g, "\n").trim();
  return normalized.length > 0 ? normalized : null;
}

function loadTitle(args) {
  return normalizeOptionalText(readOptionalTextFile(args.titleFile) ?? args.title);
}

function loadBody(args) {
  return normalizeOptionalText(readOptionalTextFile(args.bodyFile) ?? args.body);
}

function toCodePoints(value) {
  return [...value].map((char, index) => ({
    index,
    char,
    codePoint: `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`,
  }));
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

function createHeaders() {
  return {
    Authorization: `Bot ${getRequiredEnv(DISCORD_BOT_TOKEN_ENV)}`,
    "Content-Type": "application/json",
    "User-Agent": DISCORD_API_USER_AGENT,
  };
}

async function discordRequest(pathname, { method = "GET", body } = {}) {
  const response = await fetch(`${DISCORD_API_BASE_URL}${pathname}`, {
    method,
    headers: createHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await parseDiscordJson(response);
  return { ok: response.ok, status: response.status, data };
}

function buildSummary(args, title, body) {
  return {
    apply: args.apply,
    threadId: args.threadId,
    messageId: args.messageId,
    title,
    titleCodePoints: title ? toCodePoints(title) : [],
    bodyLength: body?.length ?? 0,
    allowUnicodeTitle: args.allowUnicodeTitle,
  };
}

function validateArgs(args, title, body) {
  if (!args.threadId?.trim()) {
    throw new Error("Provide --thread-id for the Discord thread.");
  }
  if (!title && !body) {
    throw new Error("Provide --title/--title-file and/or --body/--body-file.");
  }
  if (body && !args.messageId?.trim()) {
    throw new Error("Provide --message-id when patching starter-post body content.");
  }
  if (title && !args.allowUnicodeTitle && !ASCII_PRINTABLE_PATTERN.test(title)) {
    throw new Error(
      "Thread titles default to ASCII-safe punctuation only. Use ASCII punctuation, or rerun with --allow-unicode-title after sourcing the title from a UTF-8-safe path and verifying readback.",
    );
  }
}

async function main() {
  const args = parseArgs();
  const title = loadTitle(args);
  const body = loadBody(args);

  validateArgs(args, title, body);

  const summary = buildSummary(args, title, body);

  if (!args.apply) {
    if (args.json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(JSON.stringify(summary, null, 2));
      console.log("Dry run only. Re-run with --apply to patch Discord.");
    }
    return;
  }

  if (title) {
    const titlePatchResult = await discordRequest(`/channels/${args.threadId}`, {
      method: "PATCH",
      body: { name: title },
    });
    if (!titlePatchResult.ok) {
      throw new Error(
        `Thread title patch failed (${titlePatchResult.status}): ${titlePatchResult.data && typeof titlePatchResult.data === "object" && "message" in titlePatchResult.data ? String(titlePatchResult.data.message) : "unknown error"}`,
      );
    }
  }

  if (body) {
    const bodyPatchResult = await discordRequest(`/channels/${args.threadId}/messages/${args.messageId}`, {
      method: "PATCH",
      body: {
        content: body,
        allowed_mentions: {
          parse: [],
          users: [],
          roles: [],
          replied_user: false,
        },
      },
    });
    if (!bodyPatchResult.ok) {
      throw new Error(
        `Starter message patch failed (${bodyPatchResult.status}): ${bodyPatchResult.data && typeof bodyPatchResult.data === "object" && "message" in bodyPatchResult.data ? String(bodyPatchResult.data.message) : "unknown error"}`,
      );
    }
  }

  let verifiedTitle = null;
  if (title) {
    const readbackResult = await discordRequest(`/channels/${args.threadId}`);
    if (!readbackResult.ok || typeof readbackResult.data?.name !== "string") {
      throw new Error(`Thread title readback failed (${readbackResult.status}).`);
    }
    verifiedTitle = readbackResult.data.name;
    if (verifiedTitle !== title) {
      throw new Error(`Thread title readback mismatch. Expected \"${title}\" but Discord stored \"${verifiedTitle}\".`);
    }
  }

  const result = {
    ...summary,
    verifiedTitle,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`patch-discord-thread failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
