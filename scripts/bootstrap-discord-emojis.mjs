#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_API_USER_AGENT = "fawxzzy-fitness-discord-emoji-bootstrap/1.0";
const MAX_EMOJI_BYTES = 256 * 1024;
const EMOJI_SIZE_PX = 128;
const DEFAULT_ENV_TEMPLATE_OUTPUT = path.join("tmp", "discord-emoji-bootstrap.env");
const VALID_EMOJI_MODES = new Set(["application", "guild"]);
const DEFAULT_EMOJI_MODE = "application";

export const DISCORD_EMOJI_ASSET_SPECS = [
  { name: "Bug", fileName: "Bug.png", envVarName: "DISCORD_FEEDBACK_BUG_EMOJI_ID" },
  { name: "Feature", fileName: "Feature.png", envVarName: "DISCORD_FEEDBACK_FEATURE_EMOJI_ID" },
  { name: "FawxzzyLogo", fileName: "FawxzzyLogo.png", envVarName: "DISCORD_FAWXZZY_LOGO_EMOJI_ID" },
  { name: "FawxzzyLogoWhite", fileName: "FawxzzyLogoWhite.png", envVarName: "DISCORD_FAWXZZY_LOGO_WHITE_EMOJI_ID" },
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..");
const assetDir = path.join(repoRoot, "assets", "discord-emojis");
const envFilePath = resolveEnvFilePath(repoRoot);
const fileEnv = parseDotenvFile(envFilePath);

for (const [key, value] of Object.entries(fileEnv)) {
  if (!process.env[key]) {
    process.env[key] = String(value ?? "")
      .replace(/\\r\\n/g, "")
      .replace(/\\n/g, "")
      .replace(/\r?\n/g, "")
      .trim();
  }
}

export function getDiscordEmojiEnvVarName(name) {
  const spec = DISCORD_EMOJI_ASSET_SPECS.find((candidate) => candidate.name === name);
  if (!spec) {
    throw new Error(`Unsupported Discord emoji asset name: ${name}`);
  }

  return spec.envVarName;
}

function optionalEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function mustGetEnv(name) {
  const value = optionalEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function isDiscordSnowflake(value) {
  return /^\d{5,32}$/.test(String(value ?? "").trim());
}

function normalizeEmojiMode(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_EMOJI_MODE;
  }

  if (!VALID_EMOJI_MODES.has(normalized)) {
    throw new Error(`Invalid emoji mode: ${value}. Expected application or guild.`);
  }

  return normalized;
}

export function parseArgs(argv) {
  const args = {
    apply: false,
    replace: false,
    writeEnvTemplate: false,
    envOutputPath: DEFAULT_ENV_TEMPLATE_OUTPUT,
    mode: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index] ?? "").trim();
    if (!token) {
      continue;
    }

    if (token === "--apply") {
      args.apply = true;
      continue;
    }

    if (token === "--replace") {
      args.replace = true;
      continue;
    }

    if (token === "--write-env-template") {
      args.writeEnvTemplate = true;
      continue;
    }

    if (token === "--mode") {
      args.mode = normalizeEmojiMode(argv[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (token.startsWith("--mode=")) {
      args.mode = normalizeEmojiMode(token.slice("--mode=".length));
      continue;
    }

    if (token === "--env-output") {
      args.envOutputPath = String(argv[index + 1] ?? "").trim() || DEFAULT_ENV_TEMPLATE_OUTPUT;
      index += 1;
      continue;
    }

    if (token.startsWith("--env-output=")) {
      args.envOutputPath = token.slice("--env-output=".length).trim() || DEFAULT_ENV_TEMPLATE_OUTPUT;
      continue;
    }

    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }

    throw new Error(`Unsupported argument: ${token}`);
  }

  return args;
}

export function resolveEmojiMode(args) {
  const requestedMode = normalizeEmojiMode(args?.requestedMode ?? optionalEnv("DISCORD_EMOJI_MODE"));
  const applicationId = args?.applicationId ?? optionalEnv("DISCORD_APPLICATION_ID");
  const guildId = args?.guildId ?? optionalEnv("DISCORD_GUILD_ID");
  const explicitMode = Boolean(args?.requestedMode);

  if (requestedMode === "application" && isDiscordSnowflake(applicationId)) {
    return {
      mode: "application",
      targetId: applicationId,
      source: explicitMode ? "flag" : optionalEnv("DISCORD_EMOJI_MODE") ? "env" : "default",
      fellBack: false,
    };
  }

  if (requestedMode === "application" && !explicitMode && isDiscordSnowflake(guildId)) {
    return {
      mode: "guild",
      targetId: guildId,
      source: optionalEnv("DISCORD_EMOJI_MODE") ? "env" : "default",
      fellBack: true,
      fallbackReason: "DISCORD_APPLICATION_ID is missing, so the default application mode fell back to guild mode.",
    };
  }

  if (requestedMode === "guild" && isDiscordSnowflake(guildId)) {
    return {
      mode: "guild",
      targetId: guildId,
      source: explicitMode ? "flag" : optionalEnv("DISCORD_EMOJI_MODE") ? "env" : "default",
      fellBack: false,
    };
  }

  if (requestedMode === "application") {
    throw new Error("Application emoji mode requires DISCORD_APPLICATION_ID.");
  }

  throw new Error("Guild emoji mode requires DISCORD_GUILD_ID.");
}

function detectMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".avif":
      return "image/avif";
    default:
      throw new Error(`Unsupported emoji asset format: ${extension || "<none>"}`);
  }
}

