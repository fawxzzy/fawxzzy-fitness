import "server-only";

import {
  refreshSpotifyAccessToken,
} from "@/lib/spotify/oauth";
import {
  buildSpotifyReconnectPlaybackCopy,
  decryptSpotifyRefreshToken,
  encryptSpotifyRefreshToken,
  hasSpotifyPlaybackScopes,
  refreshDiscordSpotifyConnectionSession,
  type DiscordSpotifyConnectionRow,
} from "@/lib/spotify/tokens";

const SPOTIFY_PLAYER_DEVICES_ENDPOINT = "https://api.spotify.com/v1/me/player/devices";
const SPOTIFY_PLAYER_STATE_ENDPOINT = "https://api.spotify.com/v1/me/player";

export type SpotifyAvailableDevice = {
  id: string | null;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
};

export type SpotifyCurrentPlaybackState = {
  device: SpotifyAvailableDevice | null;
  is_playing: boolean | null;
};

type SpotifyPlayerApiErrorCode =
  | "SPOTIFY_PLAYBACK_SCOPE_REQUIRED"
  | "SPOTIFY_RECONNECT_REQUIRED"
  | "SPOTIFY_NO_ACTIVE_DEVICE"
  | "SPOTIFY_PLAYER_RATE_LIMITED"
  | "SPOTIFY_PLAYER_API_FAILED";

export class SpotifyPlayerApiError extends Error {
  code: SpotifyPlayerApiErrorCode;
  status: number;

  constructor(args: {
    code: SpotifyPlayerApiErrorCode;
    message: string;
    status: number;
  }) {
    super(args.message);
    this.code = args.code;
    this.status = args.status;
  }
}

function coerceSpotifyAvailableDevice(value: unknown): SpotifyAvailableDevice | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.name !== "string"
    || typeof candidate.type !== "string"
    || typeof candidate.is_active !== "boolean"
    || typeof candidate.is_private_session !== "boolean"
    || typeof candidate.is_restricted !== "boolean"
  ) {
    return null;
  }

  return {
    id: typeof candidate.id === "string" ? candidate.id : null,
    is_active: candidate.is_active,
    is_private_session: candidate.is_private_session,
    is_restricted: candidate.is_restricted,
    name: candidate.name,
    type: candidate.type,
  };
}

function buildSpotifyPlayerApiError(args: {
  status: number;
  fallbackMessage: string;
  noActiveDeviceMessage?: string;
}): SpotifyPlayerApiError {
  if (args.status === 401 || args.status === 403) {
    return new SpotifyPlayerApiError({
      code: "SPOTIFY_PLAYBACK_SCOPE_REQUIRED",
      status: args.status,
      message: "Spotify is connected, but playback permissions are missing. Reconnect Spotify to enable playback handoff.",
    });
  }

  if (args.status === 404) {
    return new SpotifyPlayerApiError({
      code: "SPOTIFY_NO_ACTIVE_DEVICE",
      status: args.status,
      message: args.noActiveDeviceMessage ?? buildNoActiveDeviceMessage(),
    });
  }

  if (args.status === 429) {
    return new SpotifyPlayerApiError({
      code: "SPOTIFY_PLAYER_RATE_LIMITED",
      status: args.status,
      message: "Spotify is rate-limiting playback requests right now. Try again in a moment.",
    });
  }

  return new SpotifyPlayerApiError({
    code: "SPOTIFY_PLAYER_API_FAILED",
    status: args.status,
    message: args.fallbackMessage,
  });
}

export async function buildSpotifyPlayerAccessToken(connection: DiscordSpotifyConnectionRow): Promise<string> {
  try {
    const refreshToken = decryptSpotifyRefreshToken(connection.encrypted_refresh_token);
    const tokenResult = await refreshSpotifyAccessToken({
      refreshToken,
    });

    await refreshDiscordSpotifyConnectionSession({
      connectionId: connection.id,
      accessTokenExpiresAt: tokenResult.expiresAt,
      encryptedRefreshToken: tokenResult.refreshToken
        ? encryptSpotifyRefreshToken(tokenResult.refreshToken)
        : null,
      scopes: tokenResult.scopes,
    });

    return tokenResult.accessToken;
  } catch (error) {
    if (error instanceof Error && /invalid_grant/i.test(error.message)) {
      throw new SpotifyPlayerApiError({
        code: "SPOTIFY_RECONNECT_REQUIRED",
        status: 401,
        message: buildSpotifyReconnectPlaybackCopy(),
      });
    }

    throw error;
  }
}

