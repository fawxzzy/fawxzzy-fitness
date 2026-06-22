import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..");
export const DISCORD_INVENTORY_NOISE_DOC_PATH = path.join(repoRoot, "docs", "ops", "FITNESS-DISCORD-INVENTORY-NOISE-AUDITS.md");
const envPath = resolveEnvFilePath(repoRoot);
const fileEnv = parseDotenvFile(envPath);

for (const [key, value] of Object.entries(fileEnv)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_API_USER_AGENT = "fawxzzy-fitness-discord-server-ops/1.0";
const DISCORD_CHANNEL_TYPES = new Map([
  [0, "text"],
  [1, "dm"],
  [2, "voice"],
  [4, "category"],
  [5, "announcement"],
  [10, "news-thread"],
  [11, "public-thread"],
  [12, "private-thread"],
  [13, "stage"],
  [14, "directory"],
  [15, "forum"],
  [16, "media"],
]);

const DISCORD_PERMISSION_MENTION_EVERYONE = BigInt(1) << BigInt(17);
const DEFAULT_INVENTORY_MARKDOWN_OUT = "runtime/discord-inventory/latest.md";
const DEFAULT_INVENTORY_JSON_OUT = "runtime/discord-inventory/latest.json";
const DEFAULT_NOISE_MARKDOWN_OUT = "runtime/discord-noise/latest.md";
const DEFAULT_NOISE_JSON_OUT = "runtime/discord-noise/latest.json";
const ALLOWED_LOUD_CHANNEL_ENV_KEYS = new Set([
  "DISCORD_UPDATES_CHANNEL_ID",
  "DISCORD_MAIN_CHANNEL_ID",
]);

function getOptionalEnv(name) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function getRequiredEnv(name) {
  const value = getOptionalEnv(name);
  if (!value) {
    throw new Error(`Missing required env: ${name}. Set it in ${envPath} or the current shell.`);
  }

  return value;
}

function isSnowflake(value) {
  return /^[0-9]{5,32}$/.test(String(value ?? "").trim());
}

function formatChannelType(type) {
  return DISCORD_CHANNEL_TYPES.get(Number(type)) ?? `type-${String(type ?? "unknown")}`;
}

function normalizeChannel(channel) {
  return {
    id: String(channel?.id ?? ""),
    name: String(channel?.name ?? "").trim() || "(unnamed)",
    type: Number(channel?.type ?? -1),
    type_label: formatChannelType(channel?.type),
    parent_id: typeof channel?.parent_id === "string" ? channel.parent_id : null,
    permission_overwrite_count: Array.isArray(channel?.permission_overwrites) ? channel.permission_overwrites.length : 0,
    available_tags: Array.isArray(channel?.available_tags)
      ? channel.available_tags
        .filter((tag) => typeof tag?.id === "string" && typeof tag?.name === "string")
        .map((tag) => ({ id: tag.id, name: tag.name }))
      : [],
  };
}

function normalizeRole(role) {
  return {
    id: String(role?.id ?? ""),
    name: String(role?.name ?? "").trim() || "(unnamed)",
    permissions: String(role?.permissions ?? "0"),
    position: Number(role?.position ?? 0),
  };
}

function normalizeEmoji(emoji) {
  return {
    id: typeof emoji?.id === "string" ? emoji.id : null,
    name: typeof emoji?.name === "string" ? emoji.name : "(unnamed)",
    available: emoji?.available !== false,
  };
}

function sortByNameThenId(items) {
  return [...items].sort((left, right) => {
    const nameCompare = String(left.name ?? "").localeCompare(String(right.name ?? ""));
    if (nameCompare !== 0) {
      return nameCompare;
    }

    return String(left.id ?? "").localeCompare(String(right.id ?? ""));
  });
}

export function parseInventoryArgs(argv = process.argv.slice(2)) {
  const args = {
    writeMarkdown: true,
    writeJson: true,
    out: null,
    debug: false,
  };

  let sawFormatFlag = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--markdown") {
      if (!sawFormatFlag) {
        args.writeMarkdown = true;
        args.writeJson = false;
      } else {
        args.writeMarkdown = true;
      }
      sawFormatFlag = true;
      continue;
    }

    if (token === "--json") {
      if (!sawFormatFlag) {
        args.writeMarkdown = false;
        args.writeJson = true;
      } else {
        args.writeJson = true;
      }
      sawFormatFlag = true;
      continue;
    }

    if (token === "--out") {
      args.out = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (token === "--debug") {
      args.debug = true;
    }
  }

  return args;
}

