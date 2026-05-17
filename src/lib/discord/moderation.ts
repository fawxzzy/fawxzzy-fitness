import "server-only";

import {
  DISCORD_APPLICATION_ID,
  DISCORD_MOD_LOG_CHANNEL_ID,
  DISCORD_PURGATORY_CATEGORY_ID,
  DISCORD_PURGATORY_CHANNEL_ID,
  DISCORD_PURGATORY_REMOVED_ROLE_IDS,
  DISCORD_PURGATORY_ROLE_ID,
  DISCORD_VERIFIED_ROLE_ID_OPTIONAL,
} from "@/lib/env";
import {
  DISCORD_PERMISSION_ADMINISTRATOR,
  DISCORD_PERMISSION_MANAGE_CHANNELS,
  DISCORD_PERMISSION_MANAGE_GUILD,
  DISCORD_PERMISSION_MANAGE_MESSAGES,
  DISCORD_PERMISSION_MANAGE_ROLES,
  DISCORD_PERMISSION_READ_MESSAGE_HISTORY,
  DISCORD_PERMISSION_SEND_MESSAGES,
  DISCORD_PERMISSION_VIEW_CHANNEL,
  discordMemberHasModerationPermission,
} from "@/lib/discord/interactions";
import {
  addDiscordGuildMemberRole,
  createDiscordChannel,
  createDiscordChannelMessage,
  createDiscordRole,
  fetchDiscordChannel,
  fetchDiscordGuild,
  fetchDiscordGuildChannels,
  fetchDiscordGuildMember,
  fetchDiscordGuildRoles,
  removeDiscordGuildMemberRole,
  type DiscordAllowedMentions,
  type DiscordChannel,
  type DiscordGuildMember,
  type DiscordGuildRole,
  updateDiscordChannelPermissionOverwrite,
} from "@/lib/discord/rest";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const DISCORD_PURGATORY_ROLE_NAME = "Purgatory";
export const DISCORD_PURGATORY_CATEGORY_NAME = "Purgatory";
export const DISCORD_PURGATORY_CHANNEL_NAME = "purgatory";
export const DISCORD_PURGATORY_CHANNEL_NOTICE = "You have been moved to Purgatory. An admin will review this with you here.";
export const DISCORD_MODERATION_CASE_SHORT_ID_LENGTH = 8;

type DiscordModerationAction = "purgatory";
export type DiscordModerationCaseStatus = "active" | "released" | "expired" | "failed";

export type DiscordModerationCaseRow = {
  id: string;
  action: DiscordModerationAction;
  status: DiscordModerationCaseStatus;
  target_discord_user_id: string;
  target_discord_username: string | null;
  target_fitness_user_id: string | null;
  target_member_number: number | null;
  moderator_discord_user_id: string;
  moderator_discord_username: string | null;
  reason: string;
  duration_seconds: number | null;
  expires_at: string | null;
  removed_role_ids: string[];
  restored_role_ids: string[];
  purgatory_role_id: string | null;
  purgatory_channel_id: string | null;
  log_channel_id: string | null;
  log_message_id: string | null;
  release_note: string | null;
  released_by_discord_user_id: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
};

type DiscordMemberLinkRow = {
  fitness_user_id: string | null;
  user_number: number | null;
};

type DiscordModerationAdminClient = {
  from: (table: "discord_moderation_cases" | "discord_member_links") => any;
};

type DiscordModerationDependencies = {
  adminClient?: DiscordModerationAdminClient;
  fetchGuild?: typeof fetchDiscordGuild;
  fetchGuildRoles?: typeof fetchDiscordGuildRoles;
  fetchGuildChannels?: typeof fetchDiscordGuildChannels;
  fetchGuildMember?: typeof fetchDiscordGuildMember;
  fetchChannel?: typeof fetchDiscordChannel;
  createRole?: typeof createDiscordRole;
  createChannel?: typeof createDiscordChannel;
  updatePermissionOverwrite?: typeof updateDiscordChannelPermissionOverwrite;
  addMemberRole?: typeof addDiscordGuildMemberRole;
  removeMemberRole?: typeof removeDiscordGuildMemberRole;
  createMessage?: typeof createDiscordChannelMessage;
};

type EnsurePurgatoryResult =
  | {
    ok: true;
    roleId: string;
    categoryId: string;
    channelId: string;
    logChannelId: string | null;
    warnings: string[];
  }
  | {
    ok: false;
    code: string;
    message: string;
  };

type MoveToPurgatoryResult =
  | {
    ok: true;
    caseRow: DiscordModerationCaseRow;
    warnings: string[];
  }
  | {
    ok: false;
    code: string;
    message: string;
  };

type ReleasePurgatoryResult =
  | {
    ok: true;
    caseRow: DiscordModerationCaseRow;
    warnings: string[];
  }
  | {
    ok: false;
    code: string;
    message: string;
  };

const DISCORD_MODERATION_SELECT_COLUMNS = [
  "id",
  "action",
  "status",
  "target_discord_user_id",
  "target_discord_username",
  "target_fitness_user_id",
  "target_member_number",
  "moderator_discord_user_id",
  "moderator_discord_username",
  "reason",
  "duration_seconds",
  "expires_at",
  "removed_role_ids",
  "restored_role_ids",
  "purgatory_role_id",
  "purgatory_channel_id",
  "log_channel_id",
  "log_message_id",
  "release_note",
  "released_by_discord_user_id",
  "released_at",
  "created_at",
  "updated_at",
].join(", ");

