import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type DiscordSpotifyRoomMemberStatus = "joined" | "left";

export type DiscordSpotifyRoomMemberRow = {
  id: string;
  lobby_id: string;
  discord_user_id: string;
  spotify_user_id: string | null;
  status: DiscordSpotifyRoomMemberStatus;
  joined_at: string;
  left_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

type SpotifyRoomMembersAdminClient = {
  from: (table: "discord_spotify_room_members") => any;
};

const DISCORD_SPOTIFY_ROOM_MEMBER_SELECT = [
  "id",
  "lobby_id",
  "discord_user_id",
  "spotify_user_id",
  "status",
  "joined_at",
  "left_at",
  "last_seen_at",
  "created_at",
  "updated_at",
].join(", ");

function coerceRoomMemberStatus(status: unknown): DiscordSpotifyRoomMemberStatus | null {
  return status === "joined" || status === "left" ? status : null;
}

function coerceRoomMemberRow(row: unknown): DiscordSpotifyRoomMemberRow | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const candidate = row as Record<string, unknown>;
  const status = coerceRoomMemberStatus(candidate.status);

  if (
    typeof candidate.id !== "string"
    || typeof candidate.lobby_id !== "string"
    || typeof candidate.discord_user_id !== "string"
    || !status
    || typeof candidate.joined_at !== "string"
    || typeof candidate.created_at !== "string"
    || typeof candidate.updated_at !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    lobby_id: candidate.lobby_id,
    discord_user_id: candidate.discord_user_id,
    spotify_user_id: typeof candidate.spotify_user_id === "string" ? candidate.spotify_user_id : null,
    status,
    joined_at: candidate.joined_at,
    left_at: typeof candidate.left_at === "string" ? candidate.left_at : null,
    last_seen_at: typeof candidate.last_seen_at === "string" ? candidate.last_seen_at : null,
    created_at: candidate.created_at,
    updated_at: candidate.updated_at,
  };
}

export async function getDiscordSpotifyRoomMember(args: {
  lobbyId: string;
  discordUserId: string;
  admin?: SpotifyRoomMembersAdminClient;
}): Promise<DiscordSpotifyRoomMemberRow | null> {
  const admin = args.admin ?? supabaseAdmin();
  const { data, error } = await admin
    .from("discord_spotify_room_members")
    .select(DISCORD_SPOTIFY_ROOM_MEMBER_SELECT)
    .eq("lobby_id", args.lobbyId)
    .eq("discord_user_id", args.discordUserId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Spotify room membership: ${error.message}`);
  }

  return coerceRoomMemberRow(data);
}

export async function countJoinedDiscordSpotifyRoomMembers(args: {
  lobbyId: string;
  admin?: SpotifyRoomMembersAdminClient;
}): Promise<number> {
  const admin = args.admin ?? supabaseAdmin();
  const { count, error } = await admin
    .from("discord_spotify_room_members")
    .select("id", { count: "exact", head: true })
    .eq("lobby_id", args.lobbyId)
    .eq("status", "joined");

  if (error) {
    throw new Error(`Failed to count Spotify room members: ${error.message}`);
  }

  return typeof count === "number" && Number.isFinite(count) ? count : 0;
}

export async function joinDiscordSpotifyRoom(args: {
  lobbyId: string;
  discordUserId: string;
  spotifyUserId?: string | null;
  admin?: SpotifyRoomMembersAdminClient;
}): Promise<DiscordSpotifyRoomMemberRow> {
  const admin = args.admin ?? supabaseAdmin();
  const nowIso = new Date().toISOString();
  const existing = await getDiscordSpotifyRoomMember({
    lobbyId: args.lobbyId,
    discordUserId: args.discordUserId,
    admin,
  });

  if (existing) {
    const { data, error } = await admin
      .from("discord_spotify_room_members")
      .update({
        spotify_user_id: args.spotifyUserId ?? existing.spotify_user_id,
        status: "joined",
        joined_at: existing.status === "joined" ? existing.joined_at : nowIso,
        left_at: null,
        last_seen_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", existing.id)
      .select(DISCORD_SPOTIFY_ROOM_MEMBER_SELECT)
      .single();

    const row = coerceRoomMemberRow(data);
    if (error || !row) {
      throw new Error(`Failed to join Spotify room: ${error?.message ?? "missing row"}`);
    }
    return row;
  }

  const { data, error } = await admin
    .from("discord_spotify_room_members")
    .insert({
      lobby_id: args.lobbyId,
      discord_user_id: args.discordUserId,
      spotify_user_id: args.spotifyUserId ?? null,
      status: "joined",
      joined_at: nowIso,
      left_at: null,
      last_seen_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(DISCORD_SPOTIFY_ROOM_MEMBER_SELECT)
    .single();

  const row = coerceRoomMemberRow(data);
  if (error || !row) {
    throw new Error(`Failed to create Spotify room membership: ${error?.message ?? "missing row"}`);
  }

  return row;
}

export async function leaveDiscordSpotifyRoom(args: {
  lobbyId: string;
  discordUserId: string;
  admin?: SpotifyRoomMembersAdminClient;
}): Promise<DiscordSpotifyRoomMemberRow | null> {
  const admin = args.admin ?? supabaseAdmin();
  const existing = await getDiscordSpotifyRoomMember({
    lobbyId: args.lobbyId,
    discordUserId: args.discordUserId,
    admin,
  });

  if (!existing) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("discord_spotify_room_members")
    .update({
      status: "left",
      left_at: nowIso,
      last_seen_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", existing.id)
    .select(DISCORD_SPOTIFY_ROOM_MEMBER_SELECT)
    .single();

  const row = coerceRoomMemberRow(data);
  if (error || !row) {
    throw new Error(`Failed to leave Spotify room: ${error?.message ?? "missing row"}`);
  }

  return row;
}

export async function leaveAllJoinedDiscordSpotifyRoomMembers(args: {
  lobbyId: string;
  admin?: SpotifyRoomMembersAdminClient;
}): Promise<void> {
  const admin = args.admin ?? supabaseAdmin();
  const nowIso = new Date().toISOString();
  const { error } = await admin
    .from("discord_spotify_room_members")
    .update({
      status: "left",
      left_at: nowIso,
      last_seen_at: nowIso,
      updated_at: nowIso,
    })
    .eq("lobby_id", args.lobbyId)
    .eq("status", "joined");

  if (error) {
    throw new Error(`Failed to clear Spotify room members: ${error.message}`);
  }
}