export function parseNoiseApplyArgs(argv = process.argv.slice(2)) {
  return {
    apply: argv.includes("--apply"),
    debug: argv.includes("--debug"),
  };
}

export function resolveInventoryOutputPaths(args) {
  const normalizePath = (target) => (path.isAbsolute(target) ? target : path.join(repoRoot, target));
  const resolved = {};

  if (args.out) {
    const absoluteTarget = normalizePath(args.out);
    const extension = path.extname(absoluteTarget).toLowerCase();

    if (args.writeMarkdown && !args.writeJson) {
      resolved.markdown = absoluteTarget;
    } else if (args.writeJson && !args.writeMarkdown) {
      resolved.json = absoluteTarget;
    } else if (extension === ".md") {
      resolved.markdown = absoluteTarget;
      resolved.json = absoluteTarget.replace(/\.md$/i, ".json");
    } else if (extension === ".json") {
      resolved.json = absoluteTarget;
      resolved.markdown = absoluteTarget.replace(/\.json$/i, ".md");
    } else {
      resolved.markdown = `${absoluteTarget}.md`;
      resolved.json = `${absoluteTarget}.json`;
    }
  } else {
    if (args.writeMarkdown) {
      resolved.markdown = path.join(repoRoot, DEFAULT_INVENTORY_MARKDOWN_OUT);
    }
    if (args.writeJson) {
      resolved.json = path.join(repoRoot, DEFAULT_INVENTORY_JSON_OUT);
    }
  }

  return resolved;
}

export function resolveNoiseOutputPaths(args) {
  const normalizePath = (target) => (path.isAbsolute(target) ? target : path.join(repoRoot, target));
  const resolved = {};

  if (args.out) {
    const absoluteTarget = normalizePath(args.out);
    const extension = path.extname(absoluteTarget).toLowerCase();

    if (args.writeMarkdown && !args.writeJson) {
      resolved.markdown = absoluteTarget;
    } else if (args.writeJson && !args.writeMarkdown) {
      resolved.json = absoluteTarget;
    } else if (extension === ".md") {
      resolved.markdown = absoluteTarget;
      resolved.json = absoluteTarget.replace(/\.md$/i, ".json");
    } else if (extension === ".json") {
      resolved.json = absoluteTarget;
      resolved.markdown = absoluteTarget.replace(/\.json$/i, ".md");
    } else {
      resolved.markdown = `${absoluteTarget}.md`;
      resolved.json = `${absoluteTarget}.json`;
    }
  } else {
    if (args.writeMarkdown) {
      resolved.markdown = path.join(repoRoot, DEFAULT_NOISE_MARKDOWN_OUT);
    }
    if (args.writeJson) {
      resolved.json = path.join(repoRoot, DEFAULT_NOISE_JSON_OUT);
    }
  }

  return resolved;
}

async function parseDiscordJson(response) {
  const responseText = await response.text();
  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return { message: responseText.slice(0, 300) };
  }
}