const DISCORD_CHANNEL_TYPE_GUILD_TEXT = 0;
const DISCORD_CHANNEL_TYPE_GUILD_CATEGORY = 4;
const DISCORD_OVERWRITE_TYPE_ROLE = 0;
const DISCORD_OVERWRITE_TYPE_MEMBER = 1;
const DISCORD_ADMIN_PERMISSION_MASK =
  DISCORD_PERMISSION_ADMINISTRATOR
  | DISCORD_PERMISSION_MANAGE_GUILD
  | DISCORD_PERMISSION_MANAGE_ROLES;
const DISCORD_PURGATORY_ROLE_ALLOW_MASK =
  DISCORD_PERMISSION_VIEW_CHANNEL
  | DISCORD_PERMISSION_SEND_MESSAGES
  | DISCORD_PERMISSION_READ_MESSAGE_HISTORY;
const DISCORD_PURGATORY_BOT_ALLOW_MASK =
  DISCORD_PURGATORY_ROLE_ALLOW_MASK
  | DISCORD_PERMISSION_MANAGE_CHANNELS
  | DISCORD_PERMISSION_MANAGE_MESSAGES;
const MAX_MOD_LOG_CASES = 10;

function coerceString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function normalizeDiscordModerationCaseRow(value: unknown): DiscordModerationCaseRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = coerceString(row.id);
  const action = row.action === "purgatory" ? "purgatory" : null;
  const status = row.status === "active"
    || row.status === "released"
    || row.status === "expired"
    || row.status === "failed"
    ? row.status
    : null;
  const targetDiscordUserId = coerceString(row.target_discord_user_id);
  const moderatorDiscordUserId = coerceString(row.moderator_discord_user_id);
  const reason = coerceString(row.reason);
  const createdAt = coerceString(row.created_at);
  const updatedAt = coerceString(row.updated_at);

  if (!id || !action || !status || !targetDiscordUserId || !moderatorDiscordUserId || !reason || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    action,
    status,
    target_discord_user_id: targetDiscordUserId,
    target_discord_username: coerceString(row.target_discord_username),
    target_fitness_user_id: coerceString(row.target_fitness_user_id),
    target_member_number: typeof row.target_member_number === "number" ? row.target_member_number : null,
    moderator_discord_user_id: moderatorDiscordUserId,
    moderator_discord_username: coerceString(row.moderator_discord_username),
    reason,
    duration_seconds: typeof row.duration_seconds === "number" ? row.duration_seconds : null,
    expires_at: coerceString(row.expires_at),
    removed_role_ids: coerceStringArray(row.removed_role_ids),
    restored_role_ids: coerceStringArray(row.restored_role_ids),
    purgatory_role_id: coerceString(row.purgatory_role_id),
    purgatory_channel_id: coerceString(row.purgatory_channel_id),
    log_channel_id: coerceString(row.log_channel_id),
    log_message_id: coerceString(row.log_message_id),
    release_note: coerceString(row.release_note),
    released_by_discord_user_id: coerceString(row.released_by_discord_user_id),
    released_at: coerceString(row.released_at),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function getAdminClient(dependencies?: DiscordModerationDependencies) {
  return (dependencies?.adminClient ?? (supabaseAdmin() as unknown as DiscordModerationAdminClient));
}

function parsePermissionBitfield(value: string | null | undefined): bigint {
  if (!value) {
    return BigInt(0);
  }

  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

function getRoleMap(roles: DiscordGuildRole[]): Map<string, DiscordGuildRole> {
  return new Map(roles.filter((role) => typeof role.id === "string").map((role) => [role.id, role]));
}

function getMemberRoleIds(member: DiscordGuildMember | null | undefined): string[] {
  return Array.isArray(member?.roles) ? member.roles.filter((roleId): roleId is string => typeof roleId === "string") : [];
}

function getMemberHighestRolePosition(member: DiscordGuildMember | null | undefined, roleMap: Map<string, DiscordGuildRole>): number {
  return getMemberRoleIds(member).reduce((highest, roleId) => {
    const position = roleMap.get(roleId)?.position;
    return typeof position === "number" ? Math.max(highest, position) : highest;
  }, 0);
}

function memberHasAdminLikeRole(member: DiscordGuildMember | null | undefined, roleMap: Map<string, DiscordGuildRole>): boolean {
  const permissions = getMemberRoleIds(member).reduce((combined, roleId) => {
    const rawPermissions = roleMap.get(roleId)?.permissions;
    return combined | parsePermissionBitfield(typeof rawPermissions === "string" ? rawPermissions : null);
  }, BigInt(0));

  return (permissions & DISCORD_ADMIN_PERMISSION_MASK) !== BigInt(0);
}

function canBotManageRole(role: DiscordGuildRole | undefined, botHighestRolePosition: number): boolean {
  if (!role || typeof role.id !== "string") {
    return false;
  }

  if (role.managed === true) {
    return false;
  }

  const position = typeof role.position === "number" ? role.position : 0;
  return position < botHighestRolePosition;
}

function buildAllowedMentions(args?: {
  userId?: string | null;
}): DiscordAllowedMentions {
  return {
    parse: [],
    users: args?.userId ? [args.userId] : undefined,
    roles: [],
    replied_user: false,
  };
}

function normalizeText(value: string | null | undefined, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\r\n/g, "\n").replace(/\u0000/g, "").trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function formatMention(userId: string, fallback: string | null): string {
  return userId ? `<@${userId}>` : (fallback ?? "unknown");
}

function formatDuration(durationSeconds: number | null): string {
  if (!durationSeconds || durationSeconds <= 0) {
    return "Indefinite";
  }

  if (durationSeconds % 86400 === 0) {
    return `${durationSeconds / 86400}d`;
  }

  if (durationSeconds % 3600 === 0) {
    return `${durationSeconds / 3600}h`;
  }

  if (durationSeconds % 60 === 0) {
    return `${durationSeconds / 60}m`;
  }

  return `${durationSeconds}s`;
}

function buildModerationLogMessage(args: {
  actionLabel: string;
  targetUserId: string;
  targetUsername: string | null;
  moderatorUserId: string | null;
  moderatorUsername: string | null;
  reason: string;
  durationSeconds: number | null;
  caseId: string;
  releaseNote?: string | null;
}) {
  const lines = [
    `## ${args.actionLabel}`,
    `- User: ${formatMention(args.targetUserId, args.targetUsername)}`,
    `- Moderator: ${args.moderatorUserId ? formatMention(args.moderatorUserId, args.moderatorUsername) : (args.moderatorUsername ?? "automation")}`,
    `- Reason: ${args.reason}`,
    `- Duration: ${formatDuration(args.durationSeconds)}`,
    `- Case ID: \`${formatDiscordModerationCaseShortId(args.caseId)}\``,
  ];

  if (args.releaseNote) {
    lines.push(`- Note: ${args.releaseNote}`);
  }

  return lines.join("\n");
}

export function formatDiscordModerationCaseShortId(caseId: string): string {
  const normalized = String(caseId ?? "").trim().toLowerCase();
  return normalized ? normalized.slice(0, DISCORD_MODERATION_CASE_SHORT_ID_LENGTH) : "unknown";
}

export function parseDiscordModerationDuration(value: string | null | undefined): {
  ok: true;
  durationSeconds: number | null;
} | {
  ok: false;
  message: string;
} {
  if (!value || !value.trim()) {
    return { ok: true, durationSeconds: null };
  }

  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(\d+)(m|h|d)$/);
  if (!match) {
    return {
      ok: false,
      message: "Duration must look like 10m, 1h, or 1d.",
    };
  }

  const amount = Number.parseInt(match[1] ?? "", 10);
  const unit = match[2];
  if (!Number.isInteger(amount) || amount <= 0) {
    return {
      ok: false,
      message: "Duration must be a positive number.",
    };
  }

  const durationSeconds = unit === "d"
    ? amount * 86400
    : unit === "h"
      ? amount * 3600
      : amount * 60;
  return { ok: true, durationSeconds };
}

export function resolveDiscordPurgatoryRemovedRoleIds(): string[] {
  const configured = DISCORD_PURGATORY_REMOVED_ROLE_IDS();
  const verifiedRoleId = DISCORD_VERIFIED_ROLE_ID_OPTIONAL();
  return [...new Set([
    ...configured,
    ...(verifiedRoleId ? [verifiedRoleId] : []),
  ])];
}

async function findDiscordMemberLink(args: {
  discordUserId: string;
  dependencies?: DiscordModerationDependencies;
}): Promise<DiscordMemberLinkRow | null> {
  const admin = getAdminClient(args.dependencies);
  const { data, error } = await admin
    .from("discord_member_links")
    .select("fitness_user_id, user_number")
    .eq("discord_user_id", args.discordUserId)
    .maybeSingle();

  if (error || !data || typeof data !== "object") {
    return null;
  }

  return {
    fitness_user_id: coerceString((data as Record<string, unknown>).fitness_user_id),
    user_number: typeof (data as Record<string, unknown>).user_number === "number"
      ? ((data as Record<string, unknown>).user_number as number)
      : null,
  };
}

async function insertDiscordModerationCase(args: {
  row: Record<string, unknown>;
  dependencies?: DiscordModerationDependencies;
}) {
  const admin = getAdminClient(args.dependencies);
  const { data, error } = await admin
    .from("discord_moderation_cases")
    .insert(args.row)
    .select(DISCORD_MODERATION_SELECT_COLUMNS)
    .single();

  if (error) {
    return { ok: false as const, error };
  }

  const caseRow = normalizeDiscordModerationCaseRow(data);
  return caseRow
    ? { ok: true as const, caseRow }
    : { ok: false as const, error: { message: "Invalid moderation case row." } };
}

async function updateDiscordModerationCase(args: {
  caseId: string;
  patch: Record<string, unknown>;
  dependencies?: DiscordModerationDependencies;
}) {
  const admin = getAdminClient(args.dependencies);
  const { data, error } = await admin
    .from("discord_moderation_cases")
    .update(args.patch)
    .eq("id", args.caseId)
    .select(DISCORD_MODERATION_SELECT_COLUMNS)
    .single();

  if (error) {
    return { ok: false as const, error };
  }

  const caseRow = normalizeDiscordModerationCaseRow(data);
  return caseRow
    ? { ok: true as const, caseRow }
    : { ok: false as const, error: { message: "Invalid moderation case row." } };
}

export async function findActiveDiscordModerationCaseByUser(args: {
  targetDiscordUserId: string;
  dependencies?: DiscordModerationDependencies;
}): Promise<DiscordModerationCaseRow | null> {
  const admin = getAdminClient(args.dependencies);
  const { data, error } = await admin
    .from("discord_moderation_cases")
    .select(DISCORD_MODERATION_SELECT_COLUMNS)
    .eq("target_discord_user_id", args.targetDiscordUserId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  return normalizeDiscordModerationCaseRow(data[0]);
}

async function findActiveDiscordModerationCase(args: {
  targetDiscordUserId?: string | null;
  caseIdOrPrefix?: string | null;
  dependencies?: DiscordModerationDependencies;
}): Promise<DiscordModerationCaseRow | null> {
  if (args.targetDiscordUserId) {
    return findActiveDiscordModerationCaseByUser({
      targetDiscordUserId: args.targetDiscordUserId,
      dependencies: args.dependencies,
    });
  }

  const caseIdOrPrefix = normalizeText(args.caseIdOrPrefix, 36);
  if (!caseIdOrPrefix) {
    return null;
  }

  const admin = getAdminClient(args.dependencies);
  const { data, error } = await admin
    .from("discord_moderation_cases")
    .select(DISCORD_MODERATION_SELECT_COLUMNS)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !Array.isArray(data)) {
    return null;
  }

  const matches = data
    .map(normalizeDiscordModerationCaseRow)
    .filter((row): row is DiscordModerationCaseRow => Boolean(row))
    .filter((row) => row.id === caseIdOrPrefix || row.id.startsWith(caseIdOrPrefix.toLowerCase()));

  return matches[0] ?? null;
}

export async function listDiscordModerationCases(args?: {
  targetDiscordUserId?: string | null;
  limit?: number | null;
  dependencies?: DiscordModerationDependencies;
}): Promise<DiscordModerationCaseRow[]> {
  const admin = getAdminClient(args?.dependencies);
  let query = admin
    .from("discord_moderation_cases")
    .select(DISCORD_MODERATION_SELECT_COLUMNS);

  if (args?.targetDiscordUserId) {
    query = query.eq("target_discord_user_id", args.targetDiscordUserId);
  }

  const limit = Math.max(1, Math.min(args?.limit ?? 5, MAX_MOD_LOG_CASES));
  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
  if (error || !Array.isArray(data)) {
    return [];
  }

  return data
    .map(normalizeDiscordModerationCaseRow)
    .filter((row): row is DiscordModerationCaseRow => Boolean(row));
}

export async function listExpiredActiveDiscordModerationCases(args?: {
  now?: Date;
  limit?: number;
  dependencies?: DiscordModerationDependencies;
}): Promise<DiscordModerationCaseRow[]> {
  const admin = getAdminClient(args?.dependencies);
  const { data, error } = await admin
    .from("discord_moderation_cases")
    .select(DISCORD_MODERATION_SELECT_COLUMNS)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(args?.limit ?? 50, 200)));

  if (error || !Array.isArray(data)) {
    return [];
  }

  const nowMs = (args?.now ?? new Date()).getTime();
  return data
    .map(normalizeDiscordModerationCaseRow)
    .filter((row): row is DiscordModerationCaseRow => Boolean(row))
    .filter((row) => row.expires_at && Number.isFinite(Date.parse(row.expires_at)) && Date.parse(row.expires_at) <= nowMs);
}

