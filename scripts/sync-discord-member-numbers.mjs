#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";

const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const FALLBACK_SUPABASE_URL_ENV = "SUPABASE_URL";
const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";
const DISCORD_BOT_TOKEN_ENV = "DISCORD_BOT_TOKEN";
const DISCORD_GUILD_ID_ENV = "DISCORD_GUILD_ID";
const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_API_USER_AGENT = "fawxzzy-fitness-discord-member-sync/1.1";
const DISCORD_NICKNAME_MAX_LENGTH = 32;
const EXISTING_MEMBER_NUMBER_PREFIX_PATTERN = /^#\d+\s+·\s+/u;
const EXISTING_MEMBER_NUMBER_SUFFIX_PATTERN = /\s+·\s+\d+$/u;
const DEFAULT_MEMBER_DISPLAY_NAME = "Member";
const DEFAULT_BATCH_SIZE = 50;
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
  return {
    dryRun: argv.includes("--dry-run"),
    batchSize: DEFAULT_BATCH_SIZE,
  };
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

function createServiceClient() {
  return createClient(getSupabaseUrl(), getRequiredEnv(SUPABASE_SERVICE_ROLE_KEY_ENV), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function shouldDisplayDiscordMemberNumber(link) {
  return link?.user_kind === "human"
    && Number.isInteger(link?.user_number)
    && Number(link.user_number) >= 0;
}

function sanitizeDiscordDisplayName(value) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  const withoutPrefix = normalized.replace(EXISTING_MEMBER_NUMBER_PREFIX_PATTERN, "").trim();
  const withoutMemberNumber = withoutPrefix.replace(EXISTING_MEMBER_NUMBER_SUFFIX_PATTERN, "").trim();
  return withoutMemberNumber || DEFAULT_MEMBER_DISPLAY_NAME;
}

function formatDiscordMemberNickname({ userNumber, currentDisplayName }) {
  const suffix = ` · ${userNumber}`;
  const safeDisplayName = sanitizeDiscordDisplayName(currentDisplayName);
  const availableNameLength = DISCORD_NICKNAME_MAX_LENGTH - suffix.length;

  if (availableNameLength <= 0) {
    return suffix.slice(-DISCORD_NICKNAME_MAX_LENGTH).trimStart();
  }

  return `${safeDisplayName.slice(0, availableNameLength)}${suffix}`;
}

function maskDiscordUserId(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "(missing)";
  }

  return normalized.length <= 4
    ? `${"*".repeat(Math.max(normalized.length - 1, 0))}${normalized.slice(-1)}`
    : `${"*".repeat(normalized.length - 4)}${normalized.slice(-4)}`;
}

async function parseDiscordJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 200) };
  }
}