export async function discordRequest(pathname, { method = "GET", body } = {}) {
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

function buildConfiguredMatches(channels, roles, forumChannels) {
  const channelById = new Map(channels.map((channel) => [channel.id, channel]));
  const roleById = new Map(roles.map((role) => [role.id, role]));
  const forumById = new Map(forumChannels.map((channel) => [channel.id, channel]));

  const configuredChannels = [
    ["updates", "DISCORD_UPDATES_CHANNEL_ID"],
    ["main", "DISCORD_MAIN_CHANNEL_ID"],
    ["verify", "DISCORD_VERIFY_CHANNEL_ID"],
    ["feedback_panel", "DISCORD_FEEDBACK_PANEL_CHANNEL_ID"],
    ["feedback_forum", "DISCORD_BUG_REPORT_FORUM_CHANNEL_ID"],
    ["purgatory_category", "DISCORD_PURGATORY_CATEGORY_ID"],
    ["purgatory_channel", "DISCORD_PURGATORY_CHANNEL_ID"],
    ["mod_log", "DISCORD_MOD_LOG_CHANNEL_ID"],
  ].map(([label, envName]) => {
    const id = getOptionalEnv(envName);
    return {
      label,
      env: envName,
      id,
      channel: id ? channelById.get(id) ?? forumById.get(id) ?? null : null,
    };
  });

  const configuredRoles = [
    ["verified", "DISCORD_VERIFIED_ROLE_ID"],
    ["purgatory", "DISCORD_PURGATORY_ROLE_ID"],
  ].map(([label, envName]) => {
    const id = getOptionalEnv(envName);
    return {
      label,
      env: envName,
      id,
      role: id ? roleById.get(id) ?? null : null,
    };
  });

  return { configuredChannels, configuredRoles };
}

export async function fetchDiscordServerInventory() {
  const guildId = getRequiredEnv("DISCORD_GUILD_ID");
  const [rolesResult, channelsResult, emojisResult] = await Promise.all([
    discordRequest(`/guilds/${guildId}/roles`),
    discordRequest(`/guilds/${guildId}/channels`),
    discordRequest(`/guilds/${guildId}/emojis`),
  ]);

  if (!rolesResult.ok) {
    throw new Error(`Failed to fetch guild roles (${rolesResult.status}): ${rolesResult.message}`);
  }
  if (!channelsResult.ok) {
    throw new Error(`Failed to fetch guild channels (${channelsResult.status}): ${channelsResult.message}`);
  }
  if (!emojisResult.ok) {
    throw new Error(`Failed to fetch guild emojis (${emojisResult.status}): ${emojisResult.message}`);
  }

  const channels = sortByNameThenId((channelsResult.data ?? []).map(normalizeChannel));
  const roles = sortByNameThenId((rolesResult.data ?? []).map(normalizeRole));
  const emojis = sortByNameThenId((emojisResult.data ?? []).map(normalizeEmoji));
  const forumChannels = channels.filter((channel) => channel.type === 15);
  const forumTags = forumChannels.flatMap((channel) => (
    channel.available_tags.map((tag) => ({
      channel_id: channel.id,
      channel_name: channel.name,
      id: tag.id,
      name: tag.name,
    }))
  ));
  const { configuredChannels, configuredRoles } = buildConfiguredMatches(channels, roles, forumChannels);

  return {
    generated_at: new Date().toISOString(),
    guild_id: guildId,
    channels,
    roles,
    emojis,
    forum_tags: sortByNameThenId(forumTags),
    configured: {
      channels: configuredChannels,
      roles: configuredRoles,
    },
  };
}

function formatConfiguredChannelLine(match) {
  if (!match.id) {
    return `- ${match.label}: ${match.env} not set`;
  }

  if (!match.channel) {
    return `- ${match.label}: \`${match.id}\` (${match.env}, not found live)`;
  }

  return `- ${match.label}: #${match.channel.name} (\`${match.channel.id}\`, ${match.channel.type_label})`;
}

function formatConfiguredRoleLine(match) {
  if (!match.id) {
    return `- ${match.label}: ${match.env} not set`;
  }

  if (!match.role) {
    return `- ${match.label}: \`${match.id}\` (${match.env}, not found live)`;
  }

  return `- ${match.label}: ${match.role.name} (\`${match.role.id}\`)`;
}

export function renderDiscordServerInventoryMarkdown(snapshot) {
  const lines = [
    "# Discord Server Inventory",
    "",
    `Generated: ${snapshot.generated_at}`,
    `Guild: \`${snapshot.guild_id}\``,
    "",
    "## Configured channels",
    ...snapshot.configured.channels.map(formatConfiguredChannelLine),
    "",
    "## Configured roles",
    ...snapshot.configured.roles.map(formatConfiguredRoleLine),
    "",
    `## Channels (${snapshot.channels.length})`,
    ...snapshot.channels.map((channel) => (
      `- #${channel.name} | \`${channel.id}\` | ${channel.type_label} | parent: ${channel.parent_id ?? "none"} | overwrites: ${channel.permission_overwrite_count}`
    )),
    "",
    `## Roles (${snapshot.roles.length})`,
    ...snapshot.roles.map((role) => `- ${role.name} | \`${role.id}\` | position ${role.position}`),
    "",
    `## Emojis (${snapshot.emojis.length})`,
    ...snapshot.emojis.map((emoji) => `- ${emoji.name} | \`${emoji.id ?? "unicode-or-missing"}\` | available: ${emoji.available ? "yes" : "no"}`),
    "",
    `## Forum tags (${snapshot.forum_tags.length})`,
    ...snapshot.forum_tags.map((tag) => `- ${tag.name} | \`${tag.id}\` | ${tag.channel_name} (\`${tag.channel_id}\`)`),
  ];

  return `${lines.join("\n")}\n`;
}

function findBroadPingSources(root = repoRoot) {
  const targetFiles = [
    path.join(root, "src", "lib", "discord", "update-drafts.ts"),
    path.join(root, "src", "lib", "discord", "moderation.ts"),
    path.join(root, "scripts", "sync-feedback-forum-posts.mjs"),
  ].filter((filePath) => fs.existsSync(filePath));

  const findings = [];

  for (const filePath of targetFiles) {
    const contents = fs.readFileSync(filePath, "utf8");
    const hasEveryone = contents.includes("@everyone");
    const hasHere = contents.includes("@here");

    if (!hasEveryone && !hasHere) {
      continue;
    }

    const normalizedPath = path.relative(root, filePath).replace(/\\/g, "/");
    const allowed = normalizedPath === "src/lib/discord/update-drafts.ts";
    findings.push({
      file: normalizedPath,
      has_everyone: hasEveryone,
      has_here: hasHere,
      allowed,
    });
  }

  return findings;
}

export function buildDiscordNoiseAudit(snapshot) {
  const configuredChannelMap = new Map(snapshot.configured.channels.map((entry) => [entry.env, entry]));
  const updatesChannel = configuredChannelMap.get("DISCORD_UPDATES_CHANNEL_ID") ?? null;
  const mainChannel = configuredChannelMap.get("DISCORD_MAIN_CHANNEL_ID") ?? null;
  const mentionEveryoneRoles = snapshot.roles.filter((role) => {
    try {
      return (BigInt(role.permissions) & DISCORD_PERMISSION_MENTION_EVERYONE) !== BigInt(0);
    } catch {
      return false;
    }
  });

  const broadPingFindings = findBroadPingSources();
  const unexpectedBroadPingSources = broadPingFindings.filter((finding) => !finding.allowed);
  const nonLoudChannels = snapshot.channels.filter((channel) => (
    channel.id !== updatesChannel?.id
    && channel.id !== mainChannel?.id
    && channel.type !== 4
  ));

  const checks = [];
  checks.push({
    id: "updates-channel",
    status: updatesChannel?.channel ? "pass" : "fail",
    message: updatesChannel?.channel ? "Updates channel env resolves live." : "Updates channel env is missing or not found live.",
  });
  checks.push({
    id: "main-channel",
    status: mainChannel?.channel ? "pass" : "fail",
    message: mainChannel?.channel ? "Main channel env resolves live." : "Main channel env is missing or not found live.",
  });
  checks.push({
    id: "broad-ping-sources",
    status: unexpectedBroadPingSources.length > 0 ? "fail" : "pass",
    message: unexpectedBroadPingSources.length > 0
      ? "Found raw @everyone/@here usage outside the update-post lane."
      : "Raw broad-ping strings are isolated to the curated update-post lane.",
  });
  checks.push({
    id: "mention-everyone-roles",
    status: mentionEveryoneRoles.length > 0 ? "warn" : "pass",
    message: mentionEveryoneRoles.length > 0
      ? "Some roles can mention everyone or here and should be reviewed."
      : "No roles expose the Mention Everyone permission.",
  });

  const failureCount = checks.filter((check) => check.status === "fail").length;
  const warningCount = checks.filter((check) => check.status === "warn").length;
  const status = failureCount > 0 ? "fail" : warningCount > 0 ? "warn" : "pass";

  return {
    generated_at: new Date().toISOString(),
    status,
    summary: {
      pass: checks.filter((check) => check.status === "pass").length,
      warn: warningCount,
      fail: failureCount,
    },
    checks,
    loud_channels: [
      updatesChannel?.channel ? { label: "updates", ...updatesChannel.channel } : null,
      mainChannel?.channel ? { label: "main", ...mainChannel.channel } : null,
    ].filter(Boolean),
    channels_for_manual_review: nonLoudChannels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type_label,
      parent_id: channel.parent_id,
    })),
    mention_everyone_roles: mentionEveryoneRoles.map((role) => ({
      id: role.id,
      name: role.name,
      permissions: role.permissions,
    })),
    broad_ping_sources: broadPingFindings,
  };
}