function buildModerationCasesSummary(cases: DiscordModerationCaseRow[]): string {
  if (cases.length === 0) {
    return "No moderation cases found.";
  }

  return [
    "# Mod Log",
    ...cases.map((caseRow) => {
      const statusSuffix = caseRow.status === "active" ? "active" : caseRow.status;
      return `- \`${formatDiscordModerationCaseShortId(caseRow.id)}\` ${statusSuffix} | <@${caseRow.target_discord_user_id}> | ${caseRow.reason}`;
    }),
  ].join("\n");
}

export async function getDiscordModerationLogSummary(args?: {
  targetDiscordUserId?: string | null;
  limit?: number | null;
  dependencies?: DiscordModerationDependencies;
}): Promise<string> {
  const cases = await listDiscordModerationCases({
    targetDiscordUserId: args?.targetDiscordUserId ?? null,
    limit: args?.limit ?? 5,
    dependencies: args?.dependencies,
  });

  return buildModerationCasesSummary(cases);
}

export async function ensureDiscordPurgatoryInfrastructure(args: {
  guildId: string;
  dependencies?: DiscordModerationDependencies;
}): Promise<EnsurePurgatoryResult> {
  const fetchRoles = args.dependencies?.fetchGuildRoles ?? fetchDiscordGuildRoles;
  const fetchChannels = args.dependencies?.fetchGuildChannels ?? fetchDiscordGuildChannels;
  const fetchChannel = args.dependencies?.fetchChannel ?? fetchDiscordChannel;
  const createRole = args.dependencies?.createRole ?? createDiscordRole;
  const createChannel = args.dependencies?.createChannel ?? createDiscordChannel;
  const updateOverwrite = args.dependencies?.updatePermissionOverwrite ?? updateDiscordChannelPermissionOverwrite;

  const rolesResult = await fetchRoles({ guildId: args.guildId });
  if (!rolesResult.ok) {
    return {
      ok: false,
      code: rolesResult.code,
      message: rolesResult.message ?? "Could not load guild roles.",
    };
  }

  const channelsResult = await fetchChannels({ guildId: args.guildId });
  if (!channelsResult.ok) {
    return {
      ok: false,
      code: channelsResult.code,
      message: channelsResult.message ?? "Could not load guild channels.",
    };
  }

  const warnings: string[] = [];
  const configuredRoleId = DISCORD_PURGATORY_ROLE_ID();
  let purgatoryRole = rolesResult.roles.find((role) => role.id === configuredRoleId)
    ?? rolesResult.roles.find((role) => role.name === DISCORD_PURGATORY_ROLE_NAME)
    ?? null;

  if (!purgatoryRole) {
    const createRoleResult = await createRole({
      guildId: args.guildId,
      name: DISCORD_PURGATORY_ROLE_NAME,
    });
    if (!createRoleResult.ok) {
      return {
        ok: false,
        code: createRoleResult.code,
        message: createRoleResult.message ?? "Could not create the Purgatory role.",
      };
    }

    purgatoryRole = createRoleResult.role;
  }

  const configuredCategoryId = DISCORD_PURGATORY_CATEGORY_ID();
  let purgatoryCategory = channelsResult.channels.find((channel) => (
    channel.id === configuredCategoryId && channel.type === DISCORD_CHANNEL_TYPE_GUILD_CATEGORY
  ))
    ?? channelsResult.channels.find((channel) => (
      channel.type === DISCORD_CHANNEL_TYPE_GUILD_CATEGORY
      && channel.name === DISCORD_PURGATORY_CATEGORY_NAME
    ))
    ?? null;

  if (!purgatoryCategory) {
    const createCategoryResult = await createChannel({
      guildId: args.guildId,
      name: DISCORD_PURGATORY_CATEGORY_NAME,
      type: DISCORD_CHANNEL_TYPE_GUILD_CATEGORY,
    });
    if (!createCategoryResult.ok) {
      return {
        ok: false,
        code: createCategoryResult.code,
        message: createCategoryResult.message ?? "Could not create the Purgatory category.",
      };
    }

    purgatoryCategory = createCategoryResult.channel;
  }

  const configuredChannelId = DISCORD_PURGATORY_CHANNEL_ID();
  let purgatoryChannel = channelsResult.channels.find((channel) => (
    channel.id === configuredChannelId && channel.type === DISCORD_CHANNEL_TYPE_GUILD_TEXT
  ))
    ?? channelsResult.channels.find((channel) => (
      channel.type === DISCORD_CHANNEL_TYPE_GUILD_TEXT
      && channel.parent_id === purgatoryCategory?.id
      && channel.name === DISCORD_PURGATORY_CHANNEL_NAME
    ))
    ?? null;

  if (!purgatoryChannel) {
    const createTextChannelResult = await createChannel({
      guildId: args.guildId,
      name: DISCORD_PURGATORY_CHANNEL_NAME,
      type: DISCORD_CHANNEL_TYPE_GUILD_TEXT,
      parentId: purgatoryCategory.id,
    });
    if (!createTextChannelResult.ok) {
      return {
        ok: false,
        code: createTextChannelResult.code,
        message: createTextChannelResult.message ?? "Could not create the Purgatory channel.",
      };
    }

    purgatoryChannel = createTextChannelResult.channel;
  }

  const logChannelId = DISCORD_MOD_LOG_CHANNEL_ID();
  if (logChannelId) {
    const logChannelResult = await fetchChannel({ channelId: logChannelId });
    if (!logChannelResult.ok) {
      warnings.push("Configured mod log channel was not found.");
    }
  }

  const botUserId = DISCORD_APPLICATION_ID();
  const overwriteTargets = [purgatoryCategory.id, purgatoryChannel.id];

  for (const channelId of overwriteTargets) {
    const everyoneOverwrite = await updateOverwrite({
      channelId,
      overwriteId: args.guildId,
      overwrite: {
        allow: "0",
        deny: String(DISCORD_PERMISSION_VIEW_CHANNEL),
        type: DISCORD_OVERWRITE_TYPE_ROLE,
      },
    });
    if (!everyoneOverwrite.ok) {
      return {
        ok: false,
        code: everyoneOverwrite.code,
        message: everyoneOverwrite.message ?? "Could not configure the Purgatory channel visibility.",
      };
    }

    const purgatoryOverwrite = await updateOverwrite({
      channelId,
      overwriteId: purgatoryRole.id,
      overwrite: {
        allow: String(DISCORD_PURGATORY_ROLE_ALLOW_MASK),
        deny: "0",
        type: DISCORD_OVERWRITE_TYPE_ROLE,
      },
    });
    if (!purgatoryOverwrite.ok) {
      return {
        ok: false,
        code: purgatoryOverwrite.code,
        message: purgatoryOverwrite.message ?? "Could not configure the Purgatory role permissions.",
      };
    }

    const botOverwrite = await updateOverwrite({
      channelId,
      overwriteId: botUserId,
      overwrite: {
        allow: String(DISCORD_PURGATORY_BOT_ALLOW_MASK),
        deny: "0",
        type: DISCORD_OVERWRITE_TYPE_MEMBER,
      },
    });
    if (!botOverwrite.ok) {
      return {
        ok: false,
        code: botOverwrite.code,
        message: botOverwrite.message ?? "Could not configure the bot Purgatory permissions.",
      };
    }
  }

  return {
    ok: true,
    roleId: purgatoryRole.id,
    categoryId: purgatoryCategory.id,
    channelId: purgatoryChannel.id,
    logChannelId,
    warnings,
  };
}