async function loadSharp() {
  try {
    const module = await import("sharp");
    return module.default;
  } catch {
    return null;
  }
}

export async function prepareEmojiAsset(args, deps = {}) {
  const filePath = path.resolve(args.filePath);
  const readFile = deps.readFile ?? fsp.readFile;
  const stat = deps.stat ?? fsp.stat;
  const sharpFactory = deps.sharpFactory ?? await loadSharp();

  let fileStats;
  try {
    fileStats = await stat(filePath);
  } catch {
    throw new Error(`Missing emoji asset: ${filePath}`);
  }

  const originalBuffer = await readFile(filePath);
  const originalMimeType = detectMimeType(filePath);

  if (!sharpFactory) {
    if (fileStats.size > MAX_EMOJI_BYTES) {
      throw new Error(`Emoji asset exceeds ${MAX_EMOJI_BYTES} bytes and sharp is unavailable: ${filePath}`);
    }

    return {
      filePath,
      fileSizeBytes: fileStats.size,
      uploadSizeBytes: originalBuffer.byteLength,
      width: null,
      height: null,
      mimeType: originalMimeType,
      imageData: `data:${originalMimeType};base64,${originalBuffer.toString("base64")}`,
      normalized: false,
    };
  }

  const pipeline = sharpFactory(originalBuffer, { animated: false })
    .resize(EMOJI_SIZE_PX, EMOJI_SIZE_PX, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    });
  const metadata = await pipeline.metadata();
  const pngBuffer = await pipeline.clone().png({ compressionLevel: 9, palette: true }).toBuffer();

  if (pngBuffer.byteLength <= MAX_EMOJI_BYTES) {
    return {
      filePath,
      fileSizeBytes: fileStats.size,
      uploadSizeBytes: pngBuffer.byteLength,
      width: metadata.width ?? EMOJI_SIZE_PX,
      height: metadata.height ?? EMOJI_SIZE_PX,
      mimeType: "image/png",
      imageData: `data:image/png;base64,${pngBuffer.toString("base64")}`,
      normalized: true,
    };
  }

  const webpBuffer = await pipeline.clone().webp({ quality: 90, nearLossless: true }).toBuffer();
  if (webpBuffer.byteLength <= MAX_EMOJI_BYTES) {
    return {
      filePath,
      fileSizeBytes: fileStats.size,
      uploadSizeBytes: webpBuffer.byteLength,
      width: metadata.width ?? EMOJI_SIZE_PX,
      height: metadata.height ?? EMOJI_SIZE_PX,
      mimeType: "image/webp",
      imageData: `data:image/webp;base64,${webpBuffer.toString("base64")}`,
      normalized: true,
    };
  }

  throw new Error(`Emoji asset could not be reduced below ${MAX_EMOJI_BYTES} bytes: ${filePath}`);
}