export function renderDiscordNoiseAuditMarkdown(audit) {
  const lines = [
    "# Discord Noise Audit",
    "",
    `Generated: ${audit.generated_at}`,
    `Status: ${audit.status.toUpperCase()}`,
    `Summary: pass ${audit.summary.pass}, warn ${audit.summary.warn}, fail ${audit.summary.fail}`,
    "",
    "## Checks",
    ...audit.checks.map((check) => `- [${check.status.toUpperCase()}] ${check.id}: ${check.message}`),
    "",
    "## Loud channels",
    ...(audit.loud_channels.length > 0
      ? audit.loud_channels.map((channel) => `- ${channel.label}: #${channel.name} (\`${channel.id}\`)`)
      : ["- none"]),
    "",
    `## Channels for manual review (${audit.channels_for_manual_review.length})`,
    ...(audit.channels_for_manual_review.length > 0
      ? audit.channels_for_manual_review.map((channel) => `- #${channel.name} | \`${channel.id}\` | ${channel.type}`)
      : ["- none"]),
    "",
    `## Mention-everyone roles (${audit.mention_everyone_roles.length})`,
    ...(audit.mention_everyone_roles.length > 0
      ? audit.mention_everyone_roles.map((role) => `- ${role.name} | \`${role.id}\``)
      : ["- none"]),
    "",
    `## Broad ping source scan (${audit.broad_ping_sources.length})`,
    ...(audit.broad_ping_sources.length > 0
      ? audit.broad_ping_sources.map((finding) => `- ${finding.file} | @everyone: ${finding.has_everyone ? "yes" : "no"} | @here: ${finding.has_here ? "yes" : "no"} | allowed: ${finding.allowed ? "yes" : "no"}`)
      : ["- none"]),
  ];

  return `${lines.join("\n")}\n`;
}