export async function moveDiscordUserToPurgatory(args: {
  guildId: string;
  targetDiscordUserId: string;
  targetDiscordUsername?: string | null;
  moderatorDiscordUserId: string;
  moderatorDiscordUsername?: string | null;
  moderatorPermissions: string | null | undefined;
  reason: string;
  durationSeconds: number | null;
  dependencies?: DiscordModerationDependencies;
}): Promise<MoveToPurgatoryResult> {
  const fetchGuild = args.dependencies?.fetchGuild ?? fetchDiscordGuild;
  const fetchRoles = args.dependencies?.fetchGuildRoles ?? fetchDiscordGuildRoles;
  const fetchMember = args.dependencies?.fetchGuildMember ?? fetchDiscordGuildMember;
  const addRole = args.dependencies?.addMemberRole ?? addDiscordGuildMemberRole;
  const removeRole = args.dependencies?.removeMemberRole ?? removeDiscordGuildMemberRole;
  const createMessage = args.dependencies?.createMessage ?? createDiscordChannelMessage;

  const reason = normalizeText(args.reason, 1000);
  if (!reason) {
    return {
      ok: false,
      code: "DISCORD_PURGATORY_INVALID_REASON",
      message: "Reason is required.",
    };
  }

  const existingActiveCase = await findActiveDiscordModerationCaseByUser({
    targetDiscordUserId: args.targetDiscordUserId,
    dependencies: args.dependencies,
  });
  if (existingActiveCase) {
    return {
      ok: false,
      code: "DISCORD_PURGATORY_CASE_ALREADY_ACTIVE",
      message: "That user already has an active Purgatory case.",
    };
  }

  const infraResult = await ensureDiscordPurgatoryInfrastructure({
    guildId: args.guildId,
    dependencies: args.dependencies,
  });
  if (!infraResult.ok) {
    return infraResult;
  }

  const guildResult = await fetchGuild({ guildId: args.guildId });
  if (!guildResult.ok) {
    return {
      ok: false,
      code: guildResult.code,
      message: guildResult.message ?? "Could not load the guild.",
    };
  }

  const rolesResult = await fetchRoles({ guildId: args.guildId });
  if (!rolesResult.ok) {
    return {
      ok: false,
      code: rolesResult.code,
      message: rolesResult.message ?? "Could not load guild roles.",
    };
  }

  const targetMemberResult = await fetchMember({
    guildId: args.guildId,
    userId: args.targetDiscordUserId,
  });
  if (!targetMemberResult.ok) {
    return {
      ok: false,
      code: targetMemberResult.code,
      message: targetMemberResult.message ?? "Could not load that guild member.",
    };
  }

  const botUserId = DISCORD_APPLICATION_ID();
  const botMemberResult = await fetchMember({
    guildId: args.guildId,
    userId: botUserId,
  });
  if (!botMemberResult.ok) {
    return {
      ok: false,
      code: botMemberResult.code,
      message: botMemberResult.message ?? "Could not load the bot guild member state.",
    };
  }

  const ownerId = guildResult.guild.owner_id ?? null;
  if (args.targetDiscordUserId === ownerId) {
    return {
      ok: false,
      code: "DISCORD_PURGATORY_OWNER_FORBIDDEN",
      message: "Cannot move the server owner to Purgatory.",
    };
  }

  if (args.targetDiscordUserId === botUserId) {
    return {
      ok: false,
      code: "DISCORD_PURGATORY_BOT_FORBIDDEN",
      message: "Cannot move the bot to Purgatory.",
    };
  }

  const roleMap = getRoleMap(rolesResult.roles);
  const botHighestRolePosition = getMemberHighestRolePosition(botMemberResult.member, roleMap);
  const targetHighestRolePosition = getMemberHighestRolePosition(targetMemberResult.member, roleMap);
  if (botHighestRolePosition <= targetHighestRolePosition) {
    return {
      ok: false,
      code: "DISCORD_PURGATORY_TARGET_NOT_MANAGEABLE",
      message: "The bot cannot manage that user because of role hierarchy.",
    };
  }

  const targetIsAdminLike = memberHasAdminLikeRole(targetMemberResult.member, roleMap);
  const requesterIsGuildOwner = ownerId === args.moderatorDiscordUserId;
  const requesterIsAdminLike = discordMemberHasModerationPermission(args.moderatorPermissions)
    && (parsePermissionBitfield(args.moderatorPermissions) & DISCORD_PERMISSION_ADMINISTRATOR) === DISCORD_PERMISSION_ADMINISTRATOR;

  if (targetIsAdminLike && !requesterIsGuildOwner && !requesterIsAdminLike) {
    return {
      ok: false,
      code: "DISCORD_PURGATORY_ADMIN_FORBIDDEN",
      message: "Only the server owner or an administrator can move admins to Purgatory.",
    };
  }

  const currentRoleIds = new Set(getMemberRoleIds(targetMemberResult.member));
  const removableRoleIds = resolveDiscordPurgatoryRemovedRoleIds().filter((roleId) => (
    roleId !== infraResult.roleId
    && currentRoleIds.has(roleId)
    && canBotManageRole(roleMap.get(roleId), botHighestRolePosition)
  ));

  const addPurgatoryRoleResult = await addRole({
    guildId: args.guildId,
    userId: args.targetDiscordUserId,
    roleId: infraResult.roleId,
  });
  if (!addPurgatoryRoleResult.ok) {
    const failedInsert = await insertDiscordModerationCase({
      dependencies: args.dependencies,
      row: {
        action: "purgatory",
        status: "failed",
        target_discord_user_id: args.targetDiscordUserId,
        target_discord_username: args.targetDiscordUsername ?? targetMemberResult.member.user?.username ?? null,
        target_fitness_user_id: null,
        target_member_number: null,
        moderator_discord_user_id: args.moderatorDiscordUserId,
        moderator_discord_username: args.moderatorDiscordUsername ?? null,
        reason,
        duration_seconds: args.durationSeconds,
        expires_at: args.durationSeconds ? new Date(Date.now() + (args.durationSeconds * 1000)).toISOString() : null,
        removed_role_ids: [],
        restored_role_ids: [],
        purgatory_role_id: infraResult.roleId,
        purgatory_channel_id: infraResult.channelId,
        log_channel_id: infraResult.logChannelId,
      },
    });

    if (failedInsert.ok) {
      return {
        ok: false,
        code: "DISCORD_PURGATORY_ROLE_ASSIGNMENT_FAILED",
        message: `Could not move that user to Purgatory. Case \`${formatDiscordModerationCaseShortId(failedInsert.caseRow.id)}\` was recorded as failed.`,
      };
    }

    return {
      ok: false,
      code: "DISCORD_PURGATORY_ROLE_ASSIGNMENT_FAILED",
      message: "Could not move that user to Purgatory.",
    };
  }

  const warnings = [...infraResult.warnings];
  const removedRoleIds: string[] = [];
  for (const roleId of removableRoleIds) {
    const removalResult = await removeRole({
      guildId: args.guildId,
      userId: args.targetDiscordUserId,
      roleId,
    });
    if (removalResult.ok) {
      removedRoleIds.push(roleId);
    } else {
      warnings.push(`Could not remove role ${roleId}.`);
    }
  }

  const memberLink = await findDiscordMemberLink({
    discordUserId: args.targetDiscordUserId,
    dependencies: args.dependencies,
  });
  const expiresAt = args.durationSeconds ? new Date(Date.now() + (args.durationSeconds * 1000)).toISOString() : null;
  const insertResult = await insertDiscordModerationCase({
    dependencies: args.dependencies,
    row: {
      action: "purgatory",
      status: "active",
      target_discord_user_id: args.targetDiscordUserId,
      target_discord_username: args.targetDiscordUsername ?? targetMemberResult.member.user?.username ?? null,
      target_fitness_user_id: memberLink?.fitness_user_id ?? null,
      target_member_number: memberLink?.user_number ?? null,
      moderator_discord_user_id: args.moderatorDiscordUserId,
      moderator_discord_username: args.moderatorDiscordUsername ?? null,
      reason,
      duration_seconds: args.durationSeconds,
      expires_at: expiresAt,
      removed_role_ids: removedRoleIds,
      restored_role_ids: [],
      purgatory_role_id: infraResult.roleId,
      purgatory_channel_id: infraResult.channelId,
      log_channel_id: infraResult.logChannelId,
    },
  });

  if (!insertResult.ok) {
    for (const roleId of removedRoleIds) {
      await addRole({
        guildId: args.guildId,
        userId: args.targetDiscordUserId,
        roleId,
      });
    }

    await removeRole({
      guildId: args.guildId,
      userId: args.targetDiscordUserId,
      roleId: infraResult.roleId,
    });

    return {
      ok: false,
      code: "DISCORD_PURGATORY_CASE_CREATE_FAILED",
      message: "Could not record the Purgatory case, so the role changes were rolled back.",
    };
  }

  await createMessage({
    channelId: infraResult.channelId,
    body: {
      content: `${formatMention(args.targetDiscordUserId, args.targetDiscordUsername ?? null)} ${DISCORD_PURGATORY_CHANNEL_NOTICE}`,
      allowed_mentions: buildAllowedMentions({ userId: args.targetDiscordUserId }),
    },
  });

  if (infraResult.logChannelId) {
    const logMessageResult = await createMessage({
      channelId: infraResult.logChannelId,
      body: {
        content: buildModerationLogMessage({
          actionLabel: "User moved to Purgatory",
          targetUserId: args.targetDiscordUserId,
          targetUsername: args.targetDiscordUsername ?? targetMemberResult.member.user?.username ?? null,
          moderatorUserId: args.moderatorDiscordUserId,
          moderatorUsername: args.moderatorDiscordUsername ?? null,
          reason,
          durationSeconds: args.durationSeconds,
          caseId: insertResult.caseRow.id,
        }),
        allowed_mentions: buildAllowedMentions({
          userId: args.targetDiscordUserId,
        }),
      },
    });

    if (logMessageResult.ok) {
      const updateLogResult = await updateDiscordModerationCase({
        caseId: insertResult.caseRow.id,
        patch: {
          log_message_id: logMessageResult.messageId,
          updated_at: new Date().toISOString(),
        },
        dependencies: args.dependencies,
      });
      if (updateLogResult.ok) {
        return {
          ok: true,
          caseRow: updateLogResult.caseRow,
          warnings,
        };
      }
    } else {
      warnings.push("Could not post the moderation log message.");
    }
  }

  return {
    ok: true,
    caseRow: insertResult.caseRow,
    warnings,
  };
}

