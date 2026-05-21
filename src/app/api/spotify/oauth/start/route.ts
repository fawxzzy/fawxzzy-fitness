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
  if (!token) {
    return buildSpotifyOAuthStartFailure("Missing Spotify authorization token.");
  }

  try {
    const verifiedToken = verifySpotifyOAuthStartToken(token);
    const { authorizationUrl } = buildSpotifyAuthorizationUrl(verifiedToken.discordUserId, {
      includePlaybackScopes: verifiedToken.includePlaybackScopes,
      includeLiveQueueScopes: verifiedToken.includeLiveQueueScopes,
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
    });
    return buildSpotifyOAuthStartFailure("Invalid or expired Spotify authorization token.");
  }
}