async function discordRequest(pathname, args = {}) {
  const botToken = mustGetEnv("DISCORD_BOT_TOKEN");
  const response = await (args.fetchImpl ?? globalThis.fetch)(`${DISCORD_API_BASE_URL}${pathname}`, {
    method: args.method ?? "GET",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
      "User-Agent": DISCORD_API_USER_AGENT,
      ...(args.auditLogReason ? { "X-Audit-Log-Reason": args.auditLogReason } : {}),
    },
    body: args.body === undefined ? undefined : JSON.stringify(args.body),
  });

  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText.slice(0, 300) };
    }
  }

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

async function listExistingEmojis(args, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  if (args.mode === "application") {
    const result = await discordRequest(`/applications/${args.targetId}/emojis`, { fetchImpl });
    if (!result.ok || !Array.isArray(result.data?.items)) {
      throw new Error(`Unable to list application emojis (${result.status}): ${result.message ?? "Unknown error"}`);
    }

    return result.data.items;
  }

  const result = await discordRequest(`/guilds/${args.targetId}/emojis`, { fetchImpl });
  if (!result.ok || !Array.isArray(result.data)) {
    throw new Error(`Unable to list guild emojis (${result.status}): ${result.message ?? "Unknown error"}`);
  }

  return result.data;
}

async function createEmoji(args, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const auditLogReason = args.mode === "guild" ? "Fawx Security emoji bootstrap" : null;
  const pathname = args.mode === "application"
    ? `/applications/${args.targetId}/emojis`
    : `/guilds/${args.targetId}/emojis`;
  const body = args.mode === "application"
    ? { name: args.name, image: args.imageData }
    : { name: args.name, image: args.imageData, roles: [] };

  const result = await discordRequest(pathname, {
    method: "POST",
    body,
    fetchImpl,
    auditLogReason,
  });

  if (!result.ok || !result.data || typeof result.data.id !== "string") {
    throw new Error(`Unable to create ${args.mode} emoji ${args.name} (${result.status}): ${result.message ?? "Unknown error"}`);
  }

  return result.data;
}

async function deleteEmoji(args, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const auditLogReason = args.mode === "guild" ? "Fawx Security emoji bootstrap replace" : null;
  const pathname = args.mode === "application"
    ? `/applications/${args.targetId}/emojis/${args.emojiId}`
    : `/guilds/${args.targetId}/emojis/${args.emojiId}`;
  const result = await discordRequest(pathname, {
    method: "DELETE",
    fetchImpl,
    auditLogReason,
  });

  if (!result.ok || result.status !== 204) {
    throw new Error(`Unable to delete ${args.mode} emoji ${args.name} (${result.status}): ${result.message ?? "Unknown error"}`);
  }
}

export function buildEmojiBootstrapSummary(result) {
  const lines = [
    `Discord emoji bootstrap (${result.mode}${result.fellBack ? ", fallback" : ""})`,
    `apply=${result.apply} replace=${result.replace}`,
  ];

  if (result.fallbackReason) {
    lines.push(`fallback: ${result.fallbackReason}`);
  }

  for (const row of result.rows) {
    const identifier = row.emojiId ? ` id=${row.emojiId}` : "";
    lines.push(`- ${row.name}: ${row.action}${identifier}`);
    lines.push(`  env: ${row.envVarName}${row.emojiId ? `=${row.emojiId}` : ""}`);
  }

  if (result.envTemplatePath) {
    lines.push(`env template: ${result.envTemplatePath}`);
  }

  return lines.join("\n");
}

function buildEnvTemplate(rows) {
  return rows
    .map((row) => row.emojiId ? `${row.envVarName}=${row.emojiId}` : `# ${row.envVarName}=<missing>`)
    .join("\n") + "\n";
}

