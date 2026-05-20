import "server-only";

import { Buffer } from "node:buffer";
import { optionalEnv } from "@/lib/env";
import { getLatestDiscordSpotifyLobby, type DiscordSpotifyApprovalMode, type DiscordSpotifyLobbyRow } from "@/lib/spotify/lobbies";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type DiscordSpotifyQueueItemStatus = "pending" | "approved" | "rejected" | "removed" | "played" | "skipped";
export type DiscordSpotifyQueueSourceType = "discord_search" | "discord_link" | "spotify_mirror";
export type DiscordSpotifyQueueApprovalState = "pending" | "approved" | "rejected" | "removed";
export type DiscordSpotifyQueuePlaybackState = "queued" | "playing" | "played" | "skipped" | "cleared";

export type DiscordSpotifyQueueItemRow = {
  id: string;
  lobby_id: string | null;
  status: DiscordSpotifyQueueItemStatus;
  source_type: DiscordSpotifyQueueSourceType;
  approval_state: DiscordSpotifyQueueApprovalState;
  playback_state: DiscordSpotifyQueuePlaybackState;
  spotify_uri: string;
  spotify_url: string | null;
  track_title: string | null;
  artist_name: string | null;
  album_name: string | null;
  duration_ms: number | null;
  suggested_by_discord_user_id: string;
  suggested_by_spotify_user_id: string | null;
  approved_by_discord_user_id: string | null;
  rejected_by_discord_user_id: string | null;
  removed_by_discord_user_id: string | null;
  rejection_reason: string | null;
  removal_reason: string | null;
  queue_position: number | null;
  dedupe_key: string | null;
  mirror_first_seen_at: string | null;
  mirror_last_seen_at: string | null;
  display_position: number | null;
  cleared_reason: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  removed_at: string | null;
  played_at: string | null;
  skipped_at: string | null;
  playback_started_at: string | null;
  playback_finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SpotifyTrackReference = {
  trackId: string;
  spotifyUri: string;
  spotifyUrl: string;
};

export type SpotifyTrackMetadata = {
  trackTitle: string | null;
  artistName: string | null;
  albumName: string | null;
  durationMs: number | null;
};

export type DiscordSpotifyQueueSummary = {
  approvedItems: DiscordSpotifyQueueItemRow[];
  pendingItems: DiscordSpotifyQueueItemRow[];
};

type SpotifyQueueAdminClient = {
  from: (table: "discord_spotify_queue_items") => any;
};

const SPOTIFY_TRACK_ID_PATTERN = /^[A-Za-z0-9]{22}$/;
const SPOTIFY_TRACK_URI_PATTERN = /^spotify:track:([A-Za-z0-9]{22})$/i;
const SPOTIFY_TRACK_URL_PATTERN = /(?:^|\/)track\/([A-Za-z0-9]{22})(?:$|[/?#])/i;
const SPOTIFY_APP_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_TRACKS_API_URL = "https://api.spotify.com/v1/tracks";

const DISCORD_SPOTIFY_QUEUE_SELECT = [
  "id",
  "lobby_id",
  "status",
  "source_type",
  "approval_state",
  "playback_state",
  "spotify_uri",
  "spotify_url",
  "track_title",
  "artist_name",
  "album_name",
  "duration_ms",
  "suggested_by_discord_user_id",
  "suggested_by_spotify_user_id",
  "approved_by_discord_user_id",
  "rejected_by_discord_user_id",
  "removed_by_discord_user_id",
  "rejection_reason",
  "removal_reason",
  "queue_position",
  "dedupe_key",
  "mirror_first_seen_at",
  "mirror_last_seen_at",
  "display_position",
  "cleared_reason",
  "approved_at",
  "rejected_at",
  "removed_at",
  "played_at",
  "skipped_at",
  "playback_started_at",
  "playback_finished_at",
  "created_at",
  "updated_at",
].join(", ");

function coerceQueueStatus(status: unknown): DiscordSpotifyQueueItemStatus | null {
  return status === "pending"
    || status === "approved"
    || status === "rejected"
    || status === "removed"
    || status === "played"
    || status === "skipped"
    ? status
    : null;
}

function coerceSourceType(value: unknown): DiscordSpotifyQueueSourceType {
  return value === "discord_search" || value === "spotify_mirror" ? value : "discord_link";
}

function coerceApprovalState(value: unknown, legacyStatus: DiscordSpotifyQueueItemStatus): DiscordSpotifyQueueApprovalState {
  if (value === "pending" || value === "approved" || value === "rejected" || value === "removed") {
    return value;
  }

  if (legacyStatus === "pending" || legacyStatus === "rejected" || legacyStatus === "removed") {
    return legacyStatus;
  }

  return "approved";
}

function coercePlaybackState(value: unknown, legacyStatus: DiscordSpotifyQueueItemStatus): DiscordSpotifyQueuePlaybackState {
  if (value === "queued" || value === "playing" || value === "played" || value === "skipped" || value === "cleared") {
    return value;
  }

  if (legacyStatus === "played" || legacyStatus === "skipped") {
    return legacyStatus;
  }

  if (legacyStatus === "removed") {
    return "cleared";
  }

  return "queued";
}

function coerceQueueItemRow(row: unknown): DiscordSpotifyQueueItemRow | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const candidate = row as Record<string, unknown>;
  const status = coerceQueueStatus(candidate.status);
  if (
    typeof candidate.id !== "string"
    || !status
    || typeof candidate.spotify_uri !== "string"
    || typeof candidate.suggested_by_discord_user_id !== "string"
    || typeof candidate.created_at !== "string"
    || typeof candidate.updated_at !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    lobby_id: typeof candidate.lobby_id === "string" ? candidate.lobby_id : null,
    status,
    source_type: coerceSourceType(candidate.source_type),
    approval_state: coerceApprovalState(candidate.approval_state, status),
    playback_state: coercePlaybackState(candidate.playback_state, status),
    spotify_uri: candidate.spotify_uri,
    spotify_url: typeof candidate.spotify_url === "string" ? candidate.spotify_url : null,
    track_title: typeof candidate.track_title === "string" ? candidate.track_title : null,
    artist_name: typeof candidate.artist_name === "string" ? candidate.artist_name : null,
    album_name: typeof candidate.album_name === "string" ? candidate.album_name : null,
    duration_ms: typeof candidate.duration_ms === "number" ? candidate.duration_ms : null,
    suggested_by_discord_user_id: candidate.suggested_by_discord_user_id,
    suggested_by_spotify_user_id: typeof candidate.suggested_by_spotify_user_id === "string" ? candidate.suggested_by_spotify_user_id : null,
    approved_by_discord_user_id: typeof candidate.approved_by_discord_user_id === "string" ? candidate.approved_by_discord_user_id : null,
    rejected_by_discord_user_id: typeof candidate.rejected_by_discord_user_id === "string" ? candidate.rejected_by_discord_user_id : null,
    removed_by_discord_user_id: typeof candidate.removed_by_discord_user_id === "string" ? candidate.removed_by_discord_user_id : null,
    rejection_reason: typeof candidate.rejection_reason === "string" ? candidate.rejection_reason : null,
    removal_reason: typeof candidate.removal_reason === "string" ? candidate.removal_reason : null,
    queue_position: typeof candidate.queue_position === "number" ? candidate.queue_position : null,
    dedupe_key: typeof candidate.dedupe_key === "string" ? candidate.dedupe_key : null,
    mirror_first_seen_at: typeof candidate.mirror_first_seen_at === "string" ? candidate.mirror_first_seen_at : null,
    mirror_last_seen_at: typeof candidate.mirror_last_seen_at === "string" ? candidate.mirror_last_seen_at : null,
    display_position: typeof candidate.display_position === "number"
      ? candidate.display_position
      : typeof candidate.queue_position === "number"
        ? candidate.queue_position
        : null,
    cleared_reason: typeof candidate.cleared_reason === "string" ? candidate.cleared_reason : null,
    approved_at: typeof candidate.approved_at === "string" ? candidate.approved_at : null,
    rejected_at: typeof candidate.rejected_at === "string" ? candidate.rejected_at : null,
    removed_at: typeof candidate.removed_at === "string" ? candidate.removed_at : null,
    played_at: typeof candidate.played_at === "string" ? candidate.played_at : null,
    skipped_at: typeof candidate.skipped_at === "string" ? candidate.skipped_at : null,
    playback_started_at: typeof candidate.playback_started_at === "string"
      ? candidate.playback_started_at
      : typeof candidate.played_at === "string"
        ? candidate.played_at
        : null,
    playback_finished_at: typeof candidate.playback_finished_at === "string"
      ? candidate.playback_finished_at
      : typeof candidate.played_at === "string"
        ? candidate.played_at
        : null,
    created_at: candidate.created_at,
    updated_at: candidate.updated_at,
  };
}

function normalizeReason(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, 500) : null;
}

function normalizeTrackDisplayValue(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, 200) : null;
}