async function finalizeDiscordPurgatoryCase(args: {
  guildId: string;
  releasedByDiscordUserId: string | null;
  releasedByDiscordUsername?: string | null;
  targetDiscordUserId?: string | null;
  caseIdOrPrefix?: string | null;
  releaseNote?: string | null;
  finalStatus: "released" | "expired";
  dependencies?: DiscordModerationDependencies;
}): Promise<ReleasePurgatoryResult> {
  const fetchRoles = args.dependencies?.fetchGuildRoles ?? fetchDiscordGuildRoles;
  const fetchMember = args.dependencies?.fetchGuildMember ?? fetchDiscordGuildMember;
  const addRole = args.dependencies?.addMemberRole ?? addDiscordGuildMemberRole;
  const removeRole = args.dependencies?.removeMemberRole ?? removeDiscordGuildMemberRole;
  const createMessage = args.dependencies?.createMessage ?? createDiscordChannelMessage;

  const caseRow = await findActiveDiscordModerationCase({
    targetDiscordUserId: args.targetDiscordUserId ?? null,
    caseIdOrPrefix: args.caseIdOrPrefix ?? null,
    dependencies: args.dependencies,
  });
  if (!caseRow) {
    return {
      ok: false,
      code: "DISCORD_PURGATORY_CASE_NOT_FOUND",
      message: "Could not find an active Purgatory case.",
    };
  }

  const rolesResult = await fetchRoles({ guildId: args.guildId });
  if (!rolesResult.ok) {
    return {
      ok: false,
      code: rolesResult.code,
      message: rolesResult.message ?? "Could not load guild roles.",
    };
  }

  const roleMap = getRoleMap(rolesResult.roles);
  const botMemberResult = await fetchMember({
    guildId: args.guildId,
    userId: DISCORD_APPLICATION_ID(),
  });
  if (!botMemberResult.ok) {
    return {
      ok: false,
      code: botMemberResult.code,
      message: botMemberResult.message ?? "Could not load the bot guild member state.",
    };
  }

  const botHighestRolePosition = getMemberHighestRolePosition(botMemberResult.member, roleMap);
  const warnings: string[] = [];
  const memberResult = await fetchMember({
    guildId: args.guildId,
    userId: caseRow.target_discord_user_id,
  });

  let restoredRoleIds: string[] = [];

  if (!memberResult.ok) {
    warnings.push("Target member is no longer in the server.");
  } else {
    const currentRoleIds = new Set(getMemberRoleIds(memberResult.member));

    if (caseRow.purgatory_role_id && currentRoleIds.has(caseRow.purgatory_role_id)) {
      const removePurgatoryRoleResult = await removeRole({
        guildId: args.guildId,
        userId: caseRow.target_discord_user_id,
        roleId: caseRow.purgatory_role_id,
      });
      if (!removePurgatoryRoleResult.ok) {
        return {
          ok: false,
          code: "DISCORD_PURGATORY_RELEASE_REMOVE_FAILED",
          message: "Could not remove the Purgatory role.",
        };
      }
    }

    for (const roleId of caseRow.removed_role_ids) {
      const role = roleMap.get(roleId);
      if (!role) {
        warnings.push(`Skipped missing role ${roleId}.`);
        continue;
      }

      if (currentRoleIds.has(roleId)) {
        continue;
      }

      if (!canBotManageRole(role, botHighestRolePosition)) {
        warnings.push(`Skipped unmanaged role ${roleId}.`);
        continue;
      }

      const restoreResult = await addRole({
        guildId: args.guildId,
        userId: caseRow.target_discord_user_id,
        roleId,
      });

      if (restoreResult.ok) {
        restoredRoleIds.push(roleId);
      } else {
        warnings.push(`Could not restore role ${roleId}.`);
      }
    }
  }

  const releaseNote = normalizeText(args.releaseNote ?? null, 1000);
  const updatedCaseResult = await updateDiscordModerationCase({
    caseId: caseRow.id,
    patch: {
      status: args.finalStatus,
      restored_role_ids: restoredRoleIds,
      release_note: releaseNote,
      released_by_discord_user_id: args.releasedByDiscordUserId,
      released_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    dependencies: args.dependencies,
  });

  if (!updatedCaseResult.ok) {
    return {
      ok: false,
      code: "DISCORD_PURGATORY_CASE_UPDATE_FAILED",
      message: "Could not update the Purgatory case.",
    };
  }

  if (updatedCaseResult.caseRow.log_channel_id) {
    const actionLabel = args.finalStatus === "expired"
      ? "Purgatory case auto-released"
      : "User released from Purgatory";
    const logMessageResult = await createMessage({
      channelId: updatedCaseResult.caseRow.log_channel_id,
      body: {
        content: buildModerationLogMessage({
          actionLabel,
          targetUserId: updatedCaseResult.caseRow.target_discord_user_id,
          targetUsername: updatedCaseResult.caseRow.target_discord_username,
          moderatorUserId: args.releasedByDiscordUserId,
          moderatorUsername: args.releasedByDiscordUsername ?? null,
          reason: updatedCaseResult.caseRow.reason,
          durationSeconds: updatedCaseResult.caseRow.duration_seconds,
          caseId: updatedCaseResult.caseRow.id,
          releaseNote,
        }),
        allowed_mentions: buildAllowedMentions({
          userId: updatedCaseResult.caseRow.target_discord_user_id,
        }),
      },
    });

    if (!logMessageResult.ok) {
      warnings.push("Could not post the release log message.");
    }
  }

  return {
    ok: true,
    caseRow: updatedCaseResult.caseRow,
    warnings,
  };
}

export async function releaseDiscordPurgatoryCase(args: {
  guildId: string;
  releasedByDiscordUserId: string;
  releasedByDiscordUsername?: string | null;
  targetDiscordUserId?: string | null;
  caseIdOrPrefix?: string | null;
  releaseNote?: string | null;
  dependencies?: DiscordModerationDependencies;
}): Promise<ReleasePurgatoryResult> {
  return finalizeDiscordPurgatoryCase({
    guildId: args.guildId,
    releasedByDiscordUserId: args.releasedByDiscordUserId,
    releasedByDiscordUsername: args.releasedByDiscordUsername ?? null,
    targetDiscordUserId: args.targetDiscordUserId ?? null,
    caseIdOrPrefix: args.caseIdOrPrefix ?? null,
    releaseNote: args.releaseNote ?? null,
    finalStatus: "released",
    dependencies: args.dependencies,
  });
}

export async function expireDiscordPurgatoryCase(args: {
  guildId: string;
  targetDiscordUserId?: string | null;
  caseIdOrPrefix?: string | null;
  releaseNote?: string | null;
  dependencies?: DiscordModerationDependencies;
}): Promise<ReleasePurgatoryResult> {
  return finalizeDiscordPurgatoryCase({
    guildId: args.guildId,
    releasedByDiscordUserId: null,
    releasedByDiscordUsername: "automation",
    targetDiscordUserId: args.targetDiscordUserId ?? null,
    caseIdOrPrefix: args.caseIdOrPrefix ?? null,
    releaseNote: args.releaseNote ?? "Expired Purgatory case released by automation.",
    finalStatus: "expired",
    dependencies: args.dependencies,
  });
}
