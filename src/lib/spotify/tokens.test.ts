import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSpotifyStatusCopy,
  disconnectDiscordSpotifyConnection,
  encryptSpotifyRefreshToken,
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
    "Spotify connected, but this account is not Premium. You can view Spotify Club, but Jam Ready features require Premium.",
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