async function spotifyPlayerRequest(args: {
  connection: DiscordSpotifyConnectionRow;
  url: string;
  method: "GET" | "PUT";
  body?: Record<string, unknown>;
  fallbackMessage: string;
  noActiveDeviceMessage?: string;
  accessToken?: string;
}): Promise<Response> {
  if (!hasSpotifyPlaybackScopes(connectionScopesFromConnection(args.connection))) {
    throw new SpotifyPlayerApiError({
      code: "SPOTIFY_PLAYBACK_SCOPE_REQUIRED",
      status: 403,
      message: "Spotify is connected, but playback permissions are missing. Reconnect Spotify to enable playback handoff.",
    });
  }

  const accessToken = args.accessToken?.trim() || await buildSpotifyPlayerAccessToken(args.connection);
  const response = await fetch(args.url, {
    method: args.method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(args.body ? { "Content-Type": "application/json" } : {}),
    },
    body: args.body ? JSON.stringify(args.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw buildSpotifyPlayerApiError({
      status: response.status,
      fallbackMessage: args.fallbackMessage,
      noActiveDeviceMessage: args.noActiveDeviceMessage,
    });
  }

  return response;
}

function connectionScopesFromConnection(connection: DiscordSpotifyConnectionRow): string[] {
  return Array.isArray(connection.scopes) ? connection.scopes : [];
}

export function getActiveSpotifyDevice(devices: SpotifyAvailableDevice[]): SpotifyAvailableDevice | null {
  return devices.find((device) => (
    Boolean(device.id)
    && device.is_active
    && !device.is_restricted
  )) ?? null;
}

export function buildNoActiveDeviceMessage(): string {
  return "Open Spotify on your phone, desktop, or browser first, then try again.";
}

export async function getAvailableSpotifyDevices(
  connection: DiscordSpotifyConnectionRow,
  accessToken?: string,
): Promise<SpotifyAvailableDevice[]> {
  const response = await spotifyPlayerRequest({
    connection,
    url: SPOTIFY_PLAYER_DEVICES_ENDPOINT,
    method: "GET",
    fallbackMessage: "Spotify playback readiness could not be checked right now. Try again in a moment.",
    accessToken,
  });

  const body = await response.json().catch(() => null) as {
    devices?: unknown[];
  } | null;

  if (!body || !Array.isArray(body.devices)) {
    throw new SpotifyPlayerApiError({
      code: "SPOTIFY_PLAYER_API_FAILED",
      status: 500,
      message: "Spotify playback readiness could not be checked right now. Try again in a moment.",
    });
  }

  return body.devices
    .map((device) => coerceSpotifyAvailableDevice(device))
    .filter((device): device is SpotifyAvailableDevice => Boolean(device));
}

export async function getCurrentPlaybackState(
  connection: DiscordSpotifyConnectionRow,
  accessToken?: string,
): Promise<SpotifyCurrentPlaybackState> {
  const response = await spotifyPlayerRequest({
    connection,
    url: SPOTIFY_PLAYER_STATE_ENDPOINT,
    method: "GET",
    fallbackMessage: "Spotify playback state could not be loaded right now. Try again in a moment.",
    accessToken,
  });

  if (response.status === 204) {
    return {
      device: null,
      is_playing: null,
    };
  }

  const body = await response.json().catch(() => null) as {
    device?: unknown;
    is_playing?: unknown;
  } | null;

  return {
    device: coerceSpotifyAvailableDevice(body?.device),
    is_playing: typeof body?.is_playing === "boolean" ? body.is_playing : null,
  };
}

export async function startSpotifyPlaybackOnDevice(args: {
  connection: DiscordSpotifyConnectionRow;
  deviceId: string;
  spotifyUris: string[];
  accessToken?: string;
}): Promise<void> {
  const deviceId = args.deviceId.trim();
  if (!deviceId) {
    throw new SpotifyPlayerApiError({
      code: "SPOTIFY_NO_ACTIVE_DEVICE",
      status: 404,
      message: buildNoActiveDeviceMessage(),
    });
  }

  const spotifyUris = args.spotifyUris.map((uri) => uri.trim()).filter(Boolean);
  if (spotifyUris.length === 0) {
    throw new SpotifyPlayerApiError({
      code: "SPOTIFY_PLAYER_API_FAILED",
      status: 400,
      message: "No approved tracks are queued yet.",
    });
  }

  await spotifyPlayerRequest({
    connection: args.connection,
    url: `${SPOTIFY_PLAYER_STATE_ENDPOINT}/play?device_id=${encodeURIComponent(deviceId)}`,
    method: "PUT",
    body: {
      uris: spotifyUris,
    },
    fallbackMessage: "Spotify playback could not be started right now. Try again in a moment.",
    noActiveDeviceMessage: buildNoActiveDeviceMessage(),
    accessToken: args.accessToken,
  });
}
