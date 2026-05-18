import "server-only";

import { createHash, randomBytes } from "node:crypto";
import {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_OAUTH_STATE_SECRET,
  SPOTIFY_REDIRECT_URI,
} from "@/lib/env";
import { decryptSpotifySecret, encryptSpotifySecret } from "@/lib/spotify/crypto";

const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_PHASE_1_SCOPE = "user-read-private";
const SPOTIFY_PKCE_VERIFIER_BYTES = 48;
const SPOTIFY_OAUTH_STATE_MAX_AGE_MS = 15 * 60_000;

type SpotifyOAuthStatePayload = {
  discordUserId: string;
  codeVerifier: string;
  issuedAt: number;
  nonce: string;
};

export type SpotifyAuthorizationUrlResult = {
  authorizationUrl: string;
  state: string;
  codeChallenge: string;
};

export type SpotifyTokenExchangeResult = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string | null;
  scopes: string[];
};

function encodeBase64Url(value: Uint8Array | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function buildPkceCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier, "utf8").digest("base64url");
}

export function createSpotifyCodeVerifier(): string {
  return encodeBase64Url(randomBytes(SPOTIFY_PKCE_VERIFIER_BYTES));
}

export function createSpotifyOAuthState(args: {
  discordUserId: string;
  codeVerifier: string;
  issuedAt?: number;
}): string {
  return encryptSpotifySecret(JSON.stringify({
    discordUserId: args.discordUserId,
    codeVerifier: args.codeVerifier,
    issuedAt: args.issuedAt ?? Date.now(),
    nonce: encodeBase64Url(randomBytes(12)),
  } satisfies SpotifyOAuthStatePayload), SPOTIFY_OAUTH_STATE_SECRET());
}

export function verifySpotifyOAuthState(state: string, now = Date.now()): SpotifyOAuthStatePayload {
  let parsed: Partial<SpotifyOAuthStatePayload> | null = null;

  try {
    parsed = JSON.parse(decryptSpotifySecret(state, SPOTIFY_OAUTH_STATE_SECRET())) as Partial<SpotifyOAuthStatePayload>;
  } catch {
    throw new Error("Invalid Spotify OAuth state.");
  }

  if (
    !parsed
    || typeof parsed.discordUserId !== "string"
    || !/^\d{5,32}$/.test(parsed.discordUserId)
    || typeof parsed.codeVerifier !== "string"
    || parsed.codeVerifier.length < 43
    || parsed.codeVerifier.length > 128
    || typeof parsed.issuedAt !== "number"
    || !Number.isFinite(parsed.issuedAt)
  ) {
    throw new Error("Invalid Spotify OAuth state.");
  }

  if (Math.abs(now - parsed.issuedAt) > SPOTIFY_OAUTH_STATE_MAX_AGE_MS) {
    throw new Error("Expired Spotify OAuth state.");
  }

  return {
    discordUserId: parsed.discordUserId,
    codeVerifier: parsed.codeVerifier,
    issuedAt: parsed.issuedAt,
    nonce: typeof parsed.nonce === "string" ? parsed.nonce : "",
  };
}

export function buildSpotifyAuthorizationUrl(discordUserId: string): SpotifyAuthorizationUrlResult {
  const codeVerifier = createSpotifyCodeVerifier();
  const codeChallenge = buildPkceCodeChallenge(codeVerifier);
  const state = createSpotifyOAuthState({
    discordUserId,
    codeVerifier,
  });

  const url = new URL(SPOTIFY_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", SPOTIFY_CLIENT_ID());
  url.searchParams.set("redirect_uri", SPOTIFY_REDIRECT_URI());
  url.searchParams.set("scope", SPOTIFY_PHASE_1_SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", codeChallenge);

  return {
    authorizationUrl: url.toString(),
    state,
    codeChallenge,
  };
}

export async function exchangeSpotifyAuthorizationCode(args: {
  code: string;
  codeVerifier: string;
}): Promise<SpotifyTokenExchangeResult> {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID(),
      grant_type: "authorization_code",
      code: args.code,
      redirect_uri: SPOTIFY_REDIRECT_URI(),
      code_verifier: args.codeVerifier,
    }).toString(),
    cache: "no-store",
  });

  const body = await response.json().catch(() => null) as {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
    scope?: unknown;
    error?: unknown;
  } | null;

  if (!response.ok) {
    throw new Error(
      `Spotify token exchange failed: ${
        body && typeof body.error === "string" ? body.error : `status_${response.status}`
      }.`,
    );
  }

  if (
    !body
    || typeof body.access_token !== "string"
    || typeof body.refresh_token !== "string"
  ) {
    throw new Error("Spotify token exchange did not return the required tokens.");
  }

  const expiresInSeconds = typeof body.expires_in === "number" && Number.isFinite(body.expires_in)
    ? body.expires_in
    : null;

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: expiresInSeconds === null
      ? null
      : new Date(Date.now() + expiresInSeconds * 1_000).toISOString(),
    scopes: typeof body.scope === "string"
      ? body.scope.split(/\s+/).map((scope) => scope.trim()).filter(Boolean)
      : [SPOTIFY_PHASE_1_SCOPE],
  };
}