export function buildDiscordSpotifyQueueDedupeKey(args: {
  lobbyId: string;
  spotifyUri: string;
  sourceType: DiscordSpotifyQueueSourceType;
}): string {
  return `${args.lobbyId}:${args.sourceType}:${args.spotifyUri.toLowerCase()}`;
}

function optionalSpotifyClientId(): string | null {
  const value = optionalEnv("SPOTIFY_CLIENT_ID");
  return value && value.length > 0 ? value : null;
}

function optionalSpotifyClientSecret(): string | null {
  const value = optionalEnv("SPOTIFY_CLIENT_SECRET");
  return value && value.length > 0 ? value : null;
}

function encodeBasicAuth(clientId: string, clientSecret: string): string {
  return Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
}

async function fetchSpotifyAppAccessToken(): Promise<string | null> {
  const clientId = optionalSpotifyClientId();
  const clientSecret = optionalSpotifyClientSecret();
  if (!clientId || !clientSecret) {
    return null;
  }

  const response = await fetch(SPOTIFY_APP_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${encodeBasicAuth(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }).toString(),
    cache: "no-store",
  });

  const body = await response.json().catch(() => null) as { access_token?: unknown } | null;
  if (!response.ok || !body || typeof body.access_token !== "string") {
    return null;
  }

  return body.access_token;
}