export function buildDiscordNoiseApplyPlan(audit, args = { apply: false }) {
  const recommendations = [];

  for (const check of audit.checks) {
    if (check.id === "updates-channel" && check.status !== "pass") {
      recommendations.push("Set DISCORD_UPDATES_CHANNEL_ID to the real updates channel before relying on noise automation.");
    }

    if (check.id === "main-channel" && check.status !== "pass") {
      recommendations.push("Set DISCORD_MAIN_CHANNEL_ID to the real main channel before relying on noise automation.");
    }

    if (check.id === "broad-ping-sources" && check.status !== "pass") {
      recommendations.push("Remove raw @everyone/@here strings outside src/lib/discord/update-drafts.ts.");
    }

    if (check.id === "mention-everyone-roles" && check.status !== "pass") {
      recommendations.push("Review roles with Mention Everyone and remove that permission outside intentional announcer lanes.");
    }
  }

  if (audit.channels_for_manual_review.length > 0) {
    recommendations.push("Review non-loud channels and categories for posting limits, slowmode, and mention discipline.");
  }

  return {
    mode: args.apply ? "apply" : "dry-run",
    mutated: false,
    mutations: [],
    recommendations,
    note: args.apply
      ? "No automatic Discord permission mutations ran in v1. Review the recommendations before widening apply behavior."
      : "Dry-run only. No Discord permissions or notification settings were changed.",
  };
}

export function writeTextArtifact(targetPath, contents) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, contents, "utf8");
}

export function writeJsonArtifact(targetPath, payload) {
  writeTextArtifact(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
}

export function collectRuntimeChannelIds(snapshot) {
  return new Map(snapshot.configured.channels.filter((entry) => entry.id && entry.channel).map((entry) => [entry.label, entry.channel]));
}

export function isConfiguredLoudChannel(label) {
  return label === "updates" || label === "main";
}

export function getAllowedLoudChannelEnvKeys() {
  return new Set(ALLOWED_LOUD_CHANNEL_ENV_KEYS);
}
