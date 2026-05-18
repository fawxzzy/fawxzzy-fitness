import { NextRequest, NextResponse } from "next/server";
import { exchangeSpotifyAuthorizationCode, verifySpotifyOAuthState } from "@/lib/spotify/oauth";
import { fetchSpotifyCurrentUserProfile } from "@/lib/spotify/profile";
import {
  encryptSpotifyRefreshToken,
  upsertDiscordSpotifyConnection,
} from "@/lib/spotify/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function renderSpotifyOAuthResultPage(args: {
  title: string;
  body: string;
  status?: number;
}) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${args.title}</title>
  </head>
  <body>
    <main style="font-family: Arial, sans-serif; margin: 48px auto; max-width: 640px; padding: 0 20px; line-height: 1.5;">
      <h1>${args.title}</h1>
      <p>${args.body}</p>
    </main>
  </body>
</html>`;

  return new NextResponse(html, {
    status: args.status ?? 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return renderSpotifyOAuthResultPage({
      title: "Spotify connection failed",
      body: "Spotify did not complete the connection request. Return to Discord and try /spotify connect again.",
      status: 400,
    });
  }

  if (!state || !code) {
    return renderSpotifyOAuthResultPage({
      title: "Spotify connection failed",
      body: "The Spotify callback was missing required parameters. Return to Discord and try /spotify connect again.",
      status: 400,
    });
  }

  try {
    const verifiedState = verifySpotifyOAuthState(state);
    const tokenResult = await exchangeSpotifyAuthorizationCode({
      code,
      codeVerifier: verifiedState.codeVerifier,
    });
    const profile = await fetchSpotifyCurrentUserProfile(tokenResult.accessToken);

    await upsertDiscordSpotifyConnection({
      discordUserId: verifiedState.discordUserId,
      profile,
      encryptedRefreshToken: encryptSpotifyRefreshToken(tokenResult.refreshToken),
      accessTokenExpiresAt: tokenResult.expiresAt,
      scopes: tokenResult.scopes,
    });

    return renderSpotifyOAuthResultPage({
      title: "Spotify connected",
      body: profile.spotifyProduct === "unknown"
        ? "Spotify connected, but Premium status could not be confirmed yet. You can return to Discord."
        : "Spotify connected. You can return to Discord.",
    });
  } catch (error) {
    console.error("[spotify-oauth-callback] failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return renderSpotifyOAuthResultPage({
      title: "Spotify connection failed",
      body: "Spotify could not be connected right now. Return to Discord and try /spotify connect again.",
      status: 500,
    });
  }
}