export function buildSpotifyTrackUrl(trackId: string): string {
  return `https://open.spotify.com/track/${trackId}`;
}

export function parseSpotifyTrackReference(value: string): SpotifyTrackReference {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error("Spotify track reference is required.");
  }

  const uriMatch = normalized.match(SPOTIFY_TRACK_URI_PATTERN);
  if (uriMatch?.[1] && SPOTIFY_TRACK_ID_PATTERN.test(uriMatch[1])) {
    return {
      trackId: uriMatch[1],
      spotifyUri: `spotify:track:${uriMatch[1]}`,
      spotifyUrl: buildSpotifyTrackUrl(uriMatch[1]),
    };
  }

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    parsedUrl = null;
  }

  if (!parsedUrl) {
    throw new Error("Only Spotify track URLs or spotify:track URIs are supported in this phase.");
  }

  if (parsedUrl.hostname !== "open.spotify.com" && parsedUrl.hostname !== "play.spotify.com") {
    throw new Error("Only Spotify track URLs or spotify:track URIs are supported in this phase.");
  }

  const trackMatch = parsedUrl.pathname.match(SPOTIFY_TRACK_URL_PATTERN);
  if (!trackMatch?.[1] || !SPOTIFY_TRACK_ID_PATTERN.test(trackMatch[1])) {
    throw new Error("Only Spotify track URLs are supported in this phase.");
  }

  return {
    trackId: trackMatch[1],
    spotifyUri: `spotify:track:${trackMatch[1]}`,
    spotifyUrl: buildSpotifyTrackUrl(trackMatch[1]),
  };
}

