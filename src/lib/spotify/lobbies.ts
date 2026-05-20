import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type DiscordSpotifyLobbyStatus = "open" | "closed";
export type DiscordSpotifyApprovalMode = "auto_approve_jam_ready" | "review" | "host_only";

export type DiscordSpotifyLobbyRow = {
  id: string;
  room_slug: string;
  room_name: string;
  visibility: "public" | "private";
  join_key_hash: string | null;
  status: DiscordSpotifyLobbyStatus;
  host_discord_user_id: string | null;
  host_spotify_user_id: string | null;
  approval_mode: DiscordSpotifyApprovalMode;
  spotify_mirror_enabled: boolean;
  spotify_mirror_last_synced_at: string | null;
  spotify_mirror_error_count: number;
  stop_playback_on_close: boolean;
  title: string | null;
  description: string | null;
  panel_channel_id: string | null;
  panel_message_id: string | null;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

type SpotifyLobbiesAdminClient = {
  from: (table: "discord_spotify_lobbies") => any;
};

const DISCORD_SPOTIFY_LOBBY_SELECT = [
  "id",
  "room_slug",
  "room_name",
  "visibility",
  "join_key_hash",
  "status",
  "host_discord_user_id",
  "host_spotify_user_id",
  "approval_mode",
  "spotify_mirror_enabled",
  "spotify_mirror_last_synced_at",
  "spotify_mirror_error_count",
  "stop_playback_on_close",
  "title",
  "description",
  "panel_channel_id",
  "panel_message_id",
  "opened_at",
  "closed_at",
  "created_at",
  "updated_at",
].join(", ");

function coerceLobbyStatus(status: unknown): DiscordSpotifyLobbyStatus {
  return status === "open" ? "open" : "closed";
}

function coerceApprovalMode(value: unknown): DiscordSpotifyApprovalMode {
  if (value === "review" || value === "host_only") {
    return value;
  }

  return "auto_approve_jam_ready";
}

function coerceDiscordSpotifyLobbyRow(row: unknown): DiscordSpotifyLobbyRow | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const candidate = row as Record<string, unknown>;
  if (
    typeof candidate.id !== "string"
    || typeof candidate.created_at !== "string"
    || typeof candidate.updated_at !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    room_slug: typeof candidate.room_slug === "string" && candidate.room_slug.trim() ? candidate.room_slug : "main",
    room_name: typeof candidate.room_name === "string" && candidate.room_name.trim() ? candidate.room_name : "Main Room",
    visibility: candidate.visibility === "private" ? "private" : "public",
    join_key_hash: typeof candidate.join_key_hash === "string" ? candidate.join_key_hash : null,
    status: coerceLobbyStatus(candidate.status),
    host_discord_user_id: typeof candidate.host_discord_user_id === "string" ? candidate.host_discord_user_id : null,
    host_spotify_user_id: typeof candidate.host_spotify_user_id === "string" ? candidate.host_spotify_user_id : null,
    approval_mode: coerceApprovalMode(candidate.approval_mode),
    spotify_mirror_enabled: candidate.spotify_mirror_enabled === true,
    spotify_mirror_last_synced_at: typeof candidate.spotify_mirror_last_synced_at === "string"
      ? candidate.spotify_mirror_last_synced_at
      : null,
    spotify_mirror_error_count: typeof candidate.spotify_mirror_error_count === "number"
      && Number.isFinite(candidate.spotify_mirror_error_count)
      ? candidate.spotify_mirror_error_count
      : 0,
    stop_playback_on_close: candidate.stop_playback_on_close === true,
    title: typeof candidate.title === "string" ? candidate.title : null,
    description: typeof candidate.description === "string" ? candidate.description : null,
    panel_channel_id: typeof candidate.panel_channel_id === "string" ? candidate.panel_channel_id : null,
    panel_message_id: typeof candidate.panel_message_id === "string" ? candidate.panel_message_id : null,
    opened_at: typeof candidate.opened_at === "string" ? candidate.opened_at : null,
    closed_at: typeof candidate.closed_at === "string" ? candidate.closed_at : null,
    created_at: candidate.created_at,
    updated_at: candidate.updated_at,
  };
}

