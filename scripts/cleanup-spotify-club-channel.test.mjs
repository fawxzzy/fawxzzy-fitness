import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCleanupPlan,
  discordMessageHasSpotifyClubPanel,
  isSpotifyClubCleanupCandidate,
  runSpotifyClubCleanup,
} from "./cleanup-spotify-club-channel.mjs";

test("discordMessageHasSpotifyClubPanel detects the canonical Spotify Club panel", () => {
  assert.equal(discordMessageHasSpotifyClubPanel({
    embeds: [{ title: "Spotify Club" }],
    components: [
      {
        components: [
          { custom_id: "spotify_connect_open" },
        ],
      },
    ],
  }), true);

  assert.equal(discordMessageHasSpotifyClubPanel({
    embeds: [{ title: "Spotify Club" }],
    components: [],
  }), false);
});

test("isSpotifyClubCleanupCandidate matches only known bot-authored Spotify queue chatter", () => {
  assert.equal(isSpotifyClubCleanupCandidate({
    author: { id: "app-1" },
    content: "Queue suggestion pending: `abc12345` spotify:track:xyz by <@1>.",
    embeds: [],
    components: [],
  }, "app-1"), true);

  assert.equal(isSpotifyClubCleanupCandidate({
    id: "panel-1",
    author: { id: "app-1" },
    content: "",
    embeds: [{ title: "Spotify Club" }],
    components: [{ components: [{ custom_id: "spotify_connect_open" }] }],
  }, "app-1"), false);

  assert.equal(isSpotifyClubCleanupCandidate({
    author: { id: "user-1" },
    content: "Queue approved: `abc12345` Song A is now #1 by <@1>.",
    embeds: [],
    components: [],
  }, "app-1"), false);
});

test("buildCleanupPlan preserves the panel and identifies only stale rollout messages", () => {
  const plan = buildCleanupPlan({
    applicationId: "app-1",
    messages: [
      {
        id: "panel-1",
        author: { id: "app-1" },
        content: "",
        embeds: [{ title: "Spotify Club" }],
        components: [{ components: [{ custom_id: "spotify_connect_open" }] }],
      },
      {
        id: "audit-1",
        author: { id: "app-1" },
        content: "Queue approved: `abc12345` Song A is now #1 by <@1>.",
      },
      {
        id: "user-1",
        author: { id: "user-1" },
        content: "love this queue",
      },
    ],
  });

  assert.deepEqual(plan.preservedPanelIds, ["panel-1"]);
  assert.deepEqual(plan.deletableMessages, [
    {
      id: "audit-1",
      content: "Queue approved: `abc12345` Song A is now #1 by <@1>.",
    },
  ]);
});

test("runSpotifyClubCleanup dry-run does not mutate and targets only the configured Spotify Club channel", async () => {
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_SPOTIFY_CLUB_CHANNEL_ID = "spotify-club-channel";
  process.env.DISCORD_APPLICATION_ID = "app-1";

  const originalFetch = globalThis.fetch;
  const observedPaths = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    observedPaths.push(`${String(init?.method ?? "GET")} ${url.pathname}`);

    if (
      url.pathname === "/api/v10/channels/spotify-club-channel/messages"
      && url.searchParams.get("limit") === "100"
    ) {
      return new Response(JSON.stringify([
        {
          id: "panel-1",
          author: { id: "app-1" },
          content: "",
          embeds: [{ title: "Spotify Club" }],
          components: [{ components: [{ custom_id: "spotify_connect_open" }] }],
        },
        {
          id: "audit-1",
          author: { id: "app-1" },
          content: "Queue removed: `abc12345` Song A by <@1>. Reason: cleanup",
          embeds: [],
          components: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const result = await runSpotifyClubCleanup({ apply: false, debug: false, limit: 100 });
    assert.equal(result.deletedMessageIds.length, 0);
    assert.deepEqual(result.preservedPanelIds, ["panel-1"]);
    assert.deepEqual(result.deletableMessages.map((message) => message.id), ["audit-1"]);
    assert.deepEqual(observedPaths, ["GET /api/v10/channels/spotify-club-channel/messages"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runSpotifyClubCleanup apply deletes only matched Spotify Club rollout messages", async () => {
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_SPOTIFY_CLUB_CHANNEL_ID = "spotify-club-channel";
  process.env.DISCORD_APPLICATION_ID = "app-1";

  const originalFetch = globalThis.fetch;
  const deletedPaths = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (method === "GET" && url.pathname === "/api/v10/channels/spotify-club-channel/messages") {
      return new Response(JSON.stringify([
        {
          id: "panel-1",
          author: { id: "app-1" },
          content: "",
          embeds: [{ title: "Spotify Club" }],
          components: [{ components: [{ custom_id: "spotify_connect_open" }] }],
        },
        {
          id: "audit-1",
          author: { id: "app-1" },
          content: "Queue rejected: `abc12345` Song A by <@1>. Reason: duplicate",
          embeds: [],
          components: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "DELETE" && url.pathname === "/api/v10/channels/spotify-club-channel/messages/audit-1") {
      deletedPaths.push(url.pathname);
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const result = await runSpotifyClubCleanup({ apply: true, debug: false, limit: 100 });
    assert.deepEqual(result.deletedMessageIds, ["audit-1"]);
    assert.deepEqual(deletedPaths, ["/api/v10/channels/spotify-club-channel/messages/audit-1"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runSpotifyClubCleanup retries message deletes after Discord rate limits", async () => {
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_SPOTIFY_CLUB_CHANNEL_ID = "spotify-club-channel";
  process.env.DISCORD_APPLICATION_ID = "app-1";

  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const deleteAttempts = [];
  const sleptMs = [];

  globalThis.setTimeout = (callback, delay = 0, ...args) => {
    sleptMs.push(Number(delay));
    callback(...args);
    return 0;
  };

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (method === "GET" && url.pathname === "/api/v10/channels/spotify-club-channel/messages") {
      return new Response(JSON.stringify([
        {
          id: "panel-1",
          author: { id: "app-1" },
          content: "",
          embeds: [{ title: "Spotify Club" }],
          components: [{ components: [{ custom_id: "spotify_connect_open" }] }],
        },
        {
          id: "audit-1",
          author: { id: "app-1" },
          content: "Queue approved: `abc12345` Song A is now #1 by <@1>.",
          embeds: [],
          components: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "DELETE" && url.pathname === "/api/v10/channels/spotify-club-channel/messages/audit-1") {
      deleteAttempts.push(url.pathname);
      if (deleteAttempts.length === 1) {
        return new Response(JSON.stringify({
          message: "You are being rate limited.",
          retry_after: 0.01,
        }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const result = await runSpotifyClubCleanup({ apply: true, debug: false, limit: 100 });
    assert.deepEqual(result.deletedMessageIds, ["audit-1"]);
    assert.deepEqual(deleteAttempts, [
      "/api/v10/channels/spotify-club-channel/messages/audit-1",
      "/api/v10/channels/spotify-club-channel/messages/audit-1",
    ]);
    assert.deepEqual(sleptMs, [10]);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
  }
});