export async function fetchSpotifyTrackMetadata(trackId: string): Promise<SpotifyTrackMetadata | null> {
  if (!SPOTIFY_TRACK_ID_PATTERN.test(trackId)) {
    return null;
  }

  const accessToken = await fetchSpotifyAppAccessToken();
  if (!accessToken) {
    return null;
  }

  const response = await fetch(`${SPOTIFY_TRACKS_API_URL}/${trackId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => null) as {
    name?: unknown;
    duration_ms?: unknown;
    album?: { name?: unknown } | null;
    artists?: Array<{ name?: unknown }> | null;
  } | null;

  if (!response.ok || !body) {
    return null;
  }

  return {
    trackTitle: normalizeTrackDisplayValue(typeof body.name === "string" ? body.name : null),
    artistName: normalizeTrackDisplayValue(
      Array.isArray(body.artists)
        ? body.artists
          .map((artist) => (typeof artist?.name === "string" ? artist.name.trim() : ""))
          .filter(Boolean)
          .join(", ")
        : null,
    ),
    albumName: normalizeTrackDisplayValue(typeof body.album?.name === "string" ? body.album.name : null),
    durationMs: typeof body.duration_ms === "number" && Number.isFinite(body.duration_ms) && body.duration_ms > 0
      ? body.duration_ms
      : null,
  };
}

function formatQueueTrackLabel(item: Pick<DiscordSpotifyQueueItemRow, "track_title" | "artist_name" | "spotify_uri">): string {
  const title = item.track_title?.trim();
  const artist = item.artist_name?.trim();
  if (title && artist) {
    return `${title} - ${artist}`;
  }

  if (title) {
    return title;
  }

  return item.spotify_uri;
}

export function formatQueueSourceLabel(sourceType: DiscordSpotifyQueueSourceType): string {
  if (sourceType === "discord_search") {
    return "Discord search";
  }
  if (sourceType === "spotify_mirror") {
    return "Spotify mirror";
  }
  return "Discord link";
}

export function buildDiscordSpotifyQueuePreviewLines(summary: DiscordSpotifyQueueSummary): string[] {
  if (summary.approvedItems.length === 0) {
    return ["No approved tracks yet."];
  }

  return summary.approvedItems.slice(0, 3).map((item, index) => {
    const position = item.queue_position ?? index + 1;
    return `${position}. ${formatQueueTrackLabel(item)} (${formatQueueSourceLabel(item.source_type)})`;
  });
}

export function buildDiscordSpotifyQueueSummaryText(summary: DiscordSpotifyQueueSummary): string {
  return buildDiscordSpotifyQueueSummaryTextForViewer(summary);
}

export function buildDiscordSpotifyQueueSummaryTextForViewer(
  summary: DiscordSpotifyQueueSummary,
  viewerDiscordUserId?: string | null,
): string {
  const approvedLines = summary.approvedItems.length === 0
    ? ["No approved tracks yet."]
    : summary.approvedItems.slice(0, 10).map((item, index) => {
      const position = item.queue_position ?? index + 1;
      const playbackLabel = item.playback_state === "playing" ? "Now playing" : "Queued";
      return `${position}. ${formatQueueTrackLabel(item)} (${formatQueueSourceLabel(item.source_type)}, ${playbackLabel})`;
    });

  const pendingLines = summary.pendingItems.length === 0
    ? ["No pending suggestions."]
    : summary.pendingItems.slice(0, 10).map((item) => {
      const shortId = item.id.split("-")[0]?.slice(0, 8) ?? item.id;
      return `- ${shortId}: ${formatQueueTrackLabel(item)} (${formatQueueSourceLabel(item.source_type)})`;
    });

  const viewerPendingLines = viewerDiscordUserId
    ? summary.pendingItems
      .filter((item) => item.suggested_by_discord_user_id === viewerDiscordUserId)
      .slice(0, 5)
      .map((item) => `- ${formatQueueTrackLabel(item)}`)
    : [];

  return [
    "**Approved queue**",
    ...approvedLines,
    "",
    `Pending suggestions: ${summary.pendingItems.length}`,
    ...pendingLines,
    ...(viewerPendingLines.length > 0
      ? [
        "",
        "**Your pending suggestions**",
        ...viewerPendingLines,
      ]
      : []),
  ].join("\n");
}

export function buildDiscordSpotifyQueueActionSummary(args: {
  action: "suggested" | "approved" | "rejected" | "removed";
  item: DiscordSpotifyQueueItemRow;
  actorDiscordUserId?: string | null;
  reason?: string | null;
}): string {
  const shortId = args.item.id.split("-")[0]?.slice(0, 8) ?? args.item.id;
  const trackLabel = formatQueueTrackLabel(args.item);
  const actorLine = args.actorDiscordUserId ? ` by <@${args.actorDiscordUserId}>` : "";
  const reasonLine = args.reason ? ` Reason: ${args.reason}` : "";

  if (args.action === "suggested") {
    if (args.item.approval_state === "approved") {
      const position = args.item.display_position ?? args.item.queue_position ?? "?";
      return `Queue added: \`${shortId}\` ${trackLabel} is now #${position}${actorLine}.`;
    }

    return `Queue suggestion pending: \`${shortId}\` ${trackLabel}${actorLine}.`;
  }

  if (args.action === "approved") {
    const position = args.item.display_position ?? args.item.queue_position ?? "?";
    return `Queue approved: \`${shortId}\` ${trackLabel} is now #${position}${actorLine}.${reasonLine}`;
  }

  if (args.action === "rejected") {
    return `Queue rejected: \`${shortId}\` ${trackLabel}${actorLine}.${reasonLine}`;
  }

  return `Queue removed: \`${shortId}\` ${trackLabel}${actorLine}.${reasonLine}`;
}