async function updateDiscordGuildMemberNickname({ guildId, userId, nickname, botToken }) {
  const response = await fetch(`${DISCORD_API_BASE_URL}/guilds/${guildId}/members/${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
      "User-Agent": DISCORD_API_USER_AGENT,
    },
    body: JSON.stringify({ nick: nickname }),
  });

  if (response.ok) {
    return { ok: true };
  }

  const body = await parseDiscordJson(response);
  return {
    ok: false,
    code: response.status === 403
      ? "DISCORD_NICKNAME_UPDATE_FORBIDDEN"
      : response.status === 404
        ? "DISCORD_NICKNAME_UPDATE_NOT_FOUND"
        : "DISCORD_NICKNAME_UPDATE_FAILED",
    status: response.status,
    message: body && typeof body === "object" && "message" in body
      ? String(body.message ?? response.statusText)
      : response.statusText,
  };
}

async function main() {
  const args = parseArgs();
  const client = createServiceClient();
  const botToken = getOptionalEnv(DISCORD_BOT_TOKEN_ENV);
  const guildId = getOptionalEnv(DISCORD_GUILD_ID_ENV);
  const canSyncDiscordNicknames = Boolean(botToken && guildId);

  const { data: links, error: linksError } = await client
    .from("discord_member_links")
    .select("id, discord_user_id, discord_username, user_number, user_kind, nickname_sync_status")
    .in("nickname_sync_status", ["needs_sync", "failed", "not_attempted"])
    .eq("user_kind", "human")
    .gte("user_number", 0)
    .order("updated_at", { ascending: true })
    .limit(args.batchSize);

  if (linksError) {
    throw new Error(`Unable to load discord_member_links: ${linksError.message}`);
  }

  const summary = {
    scanned: 0,
    eligible: 0,
    synced: 0,
    failed: 0,
    skipped: 0,
  };
  const notes = [];

  for (const link of links ?? []) {
    summary.scanned += 1;

    if (!shouldDisplayDiscordMemberNumber(link)) {
      summary.skipped += 1;

      if (!args.dryRun) {
        const { error: updateError } = await client
          .from("discord_member_links")
          .update({
            nickname_sync_status: "skipped",
            nickname_synced_at: null,
            last_error_code: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", link.id);

        if (updateError) {
          throw new Error(`Unable to update discord_member_links row ${link.id}: ${updateError.message}`);
        }
      }

      continue;
    }

    summary.eligible += 1;
    const nickname = formatDiscordMemberNickname({
      userNumber: link.user_number,
      currentDisplayName: link.discord_username,
    });

    if (args.dryRun) {
      notes.push(`Dry run: would sync ${maskDiscordUserId(link.discord_user_id)} to ${nickname}`);
      continue;
    }

    if (!canSyncDiscordNicknames) {
      summary.failed += 1;
      notes.push(`Nickname sync failed for ${maskDiscordUserId(link.discord_user_id)} because Discord env is incomplete`);

      const { error: updateError } = await client
        .from("discord_member_links")
        .update({
          nickname_sync_status: "failed",
          nickname_synced_at: null,
          last_error_code: "DISCORD_ENV_INCOMPLETE",
          updated_at: new Date().toISOString(),
        })
        .eq("id", link.id);

      if (updateError) {
        throw new Error(`Unable to update discord_member_links row ${link.id}: ${updateError.message}`);
      }

      continue;
    }

    const nicknameResult = await updateDiscordGuildMemberNickname({
      guildId,
      userId: link.discord_user_id,
      nickname,
      botToken,
    });

    if (nicknameResult.ok) {
      summary.synced += 1;
      const { error: updateError } = await client
        .from("discord_member_links")
        .update({
          nickname_sync_status: "synced",
          nickname_synced_at: new Date().toISOString(),
          last_error_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", link.id);

      if (updateError) {
        throw new Error(`Unable to update discord_member_links row ${link.id}: ${updateError.message}`);
      }

      continue;
    }

    summary.failed += 1;
    notes.push(`Nickname sync failed for ${maskDiscordUserId(link.discord_user_id)} -> ${nicknameResult.code}`);

    const { error: updateError } = await client
      .from("discord_member_links")
      .update({
        nickname_sync_status: "failed",
        nickname_synced_at: null,
        last_error_code: nicknameResult.code,
        updated_at: new Date().toISOString(),
      })
      .eq("id", link.id);

    if (updateError) {
      throw new Error(`Unable to update discord_member_links row ${link.id}: ${updateError.message}`);
    }
  }

  console.log("Discord member-number sync");
  console.log(`Env file: ${envPath}`);
  console.log(`Mode: ${args.dryRun ? "dry-run" : "apply"}`);
  console.log(`Discord nickname sync enabled: ${canSyncDiscordNicknames}`);
  console.log(`Links scanned: ${summary.scanned}`);
  console.log(`Eligible rows: ${summary.eligible}`);
  console.log(`Nickname sync updated: ${summary.synced}`);
  console.log(`Nickname sync failed: ${summary.failed}`);
  console.log(`Nickname sync skipped: ${summary.skipped}`);

  if (notes.length > 0) {
    console.log("Notes:");
    for (const note of notes) {
      console.log(`  - ${note}`);
    }
  }
}

main().catch((error) => {
  console.error(`sync-discord-member-numbers failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
