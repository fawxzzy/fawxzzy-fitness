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
const DISCORD_API_USER_AGENT = "fawxzzy-fitness-discord-member-sync/1.0";
const DISCORD_NICKNAME_MAX_LENGTH = 32;
const EXISTING_MEMBER_NUMBER_PREFIX_PATTERN = /^#\d+\s+·\s+/;
const DEFAULT_MEMBER_DISPLAY_NAME = "Member";
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

function shouldDisplayDiscordMemberNumber(profile) {
  return profile?.user_kind === "human"
    && Number.isInteger(profile?.user_number)
    && Number(profile.user_number) >= 0;
}

function sanitizeDiscordDisplayName(value) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  const withoutExistingPrefix = normalized.replace(EXISTING_MEMBER_NUMBER_PREFIX_PATTERN, "").trim();
  return withoutExistingPrefix || DEFAULT_MEMBER_DISPLAY_NAME;
}

function formatDiscordMemberNickname({ userNumber, currentDisplayName }) {
  const prefix = `#${userNumber} · `;
  const safeDisplayName = sanitizeDiscordDisplayName(currentDisplayName);
  const availableNameLength = DISCORD_NICKNAME_MAX_LENGTH - prefix.length;

  if (availableNameLength <= 0) {
    return prefix.slice(0, DISCORD_NICKNAME_MAX_LENGTH).trimEnd();
  }

  return `${prefix}${safeDisplayName.slice(0, availableNameLength)}`;
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
  const [{ data: links, error: linksError }, { data: profiles, error: profilesError }] = await Promise.all([
    client
      .from("discord_member_links")
      .select("id, fitness_user_id, discord_user_id, discord_username, user_number, user_kind, nickname_sync_status"),
    client
      .from("profiles")
      .select("id, user_number, user_kind"),
  ]);

  if (linksError) {
    throw new Error(`Unable to load discord_member_links: ${linksError.message}`);
  }

  if (profilesError) {
    throw new Error(`Unable to load profiles: ${profilesError.message}`);
  }

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const summary = {
    scanned: 0,
    linkRowsUpdated: 0,
    staleLinkRows: 0,
    missingProfiles: 0,
    nicknameSyncEligible: 0,
    nicknameSyncUpdated: 0,
    nicknameSyncFailed: 0,
    nicknameSyncSkipped: 0,
  };
  const notes = [];

  for (const link of links ?? []) {
    summary.scanned += 1;
    const profile = profileById.get(link.fitness_user_id);

    if (!profile) {
      summary.missingProfiles += 1;
      notes.push(`Missing profile for link ${link.id} -> discord ${maskDiscordUserId(link.discord_user_id)}`);
      continue;
    }

    const nextUserNumber = typeof profile.user_number === "number" ? profile.user_number : null;
    const nextUserKind = typeof profile.user_kind === "string" ? profile.user_kind : "unknown";
    const linkIsStale = link.user_number !== nextUserNumber || link.user_kind !== nextUserKind;
    if (linkIsStale) {
      summary.staleLinkRows += 1;
    }

    let nicknameSyncStatus = shouldDisplayDiscordMemberNumber(profile) ? "not_attempted" : "skipped";
    let nicknameSyncedAt = null;
    let lastErrorCode = null;

    if (shouldDisplayDiscordMemberNumber(profile)) {
      summary.nicknameSyncEligible += 1;
      const nickname = formatDiscordMemberNickname({
        userNumber: profile.user_number,
        currentDisplayName: link.discord_username,
      });

      if (args.dryRun) {
        summary.nicknameSyncSkipped += 1;
        notes.push(`Dry run: would sync ${maskDiscordUserId(link.discord_user_id)} to ${nickname}`);
      } else if (canSyncDiscordNicknames) {
        const nicknameResult = await updateDiscordGuildMemberNickname({
          guildId,
          userId: link.discord_user_id,
          nickname,
          botToken,
        });

        if (nicknameResult.ok) {
          nicknameSyncStatus = "synced";
          nicknameSyncedAt = new Date().toISOString();
          summary.nicknameSyncUpdated += 1;
        } else {
          nicknameSyncStatus = "failed";
          lastErrorCode = nicknameResult.code;
          summary.nicknameSyncFailed += 1;
          notes.push(`Nickname sync failed for ${maskDiscordUserId(link.discord_user_id)} -> ${nicknameResult.code}`);
        }
      } else {
        summary.nicknameSyncSkipped += 1;
        notes.push(`Nickname sync skipped for ${maskDiscordUserId(link.discord_user_id)} because Discord env is incomplete`);
      }
    } else {
      summary.nicknameSyncSkipped += 1;
    }

    if (args.dryRun) {
      continue;
    }

    const updatePayload = {
      user_number: nextUserNumber,
      user_kind: nextUserKind,
      nickname_sync_status: nicknameSyncStatus,
      nickname_synced_at: nicknameSyncedAt,
      last_error_code: lastErrorCode,
      updated_at: new Date().toISOString(),
    };
    const { error: updateError } = await client
      .from("discord_member_links")
      .update(updatePayload)
      .eq("id", link.id);

    if (updateError) {
      throw new Error(`Unable to update discord_member_links row ${link.id}: ${updateError.message}`);
    }

    summary.linkRowsUpdated += 1;
  }

  console.log("Discord member-number sync");
  console.log(`Env file: ${envPath}`);
  console.log(`Mode: ${args.dryRun ? "dry-run" : "apply"}`);
  console.log(`Discord nickname sync enabled: ${canSyncDiscordNicknames}`);
  console.log(`Links scanned: ${summary.scanned}`);
  console.log(`Stale link rows: ${summary.staleLinkRows}`);
  console.log(`Link rows updated: ${summary.linkRowsUpdated}`);
  console.log(`Missing linked profiles: ${summary.missingProfiles}`);
  console.log(`Nickname sync eligible: ${summary.nicknameSyncEligible}`);
  console.log(`Nickname sync updated: ${summary.nicknameSyncUpdated}`);
  console.log(`Nickname sync failed: ${summary.nicknameSyncFailed}`);
  console.log(`Nickname sync skipped: ${summary.nicknameSyncSkipped}`);

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