async function fetchLobbyQueueItems(args: {
  lobbyId: string;
  statuses?: DiscordSpotifyQueueItemStatus[];
  admin?: SpotifyQueueAdminClient;
}): Promise<DiscordSpotifyQueueItemRow[]> {
  const admin = args.admin ?? supabaseAdmin();
  let query = admin
    .from("discord_spotify_queue_items")
    .select(DISCORD_SPOTIFY_QUEUE_SELECT)
    .eq("lobby_id", args.lobbyId)
    .order("queue_position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (args.statuses && args.statuses.length > 0) {
    query = query.in("status", args.statuses);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load Spotify queue items: ${error.message}`);
  }

  return Array.isArray(data)
    ? data.map((row) => coerceQueueItemRow(row)).filter((row): row is DiscordSpotifyQueueItemRow => Boolean(row))
    : [];
}

async function fetchQueueItemById(id: string, admin: SpotifyQueueAdminClient): Promise<DiscordSpotifyQueueItemRow | null> {
  const { data, error } = await admin
    .from("discord_spotify_queue_items")
    .select(DISCORD_SPOTIFY_QUEUE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Spotify queue item: ${error.message}`);
  }

  return coerceQueueItemRow(data);
}

async function insertQueueItem(values: Record<string, unknown>, admin: SpotifyQueueAdminClient): Promise<DiscordSpotifyQueueItemRow> {
  const { data, error } = await admin
    .from("discord_spotify_queue_items")
    .insert(values)
    .select(DISCORD_SPOTIFY_QUEUE_SELECT)
    .single();

  const row = coerceQueueItemRow(data);
  if (error || !row) {
    throw new Error(`Failed to create Spotify queue item: ${error?.message ?? "missing row"}`);
  }

  return row;
}

async function updateQueueItem(id: string, values: Record<string, unknown>, admin: SpotifyQueueAdminClient): Promise<DiscordSpotifyQueueItemRow> {
  const { data, error } = await admin
    .from("discord_spotify_queue_items")
    .update(values)
    .eq("id", id)
    .select(DISCORD_SPOTIFY_QUEUE_SELECT)
    .single();

  const row = coerceQueueItemRow(data);
  if (error || !row) {
    throw new Error(`Failed to update Spotify queue item: ${error?.message ?? "missing row"}`);
  }

  return row;
}

export async function getCurrentDiscordSpotifyLobbyForQueue(): Promise<DiscordSpotifyLobbyRow | null> {
  const lobby = await getLatestDiscordSpotifyLobby();
  return lobby?.status === "open" ? lobby : null;
}

export async function getDiscordSpotifyQueueSummary(args: {
  lobbyId: string;
  admin?: SpotifyQueueAdminClient;
}): Promise<DiscordSpotifyQueueSummary> {
  const items = await fetchLobbyQueueItems({
    lobbyId: args.lobbyId,
    statuses: ["pending", "approved", "played", "skipped"],
    admin: args.admin,
  });

  return {
    approvedItems: items.filter((item) => (
      item.approval_state === "approved"
      && (item.playback_state === "queued" || item.playback_state === "playing")
    )).sort((left, right) => {
      const leftPosition = left.display_position ?? left.queue_position ?? Number.MAX_SAFE_INTEGER;
      const rightPosition = right.display_position ?? right.queue_position ?? Number.MAX_SAFE_INTEGER;
      if (leftPosition !== rightPosition) {
        return leftPosition - rightPosition;
      }
      return left.created_at.localeCompare(right.created_at);
    }),
    pendingItems: items.filter((item) => item.approval_state === "pending").sort((left, right) => (
      left.created_at.localeCompare(right.created_at)
    )),
  };
}

export async function getActiveDiscordSpotifyQueueItems(args: {
  lobbyId: string;
  admin?: SpotifyQueueAdminClient;
}): Promise<DiscordSpotifyQueueItemRow[]> {
  return fetchLobbyQueueItems({
    lobbyId: args.lobbyId,
    statuses: ["pending", "approved", "played", "skipped"],
    admin: args.admin,
  });
}

