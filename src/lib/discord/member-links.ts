import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type DiscordMemberLinkUserKind = "human" | "automation" | "unknown";
export type DiscordMemberLinkNicknameSyncStatus = "not_attempted" | "synced" | "failed" | "skipped";

type UpsertDiscordMemberLinkRow = {
  id: string;
  fitness_user_id: string;
  discord_user_id: string;
  discord_username: string | null;
  user_number: number | null;
  user_kind: DiscordMemberLinkUserKind;
  verified_role_granted_at: string | null;
  nickname_sync_status: DiscordMemberLinkNicknameSyncStatus;
  nickname_synced_at: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
};

type DiscordMemberLinksAdminClient = {
  rpc: (
    functionName: "upsert_discord_member_link",
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export async function upsertDiscordMemberLink(args: {
  fitnessUserId: string;
  discordUserId: string;
  discordUsername: string | null;
  userNumber: number | null;
  userKind: DiscordMemberLinkUserKind;
  verifiedRoleGrantedAt: string | null;
  nicknameSyncStatus: DiscordMemberLinkNicknameSyncStatus;
  nicknameSyncedAt: string | null;
  lastErrorCode: string | null;
  adminClient?: DiscordMemberLinksAdminClient;
}): Promise<{ ok: true; linkId: string } | { ok: false; code: "DISCORD_MEMBER_LINK_UPSERT_FAILED" }> {
  const admin = (args.adminClient ?? (supabaseAdmin() as unknown as DiscordMemberLinksAdminClient));
  const { data, error } = await admin.rpc("upsert_discord_member_link", {
    input_fitness_user_id: args.fitnessUserId,
    input_discord_user_id: args.discordUserId,
    input_discord_username: args.discordUsername,
    input_user_number: args.userNumber,
    input_user_kind: args.userKind,
    input_verified_role_granted_at: args.verifiedRoleGrantedAt,
    input_nickname_sync_status: args.nicknameSyncStatus,
    input_nickname_synced_at: args.nicknameSyncedAt,
    input_last_error_code: args.lastErrorCode,
  });

  if (error) {
    return { ok: false, code: "DISCORD_MEMBER_LINK_UPSERT_FAILED" };
  }

  const link = Array.isArray(data)
    ? (data[0] as UpsertDiscordMemberLinkRow | null | undefined) ?? null
    : data as UpsertDiscordMemberLinkRow | null;
  if (!link?.id) {
    return { ok: false, code: "DISCORD_MEMBER_LINK_UPSERT_FAILED" };
  }

  return { ok: true, linkId: link.id };
}
