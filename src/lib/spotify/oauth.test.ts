import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSpotifyAuthorizationUrl,
  buildSpotifyOAuthStartUrl,
  refreshSpotifyAccessToken,
  SPOTIFY_PHASE_4_PLAYBACK_SCOPES,
  createSpotifyOAuthStartToken,
  createSpotifyOAuthState,
  verifySpotifyOAuthStartToken,
  verifySpotifyOAuthState,
} from "./oauth.ts";
import { GET as handleSpotifyOAuthStart } from "@/app/api/spotify/oauth/start/route.ts";

const buildSpotifyOAuthStartRequest = (url: string): Parameters<typeof handleSpotifyOAuthStart>[0] => new Request(url) as Parameters<typeof handleSpotifyOAuthStart>[0];

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

test("Spotify OAuth start token round-trips scope intent and rejects invalid payloads", () => {
  process.env.SPOTIFY_OAUTH_STATE_SECRET = "spotify-oauth-state-secret";

  const token = createSpotifyOAuthStartToken({
    discordUserId: "123456789012345678",
    includeLiveQueueScopes: true,
  });
  const verified = verifySpotifyOAuthStartToken(token);

  assert.equal(verified.discordUserId, "123456789012345678");
  assert.equal(verified.includeLiveQueueScopes, true);
  assert.equal(verified.includePlaybackScopes, false);
  assert.equal(typeof verified.issuedAt, "number");
  assert.throws(() => verifySpotifyOAuthStartToken(`${token}x`), /Invalid Spotify OAuth start token/);
});

test("Spotify OAuth start URL stays short and first-party", () => {
  process.env.SPOTIFY_OAUTH_STATE_SECRET = "spotify-oauth-state-secret";
  process.env.SPOTIFY_REDIRECT_URI = "https://fitness.example.com/api/spotify/oauth/callback";

  const startUrl = buildSpotifyOAuthStartUrl("123456789012345678", {
    includeLiveQueueScopes: true,
  });
  const url = new URL(startUrl);

  assert.equal(url.origin, "https://fitness.example.com");
  assert.equal(url.pathname, "/api/spotify/oauth/start");
  assert.ok(url.searchParams.get("token"));
  assert.equal(startUrl.length <= 512, true);
});

test("Spotify OAuth start URL uses the configured production app host", () => {
  process.env.SPOTIFY_OAUTH_STATE_SECRET = "spotify-oauth-state-secret";
  process.env.SPOTIFY_REDIRECT_URI = "https://fawxzzy-fitness-local.vercel.app/api/spotify/oauth/callback";

  const startUrl = buildSpotifyOAuthStartUrl("123456789012345678", {
    includeLiveQueueScopes: true,
  });
  const url = new URL(startUrl);

  assert.equal(url.origin, "https://fawxzzy-fitness-local.vercel.app");
  assert.equal(url.pathname, "/api/spotify/oauth/start");
  assert.ok(url.searchParams.get("token"));
  assert.equal(startUrl.length <= 512, true);
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

test("Spotify OAuth start route redirects to the full Spotify authorize URL", async () => {
  process.env.SPOTIFY_OAUTH_STATE_SECRET = "spotify-oauth-state-secret";
  process.env.SPOTIFY_CLIENT_ID = "spotify-client-id";
  process.env.SPOTIFY_REDIRECT_URI = "https://fitness.example.com/api/spotify/oauth/callback";

  const token = createSpotifyOAuthStartToken({
    discordUserId: "123456789012345678",
    includeLiveQueueScopes: true,
  });
  const response = handleSpotifyOAuthStart(buildSpotifyOAuthStartRequest(`https://fitness.example.com/api/spotify/oauth/start?token=${encodeURIComponent(token)}`));
  const location = response.headers.get("location") ?? "";
  const url = new URL(location);

  assert.equal(response.status, 302);
  assert.equal(url.origin, "https://accounts.spotify.com");
  assert.equal(url.pathname, "/authorize");
  assert.equal(url.searchParams.get("client_id"), "spotify-client-id");
  assert.match(url.searchParams.get("scope") ?? "", /user-read-currently-playing/);
  assert.match(url.searchParams.get("scope") ?? "", /user-modify-playback-state/);
  assert.ok(url.searchParams.get("state"));
  assert.ok(url.searchParams.get("code_challenge"));
});

test("Spotify OAuth start route rejects invalid and expired tokens", async () => {
  process.env.SPOTIFY_OAUTH_STATE_SECRET = "spotify-oauth-state-secret";
  process.env.SPOTIFY_REDIRECT_URI = "https://fitness.example.com/api/spotify/oauth/callback";

  const missingTokenResponse = handleSpotifyOAuthStart(buildSpotifyOAuthStartRequest("https://fitness.example.com/api/spotify/oauth/start"));
  const missingTokenBody = await missingTokenResponse.text();
  assert.equal(missingTokenResponse.status, 400);
  assert.equal(missingTokenResponse.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.doesNotMatch(missingTokenBody, /<html/i);
  assert.match(missingTokenBody, /Missing Spotify authorization token/);

  const invalidResponse = handleSpotifyOAuthStart(buildSpotifyOAuthStartRequest("https://fitness.example.com/api/spotify/oauth/start?token=invalid"));
  const invalidBody = await invalidResponse.text();
  assert.equal(invalidResponse.status, 400);
  assert.equal(invalidResponse.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.doesNotMatch(invalidBody, /<html/i);
  assert.match(invalidBody, /Invalid or expired Spotify authorization token/);

  const expiredToken = createSpotifyOAuthStartToken({
    discordUserId: "123456789012345678",
    issuedAt: Date.now() - 20 * 60_000,
  });
  const expiredResponse = handleSpotifyOAuthStart(buildSpotifyOAuthStartRequest(`https://fitness.example.com/api/spotify/oauth/start?token=${encodeURIComponent(expiredToken)}`));
  const expiredBody = await expiredResponse.text();
  assert.equal(expiredResponse.status, 400);
  assert.equal(expiredResponse.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.doesNotMatch(expiredBody, /<html/i);
  assert.match(expiredBody, /Invalid or expired Spotify authorization token/);
});

test("Spotify refresh token exchange captures rotated refresh tokens when provided", async () => {
  process.env.SPOTIFY_CLIENT_ID = "spotify-client-id";

  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({
    access_token: "access-token",
    refresh_token: "rotated-refresh-token",
    expires_in: 3600,
    scope: "user-read-private user-read-playback-state user-modify-playback-state",
  }), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });

  try {
    const result = await refreshSpotifyAccessToken({
      refreshToken: "refresh-token",
    });

    assert.equal(result.accessToken, "access-token");
    assert.equal(result.refreshToken, "rotated-refresh-token");
    assert.deepEqual(result.scopes, [
      "user-read-private",
      "user-read-playback-state",
      "user-modify-playback-state",
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});
