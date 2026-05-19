import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNoActiveDeviceMessage,
  getAvailableSpotifyDevices,
  getActiveSpotifyDevice,
  SpotifyPlayerApiError,
  startSpotifyPlaybackOnDevice,
} from "./player.ts";
import {
  buildSpotifyReconnectPlaybackCopy,
  encryptSpotifyRefreshToken,
} from "./tokens.ts";

const baseConnection = {
  id: "connection-1",
  discord_user_id: "123456789012345678",
  spotify_user_id: "spotify-user-1",
  spotify_display_name: "Fawxzzy",
  spotify_product: "premium" as const,
  is_premium: true,
  encrypted_refresh_token: "ciphertext",
  access_token_expires_at: null,
  scopes: ["user-read-private", "user-read-playback-state", "user-modify-playback-state"],
  connected_at: "2026-05-19T00:00:00.000Z",
  last_checked_at: "2026-05-19T00:00:00.000Z",
  disconnected_at: null,
  created_at: "2026-05-19T00:00:00.000Z",
  updated_at: "2026-05-19T00:00:00.000Z",
};

test("getActiveSpotifyDevice selects the active unrestricted device with an id", () => {
  assert.deepEqual(
    getActiveSpotifyDevice([
      {
        id: "restricted-device",
        is_active: true,
        is_private_session: false,
        is_restricted: true,
        name: "Restricted",
        type: "Computer",
      },
      {
        id: "active-device",
        is_active: true,
        is_private_session: false,
        is_restricted: false,
        name: "Web Player",
        type: "Computer",
      },
    ])?.id,
    "active-device",
  );
});

test("buildNoActiveDeviceMessage keeps the recovery copy clear", () => {
  assert.equal(
    buildNoActiveDeviceMessage(),
    "Open Spotify on your phone, desktop, or browser first, then try again.",
  );
});

test("startSpotifyPlaybackOnDevice rejects missing device ids before any API call", async () => {
  await assert.rejects(
    startSpotifyPlaybackOnDevice({
      connection: baseConnection,
      deviceId: "   ",
      spotifyUris: ["spotify:track:3n3Ppam7vgaVa1iaRUc9Lp"],
    }),
    (error: unknown) => (
      error instanceof SpotifyPlayerApiError
      && error.code === "SPOTIFY_NO_ACTIVE_DEVICE"
    ),
  );
});

test("startSpotifyPlaybackOnDevice rejects an empty approved queue before any API call", async () => {
  await assert.rejects(
    startSpotifyPlaybackOnDevice({
      connection: baseConnection,
      deviceId: "active-device",
      spotifyUris: [],
    }),
    (error: unknown) => (
      error instanceof SpotifyPlayerApiError
      && error.message === "No approved tracks are queued yet."
    ),
  );
});

test("getAvailableSpotifyDevices prompts reconnect when Spotify invalidates the stored refresh token", async () => {
  process.env.SPOTIFY_CLIENT_ID = "spotify-client-id";
  process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY = "spotify-token-secret";

  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({
    error: "invalid_grant",
  }), {
    status: 400,
    headers: {
      "content-type": "application/json",
    },
  });

  try {
    await assert.rejects(
      getAvailableSpotifyDevices({
        ...baseConnection,
        encrypted_refresh_token: encryptSpotifyRefreshToken("refresh-token"),
      }),
      (error: unknown) => (
        error instanceof SpotifyPlayerApiError
        && error.code === "SPOTIFY_RECONNECT_REQUIRED"
        && error.message === buildSpotifyReconnectPlaybackCopy()
      ),
    );
  } finally {
    global.fetch = originalFetch;
  }
});