function buildLobbyStatusPayload(args: {
  status: DiscordSpotifyLobbyStatus;
  hostDiscordUserId?: string | null;
  hostSpotifyUserId?: string | null;
  title?: string | null;
  description?: string | null;
  roomSlug?: string | null;
  roomName?: string | null;
  visibility?: "public" | "private" | null;
  joinKeyHash?: string | null;
  approvalMode?: DiscordSpotifyApprovalMode | null;
  spotifyMirrorEnabled?: boolean | null;
  spotifyMirrorLastSyncedAt?: string | null;
  spotifyMirrorErrorCount?: number | null;
  stopPlaybackOnClose?: boolean | null;
  panelChannelId?: string | null;
  panelMessageId?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
}) {
  const nowIso = new Date().toISOString();

  return {
    status: args.status,
    room_slug: args.roomSlug ?? "main",
    room_name: args.roomName ?? "Main Room",
    visibility: args.visibility === "private" ? "private" : "public",
    join_key_hash: args.joinKeyHash ?? null,
    approval_mode: args.approvalMode ?? "auto_approve_jam_ready",
    spotify_mirror_enabled: args.spotifyMirrorEnabled ?? false,
    spotify_mirror_last_synced_at: args.spotifyMirrorLastSyncedAt ?? null,
    spotify_mirror_error_count: args.spotifyMirrorErrorCount ?? 0,
    stop_playback_on_close: args.stopPlaybackOnClose ?? false,
    host_discord_user_id: args.hostDiscordUserId ?? null,
    host_spotify_user_id: args.hostSpotifyUserId ?? null,
    title: args.title ?? null,
    description: args.description ?? null,
    panel_channel_id: args.panelChannelId ?? null,
    panel_message_id: args.panelMessageId ?? null,
    opened_at: args.status === "open" ? (args.openedAt ?? nowIso) : null,
    closed_at: args.status === "closed" ? (args.closedAt ?? nowIso) : null,
    updated_at: nowIso,
  };
}

async function selectLatestLobbyRow(admin: SpotifyLobbiesAdminClient): Promise<DiscordSpotifyLobbyRow | null> {
  const { data, error } = await admin
    .from("discord_spotify_lobbies")
    .select(DISCORD_SPOTIFY_LOBBY_SELECT)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to load Spotify lobby: ${error.message}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return coerceDiscordSpotifyLobbyRow(data[0]);
}

async function insertLobbyRow(
  values: Record<string, unknown>,
  admin: SpotifyLobbiesAdminClient,
): Promise<DiscordSpotifyLobbyRow> {
  const { data, error } = await admin
    .from("discord_spotify_lobbies")
    .insert(values)
    .select(DISCORD_SPOTIFY_LOBBY_SELECT)
    .single();

  const row = coerceDiscordSpotifyLobbyRow(data);
  if (error || !row) {
    throw new Error(`Failed to create Spotify lobby: ${error?.message ?? "missing row"}`);
  }

  return row;
}

async function updateLobbyRow(
  id: string,
  values: Record<string, unknown>,
  admin: SpotifyLobbiesAdminClient,
): Promise<DiscordSpotifyLobbyRow> {
  const { data, error } = await admin
    .from("discord_spotify_lobbies")
    .update(values)
    .eq("id", id)
    .select(DISCORD_SPOTIFY_LOBBY_SELECT)
    .single();

  const row = coerceDiscordSpotifyLobbyRow(data);
  if (error || !row) {
    throw new Error(`Failed to update Spotify lobby: ${error?.message ?? "missing row"}`);
  }

  return row;
}

export function formatDiscordSpotifyLobbyStatusLabel(lobby: DiscordSpotifyLobbyRow | null): "Open" | "Closed" {
  return lobby?.status === "open" ? "Open" : "Closed";
}

export function buildDiscordSpotifyLobbyStatusSummary(lobby: DiscordSpotifyLobbyRow | null): string {
  if (!lobby || lobby.status === "closed") {
    return "Spotify Club lobby is Closed.";
  }

  const hostLine = lobby.host_discord_user_id ? `\nHost: <@${lobby.host_discord_user_id}>` : "";
  return `Spotify Club lobby is Open.${hostLine}`;
}

export async function getLatestDiscordSpotifyLobby(
  admin: SpotifyLobbiesAdminClient = supabaseAdmin(),
): Promise<DiscordSpotifyLobbyRow | null> {
  return selectLatestLobbyRow(admin);
}

export async function upsertDiscordSpotifyLobbyPanel(args: {
  panelChannelId: string;
  panelMessageId: string;
  admin?: SpotifyLobbiesAdminClient;
}): Promise<DiscordSpotifyLobbyRow> {
  const admin = args.admin ?? supabaseAdmin();
  const existing = await selectLatestLobbyRow(admin);

  const values = {
    panel_channel_id: args.panelChannelId,
    panel_message_id: args.panelMessageId,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    return updateLobbyRow(existing.id, values, admin);
  }

  return insertLobbyRow({
    ...buildLobbyStatusPayload({
      status: "closed",
      roomSlug: "main",
      roomName: "Main Room",
      visibility: "public",
      joinKeyHash: null,
      approvalMode: "auto_approve_jam_ready",
      spotifyMirrorEnabled: false,
      spotifyMirrorLastSyncedAt: null,
      spotifyMirrorErrorCount: 0,
      stopPlaybackOnClose: false,
      panelChannelId: args.panelChannelId,
      panelMessageId: args.panelMessageId,
    }),
  }, admin);
}