export async function insertMirroredDiscordSpotifyQueueItem(args: {
  lobbyId: string;
  spotifyUri: string;
  spotifyUrl: string | null;
  trackTitle: string | null;
  artistName: string | null;
  albumName: string | null;
  durationMs: number | null;
  displayPosition: number | null;
  hostDiscordUserId: string;
  firstSeenAt?: string;
  admin?: SpotifyQueueAdminClient;
}): Promise<DiscordSpotifyQueueItemRow> {
  const admin = args.admin ?? supabaseAdmin();
  const nowIso = new Date().toISOString();
  const seenAt = args.firstSeenAt ?? nowIso;
  const displayPosition = args.displayPosition ?? await getNextQueuePosition(args.lobbyId, admin);

  return insertQueueItem({
    lobby_id: args.lobbyId,
    status: "approved",
    source_type: "spotify_mirror",
    approval_state: "approved",
    playback_state: "queued",
    spotify_uri: args.spotifyUri,
    spotify_url: args.spotifyUrl,
    track_title: args.trackTitle,
    artist_name: args.artistName,
    album_name: args.albumName,
    duration_ms: args.durationMs,
    suggested_by_discord_user_id: args.hostDiscordUserId,
    approved_by_discord_user_id: args.hostDiscordUserId,
    queue_position: displayPosition,
    display_position: displayPosition,
    dedupe_key: buildDiscordSpotifyQueueDedupeKey({
      lobbyId: args.lobbyId,
      spotifyUri: args.spotifyUri,
      sourceType: "spotify_mirror",
    }),
    mirror_first_seen_at: seenAt,
    mirror_last_seen_at: nowIso,
    approved_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  }, admin);
}

export async function markDiscordSpotifyQueueItemMirrorSeen(args: {
  queueItemId: string;
  displayPosition: number | null;
  admin?: SpotifyQueueAdminClient;
}): Promise<DiscordSpotifyQueueItemRow> {
  const admin = args.admin ?? supabaseAdmin();
  const nowIso = new Date().toISOString();
  return updateQueueItem(args.queueItemId, {
    mirror_last_seen_at: nowIso,
    display_position: args.displayPosition,
    queue_position: args.displayPosition,
    updated_at: nowIso,
  }, admin);
}

export async function clearStaleMirroredDiscordSpotifyQueueItems(args: {
  lobbyId: string;
  activeSpotifyUris: string[];
  admin?: SpotifyQueueAdminClient;
}): Promise<number> {
  const admin = args.admin ?? supabaseAdmin();
  const activeUriCounts = args.activeSpotifyUris.reduce((counts, uri) => {
    const normalizedUri = uri.trim().toLowerCase();
    if (normalizedUri) {
      counts.set(normalizedUri, (counts.get(normalizedUri) ?? 0) + 1);
    }
    return counts;
  }, new Map<string, number>());
  const nowIso = new Date().toISOString();
  const activeItems = await fetchLobbyQueueItems({
    lobbyId: args.lobbyId,
    statuses: ["approved"],
    admin,
  });
  const activeMirrorItems = activeItems
    .filter((item) => (
      item.source_type === "spotify_mirror"
      && item.approval_state === "approved"
      && (item.playback_state === "queued" || item.playback_state === "playing")
    ))
    .sort((left, right) => {
      const leftPosition = left.display_position ?? left.queue_position ?? Number.MAX_SAFE_INTEGER;
      const rightPosition = right.display_position ?? right.queue_position ?? Number.MAX_SAFE_INTEGER;
      if (leftPosition !== rightPosition) {
        return leftPosition - rightPosition;
      }
      return left.created_at.localeCompare(right.created_at);
    });
  const staleMirrorItems: DiscordSpotifyQueueItemRow[] = [];

  activeMirrorItems.forEach((item) => {
    const normalizedUri = item.spotify_uri.toLowerCase();
    const remainingCount = activeUriCounts.get(normalizedUri) ?? 0;
    if (remainingCount > 0) {
      activeUriCounts.set(normalizedUri, remainingCount - 1);
      return;
    }

    staleMirrorItems.push(item);
  });

  await Promise.all(staleMirrorItems.map((item) => updateQueueItem(item.id, {
    status: "skipped",
    playback_state: "cleared",
    cleared_reason: "mirror_missing_from_latest_snapshot",
    skipped_at: nowIso,
    updated_at: nowIso,
  }, admin)));

  return staleMirrorItems.length;
}

