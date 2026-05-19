import assert from "node:assert/strict";
import test from "node:test";

import {
  formatSearchResultsForDiscord,
  searchSpotifyTracks,
} from "./search.ts";

test("searchSpotifyTracks returns top Spotify track results", async () => {
  const originalFetch = globalThis.fetch;
  const observedUrls: string[] = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    observedUrls.push(url.toString());

    if (url.hostname === "accounts.spotify.com" && url.pathname === "/api/token") {
      return new Response(JSON.stringify({
        access_token: "app-token",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "api.spotify.com" && url.pathname === "/v1/search" && init?.method === "GET") {
      return new Response(JSON.stringify({
        tracks: {
          items: [{
            id: "3n3Ppam7vgaVa1iaRUc9Lp",
            name: "Hey Ya!",
            artists: [{ name: "Outkast" }],
            album: { name: "Speakerboxxx/The Love Below" },
          }],
        },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch ${url.toString()}`);
  };

  process.env.SPOTIFY_CLIENT_ID = "spotify-client-id";
  process.env.SPOTIFY_CLIENT_SECRET = "spotify-client-secret";

  try {
    const results = await searchSpotifyTracks("hey ya", { limit: 5, market: "US" });
    assert.equal(results.length, 1);
    assert.equal(results[0]?.spotifyUri, "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp");
    assert.equal(results[0]?.trackTitle, "Hey Ya!");
    assert.equal(observedUrls.some((value) => value.includes("/v1/search?q=hey+ya")), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("formatSearchResultsForDiscord creates select menu options", () => {
  assert.deepEqual(formatSearchResultsForDiscord([{
    spotifyUri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
    spotifyUrl: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp",
    trackTitle: "Hey Ya!",
    artistName: "Outkast",
    albumName: "Speakerboxxx/The Love Below",
  }]), [{
    label: "Hey Ya! - Outkast",
    value: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
    description: "Album: Speakerboxxx/The Love Below",
  }]);
});
