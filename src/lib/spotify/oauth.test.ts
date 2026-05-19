import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSpotifyAuthorizationUrl,
  SPOTIFY_PHASE_4_PLAYBACK_SCOPES,
  createSpotifyOAuthState,
  verifySpotifyOAuthState,
} from "./oauth.ts";

test("Spotify OAuth state round-trips signed PKCE state", () => {
  process.env.SPOTIFY_OAUTH_STATE_SECRET = "spotify-oauth-state-secret";

  const state = createSpotifyOAuthState({
    discordUserId: "123456789012345678",
    codeVerifier: "a".repeat(64),
    issuedAt: Date.now(),
  });

  const verified = verifySpotifyOAuthState(state);
  assert.equal(verified.discordUserId, "123456789012345678");
  assert.equal(verified.codeVerifier, "a".repeat(64));
});

test("Spotify OAuth state rejects invalid payloads", () => {
  process.env.SPOTIFY_OAUTH_STATE_SECRET = "spotify-oauth-state-secret";

  assert.throws(() => verifySpotifyOAuthState("invalid-state"), /Invalid Spotify OAuth state/);
});

test("Spotify connect URL includes PKCE challenge and the Phase 1 private profile scope", () => {
  process.env.SPOTIFY_OAUTH_STATE_SECRET = "spotify-oauth-state-secret";
  process.env.SPOTIFY_CLIENT_ID = "spotify-client-id";
  process.env.SPOTIFY_REDIRECT_URI = "https://fitness.example.com/api/spotify/oauth/callback";

  const result = buildSpotifyAuthorizationUrl("123456789012345678");
  const url = new URL(result.authorizationUrl);

  assert.equal(url.origin, "https://accounts.spotify.com");
  assert.equal(url.searchParams.get("client_id"), "spotify-client-id");
  assert.equal(url.searchParams.get("scope"), "user-read-private");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.ok(url.searchParams.get("state"));
  assert.ok(url.searchParams.get("code_challenge"));
});

test("Spotify playback-upgrade URL includes playback scopes without dropping Phase 1 scope", () => {
  process.env.SPOTIFY_OAUTH_STATE_SECRET = "spotify-oauth-state-secret";
  process.env.SPOTIFY_CLIENT_ID = "spotify-client-id";
  process.env.SPOTIFY_REDIRECT_URI = "https://fitness.example.com/api/spotify/oauth/callback";

  const result = buildSpotifyAuthorizationUrl("123456789012345678", {
    includePlaybackScopes: true,
  });
  const url = new URL(result.authorizationUrl);
  const scopes = (url.searchParams.get("scope") ?? "").split(/\s+/).filter(Boolean);

  assert.equal(scopes.includes("user-read-private"), true);
  for (const scope of SPOTIFY_PHASE_4_PLAYBACK_SCOPES) {
    assert.equal(scopes.includes(scope), true);
  }
});