export async function suggestDiscordSpotifyQueueItem(args: {
  lobbyId: string;
  spotifyUrlOrUri: string;
  suggestedByDiscordUserId: string;
  suggestedBySpotifyUserId?: string | null;
  approvalMode?: DiscordSpotifyApprovalMode;
  sourceType?: Exclude<DiscordSpotifyQueueSourceType, "spotify_mirror">;
  admin?: SpotifyQueueAdminClient;
}): Promise<DiscordSpotifyQueueItemRow> {
  const admin = args.admin ?? supabaseAdmin();
  const reference = parseSpotifyTrackReference(args.spotifyUrlOrUri);
  const metadata = await fetchSpotifyTrackMetadata(reference.trackId);
  const nowIso = new Date().toISOString();
  const approvalMode = args.approvalMode ?? "auto_approve_jam_ready";
  const sourceType = args.sourceType ?? "discord_link";
  const approved = approvalMode === "auto_approve_jam_ready" || approvalMode === "host_only";
  const queuePosition = approved ? await getNextQueuePosition(args.lobbyId, admin) : null;

  return insertQueueItem({
    lobby_id: args.lobbyId,
    status: approved ? "approved" : "pending",
    source_type: sourceType,
    approval_state: approved ? "approved" : "pending",
    playback_state: "queued",
    spotify_uri: reference.spotifyUri,
    spotify_url: reference.spotifyUrl,
    track_title: metadata?.trackTitle ?? null,
    artist_name: metadata?.artistName ?? null,
    album_name: metadata?.albumName ?? null,
    duration_ms: metadata?.durationMs ?? null,
    suggested_by_discord_user_id: args.suggestedByDiscordUserId,
    suggested_by_spotify_user_id: args.suggestedBySpotifyUserId ?? null,
    approved_by_discord_user_id: approved ? args.suggestedByDiscordUserId : null,
    queue_position: queuePosition,
    display_position: queuePosition,
    dedupe_key: buildDiscordSpotifyQueueDedupeKey({
      lobbyId: args.lobbyId,
      spotifyUri: reference.spotifyUri,
      sourceType,
    }),
    approved_at: approved ? nowIso : null,
    created_at: nowIso,
    updated_at: nowIso,
  }, admin);
}

export async function findDiscordSpotifyQueueItemByIdOrPrefix(args: {
  queueItemIdOrPrefix: string;
  lobbyId: string;
  admin?: SpotifyQueueAdminClient;
}): Promise<DiscordSpotifyQueueItemRow | null> {
  const admin = args.admin ?? supabaseAdmin();
  const normalized = String(args.queueItemIdOrPrefix ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(normalized)) {
    const exact = await fetchQueueItemById(normalized, admin);
    if (exact?.lobby_id === args.lobbyId) {
      return exact;
    }
  }

  const items = await fetchLobbyQueueItems({
    lobbyId: args.lobbyId,
    admin,
  });

  const matches = items.filter((item) => item.id.toLowerCase().startsWith(normalized));
  return matches.length === 1 ? matches[0] ?? null : null;
}

async function getNextQueuePosition(lobbyId: string, admin: SpotifyQueueAdminClient): Promise<number> {
  const items = await fetchLobbyQueueItems({ lobbyId, admin });
  const maxPosition = items.reduce((highest, item) => (
    typeof item.display_position === "number" && item.display_position > highest
      ? item.display_position
      : typeof item.queue_position === "number" && item.queue_position > highest
        ? item.queue_position
        : highest
  ), 0);
  return maxPosition + 1;
}

export async function approveDiscordSpotifyQueueItem(args: {
  queueItemIdOrPrefix: string;
  lobbyId: string;
  approvedByDiscordUserId: string;
  admin?: SpotifyQueueAdminClient;
}): Promise<DiscordSpotifyQueueItemRow> {
  const admin = args.admin ?? supabaseAdmin();
  const item = await findDiscordSpotifyQueueItemByIdOrPrefix({
    queueItemIdOrPrefix: args.queueItemIdOrPrefix,
    lobbyId: args.lobbyId,
    admin,
  });

  if (!item) {
    throw new Error("Queue item not found.");
  }
  if (item.approval_state !== "pending") {
    throw new Error("Only pending suggestions can be approved.");
  }

  const nowIso = new Date().toISOString();
  const queuePosition = await getNextQueuePosition(args.lobbyId, admin);
  return updateQueueItem(item.id, {
    status: "approved",
    approval_state: "approved",
    playback_state: "queued",
    approved_by_discord_user_id: args.approvedByDiscordUserId,
    queue_position: queuePosition,
    display_position: queuePosition,
    approved_at: nowIso,
    updated_at: nowIso,
  }, admin);
}

