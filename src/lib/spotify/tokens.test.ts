import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSpotifyMissingPlaybackPermissionsCopy,
  buildSpotifyNoActiveDeviceCopy,
  buildSpotifyPlaybackReadyCopy,
  buildSpotifyReconnectPlaybackCopy,
  buildSpotifyStatusCopy,
  disconnectDiscordSpotifyConnection,
  encryptSpotifyRefreshToken,
  hasSpotifyPlaybackScopes,
  refreshDiscordSpotifyConnectionSession,
} from "./tokens.ts";

test("Spotify status copy covers Premium, free, unknown, and disconnected states", () => {
  assert.equal(
    buildSpotifyStatusCopy({
      id: "1",
      discord_user_id: "123456789012345678",
      spotify_user_id: "spotify-1",
      spotify_display_name: "Fawxzzy",
      spotify_product: "premium",
      is_premium: true,
      encrypted_refresh_token: "ciphertext",
      access_token_expires_at: null,
      scopes: ["user-read-private"],
      connected_at: "2026-05-18T00:00:00.000Z",
      last_checked_at: "2026-05-18T00:00:00.000Z",
      disconnected_at: null,
      created_at: "2026-05-18T00:00:00.000Z",
      updated_at: "2026-05-18T00:00:00.000Z",
    }),
    "Spotify connected. Premium verified. You are Jam Ready.",
  );
  assert.equal(
    buildSpotifyStatusCopy({
      id: "2",
      discord_user_id: "123456789012345678",
      spotify_user_id: "spotify-2",
      spotify_display_name: "Fawxzzy",
      spotify_product: "free",
      is_premium: false,
      encrypted_refresh_token: "ciphertext",
      access_token_expires_at: null,
      scopes: ["user-read-private"],
      connected_at: "2026-05-18T00:00:00.000Z",
      last_checked_at: "2026-05-18T00:00:00.000Z",
      disconnected_at: null,
      created_at: "2026-05-18T00:00:00.000Z",
      updated_at: "2026-05-18T00:00:00.000Z",
    }),
    "Spotify connected, but this account is not Premium. You can view Music Sesh, but Jam Ready features require Premium.",
  );
  assert.equal(
    buildSpotifyStatusCopy({
      id: "3",
      discord_user_id: "123456789012345678",
      spotify_user_id: "spotify-3",
      spotify_display_name: "Fawxzzy",
      spotify_product: "unknown",
      is_premium: false,
      encrypted_refresh_token: "ciphertext",
      access_token_expires_at: null,
      scopes: ["user-read-private"],
      connected_at: "2026-05-18T00:00:00.000Z",
      last_checked_at: "2026-05-18T00:00:00.000Z",
      disconnected_at: null,
      created_at: "2026-05-18T00:00:00.000Z",
      updated_at: "2026-05-18T00:00:00.000Z",
    }),
    "Spotify connected, but Premium status could not be confirmed. Try reconnecting later.",
  );
  assert.equal(buildSpotifyStatusCopy(null), "Spotify is not connected yet. Use /spotify connect.");
});

test("Spotify disconnect tombstones token state without deleting history", async () => {
  process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY = "spotify-token-encryption-secret";

  const refreshTokenCiphertext = encryptSpotifyRefreshToken("refresh-token");
  const observed = {
    values: null as Record<string, unknown> | null,
    filters: [] as Array<[string, unknown]>,
  };

  const admin = {
    from() {
      return {
        update(values: Record<string, unknown>) {
          observed.values = values;

          return {
            eq(column: string, value: unknown) {
              observed.filters.push([column, value]);

              return {
                is(columnName: string, valueForIs: unknown) {
                  observed.filters.push([columnName, valueForIs]);
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
      };
    },
  };

  await disconnectDiscordSpotifyConnection("123456789012345678", admin as never);

  assert.equal(observed.filters[0]?.[0], "discord_user_id");
  assert.equal(observed.filters[0]?.[1], "123456789012345678");
  assert.equal(observed.filters[1]?.[0], "disconnected_at");
  assert.equal(observed.filters[1]?.[1], null);
  assert.equal(typeof observed.values?.encrypted_refresh_token, "string");
  assert.notEqual(observed.values?.encrypted_refresh_token, refreshTokenCiphertext);
  assert.equal(observed.values?.is_premium, false);
  assert.equal(observed.values?.spotify_product, "unknown");
});

test("Spotify playback helpers cover scope gating and device status copy", () => {
  assert.equal(
    hasSpotifyPlaybackScopes([
      "user-read-private",
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-currently-playing",
    ]),
    true,
  );
  assert.equal(
    hasSpotifyPlaybackScopes([
      "user-read-private",
      "user-read-playback-state",
    ]),
    false,
  );
  assert.equal(
    buildSpotifyMissingPlaybackPermissionsCopy(),
    "Spotify is connected, but live queue permissions are missing. Upgrade Spotify access to enable playback handoff and host queue mirroring.",
  );
  assert.equal(
    buildSpotifyReconnectPlaybackCopy(),
    "Spotify playback access expired. Reconnect Spotify to continue playback handoff.",
  );
  assert.equal(
    buildSpotifyNoActiveDeviceCopy(),
    "Open Spotify on your phone, desktop, or browser first, then try again.",
  );
  assert.equal(
    buildSpotifyPlaybackReadyCopy("Web Player"),
    "Spotify connected. Premium verified. Playback Ready on Web Player.",
  );
  assert.equal(
    buildSpotifyPlaybackReadyCopy(),
    "Spotify connected. Premium verified. Playback Ready.",
  );
});

test("Spotify session refresh persists rotated refresh tokens and scopes", async () => {
  const observed = {
    values: null as Record<string, unknown> | null,
    filters: [] as Array<[string, unknown]>,
  };

  const admin = {
    from() {
      return {
        update(values: Record<string, unknown>) {
          observed.values = values;

          return {
            eq(column: string, value: unknown) {
              observed.filters.push([column, value]);

              return {
                is(columnName: string, valueForIs: unknown) {
                  observed.filters.push([columnName, valueForIs]);
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
      };
    },
  };

  await refreshDiscordSpotifyConnectionSession({
    connectionId: "connection-1",
    accessTokenExpiresAt: "2026-05-19T17:00:00.000Z",
    encryptedRefreshToken: "ciphertext-rotated",
    scopes: ["user-read-private", "user-read-playback-state", "user-modify-playback-state"],
    admin: admin as never,
  });

  assert.equal(observed.filters[0]?.[0], "id");
  assert.equal(observed.filters[0]?.[1], "connection-1");
  assert.equal(observed.filters[1]?.[0], "disconnected_at");
  assert.equal(observed.filters[1]?.[1], null);
  assert.equal(observed.values?.encrypted_refresh_token, "ciphertext-rotated");
  assert.equal(observed.values?.access_token_expires_at, "2026-05-19T17:00:00.000Z");
  assert.deepEqual(observed.values?.scopes, [
    "user-read-private",
    "user-read-playback-state",
    "user-modify-playback-state",
  ]);
});
