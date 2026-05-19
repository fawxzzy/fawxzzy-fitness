import "server-only";

import { Buffer } from "node:buffer";
import { optionalEnv } from "@/lib/env";

export type SpotifyTrackSearchResult = {
  spotifyUri: string;
  spotifyUrl: string;
  trackTitle: string;
  artistName: string;
  albumName: string | null;
};

const SPOTIFY_SEARCH_API_URL = "https://api.spotify.com/v1/search";
const SPOTIFY_TOKEN_API_URL = "https://accounts.spotify.com/api/token";

function optionalSpotifyClientId(): string | null {
  const value = optionalEnv("SPOTIFY_CLIENT_ID");
  return value && value.length > 0 ? value : null;
}

function optionalSpotifyClientSecret(): string | null {
  const value = optionalEnv("SPOTIFY_CLIENT_SECRET");
  return value && value.length > 0 ? value : null;
}

function encodeBasicAuth(clientId: string, clientSecret: string): string {
  return Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
}

async function fetchSpotifyAppAccessToken(): Promise<string | null> {
  const clientId = optionalSpotifyClientId();
  const clientSecret = optionalSpotifyClientSecret();
  if (!clientId || !clientSecret) {
    return null;
  }

  const response = await fetch(SPOTIFY_TOKEN_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${encodeBasicAuth(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }).toString(),
    cache: "no-store",
  });

  const body = await response.json().catch(() => null) as { access_token?: unknown } | null;
  if (!response.ok || !body || typeof body.access_token !== "string") {
    return null;
  }

  return body.access_token;
}

function normalizeSearchDisplayValue(value: string | null | undefined, maxLength = 100): string {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maxLength) : "";
}

function buildSpotifyTrackUrl(trackId: string): string {
  return `https://open.spotify.com/track/${trackId}`;
}

export async function searchSpotifyTracks(query: string, args?: {
  limit?: number;
  market?: string;
}): Promise<SpotifyTrackSearchResult[]> {
  const normalizedQuery = normalizeSearchDisplayValue(query, 120);
  if (!normalizedQuery) {
    return [];
  }

  const accessToken = await fetchSpotifyAppAccessToken();
  if (!accessToken) {
    return [];
  }

  const url = new URL(SPOTIFY_SEARCH_API_URL);
  url.searchParams.set("q", normalizedQuery);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", String(Math.min(Math.max(args?.limit ?? 5, 1), 5)));
  url.searchParams.set("market", args?.market?.trim() || "US");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => null) as {
    tracks?: {
      items?: Array<{
        id?: unknown;
        name?: unknown;
        artists?: Array<{ name?: unknown }> | null;
        album?: { name?: unknown } | null;
      }>;
    };
  } | null;

  if (!response.ok || !body?.tracks?.items || !Array.isArray(body.tracks.items)) {
    return [];
  }

  return body.tracks.items.flatMap((item) => {
    const trackId = typeof item?.id === "string" ? item.id : null;
    const trackTitle = normalizeSearchDisplayValue(typeof item?.name === "string" ? item.name : null);
    const artistName = normalizeSearchDisplayValue(
      Array.isArray(item?.artists)
        ? item.artists
          .map((artist) => (typeof artist?.name === "string" ? artist.name.trim() : ""))
          .filter(Boolean)
          .join(", ")
        : null,
    );

    if (!trackId || !trackTitle || !artistName) {
      return [];
    }

    return [{
      spotifyUri: `spotify:track:${trackId}`,
      spotifyUrl: buildSpotifyTrackUrl(trackId),
      trackTitle,
      artistName,
      albumName: normalizeSearchDisplayValue(typeof item?.album?.name === "string" ? item.album.name : null),
    }];
  });
}

export function formatSearchResultsForDiscord(results: SpotifyTrackSearchResult[]): Array<{
  label: string;
  value: string;
  description: string;
}> {
  return results.slice(0, 5).map((result) => ({
    label: normalizeSearchDisplayValue(`${result.trackTitle} - ${result.artistName}`, 100),
    value: result.spotifyUri,
    description: normalizeSearchDisplayValue(result.albumName ? `Album: ${result.albumName}` : result.spotifyUrl, 100),
  }));
}