export async function rejectDiscordSpotifyQueueItem(args: {
  queueItemIdOrPrefix: string;
  lobbyId: string;
  rejectedByDiscordUserId: string;
  reason?: string | null;
  admin?: SpotifyQueueAdminClient;
}): Promise<DiscordSpotifyQueueItemRow> {
  const admin = args.admin ?? supabaseAdmin();
  const item = await findDiscordSpotifyQueueItemByIdOrPrefix({
    queueItemIdOrPrefix: args.queueItemIdOrPrefix,
    lobbyId: args.lobbyId,
    admin,
  });

  if (!item) {
    throw new Error("Queue item not found.");
  }
  if (item.approval_state !== "pending") {
    throw new Error("Only pending suggestions can be rejected.");
  }

  const nowIso = new Date().toISOString();
  return updateQueueItem(item.id, {
    status: "rejected",
    approval_state: "rejected",
    rejected_by_discord_user_id: args.rejectedByDiscordUserId,
    rejection_reason: normalizeReason(args.reason),
    rejected_at: nowIso,
    updated_at: nowIso,
  }, admin);
}

export async function removeDiscordSpotifyQueueItem(args: {
  queueItemIdOrPrefix: string;
  lobbyId: string;
  removedByDiscordUserId: string;
  reason?: string | null;
  admin?: SpotifyQueueAdminClient;
}): Promise<DiscordSpotifyQueueItemRow> {
  const admin = args.admin ?? supabaseAdmin();
  const item = await findDiscordSpotifyQueueItemByIdOrPrefix({
    queueItemIdOrPrefix: args.queueItemIdOrPrefix,
    lobbyId: args.lobbyId,
    admin,
  });

  if (!item) {
    throw new Error("Queue item not found.");
  }
  if (item.approval_state !== "pending" && item.approval_state !== "approved") {
    throw new Error("Only pending or approved queue items can be removed.");
  }

  const nowIso = new Date().toISOString();
  return updateQueueItem(item.id, {
    status: "removed",
    approval_state: "removed",
    playback_state: "cleared",
    removed_by_discord_user_id: args.removedByDiscordUserId,
    removal_reason: normalizeReason(args.reason),
    cleared_reason: normalizeReason(args.reason) ?? "removed",
    removed_at: nowIso,
    updated_at: nowIso,
  }, admin);
}

export async function markDiscordSpotifyQueueItemPlaying(args: {
  queueItemId: string;
  lobbyId: string;
  admin?: SpotifyQueueAdminClient;
}): Promise<DiscordSpotifyQueueItemRow> {
  const admin = args.admin ?? supabaseAdmin();
  const nowIso = new Date().toISOString();
  const activeItems = await fetchLobbyQueueItems({
    lobbyId: args.lobbyId,
    statuses: ["approved"],
    admin,
  });

  await Promise.all(activeItems
    .filter((item) => item.playback_state === "playing" && item.id !== args.queueItemId)
    .map((item) => updateQueueItem(item.id, {
      status: "played",
      playback_state: "played",
      played_at: nowIso,
      playback_finished_at: nowIso,
      updated_at: nowIso,
    }, admin)));

  return updateQueueItem(args.queueItemId, {
    status: "approved",
    approval_state: "approved",
    playback_state: "playing",
    playback_started_at: nowIso,
    updated_at: nowIso,
  }, admin);
}

export async function clearActiveDiscordSpotifyQueueItems(args: {
  lobbyId: string;
  reason: "room_closed" | "host_disconnect";
  admin?: SpotifyQueueAdminClient;
}): Promise<void> {
  const admin = args.admin ?? supabaseAdmin();
  const nowIso = new Date().toISOString();
  const items = await fetchLobbyQueueItems({
    lobbyId: args.lobbyId,
    statuses: ["pending", "approved"],
    admin,
  });

  await Promise.all(items
    .filter((item) => (
      item.approval_state === "pending"
      || item.approval_state === "approved"
      || item.playback_state === "queued"
      || item.playback_state === "playing"
    ))
    .map((item) => updateQueueItem(item.id, {
      status: item.approval_state === "pending" ? "removed" : "skipped",
      approval_state: item.approval_state === "pending" ? "removed" : item.approval_state,
      playback_state: "cleared",
      cleared_reason: args.reason,
      removed_at: item.approval_state === "pending" ? nowIso : item.removed_at,
      skipped_at: item.approval_state === "approved" ? nowIso : item.skipped_at,
      updated_at: nowIso,
    }, admin)));
}
