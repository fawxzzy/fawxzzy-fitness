import "server-only";

import { SPOTIFY_PHASE_4_PLAYBACK_SCOPES } from "@/lib/spotify/oauth";
import { SPOTIFY_TOKEN_ENCRYPTION_KEY } from "@/lib/env";
import { decryptSpotifySecret, encryptSpotifySecret } from "@/lib/spotify/crypto";
import type { SpotifyProduct, SpotifyProfileSnapshot } from "@/lib/spotify/profile";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type DiscordSpotifyConnectionRow = {
  id: string;
  discord_user_id: string;
  spotify_user_id: string;
  spotify_display_name: string | null;
  spotify_product: SpotifyProduct;
  is_premium: boolean;
  encrypted_refresh_token: string;
  access_token_expires_at: string | null;
  scopes: string[];
  connected_at: string;
  last_checked_at: string | null;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string;
};

type SpotifyConnectionsAdminClient = {
  from: (table: "discord_spotify_connections") => any;
};

const DISCORD_SPOTIFY_CONNECTION_SELECT = [
  "id",
  "discord_user_id",
  "spotify_user_id",
  "spotify_display_name",
  "spotify_product",
  "is_premium",
  "encrypted_refresh_token",
  "access_token_expires_at",
  "scopes",
  "connected_at",
  "last_checked_at",
  "disconnected_at",
  "created_at",
  "updated_at",
].join(", ");

function normalizeSpotifyScopes(scopes: string[]): string[] {
  return [...new Set(
    scopes
      .map((scope) => scope.trim())
      .filter(Boolean),
  )];
}

const SPOTIFY_DISCONNECTED_SENTINEL = "__spotify_disconnected__";

function coerceSpotifyProduct(product: unknown): SpotifyProduct {
  if (product === "premium" || product === "free" || product === "open" || product === "unknown") {
    return product;
  }

  return "unknown";
}

function coerceSpotifyConnectionRow(row: unknown): DiscordSpotifyConnectionRow | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const candidate = row as Record<string, unknown>;
  if (
    typeof candidate.id !== "string"
    || typeof candidate.discord_user_id !== "string"
    || typeof candidate.spotify_user_id !== "string"
    || typeof candidate.encrypted_refresh_token !== "string"
    || typeof candidate.connected_at !== "string"
    || typeof candidate.created_at !== "string"
    || typeof candidate.updated_at !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    discord_user_id: candidate.discord_user_id,
    spotify_user_id: candidate.spotify_user_id,
    spotify_display_name: typeof candidate.spotify_display_name === "string" ? candidate.spotify_display_name : null,
    spotify_product: coerceSpotifyProduct(candidate.spotify_product),
    is_premium: candidate.is_premium === true,
    encrypted_refresh_token: candidate.encrypted_refresh_token,
    access_token_expires_at: typeof candidate.access_token_expires_at === "string" ? candidate.access_token_expires_at : null,
    scopes: Array.isArray(candidate.scopes)
      ? candidate.scopes.filter((scope): scope is string => typeof scope === "string")
      : [],
    connected_at: candidate.connected_at,
    last_checked_at: typeof candidate.last_checked_at === "string" ? candidate.last_checked_at : null,
    disconnected_at: typeof candidate.disconnected_at === "string" ? candidate.disconnected_at : null,
    created_at: candidate.created_at,
    updated_at: candidate.updated_at,
  };
}

function buildSpotifyDisconnectSentinel(): string {
  return encryptSpotifySecret(SPOTIFY_DISCONNECTED_SENTINEL, SPOTIFY_TOKEN_ENCRYPTION_KEY());
}

export function encryptSpotifyRefreshToken(refreshToken: string): string {
  return encryptSpotifySecret(refreshToken, SPOTIFY_TOKEN_ENCRYPTION_KEY());
}

export function decryptSpotifyRefreshToken(ciphertext: string): string {
  return decryptSpotifySecret(ciphertext, SPOTIFY_TOKEN_ENCRYPTION_KEY());
}

export function hasSpotifyPlaybackScopes(scopes: string[] | null | undefined): boolean {
  const availableScopes = new Set(
    Array.isArray(scopes)
      ? scopes.map((scope) => scope.trim()).filter(Boolean)
      : [],
  );

  return SPOTIFY_PHASE_4_PLAYBACK_SCOPES.every((scope) => availableScopes.has(scope));
}

export function buildSpotifyStatusCopy(connection: DiscordSpotifyConnectionRow | null): string {
  if (!connection || connection.disconnected_at) {
    return "Spotify is not connected yet. Use /spotify connect.";
  }

  if (connection.is_premium) {
    return "Spotify connected. Premium verified. You are Jam Ready.";
  }

  if (connection.spotify_product === "free" || connection.spotify_product === "open") {
    return "Spotify connected, but this account is not Premium. You can view Spotify Club, but Jam Ready features require Premium.";
  }

  return "Spotify connected, but Premium status could not be confirmed. Try reconnecting later.";
}