export async function executeEmojiBootstrap(args = {}, deps = {}) {
  const parsedArgs = args.argv ? parseArgs(args.argv) : {
    apply: Boolean(args.apply),
    replace: Boolean(args.replace),
    writeEnvTemplate: Boolean(args.writeEnvTemplate),
    envOutputPath: args.envOutputPath ?? DEFAULT_ENV_TEMPLATE_OUTPUT,
    mode: args.mode ?? null,
  };
  const resolvedMode = resolveEmojiMode({
    requestedMode: parsedArgs.mode,
    applicationId: args.applicationId ?? optionalEnv("DISCORD_APPLICATION_ID"),
    guildId: args.guildId ?? optionalEnv("DISCORD_GUILD_ID"),
  });
  const listExisting = deps.listExistingEmojis ?? listExistingEmojis;
  const createEmojiImpl = deps.createEmoji ?? createEmoji;
  const deleteEmojiImpl = deps.deleteEmoji ?? deleteEmoji;
  const prepareAsset = deps.prepareEmojiAsset ?? prepareEmojiAsset;
  const writeFile = deps.writeFile ?? fsp.writeFile;
  const mkdir = deps.mkdir ?? fsp.mkdir;
  const existingEmojis = await listExisting(resolvedMode, deps);
  const rows = [];

  for (const spec of DISCORD_EMOJI_ASSET_SPECS) {
    const filePath = path.join(assetDir, spec.fileName);
    const asset = await prepareAsset({ filePath }, deps);
    const existingEmoji = existingEmojis.find((emoji) => (
      typeof emoji?.name === "string" && emoji.name.trim().toLowerCase() === spec.name.toLowerCase()
    ));

    if (existingEmoji?.id && !parsedArgs.replace) {
      rows.push({
        name: spec.name,
        envVarName: spec.envVarName,
        emojiId: existingEmoji.id,
        action: parsedArgs.apply ? "kept-existing" : "would-keep-existing",
        uploadSizeBytes: asset.uploadSizeBytes,
      });
      continue;
    }

    if (existingEmoji?.id && parsedArgs.replace) {
      if (!parsedArgs.apply) {
        rows.push({
          name: spec.name,
          envVarName: spec.envVarName,
          emojiId: existingEmoji.id,
          action: "would-replace",
          uploadSizeBytes: asset.uploadSizeBytes,
        });
        continue;
      }

      await deleteEmojiImpl({
        mode: resolvedMode.mode,
        targetId: resolvedMode.targetId,
        emojiId: existingEmoji.id,
        name: spec.name,
      }, deps);
    }

    if (!parsedArgs.apply) {
      rows.push({
        name: spec.name,
        envVarName: spec.envVarName,
        emojiId: existingEmoji?.id ?? null,
        action: existingEmoji?.id ? "would-replace" : "would-create",
        uploadSizeBytes: asset.uploadSizeBytes,
      });
      continue;
    }

    const createdEmoji = await createEmojiImpl({
      mode: resolvedMode.mode,
      targetId: resolvedMode.targetId,
      name: spec.name,
      imageData: asset.imageData,
    }, deps);
    rows.push({
      name: spec.name,
      envVarName: spec.envVarName,
      emojiId: createdEmoji.id,
      action: existingEmoji?.id ? "replaced" : "created",
      uploadSizeBytes: asset.uploadSizeBytes,
    });
  }

  const envTemplatePath = parsedArgs.writeEnvTemplate
    ? path.resolve(repoRoot, parsedArgs.envOutputPath)
    : null;
  if (envTemplatePath) {
    await mkdir(path.dirname(envTemplatePath), { recursive: true });
    await writeFile(envTemplatePath, buildEnvTemplate(rows), "utf8");
  }

  return {
    apply: parsedArgs.apply,
    replace: parsedArgs.replace,
    writeEnvTemplate: parsedArgs.writeEnvTemplate,
    mode: resolvedMode.mode,
    targetId: resolvedMode.targetId,
    fellBack: resolvedMode.fellBack,
    fallbackReason: resolvedMode.fallbackReason ?? null,
    rows,
    envTemplatePath,
  };
}

function printHelp() {
  console.log([
    "Usage: npm run discord:emoji:bootstrap -- [--apply] [--replace] [--mode application|guild] [--write-env-template] [--env-output tmp/discord-emoji-bootstrap.env]",
    "",
    "Dry-run is the default. Use --apply to create or replace Discord emojis.",
    "Use --replace to delete and recreate existing named emojis when image updates are needed.",
  ].join("\n"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const result = await executeEmojiBootstrap({
    apply: args.apply,
    replace: args.replace,
    writeEnvTemplate: args.writeEnvTemplate,
    envOutputPath: args.envOutputPath,
    mode: args.mode,
  });
  console.log(buildEmojiBootstrapSummary(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`discord:emoji:bootstrap failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