export async function openDiscordSpotifyLobby(args: {
  hostDiscordUserId: string;
  hostSpotifyUserId?: string | null;
  title?: string | null;
  description?: string | null;
  admin?: SpotifyLobbiesAdminClient;
}): Promise<DiscordSpotifyLobbyRow> {
  const admin = args.admin ?? supabaseAdmin();
  const existing = await selectLatestLobbyRow(admin);
  const values = buildLobbyStatusPayload({
    status: "open",
    roomSlug: existing?.room_slug ?? "main",
    roomName: existing?.room_name ?? "Main Room",
    visibility: existing?.visibility ?? "public",
    joinKeyHash: existing?.join_key_hash ?? null,
    approvalMode: existing?.approval_mode ?? "auto_approve_jam_ready",
    spotifyMirrorEnabled: existing?.spotify_mirror_enabled ?? false,
    spotifyMirrorLastSyncedAt: existing?.spotify_mirror_last_synced_at ?? null,
    spotifyMirrorErrorCount: existing?.spotify_mirror_error_count ?? 0,
    stopPlaybackOnClose: existing?.stop_playback_on_close ?? false,
    hostDiscordUserId: args.hostDiscordUserId,
    hostSpotifyUserId: args.hostSpotifyUserId ?? null,
    title: args.title ?? null,
    description: args.description ?? null,
    panelChannelId: existing?.panel_channel_id ?? null,
    panelMessageId: existing?.panel_message_id ?? null,
    openedAt: new Date().toISOString(),
  });

  if (existing?.status === "open") {
    return updateLobbyRow(existing.id, values, admin);
  }

  return insertLobbyRow(values, admin);
}

export async function closeDiscordSpotifyLobby(
  admin: SpotifyLobbiesAdminClient = supabaseAdmin(),
): Promise<DiscordSpotifyLobbyRow> {
  const existing = await selectLatestLobbyRow(admin);
  const values = buildLobbyStatusPayload({
    status: "closed",
    roomSlug: existing?.room_slug ?? "main",
    roomName: existing?.room_name ?? "Main Room",
    visibility: existing?.visibility ?? "public",
    joinKeyHash: existing?.join_key_hash ?? null,
    approvalMode: existing?.approval_mode ?? "auto_approve_jam_ready",
    spotifyMirrorEnabled: existing?.spotify_mirror_enabled ?? false,
    spotifyMirrorLastSyncedAt: existing?.spotify_mirror_last_synced_at ?? null,
    spotifyMirrorErrorCount: existing?.spotify_mirror_error_count ?? 0,
    stopPlaybackOnClose: existing?.stop_playback_on_close ?? false,
    hostDiscordUserId: existing?.host_discord_user_id ?? null,
    hostSpotifyUserId: existing?.host_spotify_user_id ?? null,
    title: existing?.title ?? null,
    description: existing?.description ?? null,
    panelChannelId: existing?.panel_channel_id ?? null,
    panelMessageId: existing?.panel_message_id ?? null,
    closedAt: new Date().toISOString(),
  });

  if (existing) {
    return updateLobbyRow(existing.id, values, admin);
  }

  return insertLobbyRow(values, admin);
}

export async function updateDiscordSpotifyLobbySettings(args: {
  lobbyId: string;
  approvalMode?: DiscordSpotifyApprovalMode;
  spotifyMirrorEnabled?: boolean;
  spotifyMirrorLastSyncedAt?: string | null;
  spotifyMirrorErrorCount?: number;
  stopPlaybackOnClose?: boolean;
  admin?: SpotifyLobbiesAdminClient;
}): Promise<DiscordSpotifyLobbyRow> {
  const admin = args.admin ?? supabaseAdmin();
  const values: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (args.approvalMode) {
    values.approval_mode = args.approvalMode;
  }
  if (typeof args.spotifyMirrorEnabled === "boolean") {
    values.spotify_mirror_enabled = args.spotifyMirrorEnabled;
  }
  if (args.spotifyMirrorLastSyncedAt !== undefined) {
    values.spotify_mirror_last_synced_at = args.spotifyMirrorLastSyncedAt;
  }
  if (typeof args.spotifyMirrorErrorCount === "number" && Number.isFinite(args.spotifyMirrorErrorCount)) {
    values.spotify_mirror_error_count = Math.max(0, Math.trunc(args.spotifyMirrorErrorCount));
  }
  if (typeof args.stopPlaybackOnClose === "boolean") {
    values.stop_playback_on_close = args.stopPlaybackOnClose;
  }

  return updateLobbyRow(args.lobbyId, values, admin);
}