export function buildSpotifyMissingPlaybackPermissionsCopy(): string {
  return "Spotify is connected, but playback permissions are missing. Reconnect Spotify to enable playback handoff.";
}

export function buildSpotifyReconnectPlaybackCopy(): string {
  return "Spotify playback access expired. Reconnect Spotify to continue playback handoff.";
}

export function buildSpotifyNoActiveDeviceCopy(): string {
  return "Open Spotify on your phone, desktop, or browser first, then try again.";
}

export function buildSpotifyPlaybackReadyCopy(deviceName?: string | null): string {
  const trimmedDeviceName = typeof deviceName === "string" ? deviceName.trim() : "";
  if (trimmedDeviceName) {
    return `Spotify connected. Premium verified. Playback Ready on ${trimmedDeviceName}.`;
  }

  return "Spotify connected. Premium verified. Playback Ready.";
}

export async function getDiscordSpotifyConnection(
  discordUserId: string,
  admin: SpotifyConnectionsAdminClient = supabaseAdmin(),
): Promise<DiscordSpotifyConnectionRow | null> {
  const { data, error } = await admin
    .from("discord_spotify_connections")
    .select(DISCORD_SPOTIFY_CONNECTION_SELECT)
    .eq("discord_user_id", discordUserId)
    .is("disconnected_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Spotify connection: ${error.message}`);
  }

  return coerceSpotifyConnectionRow(data);
}

export async function upsertDiscordSpotifyConnection(args: {
  discordUserId: string;
  profile: SpotifyProfileSnapshot;
  encryptedRefreshToken: string;
  accessTokenExpiresAt: string | null;
  scopes: string[];
  admin?: SpotifyConnectionsAdminClient;
}): Promise<DiscordSpotifyConnectionRow> {
  const admin = args.admin ?? supabaseAdmin();
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("discord_spotify_connections")
    .upsert({
      discord_user_id: args.discordUserId,
      spotify_user_id: args.profile.spotifyUserId,
      spotify_display_name: args.profile.spotifyDisplayName,
      spotify_product: args.profile.spotifyProduct,
      is_premium: args.profile.isPremium,
      encrypted_refresh_token: args.encryptedRefreshToken,
      access_token_expires_at: args.accessTokenExpiresAt,
      scopes: normalizeSpotifyScopes(args.scopes),
      connected_at: nowIso,
      last_checked_at: nowIso,
      disconnected_at: null,
      updated_at: nowIso,
    }, {
      onConflict: "discord_user_id",
    })
    .select(DISCORD_SPOTIFY_CONNECTION_SELECT)
    .single();

  const row = coerceSpotifyConnectionRow(data);
  if (error || !row) {
    throw new Error(`Failed to save Spotify connection: ${error?.message ?? "missing row"}`);
  }

  return row;
}

export async function disconnectDiscordSpotifyConnection(
  discordUserId: string,
  admin: SpotifyConnectionsAdminClient = supabaseAdmin(),
): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await admin
    .from("discord_spotify_connections")
    .update({
      encrypted_refresh_token: buildSpotifyDisconnectSentinel(),
      access_token_expires_at: null,
      scopes: [],
      is_premium: false,
      spotify_product: "unknown",
      last_checked_at: nowIso,
      disconnected_at: nowIso,
      updated_at: nowIso,
    })
    .eq("discord_user_id", discordUserId)
    .is("disconnected_at", null);

  if (error) {
    throw new Error(`Failed to disconnect Spotify connection: ${error.message}`);
  }
}

export async function refreshDiscordSpotifyConnectionSession(args: {
  connectionId: string;
  accessTokenExpiresAt: string | null;
  encryptedRefreshToken?: string | null;
  scopes?: string[] | null;
  admin?: SpotifyConnectionsAdminClient;
}): Promise<void> {
  const admin = args.admin ?? supabaseAdmin();
  const nowIso = new Date().toISOString();
  const values: Record<string, unknown> = {
    access_token_expires_at: args.accessTokenExpiresAt,
    last_checked_at: nowIso,
    updated_at: nowIso,
  };

  if (typeof args.encryptedRefreshToken === "string" && args.encryptedRefreshToken.trim()) {
    values.encrypted_refresh_token = args.encryptedRefreshToken;
  }

  if (Array.isArray(args.scopes) && args.scopes.length > 0) {
    values.scopes = normalizeSpotifyScopes(args.scopes);
  }

  const { error } = await admin
    .from("discord_spotify_connections")
    .update(values)
    .eq("id", args.connectionId)
    .is("disconnected_at", null);

  if (error) {
    throw new Error(`Failed to refresh Spotify connection session: ${error.message}`);
  }
}
