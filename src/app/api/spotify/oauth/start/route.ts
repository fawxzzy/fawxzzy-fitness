import { NextRequest, NextResponse } from "next/server.js";
import { buildSpotifyAuthorizationUrl, verifySpotifyOAuthStartToken } from "@/lib/spotify/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildSpotifyOAuthStartFailure(message: string) {
  return new NextResponse(message, {
    status: 400,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

export function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  console.info("[spotify-oauth-start] route hit", {
    host: url.host,
    path: url.pathname,
    hasToken: Boolean(token),
  });
  if (!token) {
    console.warn("[spotify-oauth-start] missing token", {
      host: url.host,
      path: url.pathname,
    });
    return buildSpotifyOAuthStartFailure("Missing Spotify authorization token.");
  }

  try {
    const verifiedToken = verifySpotifyOAuthStartToken(token);
    const { authorizationUrl } = buildSpotifyAuthorizationUrl(verifiedToken.discordUserId, {
      includePlaybackScopes: verifiedToken.includePlaybackScopes,
      includeLiveQueueScopes: verifiedToken.includeLiveQueueScopes,
    });
    const redirectTarget = new URL(authorizationUrl);
    console.info("[spotify-oauth-start] redirecting", {
      redirectHost: redirectTarget.host,
      tokenAgeMs: Date.now() - verifiedToken.issuedAt,
    });

    return NextResponse.redirect(authorizationUrl, {
      status: 302,
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("[spotify-oauth-start] failed", {
      error: error instanceof Error ? error.message : String(error),
      host: url.host,
      path: url.pathname,
    });
    return buildSpotifyOAuthStartFailure("Invalid or expired Spotify authorization token.");
  }
}
