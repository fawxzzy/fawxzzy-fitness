// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";
import nacl from "tweetnacl";
import { GET, POST } from "@/app/api/discord/interactions/route.ts";
import { encryptSpotifyRefreshToken } from "@/lib/spotify/tokens.ts";

function toHex(value) {
  return Buffer.from(value).toString("hex");
}

function createSignedRequest(body, keyPair) {
  const timestamp = "1715702400";
  const payload = new TextEncoder().encode(`${timestamp}${body}`);
  const signature = nacl.sign.detached(payload, keyPair.secretKey);

  return new Request("http://localhost/api/discord/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Signature-Ed25519": toHex(signature),
      "X-Signature-Timestamp": timestamp,
    },
    body,
  });
}

function buildFeedbackReportRow(overrides = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    source: "discord",
    report_type: "bug",
    status: "new",
    severity: "medium",
    area: "Settings",
    summary: "Token copy button failed",
    details: "I tapped Copy and nothing happened.",
    steps_to_reproduce: "Open Settings -> Account -> Generate token -> tap Copy",
    screenshot_url: null,
    attachment_count: 0,
    attachment_metadata: null,
    attachment_pruned: false,
    reporter_discord_user_id: "123456789012345678",
    reporter_discord_username: "zac",
    reporter_fitness_user_id: "00000000-0000-0000-0000-000000000123",
    reporter_member_number: 4,
    reporter_user_kind: "human",
    discord_interaction_id: "interaction-1",
    duplicate_fingerprint: "abc123",
    duplicate_count: 1,
    first_seen_at: "2026-05-15T13:00:00.000Z",
    last_seen_at: "2026-05-15T13:00:00.000Z",
    discord_forum_channel_id: "1504673475489562744",
    discord_forum_thread_id: "1504673475489562745",
    discord_forum_message_id: "1504673475489562746",
    discord_forum_applied_tag_ids: ["tag-bug", "tag-new", "tag-medium"],
    discord_forum_title: "Bug: Settings — Token copy button failed",
    staff_channel_message_id: null,
    closed_at: null,
    pruned_at: null,
    details_pruned: false,
    triage_notes: null,
    status_updated_at: null,
    status_updated_by_discord_user_id: null,
    status_note: null,
    completion_review_status: "not_required",
    completion_reviewed_at: null,
    completion_reviewed_by_discord_user_id: null,
    completion_review_note: null,
    reporter_mentioned_at: "2026-05-15T13:00:00.000Z",
    created_at: "2026-05-15T13:00:00.000Z",
    updated_at: "2026-05-15T13:00:00.000Z",
    ...overrides,
  };
}

function parseJsonBody(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }

  return JSON.parse(trimmed);
}

function listDiscordMessageComponentCustomIds(body) {
  if (!Array.isArray(body?.components)) {
    return [];
  }

  return body.components.flatMap((row) => (
    Array.isArray(row?.components)
      ? row.components
        .map((component) => component?.custom_id)
        .filter((customId) => typeof customId === "string")
      : []
  ));
}

function findDiscordMessageButtonByCustomId(body, customId) {
  if (!Array.isArray(body?.components)) {
    return null;
  }

  for (const row of body.components) {
    if (!Array.isArray(row?.components)) {
      continue;
    }
    const found = row.components.find((component) => component?.custom_id === customId);
    if (found) {
      return found;
    }
  }

  return null;
}

function findDiscordMessageLinkButtonByLabel(body, label) {
  if (!Array.isArray(body?.components)) {
    return null;
  }

  for (const row of body.components) {
    if (!Array.isArray(row?.components)) {
      continue;
    }
    const found = row.components.find((component) => component?.style === 5 && component?.label === label);
    if (found) {
      return found;
    }
  }

  return null;
}

function buildSpotifyClubLobbyRow(overrides = {}) {
  return {
    id: "lobby-1",
    status: "closed",
    host_discord_user_id: null,
    host_spotify_user_id: null,
    room_name: "Main Room",
    visibility: "public",
    approval_mode: "auto_approve_jam_ready",
    spotify_mirror_enabled: false,
    spotify_mirror_last_synced_at: null,
    spotify_mirror_error_count: 0,
    stop_playback_on_close: true,
    title: null,
    description: null,
    panel_channel_id: "1504668396338413670",
    panel_message_id: "panel-message-1",
    opened_at: null,
    closed_at: "2026-05-19T00:00:00.000Z",
    created_at: "2026-05-19T00:00:00.000Z",
    updated_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}

function buildSpotifyConnectionRow(overrides = {}) {
  return {
    id: "connection-1",
    discord_user_id: "123456789012345678",
    spotify_user_id: "spotify-user-1",
    spotify_display_name: "Fawxzzy",
    spotify_product: "premium",
    is_premium: true,
    encrypted_refresh_token: "ciphertext",
    access_token_expires_at: null,
    scopes: ["user-read-private", "user-read-playback-state", "user-modify-playback-state", "user-read-currently-playing"],
    connected_at: "2026-05-19T00:00:00.000Z",
    last_checked_at: "2026-05-19T00:00:00.000Z",
    disconnected_at: null,
    created_at: "2026-05-19T00:00:00.000Z",
    updated_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}

test("Discord interactions route returns 401 before parsing malformed unsigned JSON", async () => {
  process.env.DISCORD_PUBLIC_KEY = "00".repeat(32);

  const response = await POST(new Request("http://localhost/api/discord/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Signature-Ed25519": "00".repeat(64),
      "X-Signature-Timestamp": "1715702400",
    },
    body: "{not-json",
  }));

  assert.equal(response.status, 401);
});

test("Discord interactions route responds to a signed ping", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);

  const response = await POST(createSignedRequest(JSON.stringify({ type: 1 }), keyPair));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { type: 1 });
});

test("Discord interactions route returns the verification modal for the existing button custom id", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);

  const response = await POST(createSignedRequest(JSON.stringify({
    type: 3,
    data: {
      custom_id: "fitness_verify_open",
    },
  }), keyPair));

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.type, 9);
  assert.equal(payload.data.custom_id, "fitness_verify_modal");
});

test("Discord interactions route recreates the verify message when setup-verify finds no existing post", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_VERIFY_CHANNEL_ID = "1504700208251146372";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504700208251146372/messages"
      && String(init?.method ?? "GET") === "GET"
      && url.searchParams.get("limit") === "50"
    ) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504700208251146372/messages"
      && String(init?.method ?? "GET") === "POST"
    ) {
      observedDiscordBodies.push(body);
      return new Response(JSON.stringify({ id: "1504700208251146373" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(5)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "setup-verify",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Verification message created in the configured verify channel.",
        flags: 64,
      },
    });
    assert.equal(observedDiscordBodies.length, 1);
    assert.equal(observedDiscordBodies[0]?.embeds?.[0]?.title, "Fawxzzy Server Access");
    assert.equal(String(observedDiscordBodies[0]?.embeds?.[0]?.description ?? "").includes("### Server Rules"), true);
    assert.equal(observedDiscordBodies[0]?.components?.[0]?.components?.[0]?.custom_id, "fitness_verify_open");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_VERIFY_CHANNEL_ID;
  }
});

test("Discord interactions route cleans up #verify while preserving one official panel", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_VERIFY_CHANNEL_ID = "1504700208251146372";

  const originalFetch = globalThis.fetch;
  const deletedMessagePaths = [];
  const deletedThreadPaths = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504700208251146372/messages"
      && method === "GET"
    ) {
      return new Response(JSON.stringify([
        {
          id: "official-panel",
          author: { id: "1504700208251146371" },
          components: [{ type: 1, components: [{ type: 2, custom_id: "fitness_verify_open" }] }],
        },
        {
          id: "manual-note",
          author: { id: "222222222222222222" },
          components: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504700208251146372/messages/official-panel"
      && method === "PATCH"
    ) {
      return new Response(JSON.stringify({ id: "official-panel" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504700208251146372/messages/manual-note"
      && method === "DELETE"
    ) {
      deletedMessagePaths.push(url.pathname);
      return new Response(null, { status: 204 });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/guilds/1504668396338413670/threads/active"
      && method === "GET"
    ) {
      return new Response(JSON.stringify({
        threads: [{ id: "verify-thread", parent_id: "1504700208251146372" }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504700208251146372/threads/archived/public"
      && method === "GET"
    ) {
      return new Response(JSON.stringify({ threads: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504700208251146372/threads/archived/private"
      && method === "GET"
    ) {
      return new Response(JSON.stringify({ threads: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/verify-thread"
      && method === "DELETE"
    ) {
      deletedThreadPaths.push(url.pathname);
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(5)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "verify-cleanup",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Verify channel cleaned. Removed 1 message(s) and 1 thread(s). Official panel updated.",
        flags: 64,
      },
    });
    assert.deepEqual(deletedMessagePaths, ["/api/v10/channels/1504700208251146372/messages/manual-note"]);
    assert.deepEqual(deletedThreadPaths, ["/api/v10/channels/verify-thread"]);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_VERIFY_CHANNEL_ID;
  }
});

test("Discord interactions route applies locked #verify permission overwrites", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_VERIFY_CHANNEL_ID = "1504700208251146372";
  process.env.DISCORD_VERIFIED_ROLE_ID = "1504700208251146373";
  process.env.DISCORD_UNVERIFIED_ROLE_ID = "1504700208251146374";

  const originalFetch = globalThis.fetch;
  const overwriteBodies = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (
      url.hostname === "discord.com"
      && url.pathname.startsWith("/api/v10/channels/1504700208251146372/permissions/")
      && method === "PUT"
    ) {
      overwriteBodies.push(body);
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(5)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "verify-lockdown",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Verify channel locked down. Applied 3 permission overwrite(s) for the access panel.",
        flags: 64,
      },
    });
    assert.equal(overwriteBodies.length, 3);
    assert.equal(typeof overwriteBodies[0]?.allow, "string");
    assert.equal(typeof overwriteBodies[0]?.deny, "string");
    assert.equal(overwriteBodies[0]?.type, 0);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_VERIFY_CHANNEL_ID;
    delete process.env.DISCORD_VERIFIED_ROLE_ID;
    delete process.env.DISCORD_UNVERIFIED_ROLE_ID;
  }
});

test("Discord interactions route reposts an existing feedback panel when setup-feedback is rerun", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_FEEDBACK_PANEL_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];
  let deletedOldPanel = false;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744") {
      return new Response(JSON.stringify({ id: "1504673475489562744", type: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504673475489562744/messages"
      && String(init?.method ?? "GET") === "GET"
      && url.searchParams.get("limit") === "50"
    ) {
      return new Response(JSON.stringify([{
        id: "1504673475489562747",
        author: { id: "1504700208251146371" },
        components: [
          {
            type: 1,
            components: [
              { type: 2, custom_id: "fitness_feedback_submit_open" },
              { type: 2, custom_id: "fitness_feedback_update_open" },
              { type: 2, custom_id: "fitness_feedback_withdraw_open" },
            ],
          },
        ],
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504673475489562744/messages/1504673475489562747"
      && String(init?.method ?? "GET") === "DELETE"
    ) {
      deletedOldPanel = true;
      return new Response(null, { status: 204 });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504673475489562744/messages"
      && String(init?.method ?? "GET") === "POST"
    ) {
      observedDiscordBodies.push(body);
      return new Response(JSON.stringify({ id: "1504673475489562748" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(5)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "setup-feedback",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback launcher updated in configured channel.",
        flags: 64,
      },
    });
    assert.equal(deletedOldPanel, true);
    assert.equal(observedDiscordBodies[0]?.embeds?.[0]?.title, "Submit Feedback Here");
    assert.deepEqual(
      observedDiscordBodies[0]?.components?.[0]?.components?.map((component) => component.custom_id),
      [
        "fitness_feedback_submit_open",
        "fitness_feedback_update_open",
      ],
    );
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_FEEDBACK_PANEL_CHANNEL_ID;
  }
});

test("Discord interactions route posts setup-feedback in the invoking channel and removes the old panel", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_FEEDBACK_PANEL_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);
    calls.push({ method, pathname: url.pathname, body });

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671" && method === "GET") {
      return new Response(JSON.stringify({ id: "1504668396338413671", type: 0, name: "main" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "POST") {
      assert.equal(body?.components?.[0]?.components?.[0]?.custom_id, "fitness_feedback_submit_open");
      return new Response(JSON.stringify({ id: "new-panel-message" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/channels" && method === "GET") {
      return new Response(JSON.stringify([
        { id: "1504668396338413671", type: 0, name: "main" },
        { id: "1504673475489562744", type: 0, name: "submit-feedback" },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504673475489562744/messages" && method === "GET") {
      return new Response(JSON.stringify([{
        id: "old-panel-message",
        author: { id: "1504700208251146371" },
        components: [
          {
            type: 1,
            components: [
              { type: 2, custom_id: "fitness_feedback_submit_open" },
              { type: 2, custom_id: "fitness_feedback_update_open" },
            ],
          },
        ],
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504673475489562744/messages/old-panel-message" && method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/v10/channels/1504673475489562744" && method === "DELETE") {
      return new Response(JSON.stringify({ id: "1504673475489562744", name: "submit-feedback" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      channel_id: "1504668396338413671",
      member: {
        permissions: String(BigInt(1) << BigInt(5)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "setup-feedback",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback launcher created in <#1504668396338413671>.",
        flags: 64,
      },
    });
    assert.equal(calls.some((call) => call.method === "POST" && call.pathname === "/api/v10/channels/1504668396338413671/messages"), true);
    assert.equal(calls.some((call) => call.method === "DELETE" && call.pathname === "/api/v10/channels/1504673475489562744/messages/old-panel-message"), true);
    assert.equal(calls.some((call) => call.method === "DELETE" && call.pathname === "/api/v10/channels/1504673475489562744"), true);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_FEEDBACK_PANEL_CHANNEL_ID;
  }
});

test("Discord interactions route recreates the feedback panel when the old panel message is gone", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_FEEDBACK_PANEL_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744") {
      return new Response(JSON.stringify({ id: "1504673475489562744", type: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504673475489562744/messages"
      && String(init?.method ?? "GET") === "GET"
      && url.searchParams.get("limit") === "50"
    ) {
      return new Response(JSON.stringify([{
        id: "1504673475489562747",
        author: { id: "1504700208251146371" },
        components: [
          {
            type: 1,
            components: [
              { type: 2, custom_id: "fitness_feedback_submit_open" },
              { type: 2, custom_id: "fitness_feedback_update_open" },
              { type: 2, custom_id: "fitness_feedback_withdraw_open" },
            ],
          },
        ],
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504673475489562744/messages/1504673475489562747"
      && String(init?.method ?? "GET") === "DELETE"
    ) {
      return new Response(JSON.stringify({ message: "Unknown Message" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504673475489562744/messages"
      && String(init?.method ?? "GET") === "POST"
    ) {
      observedDiscordBodies.push(body);
      return new Response(JSON.stringify({ id: "1504673475489562749" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(5)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "setup-feedback",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback launcher updated in configured channel.",
        flags: 64,
      },
    });
    assert.equal(observedDiscordBodies[0]?.embeds?.[0]?.title, "Submit Feedback Here");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_FEEDBACK_PANEL_CHANNEL_ID;
  }
});

test("Discord interactions route does not auto-create a submit-feedback launcher channel", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  delete process.env.DISCORD_FEEDBACK_PANEL_CHANNEL_ID;
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  let discordFetchCount = 0;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === "discord.com") {
      discordFetchCount += 1;
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(5)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "setup-feedback",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Discord feedback panel channel is not configured.",
        flags: 64,
      },
    });
    assert.equal(discordFetchCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route opens the submit feedback panel modal", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);

  const response = await POST(createSignedRequest(JSON.stringify({
    type: 3,
    data: {
      custom_id: "fitness_feedback_submit_open",
    },
  }), keyPair));

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.type, 9);
  assert.equal(payload.data.custom_id, "fitness_feedback_submit_modal");
});

test("Discord interactions route opens the update feedback picker for recent editable cards", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && String(init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify([
        buildFeedbackReportRow({
          report_type: "feature",
          summary: "Emoji bootstrap canary",
          area: "Discord Feedback",
        }),
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 3,
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_feedback_update_open",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.type, 4);
    assert.equal(payload.data.flags, 64);
    assert.equal(payload.data.components[0]?.components[0]?.custom_id, "fitness_feedback_manage_recent:11111111-1111-4111-8111-111111111111");
    assert.equal(payload.data.components[1]?.components[0]?.custom_id, "fitness_feedback_update_pick_report");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route opens the manage-card response after selecting a feedback card", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && String(init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "feature",
        area: "Discord Feedback",
        summary: "Emoji bootstrap canary",
        details: "Synthetic bot-side canary.",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        permissions: "0",
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_feedback_update_pick_report",
        values: ["11111111-1111-4111-8111-111111111111"],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.type, 4);
    assert.equal(payload.data.components[0]?.components[0]?.custom_id, "fitness_feedback_manage_action_edit:11111111-1111-4111-8111-111111111111");
    assert.equal(payload.data.components[0]?.components[1]?.custom_id, "fitness_feedback_manage_action_withdraw:11111111-1111-4111-8111-111111111111");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route opens the manage lookup modal", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);

  const response = await POST(createSignedRequest(JSON.stringify({
    type: 3,
    data: {
      custom_id: "fitness_feedback_manage_lookup_open",
    },
  }), keyPair));

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.type, 9);
  assert.equal(payload.data.custom_id, "fitness_feedback_manage_lookup_modal");
});

test("Discord interactions route opens the edit modal after clicking the manage edit button", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && String(init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify([
        buildFeedbackReportRow({
          report_type: "feature",
          summary: "Emoji bootstrap canary",
          area: "Discord Feedback",
        }),
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        permissions: "0",
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_feedback_manage_action_edit:11111111-1111-4111-8111-111111111111",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.type, 9);
    assert.equal(payload.data.custom_id, "fitness_feedback_update_edit_modal:11111111-1111-4111-8111-111111111111");
    assert.equal(payload.data.components[0]?.component?.value, "Emoji bootstrap canary");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route opens the general feedback modal for /feedback", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;

  globalThis.fetch = async () => {
    fetchCallCount += 1;
    throw new Error("Feedback modal launcher must not fetch before responding.");
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      data: {
        name: "feedback",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.type, 9);
    assert.equal(payload.data.custom_id, "fitness_feedback_submit_modal");
    assert.equal(payload.data.title, "Submit Feedback");
    assert.equal(payload.data.components[0]?.components[0]?.custom_id, "feedback_type");
    assert.equal(payload.data.components[0]?.components[0]?.type, 4);
    assert.equal(payload.data.components[0]?.components[0]?.placeholder, "Bug or Feature");
    assert.equal(payload.data.components[3]?.components[0]?.custom_id, "bug_details");
    assert.equal(payload.data.components.some((row) => row?.type === 18), false);
    assert.equal(JSON.stringify(payload.data).includes("\"type\":19"), false);
    assert.equal(JSON.stringify(payload.data).includes("\"type\":3"), false);
    assert.equal(fetchCallCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord message command poll is secret-gated", async () => {
  delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
  delete process.env.CRON_SECRET;

  const response = await GET(new Request("http://localhost/api/discord/interactions", {
    method: "GET",
  }));

  assert.equal(response.status, 503);
});

test("Discord message command poll replaces one computa command menu per channel", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";

  const originalFetch = globalThis.fetch;
  const postedBodies = [];
  let channelMessageFetchCount = 0;
  let deletedOldMenu = false;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      channelMessageFetchCount += 1;
      if (url.searchParams.get("limit") === "25") {
        return new Response(JSON.stringify([
          {
            id: "main-message-computa-menu",
            content: "computa",
            author: { id: "123456789012345678", bot: false },
            member: { roles: ["commander-role"] },
            reactions: [],
          },
        ]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      assert.equal(url.searchParams.get("limit"), "50");
      return new Response(JSON.stringify([
        {
          id: "old-computa-menu",
          content: "",
          author: { id: "1504700208251146371", bot: true },
          embeds: [
            {
              title: "Computa",
              footer: { text: "fawx-computa-command-menu:v1" },
            },
          ],
        },
        {
          id: "main-message-computa-menu",
          content: "computa",
          author: { id: "123456789012345678", bot: false },
          member: { roles: ["commander-role"] },
          reactions: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/old-computa-menu" && method === "DELETE") {
      deletedOldMenu = true;
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "POST") {
      const body = parseJsonBody(init?.body);
      postedBodies.push(body);
      assert.equal(body?.content, "");
      assert.equal(body?.embeds?.[0]?.title, "Computa");
      assert.equal(body?.embeds?.[0]?.color, 0x22c55e);
      assert.equal(body?.embeds?.[0]?.footer, undefined);
      assert.match(body?.embeds?.[0]?.description ?? "", /`computa` - Show this command card\./);
      assert.match(body?.embeds?.[0]?.description ?? "", /`computa setup feedback`/);
      assert.match(body?.embeds?.[0]?.description ?? "", /`computa setup music sesh`/);
      assert.doesNotMatch(body?.embeds?.[0]?.description ?? "", /live/);
      assert.doesNotMatch(body?.embeds?.[0]?.description ?? "", /Owner-only/);
      assert.equal(body?.components, undefined);
      assert.deepEqual(body?.allowed_mentions, { parse: [] });
      return new Response(JSON.stringify({ id: "new-computa-menu" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/roles" && method === "GET") {
      return new Response(JSON.stringify([
        { id: "commander-role", name: "Fawxzzy Commander", permissions: "0" },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/main-message-computa-menu/reactions/fawxzzy%3A1507384062166302851/@me" && method === "PUT") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      processed: [
        {
          messageId: "main-message-computa-menu",
          ok: true,
          code: null,
          action: "posted",
        },
      ],
    });
    assert.equal(channelMessageFetchCount, 2);
    assert.equal(deletedOldMenu, true);
    assert.equal(postedBodies.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_APPLICATION_ID;
  }
});

test("Discord message command poll replaces one owner computa command menu per channel", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_COMPUTA_OWNER_USER_ID = "owner-user";

  const originalFetch = globalThis.fetch;
  const postedBodies = [];
  let deletedOldMenu = false;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      if (url.searchParams.get("limit") === "25") {
        return new Response(JSON.stringify([
          {
            id: "main-message-computa-owner-menu",
            content: "computa owner",
            author: { id: "owner-user", bot: false },
            reactions: [],
          },
        ]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      assert.equal(url.searchParams.get("limit"), "50");
      return new Response(JSON.stringify([
        {
          id: "old-computa-owner-menu",
          content: "",
          author: { id: "1504700208251146371", bot: true },
          embeds: [
            {
              title: "Computa Owner",
              footer: { text: "fawx-computa-owner-command-menu:v1" },
            },
          ],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/old-computa-owner-menu" && method === "DELETE") {
      deletedOldMenu = true;
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "POST") {
      const body = parseJsonBody(init?.body);
      postedBodies.push(body);
      assert.equal(body?.content, "");
      assert.equal(body?.embeds?.[0]?.title, "Computa Owner");
      assert.equal(body?.embeds?.[0]?.color, 0x22c55e);
      assert.equal(body?.embeds?.[0]?.footer, undefined);
      assert.match(body?.embeds?.[0]?.description ?? "", /`computa owner` - Show this owner command card\./);
      assert.doesNotMatch(body?.embeds?.[0]?.description ?? "", /`computa repair command card`/);
      assert.doesNotMatch(body?.embeds?.[0]?.description ?? "", /`computa repair feedback launcher`/);
      assert.doesNotMatch(body?.embeds?.[0]?.description ?? "", /`computa sync feedback reactions`/);
      assert.match(body?.embeds?.[0]?.description ?? "", /`computa release check`/);
      assert.match(body?.embeds?.[0]?.description ?? "", /`computa archive checked cards`/);
      assert.match(body?.embeds?.[0]?.description ?? "", /`computa post live twitch`/);
      assert.equal(body?.components, undefined);
      assert.deepEqual(body?.allowed_mentions, { parse: [] });
      return new Response(JSON.stringify({ id: "new-computa-owner-menu" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/main-message-computa-owner-menu/reactions/fawxzzy%3A1507384062166302851/@me" && method === "PUT") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      processed: [
        {
          messageId: "main-message-computa-owner-menu",
          ok: true,
          code: null,
          action: "posted",
        },
      ],
    });
    assert.equal(deletedOldMenu, true);
    assert.equal(postedBodies.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
    delete process.env.DISCORD_APPLICATION_ID;
    delete process.env.DISCORD_COMPUTA_OWNER_USER_ID;
  }
});

test("Discord message command poll posts release ledger check summary for commanders", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const postedBodies = [];
  let deletedOldCheck = false;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      if (url.searchParams.get("limit") === "25") {
        return new Response(JSON.stringify([
          {
            id: "main-message-release-check",
            content: "computa release check",
            author: { id: "123456789012345678", bot: false },
            member: { roles: ["commander-role"] },
            reactions: [],
          },
        ]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      assert.equal(url.searchParams.get("limit"), "50");
      return new Response(JSON.stringify([
        {
          id: "old-release-check",
          content: "",
          author: { id: "1504700208251146371", bot: true },
          embeds: [
            {
              title: "Computa Release Check",
              footer: { text: "fawx-computa-release-check:v1" },
            },
          ],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/roles" && method === "GET") {
      return new Response(JSON.stringify([
        { id: "commander-role", name: "Fawxzzy Commander", permissions: "0" },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504673475489562744" && method === "GET") {
      return new Response(JSON.stringify({
        id: "1504673475489562744",
        available_tags: [
          { id: "fixed-tag", name: "Fixed" },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/threads/active" && method === "GET") {
      return new Response(JSON.stringify({
        threads: [
          {
            id: "thread-fixed-missing",
            parent_id: "1504673475489562744",
            archived: false,
            applied_tags: ["fixed-tag"],
          },
          {
            id: "thread-open-with-success",
            parent_id: "1504673475489562744",
            archived: false,
            applied_tags: [],
          },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504673475489562744/threads/archived/public" && method === "GET") {
      return new Response(JSON.stringify({ threads: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504673475489562744/threads/archived/private" && method === "GET") {
      return new Response(JSON.stringify({ threads: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/thread-fixed-missing/messages/thread-fixed-missing" && method === "GET") {
      return new Response(JSON.stringify({ id: "thread-fixed-missing", reactions: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/thread-open-with-success/messages/thread-open-with-success" && method === "GET") {
      return new Response(JSON.stringify({
        id: "thread-open-with-success",
        reactions: [{ emoji: { id: "1507384062166302851", name: "fawxzzy" } }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/old-release-check" && method === "DELETE") {
      deletedOldCheck = true;
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "POST") {
      const body = parseJsonBody(init?.body);
      postedBodies.push(body);
      assert.equal(body?.embeds?.[0]?.title, "Computa Release Check");
      assert.equal(body?.embeds?.[0]?.color, 0xf59e0b);
      assert.equal(body?.embeds?.[0]?.footer?.text, "fawx-computa-release-check:v1");
      assert.match(body?.embeds?.[0]?.description ?? "", /Missing success reaction: 1/);
      assert.match(body?.embeds?.[0]?.description ?? "", /Unresolved cards with success reaction: 1/);
      return new Response(JSON.stringify({ id: "new-release-check" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/main-message-release-check/reactions/fawxzzy%3A1507384094424694785/@me" && method === "PUT") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      processed: [
        {
          messageId: "main-message-release-check",
          ok: true,
          code: null,
          action: "checked",
        },
      ],
    });
    assert.equal(deletedOldCheck, true);
    assert.equal(postedBodies.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_APPLICATION_ID;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord message command poll repairs the public computa command card for commanders", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";

  const originalFetch = globalThis.fetch;
  let postedMenu = false;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      if (url.searchParams.get("limit") === "25") {
        return new Response(JSON.stringify([
          {
            id: "main-message-computa-repair",
            content: "computa repair command card",
            author: { id: "123456789012345678", bot: false },
            member: { roles: ["commander-role"] },
            reactions: [],
          },
        ]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/roles" && method === "GET") {
      return new Response(JSON.stringify([
        { id: "commander-role", name: "Fawxzzy Commander", permissions: "0" },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "POST") {
      const body = parseJsonBody(init?.body);
      postedMenu = true;
      assert.equal(body?.embeds?.[0]?.title, "Computa");
      return new Response(JSON.stringify({ id: "new-computa-menu" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/main-message-computa-repair/reactions/fawxzzy%3A1507384062166302851/@me" && method === "PUT") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      processed: [
        {
          messageId: "main-message-computa-repair",
          ok: true,
          code: null,
          action: "posted",
        },
      ],
    });
    assert.equal(postedMenu, true);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_APPLICATION_ID;
  }
});

test("Discord message command poll rejects owner computa menu for non-owner users", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";
  process.env.DISCORD_COMPUTA_OWNER_USER_ID = "owner-user";

  const originalFetch = globalThis.fetch;
  let postedMenu = false;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      return new Response(JSON.stringify([
        {
          id: "main-message-computa-owner-forbidden",
          content: "computa owner",
          author: { id: "normal-user", bot: false },
          reactions: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/main-message-computa-owner-forbidden/reactions/fawxzzy%3A1507384094424694785/@me" && method === "PUT") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "POST") {
      postedMenu = true;
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      processed: [
        {
          messageId: "main-message-computa-owner-forbidden",
          ok: false,
          code: "DISCORD_COMPUTA_OWNER_MENU_FORBIDDEN",
          action: null,
        },
      ],
    });
    assert.equal(postedMenu, false);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
    delete process.env.DISCORD_COMPUTA_OWNER_USER_ID;
  }
});

test("Discord message command poll rejects computa menu for users without commander role", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const originalFetch = globalThis.fetch;
  let postedMenu = false;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      return new Response(JSON.stringify([
        {
          id: "main-message-computa-forbidden",
          content: "computa",
          author: { id: "normal-user", bot: false },
          member: { roles: [] },
          reactions: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/roles" && method === "GET") {
      return new Response(JSON.stringify([
        { id: "commander-role", name: "Fawxzzy Commander", permissions: "0" },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/main-message-computa-forbidden/reactions/fawxzzy%3A1507384094424694785/@me" && method === "PUT") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "POST") {
      postedMenu = true;
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      processed: [
        {
          messageId: "main-message-computa-forbidden",
          ok: false,
          code: "DISCORD_MESSAGE_COMMAND_FORBIDDEN",
          action: null,
        },
      ],
    });
    assert.equal(postedMenu, false);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
    delete process.env.DISCORD_GUILD_ID;
  }
});

test("Discord message command poll lets a manager bootstrap the commander role and setup feedback", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_FEEDBACK_PANEL_CHANNEL_ID = "1504673475489562744";
  delete process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID;
  delete process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID;

  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    calls.push({ method, pathname: url.pathname, body: parseJsonBody(init?.body) });

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (
      url.pathname === "/api/v10/channels/1504668396338413671/messages"
      && method === "GET"
      && url.searchParams.get("limit") === "25"
    ) {
      assert.equal(url.searchParams.get("limit"), "25");
      return new Response(JSON.stringify([
        {
          id: "main-message-1",
          content: "yo computa setup feedback please",
          author: { id: "123456789012345678", bot: false },
          member: { roles: ["manager-role"] },
          reactions: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671" && method === "GET") {
      return new Response(JSON.stringify({ id: "1504668396338413671", type: 0, name: "main" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/roles" && method === "GET") {
      return new Response(JSON.stringify([
        { id: "manager-role", name: "Ops", permissions: String(BigInt(1) << BigInt(5)) },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/roles" && method === "POST") {
      const body = parseJsonBody(init?.body);
      assert.equal(body?.name, "Fawxzzy Commander");
      return new Response(JSON.stringify({ id: "commander-role", name: "Fawxzzy Commander", permissions: "0" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/members/123456789012345678/roles/commander-role" && method === "PUT") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/v10/channels/1504673475489562744" && method === "GET") {
      return new Response(JSON.stringify({ id: "1504673475489562744", type: 0, name: "submit-feedback" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.pathname === "/api/v10/channels/1504668396338413671/messages"
      && method === "GET"
      && url.searchParams.get("limit") === "50"
    ) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "POST") {
      const body = parseJsonBody(init?.body);
      assert.equal(body?.message_reference, undefined);
      assert.equal(body?.components?.[0]?.components?.[0]?.custom_id, "fitness_feedback_submit_open");
      return new Response(JSON.stringify({ id: "feedback-panel-message-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/channels" && method === "GET") {
      return new Response(JSON.stringify([
        { id: "1504668396338413671", type: 0, name: "main" },
        { id: "1504673475489562744", type: 0, name: "submit-feedback" },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504673475489562744/messages" && method === "GET") {
      return new Response(JSON.stringify([{
        id: "old-feedback-panel-message",
        author: { id: "1504700208251146371" },
        components: [
          {
            type: 1,
            components: [
              { type: 2, custom_id: "fitness_feedback_submit_open" },
              { type: 2, custom_id: "fitness_feedback_update_open" },
            ],
          },
        ],
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504673475489562744/messages/old-feedback-panel-message" && method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/v10/channels/1504673475489562744" && method === "DELETE") {
      return new Response(JSON.stringify({ id: "1504673475489562744", name: "submit-feedback" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/users/@me/channels" && method === "POST") {
      const body = parseJsonBody(init?.body);
      assert.equal(body?.recipient_id, "123456789012345678");
      return new Response(JSON.stringify({ id: "dm-feedback-command" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/dm-feedback-command/messages" && method === "POST") {
      const body = parseJsonBody(init?.body);
      assert.match(body?.content ?? "", /Feedback launcher created in <#1504668396338413671>/);
      assert.deepEqual(body?.allowed_mentions, { parse: [] });
      return new Response(JSON.stringify({ id: "dm-message-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/main-message-1/reactions/fawxzzy%3A1507384062166302851/@me" && method === "PUT") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      processed: [
        {
          messageId: "main-message-1",
          ok: true,
          code: null,
          action: "created",
        },
      ],
    });
    assert.equal(calls.some((call) => call.method === "POST" && call.pathname.endsWith("/roles")), true);
    assert.equal(calls.some((call) => call.method === "PUT" && call.pathname.includes("/roles/commander-role")), true);
    assert.equal(calls.some((call) => call.body?.message_reference?.message_id === "main-message-1"), false);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_APPLICATION_ID;
    delete process.env.DISCORD_FEEDBACK_PANEL_CHANNEL_ID;
  }
});

test("Discord message command poll requires the commander role after bootstrap", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      return new Response(JSON.stringify([
        {
          id: "main-message-2",
          content: "computa setup feedback",
          author: { id: "123456789012345678", bot: false },
          member: { roles: [] },
          reactions: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/roles" && method === "GET") {
      return new Response(JSON.stringify([
        { id: "commander-role", name: "Fawxzzy Commander", permissions: "0" },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/users/@me/channels" && method === "POST") {
      const body = parseJsonBody(init?.body);
      assert.equal(body?.recipient_id, "123456789012345678");
      return new Response(JSON.stringify({ id: "dm-feedback-command-forbidden" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/dm-feedback-command-forbidden/messages" && method === "POST") {
      const body = parseJsonBody(init?.body);
      assert.match(body?.content ?? "", /Fawxzzy Commander/);
      assert.equal(body?.message_reference, undefined);
      return new Response(JSON.stringify({ id: "dm-message-2" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/main-message-2/reactions/fawxzzy%3A1507384094424694785/@me" && method === "PUT") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      processed: [
        {
          messageId: "main-message-2",
          ok: false,
          code: "DISCORD_MESSAGE_COMMAND_FORBIDDEN",
          action: null,
        },
      ],
    });
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
    delete process.env.DISCORD_GUILD_ID;
  }
});

test("Discord message command poll posts owner computa post live preset updates", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";
  process.env.DISCORD_UPDATES_CHANNEL_ID = "1504671871512346695";
  process.env.DISCORD_COMPUTA_OWNER_USER_ID = "owner-user";
  process.env.DISCORD_COMPUTA_LIVE_TWITCH_URL = "https://www.twitch.tv/fawxzzy";

  const originalFetch = globalThis.fetch;
  const postedBodies = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      return new Response(JSON.stringify([
        {
          id: "main-message-live-1",
          content: "computa post live twitch",
          author: { id: "owner-user", bot: false },
          reactions: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504671871512346695/messages" && method === "POST") {
      const body = parseJsonBody(init?.body);
      postedBodies.push(body);
      assert.equal(body?.content, "@everyone\n\nGoing live on Twitch https://www.twitch.tv/fawxzzy\n\nPull up");
      assert.deepEqual(body?.allowed_mentions, { parse: ["everyone"] });
      return new Response(JSON.stringify({ id: "updates-live-message-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/users/@me/channels" && method === "POST") {
      const body = parseJsonBody(init?.body);
      assert.equal(body?.recipient_id, "owner-user");
      return new Response(JSON.stringify({ id: "dm-computa-live" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/dm-computa-live/messages" && method === "POST") {
      const body = parseJsonBody(init?.body);
      assert.match(body?.content ?? "", /Live update posted in <#1504671871512346695>/);
      assert.deepEqual(body?.allowed_mentions, { parse: [] });
      return new Response(JSON.stringify({ id: "dm-message-live-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/main-message-live-1/reactions/fawxzzy%3A1507384062166302851/@me" && method === "PUT") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      processed: [
        {
          messageId: "main-message-live-1",
          ok: true,
          code: null,
          action: "posted",
        },
      ],
    });
    assert.equal(postedBodies.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
    delete process.env.DISCORD_UPDATES_CHANNEL_ID;
    delete process.env.DISCORD_COMPUTA_OWNER_USER_ID;
    delete process.env.DISCORD_COMPUTA_LIVE_TWITCH_URL;
  }
});

test("Discord message command poll posts owner computa post live custom link updates", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";
  process.env.DISCORD_UPDATES_CHANNEL_ID = "1504671871512346695";
  process.env.DISCORD_COMPUTA_OWNER_USER_ID = "owner-user";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      return new Response(JSON.stringify([
        {
          id: "main-message-live-2",
          content: "computa post live [https://example.com/stream]",
          author: { id: "owner-user", bot: false },
          reactions: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504671871512346695/messages" && method === "POST") {
      const body = parseJsonBody(init?.body);
      assert.equal(body?.content, "@everyone\n\nGoing live https://example.com/stream\n\nPull up");
      assert.deepEqual(body?.allowed_mentions, { parse: ["everyone"] });
      return new Response(JSON.stringify({ id: "updates-live-message-2" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/users/@me/channels" && method === "POST") {
      return new Response(JSON.stringify({ id: "dm-computa-live-custom" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/dm-computa-live-custom/messages" && method === "POST") {
      return new Response(JSON.stringify({ id: "dm-message-live-2" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/main-message-live-2/reactions/fawxzzy%3A1507384062166302851/@me" && method === "PUT") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      processed: [
        {
          messageId: "main-message-live-2",
          ok: true,
          code: null,
          action: "posted",
        },
      ],
    });
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
    delete process.env.DISCORD_UPDATES_CHANNEL_ID;
    delete process.env.DISCORD_COMPUTA_OWNER_USER_ID;
  }
});

test("Discord message command poll posts owner formatted update cards", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";
  process.env.DISCORD_UPDATES_CHANNEL_ID = "1504671871512346695";
  process.env.DISCORD_COMPUTA_OWNER_USER_ID = "owner-user";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      return new Response(JSON.stringify([
        {
          id: "main-message-update-1",
          content: "computa post update [Discord OS update | Computa commands are cleaner now.]",
          author: { id: "owner-user", bot: false },
          reactions: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504671871512346695/messages" && method === "POST") {
      const body = parseJsonBody(init?.body);
      assert.equal(body?.content, "");
      assert.deepEqual(body?.allowed_mentions, { parse: [] });
      assert.equal(body?.embeds?.[0]?.title, "Discord OS update");
      assert.equal(body?.embeds?.[0]?.description, "Computa commands are cleaner now.");
      assert.equal(body?.embeds?.[0]?.color, 0x22c55e);
      return new Response(JSON.stringify({ id: "updates-formatted-message-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/main-message-update-1/reactions/fawxzzy%3A1507384062166302851/@me" && method === "PUT") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      processed: [
        {
          messageId: "main-message-update-1",
          ok: true,
          code: null,
          action: "posted",
        },
      ],
    });
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
    delete process.env.DISCORD_UPDATES_CHANNEL_ID;
    delete process.env.DISCORD_COMPUTA_OWNER_USER_ID;
  }
});

test("Discord message command poll rejects non-owner computa post live updates", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";
  process.env.DISCORD_UPDATES_CHANNEL_ID = "1504671871512346695";
  process.env.DISCORD_COMPUTA_OWNER_USER_ID = "owner-user";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      return new Response(JSON.stringify([
        {
          id: "main-message-live-3",
          content: "computa post live",
          author: { id: "other-user", bot: false },
          reactions: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/users/@me/channels" && method === "POST") {
      const body = parseJsonBody(init?.body);
      assert.equal(body?.recipient_id, "other-user");
      return new Response(JSON.stringify({ id: "dm-computa-live-forbidden" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/dm-computa-live-forbidden/messages" && method === "POST") {
      const body = parseJsonBody(init?.body);
      assert.match(body?.content ?? "", /Only the configured Fawxzzy owner account/);
      return new Response(JSON.stringify({ id: "dm-message-live-3" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/main-message-live-3/reactions/fawxzzy%3A1507384094424694785/@me" && method === "PUT") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      processed: [
        {
          messageId: "main-message-live-3",
          ok: false,
          code: "DISCORD_COMPUTA_LIVE_FORBIDDEN",
          action: null,
        },
      ],
    });
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
    delete process.env.DISCORD_UPDATES_CHANNEL_ID;
    delete process.env.DISCORD_COMPUTA_OWNER_USER_ID;
  }
});

test("Discord message command poll archives checked feedback cards for commanders", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const patchedThreads = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      return new Response(JSON.stringify([
        {
          id: "main-message-archive",
          content: "computa archive checked cards",
          author: { id: "123456789012345678", bot: false },
          member: { roles: ["commander-role"] },
          reactions: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/roles" && method === "GET") {
      return new Response(JSON.stringify([
        { id: "commander-role", name: "Fawxzzy Commander", permissions: "0" },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/threads/active" && method === "GET") {
      return new Response(JSON.stringify({
        threads: [
          { id: "thread-checked", parent_id: "1504673475489562744", archived: false },
          { id: "thread-legacy-checked", parent_id: "1504673475489562744", archived: false },
          { id: "thread-open", parent_id: "1504673475489562744", archived: false },
          { id: "thread-other", parent_id: "other-forum", archived: false },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/thread-checked/messages/thread-checked" && method === "GET") {
      return new Response(JSON.stringify({
        id: "thread-checked",
        reactions: [{ emoji: { id: "1507384062166302851", name: "fawxzzy" } }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/thread-open/messages/thread-open" && method === "GET") {
      return new Response(JSON.stringify({
        id: "thread-open",
        reactions: [],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/thread-legacy-checked/messages/thread-legacy-checked" && method === "GET") {
      return new Response(JSON.stringify({
        id: "thread-legacy-checked",
        reactions: [{ emoji: { name: "\u2705" } }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/thread-checked" && method === "PATCH") {
      const body = parseJsonBody(init?.body);
      patchedThreads.push(body);
      assert.equal(body?.archived, true);
      assert.equal(body?.locked, true);
      return new Response(JSON.stringify({ id: "thread-checked", archived: true, locked: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/users/@me/channels" && method === "POST") {
      return new Response(JSON.stringify({ id: "dm-archive" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/dm-archive/messages" && method === "POST") {
      const body = parseJsonBody(init?.body);
      assert.match(body?.content ?? "", /Archived 1\/1 checked feedback card/);
      return new Response(JSON.stringify({ id: "dm-archive-message" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/main-message-archive/reactions/fawxzzy%3A1507384062166302851/@me" && method === "PUT") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      processed: [
        {
          messageId: "main-message-archive",
          ok: true,
          code: null,
          action: "archived",
        },
      ],
    });
    assert.equal(patchedThreads.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord message command poll syncs feedback resolved reactions for commanders", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const reactionCalls = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      return new Response(JSON.stringify([
        {
          id: "main-message-sync-reactions",
          content: "computa sync feedback reactions",
          author: { id: "123456789012345678", bot: false },
          member: { roles: ["commander-role"] },
          reactions: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/roles" && method === "GET") {
      return new Response(JSON.stringify([
        { id: "commander-role", name: "Fawxzzy Commander", permissions: "0" },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504673475489562744" && method === "GET") {
      return new Response(JSON.stringify({
        id: "1504673475489562744",
        available_tags: [
          { id: "tag-fixed", name: "Fixed" },
          { id: "tag-closed", name: "Closed" },
          { id: "tag-done", name: "Done" },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/threads/active" && method === "GET") {
      return new Response(JSON.stringify({
        threads: [
          { id: "thread-needs-add", parent_id: "1504673475489562744", archived: false, applied_tags: ["tag-fixed"] },
          { id: "thread-needs-remove", parent_id: "1504673475489562744", archived: false, applied_tags: [] },
          { id: "thread-unchanged", parent_id: "1504673475489562744", archived: false, applied_tags: ["tag-closed"] },
          { id: "thread-legacy-migrate", parent_id: "1504673475489562744", archived: false, applied_tags: ["tag-done"] },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504673475489562744/threads/archived/public" && method === "GET") {
      return new Response(JSON.stringify({
        threads: [
          { id: "thread-archived-legacy", parent_id: "1504673475489562744", archived: true, applied_tags: ["tag-closed"] },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504673475489562744/threads/archived/private" && method === "GET") {
      return new Response(JSON.stringify({ threads: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/thread-needs-add/messages/thread-needs-add" && method === "GET") {
      return new Response(JSON.stringify({ id: "thread-needs-add", reactions: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/thread-needs-remove/messages/thread-needs-remove" && method === "GET") {
      return new Response(JSON.stringify({
        id: "thread-needs-remove",
        reactions: [{ emoji: { id: "1507384062166302851", name: "fawxzzy" } }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/thread-unchanged/messages/thread-unchanged" && method === "GET") {
      return new Response(JSON.stringify({
        id: "thread-unchanged",
        reactions: [{ emoji: { id: "1507384062166302851", name: "fawxzzy" } }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/thread-legacy-migrate/messages/thread-legacy-migrate" && method === "GET") {
      return new Response(JSON.stringify({
        id: "thread-legacy-migrate",
        reactions: [{ emoji: { name: "\u2705" } }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/thread-archived-legacy/messages/thread-archived-legacy" && method === "GET") {
      return new Response(JSON.stringify({
        id: "thread-archived-legacy",
        reactions: [{ emoji: { name: "\u2705" } }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      (
        url.pathname === "/api/v10/channels/thread-needs-add/messages/thread-needs-add/reactions/fawxzzy%3A1507384062166302851/@me"
        && method === "PUT"
      )
      || (
        url.pathname === "/api/v10/channels/thread-needs-remove/messages/thread-needs-remove/reactions/fawxzzy%3A1507384062166302851/@me"
        && method === "DELETE"
      )
      || (
        url.pathname === "/api/v10/channels/thread-legacy-migrate/messages/thread-legacy-migrate/reactions/fawxzzy%3A1507384062166302851/@me"
        && method === "PUT"
      )
      || (
        url.pathname === "/api/v10/channels/thread-legacy-migrate/messages/thread-legacy-migrate/reactions/%E2%9C%85"
        && method === "DELETE"
      )
      || (
        url.pathname === "/api/v10/channels/thread-archived-legacy/messages/thread-archived-legacy/reactions/fawxzzy%3A1507384062166302851/@me"
        && method === "PUT"
      )
      || (
        url.pathname === "/api/v10/channels/thread-archived-legacy/messages/thread-archived-legacy/reactions/%E2%9C%85"
        && method === "DELETE"
      )
    ) {
      reactionCalls.push({ method, pathname: url.pathname });
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages/main-message-sync-reactions/reactions/fawxzzy%3A1507384062166302851/@me" && method === "PUT") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      processed: [
        {
          messageId: "main-message-sync-reactions",
          ok: true,
          code: null,
          action: "synced",
        },
      ],
    });
    assert.deepEqual(reactionCalls.map((call) => call.method).sort(), ["DELETE", "DELETE", "DELETE", "PUT", "PUT", "PUT"]);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
    delete process.env.DISCORD_GUILD_ID;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord message command poll skips messages already marked processed", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";

  const originalFetch = globalThis.fetch;
  let fetchCount = 0;

  globalThis.fetch = async (input, init) => {
    fetchCount += 1;
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      return new Response(JSON.stringify([
        {
          id: "main-message-3",
          content: "computa setup feedback",
          author: { id: "123456789012345678", bot: false },
          reactions: [{ me: true, emoji: { id: "1507384062166302851", name: "fawxzzy" } }],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, processed: [] });
    assert.equal(fetchCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
  }
});

test("Discord message command poll skips a greeting command that was already claimed by another worker", async () => {
  process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET = "poll-secret";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_MAIN_CHANNEL_ID = "1504668396338413671";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.NODE_ENV = "production";

  const originalFetch = globalThis.fetch;
  let greetingPostAttempted = false;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      return new Response(JSON.stringify([
        {
          id: "main-message-grand-rising",
          content: "good morning computa",
          channel_id: "1504668396338413671",
          author: { id: "123456789012345678", bot: false },
          reactions: [],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_message_command_claims") && method === "POST") {
      return new Response(JSON.stringify({
        code: "23505",
        message: "duplicate key value violates unique constraint",
      }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "POST") {
      greetingPostAttempted = true;
      throw new Error("Greeting message should not post after a duplicate claim.");
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await GET(new Request("http://localhost/api/discord/interactions", {
      method: "GET",
      headers: { authorization: "Bearer poll-secret" },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, processed: [] });
    assert.equal(greetingPostAttempted, false);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_MESSAGE_COMMAND_POLL_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_MAIN_CHANNEL_ID;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NODE_ENV;
  }
});

test("Discord interactions route opens the feedback panel submit modal without pre-response fetches", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;

  globalThis.fetch = async () => {
    fetchCallCount += 1;
    throw new Error("Feedback submit button must not fetch before opening the modal.");
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 3,
      data: {
        custom_id: "fitness_feedback_submit_open",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.type, 9);
    assert.equal(payload.data.custom_id, "fitness_feedback_submit_modal");
    assert.equal(payload.data.title, "Submit Feedback");
    assert.equal(payload.data.components[0]?.components[0]?.custom_id, "feedback_type");
    assert.equal(payload.data.components[0]?.components[0]?.type, 4);
    assert.equal(payload.data.components[3]?.components[0]?.custom_id, "bug_details");
    assert.equal(payload.data.components.some((row) => row?.type === 18), false);
    assert.equal(JSON.stringify(payload.data).includes("\"type\":19"), false);
    assert.equal(JSON.stringify(payload.data).includes("\"type\":3"), false);
    assert.equal(fetchCallCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route defers feedback submit and edits the original ephemeral response after success", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedRequests = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    observedRequests.push({ path: url.pathname, method, body });

    if (url.pathname === "/api/v10/interactions/interaction-1/interaction-token/callback") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && method === "HEAD") {
      return new Response(null, { status: 200, headers: { "content-range": "0-0/0" } });
    }

    if (url.pathname.endsWith("/rest/v1/discord_member_links")) {
      return new Response(JSON.stringify({
        fitness_user_id: "00000000-0000-0000-0000-000000000123",
        user_number: 4,
        user_kind: "human",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && method === "GET") {
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && method === "POST") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        discord_forum_channel_id: null,
        discord_forum_thread_id: null,
        discord_forum_message_id: null,
        discord_forum_applied_tag_ids: null,
        discord_forum_title: null,
      })), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504673475489562744") {
      return new Response(JSON.stringify({
        id: "1504673475489562744",
        available_tags: [
          { id: "tag-bug", name: "Bug" },
          { id: "tag-new", name: "New" },
          { id: "tag-medium", name: "Medium" },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504673475489562744/threads") {
      return new Response(JSON.stringify({
        id: "1504673475489562745",
        last_message_id: "1504673475489562746",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && method === "PATCH") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/webhooks/1504700208251146371/interaction-token/messages/@original") {
      return new Response(JSON.stringify({ id: "original-message" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "interaction-1",
      application_id: "1504700208251146371",
      token: "interaction-token",
      type: 5,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_feedback_submit_modal",
        components: [
          {
            type: 18,
            label: "Feedback type",
            component: { type: 3, custom_id: "feedback_type", values: ["bug"] },
          },
          { type: 1, components: [{ type: 4, custom_id: "bug_summary", value: "Token copy button failed" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_area", value: "Settings" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_details", value: "I tapped Copy and nothing happened." }] },
          { type: 18, label: "Screenshot or image", component: { type: 19, custom_id: "feedback_attachment", values: [] } },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 202);
    const deferCall = observedRequests.find((entry) => entry.path === "/api/v10/interactions/interaction-1/interaction-token/callback");
    const editCall = observedRequests.find((entry) => entry.path === "/api/v10/webhooks/1504700208251146371/interaction-token/messages/@original");
    assert.deepEqual(deferCall?.body, {
      type: 5,
      data: {
        flags: 64,
      },
    });
    assert.deepEqual(editCall?.body, {
      content: "Feedback received. Thanks for helping improve Fitness.",
    });
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route sends a feedback submit followup when editing the deferred response fails", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;

  const originalFetch = globalThis.fetch;
  const observedRequests = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    observedRequests.push({ path: url.pathname, method, body });

    if (url.pathname === "/api/v10/interactions/interaction-1/interaction-token/callback") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && method === "HEAD") {
      return new Response(null, { status: 200, headers: { "content-range": "0-0/0" } });
    }

    if (url.pathname.endsWith("/rest/v1/discord_member_links")) {
      return new Response("null", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && method === "GET") {
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && method === "POST") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        reporter_fitness_user_id: null,
        reporter_member_number: null,
        reporter_user_kind: null,
        discord_forum_channel_id: null,
        discord_forum_thread_id: null,
        discord_forum_message_id: null,
        discord_forum_applied_tag_ids: null,
        discord_forum_title: null,
      })), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/webhooks/1504700208251146371/interaction-token/messages/@original") {
      return new Response(JSON.stringify({ message: "Original response expired" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/webhooks/1504700208251146371/interaction-token") {
      return new Response(JSON.stringify({ id: "followup-message" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "interaction-1",
      application_id: "1504700208251146371",
      token: "interaction-token",
      type: 5,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_feedback_submit_modal",
        components: [
          {
            type: 18,
            label: "Feedback type",
            component: { type: 3, custom_id: "feedback_type", values: ["bug"] },
          },
          { type: 1, components: [{ type: 4, custom_id: "bug_summary", value: "Token copy button failed" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_area", value: "Settings" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_details", value: "I tapped Copy and nothing happened." }] },
          { type: 18, label: "Screenshot or image", component: { type: 19, custom_id: "feedback_attachment", values: [] } },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 202);
    const followupCall = observedRequests.find((entry) => entry.path === "/api/v10/webhooks/1504700208251146371/interaction-token" && entry.method === "POST");
    assert.deepEqual(followupCall?.body, {
      content: "Feedback received. Thanks for helping improve Fitness.",
      flags: 64,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route accepts feedback even when the forum env is not configured", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;

  const originalFetch = globalThis.fetch;
  let discordCallCount = 0;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));

    if (url.pathname.endsWith("/rest/v1/discord_member_links")) {
      return new Response("null", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "content-range": "0-0/0" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "POST") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        reporter_fitness_user_id: null,
        reporter_member_number: null,
        reporter_user_kind: null,
        discord_forum_channel_id: null,
        discord_forum_thread_id: null,
        discord_forum_message_id: null,
        discord_forum_applied_tag_ids: null,
        discord_forum_title: null,
      })), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com") {
      discordCallCount += 1;
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "interaction-1",
      type: 5,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_feedback_submit_modal",
        components: [
          { type: 1, components: [{ type: 4, custom_id: "feedback_type", value: "Bug" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_summary", value: "Token copy button failed" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_area", value: "Settings" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_severity", value: "medium" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_details", value: "I tapped Copy and nothing happened." }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_steps", value: "Open Settings -> Account -> Generate token -> tap Copy" }] },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback received. Thanks for helping improve Fitness.",
        flags: 64,
      },
    });
    assert.equal(discordCallCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route stores bounded image attachment metadata without file bytes", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const originalFetch = globalThis.fetch;
  let insertedBody = null;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_member_links")) {
      return new Response("null", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "content-range": "0-0/0" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "POST") {
      insertedBody = body;
      return new Response(JSON.stringify(buildFeedbackReportRow({
        attachment_count: 1,
        attachment_metadata: body?.attachment_metadata ?? null,
        discord_forum_channel_id: null,
        discord_forum_thread_id: null,
        discord_forum_message_id: null,
        discord_forum_applied_tag_ids: null,
        discord_forum_title: null,
      })), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "interaction-attachments",
      type: 5,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_feedback_submit_modal",
        components: [
          {
            type: 18,
            label: "Feedback type",
            component: { type: 3, custom_id: "feedback_type", values: ["bug"] },
          },
          { type: 1, components: [{ type: 4, custom_id: "bug_summary", value: "Screenshot test" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_area", value: "Settings" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_details", value: "Image evidence attached." }] },
          {
            type: 18,
            label: "Screenshot or image",
            component: { type: 19, custom_id: "feedback_attachment", values: ["att-1"] },
          },
        ],
        resolved: {
          attachments: {
            "att-1": {
              id: "att-1",
              filename: "bug.png",
              content_type: "image/png",
              size: 241394,
              url: "https://cdn.discordapp.com/ephemeral-attachments/bug.png",
              proxy_url: "https://media.discordapp.net/ephemeral-attachments/bug.png",
            },
          },
        },
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.equal(insertedBody?.attachment_count, 1);
    assert.deepEqual(insertedBody?.attachment_metadata, [
      {
        id: "att-1",
        filename: "bug.png",
        contentType: "image/png",
        size: 241394,
        url: "https://cdn.discordapp.com/ephemeral-attachments/bug.png",
        proxyUrl: "https://media.discordapp.net/ephemeral-attachments/bug.png",
      },
    ]);
    assert.equal(JSON.stringify(insertedBody).includes("placeholder"), false);
    assert.equal(JSON.stringify(insertedBody).includes("base64"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route rejects non-image feedback attachments safely", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const response = await POST(createSignedRequest(JSON.stringify({
    id: "interaction-invalid-attachment",
    type: 5,
    guild_id: "1504668396338413670",
    member: {
      user: {
        id: "123456789012345678",
        username: "zac",
      },
    },
    data: {
      custom_id: "fitness_feedback_submit_modal",
      components: [
        {
          type: 18,
          label: "Feedback type",
          component: { type: 3, custom_id: "feedback_type", values: ["bug"] },
        },
        { type: 1, components: [{ type: 4, custom_id: "bug_summary", value: "Attachment reject test" }] },
        { type: 1, components: [{ type: 4, custom_id: "bug_area", value: "Settings" }] },
        { type: 1, components: [{ type: 4, custom_id: "bug_details", value: "A text file was attached." }] },
        {
          type: 18,
          label: "Screenshot or image",
          component: { type: 19, custom_id: "feedback_attachment", values: ["att-2"] },
        },
      ],
      resolved: {
        attachments: {
          "att-2": {
            id: "att-2",
            filename: "notes.txt",
            content_type: "text/plain",
            size: 42,
            url: "https://cdn.discordapp.com/ephemeral-attachments/notes.txt",
            proxy_url: "https://media.discordapp.net/ephemeral-attachments/notes.txt",
          },
        },
      },
    },
  }), keyPair));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    type: 4,
    data: {
      content: "Upload up to 3 PNG, JPG, WEBP, or GIF images under 8 MB each.",
      flags: 64,
    },
  });
});

test("Discord interactions route stores unique feature feedback and creates a tagged forum thread", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];
  const observedSupabaseWrites = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "content-range": "0-0/0" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_member_links")) {
      return new Response(JSON.stringify({
        fitness_user_id: "00000000-0000-0000-0000-000000000123",
        user_number: 4,
        user_kind: "human",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "POST") {
      observedSupabaseWrites.push({ method: "POST", body });
      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "feature",
        summary: "Let me share a routine",
        area: "Routines",
        discord_forum_channel_id: null,
        discord_forum_thread_id: null,
        discord_forum_message_id: null,
        discord_forum_applied_tag_ids: null,
        discord_forum_title: null,
      })), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "PATCH") {
      observedSupabaseWrites.push({ method: "PATCH", body });
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744") {
      observedDiscordBodies.push({ path: url.pathname, method: "GET", body: null });
      return new Response(JSON.stringify({
        id: "1504673475489562744",
        available_tags: [
          { id: "tag-feature", name: "Feature" },
          { id: "tag-new", name: "New" },
          { id: "tag-medium", name: "Medium" },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744/threads") {
      observedDiscordBodies.push({ path: url.pathname, method: "POST", body });
      return new Response(JSON.stringify({
        id: "1504673475489562745",
        last_message_id: "1504673475489562746",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "interaction-1",
      type: 5,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_feedback_submit_modal",
        components: [
          { type: 1, components: [{ type: 4, custom_id: "feedback_type", value: "Feature" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_summary", value: "Let me share a routine" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_area", value: "Routines" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_severity", value: "medium" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_details", value: "I want to share a routine with friends." }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_steps", value: "Add a share button https://example.com/mock" }] },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback received. Thanks for helping improve Fitness.",
        flags: 64,
      },
    });
    assert.equal(observedSupabaseWrites[0]?.body?.report_type, "feature");
    assert.equal(observedDiscordBodies[1]?.body?.name, "Feature: Routines — Let me share a routine");
    assert.deepEqual(observedDiscordBodies[1]?.body?.applied_tags, ["tag-feature", "tag-new"]);
    assert.match(observedDiscordBodies[1]?.body?.message?.content ?? "", /\*\*Feature Request\*\*/);
    assert.deepEqual(observedDiscordBodies[1]?.body?.message?.allowed_mentions, {
      parse: [],
      users: ["123456789012345678"],
      replied_user: false,
    });
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route keeps feedback submission successful when forum decoration falls back", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";
  process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID = "1505007702924068916";
  process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID = "1505007651308703877";

  const originalFetch = globalThis.fetch;
  const observedThreadBodies = [];
  let metadataPatchCount = 0;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "content-range": "0-0/0" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_member_links")) {
      return new Response(JSON.stringify({
        fitness_user_id: "00000000-0000-0000-0000-000000000123",
        user_number: 4,
        user_kind: "human",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "POST") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "bug",
        discord_forum_channel_id: null,
        discord_forum_thread_id: null,
        discord_forum_message_id: null,
        discord_forum_applied_tag_ids: null,
        discord_forum_title: null,
      })), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "PATCH") {
      metadataPatchCount += 1;
      return new Response(JSON.stringify({ message: "db patch failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744") {
      return new Response(JSON.stringify({
        id: "1504673475489562744",
        available_tags: [
          { id: "tag-bug", name: "Bug" },
          { id: "tag-new", name: "New" },
          { id: "tag-medium", name: "Medium" },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744/threads") {
      observedThreadBodies.push(body);

      if (body.applied_tags?.length) {
        return new Response(JSON.stringify({ message: "Invalid Form Body", code: "COMPONENT_INVALID_EMOJI" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        id: "1504673475489562745",
        last_message_id: "1504673475489562746",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "interaction-1",
      type: 5,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_feedback_submit_modal",
        components: [
          { type: 1, components: [{ type: 4, custom_id: "feedback_type", value: "Bug" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_summary", value: "Token copy button failed" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_area", value: "Settings" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_severity", value: "medium" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_details", value: "I tapped Copy and nothing happened." }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_steps", value: "Open Settings -> Account -> Generate token -> tap Copy" }] },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback received. Thanks for helping improve Fitness.",
        flags: 64,
      },
    });
    assert.equal(observedThreadBodies.length, 2);
    assert.deepEqual(observedThreadBodies[0]?.applied_tags, ["tag-bug", "tag-new", "tag-medium"]);
    assert.equal(observedThreadBodies[1]?.applied_tags, undefined);
    assert.doesNotMatch(observedThreadBodies[1]?.message?.content ?? "", /<:/);
    assert.equal(metadataPatchCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
    delete process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID;
    delete process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID;
  }
});

test("Discord interactions route returns a soft success when the forum thread cannot be created", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  let threadAttemptCount = 0;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "content-range": "0-0/0" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_member_links")) {
      return new Response("null", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "POST") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        reporter_fitness_user_id: null,
        reporter_member_number: null,
        reporter_user_kind: null,
        discord_forum_channel_id: null,
        discord_forum_thread_id: null,
        discord_forum_message_id: null,
        discord_forum_applied_tag_ids: null,
        discord_forum_title: null,
      })), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744") {
      return new Response(JSON.stringify({
        id: "1504673475489562744",
        available_tags: [
          { id: "tag-bug", name: "Bug" },
          { id: "tag-new", name: "New" },
          { id: "tag-medium", name: "Medium" },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744/threads") {
      threadAttemptCount += 1;
      return new Response(JSON.stringify({ message: "Discord forum unavailable" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "interaction-1",
      type: 5,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_feedback_submit_modal",
        components: [
          { type: 1, components: [{ type: 4, custom_id: "feedback_type", value: "Bug" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_summary", value: "Token copy button failed" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_area", value: "Settings" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_severity", value: "medium" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_details", value: "I tapped Copy and nothing happened." }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_steps", value: "Open Settings -> Account -> Generate token -> tap Copy" }] },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback received, but Discord could not create the forum post yet. The team can still review it.",
        flags: 64,
      },
    });
    assert.equal(threadAttemptCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route folds duplicate feedback and posts only a compact forum reply without pinging the reporter", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];
  const observedSupabaseWrites = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "content-range": "0-0/0" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_member_links")) {
      return new Response(JSON.stringify({
        fitness_user_id: "00000000-0000-0000-0000-000000000123",
        user_number: 7,
        user_kind: "human",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response(JSON.stringify([buildFeedbackReportRow({
        reporter_discord_username: null,
        reporter_member_number: 4,
        duplicate_count: 2,
        last_seen_at: "2026-05-14T13:00:00.000Z",
      })]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "PATCH") {
      observedSupabaseWrites.push(body);
      return new Response(JSON.stringify(buildFeedbackReportRow({
        reporter_member_number: 4,
        duplicate_count: 3,
        last_seen_at: "2026-05-15T13:00:00.000Z",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages") {
      observedDiscordBodies.push(body);
      return new Response(JSON.stringify({ id: "discord-message-2" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "interaction-2",
      type: 5,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "999999999999999999",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_feedback_submit_modal",
        components: [
          { type: 1, components: [{ type: 4, custom_id: "feedback_type", value: "Bug" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_summary", value: "Token copy button failed" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_area", value: "Settings" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_severity", value: "medium" }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_details", value: "Same bug again." }] },
          { type: 1, components: [{ type: 4, custom_id: "bug_steps", value: "Repeat the same steps https://example.com/other.png" }] },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback received. It looks similar to an existing report, so we added your signal to that issue.",
        flags: 64,
      },
    });
    assert.equal(observedSupabaseWrites[0]?.duplicate_count, 3);
    assert.equal(observedDiscordBodies[0]?.content, "Duplicate signal added.\nDuplicate signals: 3");
    assert.deepEqual(observedDiscordBodies[0]?.allowed_mentions, {
      parse: [],
      replied_user: false,
    });
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route rejects feedback-status for users without staff permissions", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);

  const response = await POST(createSignedRequest(JSON.stringify({
    type: 2,
    guild_id: "1504668396338413670",
    member: {
      permissions: "0",
      user: {
        id: "123456789012345678",
        username: "zac",
      },
    },
    data: {
      name: "feedback-status",
      options: [
        { type: 3, name: "report_id", value: "11111111-1111-4111-8111-111111111111" },
        { type: 3, name: "status", value: "confirmed" },
      ],
    },
  }), keyPair));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    type: 4,
    data: {
      content: "You do not have permission to update feedback.",
      flags: 64,
    },
  });
});

test("Discord interactions route rejects feedback update modal submissions from other users", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "feature",
        area: "Routines",
        summary: "Let me share a routine",
        discord_forum_applied_tag_ids: ["tag-feature", "tag-new", "tag-medium"],
        discord_forum_title: "Feature: Routines — Let me share a routine",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 5,
      guild_id: "1504668396338413670",
      member: {
        permissions: "0",
        user: {
          id: "999999999999999999",
          username: "other-user",
        },
      },
      data: {
        custom_id: "fitness_feedback_update_edit_modal:11111111-1111-4111-8111-111111111111",
        components: [
          { type: 18, label: "Title", component: { type: 4, custom_id: "bug_summary", value: "Let me share a routine" } },
          { type: 18, label: "Area", component: { type: 4, custom_id: "bug_area", value: "Routines" } },
          { type: 18, label: "Description / what happened", component: { type: 4, custom_id: "bug_details", value: "Here are more details." } },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "You can only update feedback you submitted.",
        flags: 64,
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route rejects fix as a submit-modal feedback type", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);

  const response = await POST(createSignedRequest(JSON.stringify({
    id: "interaction-fix",
    type: 5,
    guild_id: "1504668396338413670",
    member: {
      user: {
        id: "123456789012345678",
        username: "zac",
      },
    },
    data: {
      custom_id: "fitness_feedback_submit_modal",
      components: [
        { type: 1, components: [{ type: 4, custom_id: "feedback_type", value: "Fix" }] },
        { type: 1, components: [{ type: 4, custom_id: "bug_summary", value: "Rep counter alignment issue" }] },
        { type: 1, components: [{ type: 4, custom_id: "bug_area", value: "Session" }] },
        { type: 1, components: [{ type: 4, custom_id: "bug_severity", value: "medium" }] },
        { type: 1, components: [{ type: 4, custom_id: "bug_details", value: "The numbers do not line up." }] },
        { type: 1, components: [{ type: 4, custom_id: "bug_steps", value: "Start a session and compare rows." }] },
      ],
    },
  }), keyPair));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    type: 4,
    data: {
      content: "Choose Bug or Feature for the feedback type.",
      flags: 64,
    },
  });
});

test("Discord interactions route syncs feature feedback-status into Supabase and forum tags", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];
  const observedSupabaseWrites = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "feature",
        status: "new",
        area: "Routines",
        summary: "Let me share a routine",
        discord_forum_applied_tag_ids: ["tag-feature", "tag-new", "tag-medium"],
        discord_forum_title: "Feature: Routines — Let me share a routine",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "PATCH") {
      observedSupabaseWrites.push(body);
      if (observedSupabaseWrites.length === 1) {
        return new Response(JSON.stringify(buildFeedbackReportRow({
          report_type: "feature",
          status: "needs_info",
          area: "Routines",
          summary: "Let me share a routine",
          status_updated_at: "2026-05-15T14:00:00.000Z",
          status_updated_by_discord_user_id: "222222222222222222",
          status_note: "Can you share the exact screen?",
        })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744") {
      observedDiscordBodies.push({ path: url.pathname, method: "GET", body: null });
      return new Response(JSON.stringify({
        id: "1504673475489562744",
        available_tags: [
          { id: "tag-feature", name: "Feature" },
          { id: "tag-needs-info", name: "Needs Info" },
          { id: "tag-medium", name: "Medium" },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745") {
      observedDiscordBodies.push({ path: url.pathname, method: String(init?.method ?? "GET"), body });
      return new Response(JSON.stringify({ id: "1504673475489562745" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages/1504673475489562746") {
      observedDiscordBodies.push({ path: url.pathname, method: "PATCH", body });
      return new Response(JSON.stringify({ id: "1504673475489562746" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages") {
      observedDiscordBodies.push({ path: url.pathname, method: "POST", body });
      return new Response(JSON.stringify({ id: "discord-message-3" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(3)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "feedback-status",
        options: [
          { type: 3, name: "report_id", value: "11111111-1111-4111-8111-111111111111" },
          { type: 3, name: "status", value: "needs_info" },
          { type: 3, name: "note", value: "Can you share the exact screen?" },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback updated.",
        flags: 64,
      },
    });
    assert.equal(observedSupabaseWrites[0]?.status, "needs_info");
    assert.equal(observedSupabaseWrites[1]?.discord_forum_title, "Feature: Routines — Let me share a routine");
    assert.deepEqual(observedSupabaseWrites[1]?.discord_forum_applied_tag_ids, ["tag-feature", "tag-needs-info"]);
    const starterPatch = observedDiscordBodies.find((entry) => entry.path.endsWith("/messages/1504673475489562746"));
    const auditReply = observedDiscordBodies.find((entry) => entry.path === "/api/v10/channels/1504673475489562745/messages");
    assert.match(starterPatch?.body?.content ?? "", /\*\*Feature Request\*\*/);
    assert.match(starterPatch?.body?.content ?? "", /\*\*Description\*\*/);
    assert.doesNotMatch(starterPatch?.body?.content ?? "", /Severity:/);
    assert.match(auditReply?.body?.content ?? "", /Status: New -> Needs Info/);
    assert.match(auditReply?.body?.content ?? "", /Note: Can you share the exact screen\?/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route lets the reporter edit the live feedback card from the panel flow", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];
  const observedSupabaseWrites = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname === "/api/v10/interactions/interaction-update/interaction-token/callback") {
      observedDiscordBodies.push({ path: url.pathname, method, body });
      return new Response(null, { status: 204 });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && method === "GET") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "feature",
        area: "Routines",
        summary: "Let me share a routine",
        discord_forum_applied_tag_ids: ["tag-feature", "tag-new", "tag-medium"],
        discord_forum_title: "Feature: Routines — Let me share a routine",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && method === "PATCH") {
      observedSupabaseWrites.push(body);
      if (observedSupabaseWrites.length === 1) {
        return new Response(JSON.stringify(buildFeedbackReportRow({
          report_type: "feature",
          area: "Community",
          summary: "Let me share routines with friends",
          details: "Make the share flow visible from the routine screen.",
          last_seen_at: "2026-05-15T14:10:00.000Z",
          updated_at: "2026-05-15T14:10:00.000Z",
        })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744") {
      observedDiscordBodies.push({ path: url.pathname, method, body: null });
      return new Response(JSON.stringify({
        id: "1504673475489562744",
        available_tags: [
          { id: "tag-feature", name: "Feature" },
          { id: "tag-new", name: "New" },
          { id: "tag-medium", name: "Medium" },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745") {
      observedDiscordBodies.push({ path: url.pathname, method, body });
      return new Response(JSON.stringify({ id: "1504673475489562745" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages/1504673475489562746") {
      observedDiscordBodies.push({ path: url.pathname, method, body });
      return new Response(JSON.stringify({ id: "1504673475489562746" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages") {
      observedDiscordBodies.push({ path: url.pathname, method, body });
      return new Response(JSON.stringify({ id: "discord-message-update" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/webhooks/1504700208251146371/interaction-token/messages/@original") {
      observedDiscordBodies.push({ path: url.pathname, method, body });
      return new Response(JSON.stringify({ id: "original-message" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "interaction-update",
      application_id: "1504700208251146371",
      token: "interaction-token",
      type: 5,
      guild_id: "1504668396338413670",
      member: {
        permissions: "0",
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_feedback_update_edit_modal:11111111-1111-4111-8111-111111111111",
        components: [
          { type: 18, label: "Title", component: { type: 4, custom_id: "bug_summary", value: "Let me share routines with friends" } },
          { type: 18, label: "Area", component: { type: 4, custom_id: "bug_area", value: "Community" } },
          { type: 18, label: "Description / what happened", component: { type: 4, custom_id: "bug_details", value: "Make the share flow visible from the routine screen." } },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 202);
    const deferCall = observedDiscordBodies.find((entry) => entry.path === "/api/v10/interactions/interaction-update/interaction-token/callback");
    const editCall = observedDiscordBodies.find((entry) => entry.path === "/api/v10/webhooks/1504700208251146371/interaction-token/messages/@original");
    assert.deepEqual(deferCall?.body, {
      type: 5,
      data: {
        flags: 64,
      },
    });
    assert.deepEqual(editCall?.body, {
      content: "Feedback updated.",
    });
    assert.equal(observedSupabaseWrites[0]?.summary, "Let me share routines with friends");
    assert.equal(observedSupabaseWrites[0]?.area, "Community");
    assert.equal(observedSupabaseWrites[0]?.details, "Make the share flow visible from the routine screen.");
    const starterPatch = observedDiscordBodies.find((entry) => entry.path === "/api/v10/channels/1504673475489562745/messages/1504673475489562746");
    assert.match(starterPatch?.body?.content ?? "", /Let me share routines with friends/);
    assert.match(starterPatch?.body?.content ?? "", /Community/);
    const updateReply = observedDiscordBodies.find((entry) => entry.path === "/api/v10/channels/1504673475489562745/messages");
    assert.match(updateReply?.body?.content ?? "", /Reporter added an update\./);
    assert.match(updateReply?.body?.content ?? "", /Edited fields: Title, Area, Description\./);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route allows reporters to withdraw and redact feature feedback", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];
  const observedSupabaseWrites = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "feature",
        area: "Routines",
        summary: "Let me share a routine",
        discord_forum_applied_tag_ids: ["tag-feature", "tag-new", "tag-medium"],
        discord_forum_title: "Feature: Routines — Let me share a routine",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "PATCH") {
      observedSupabaseWrites.push(body);
      if (observedSupabaseWrites.length === 1) {
        return new Response(JSON.stringify(buildFeedbackReportRow({
          report_type: "feature",
          status: "withdrawn",
          area: "Routines",
          summary: "Let me share a routine",
          details: null,
          steps_to_reproduce: null,
          screenshot_url: null,
          details_pruned: true,
          status_note: "Withdrawn by reporter",
        })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744") {
      return new Response(JSON.stringify({
        id: "1504673475489562744",
        available_tags: [
          { id: "tag-feature", name: "Feature" },
          { id: "tag-withdrawn", name: "Withdrawn" },
          { id: "tag-medium", name: "Medium" },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745" && String(init?.method ?? "GET") === "PATCH") {
      observedDiscordBodies.push({ path: url.pathname, method: "PATCH", body });
      return new Response(JSON.stringify({ id: "1504673475489562745" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages/1504673475489562746") {
      observedDiscordBodies.push({ path: url.pathname, method: "PATCH", body });
      return new Response(JSON.stringify({ id: "1504673475489562746" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages") {
      observedDiscordBodies.push({ path: url.pathname, method: "POST", body });
      return new Response(JSON.stringify({ id: "discord-message-withdraw" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745" && String(init?.method ?? "GET") === "DELETE") {
      observedDiscordBodies.push({ path: url.pathname, method: "DELETE", body });
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: "0",
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        name: "feedback-withdraw",
        options: [
          {
            type: 3,
            name: "report_id",
            value: "https://discord.com/channels/1504668396338413670/1504673475489562745/1504673475489562746",
          },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback withdrawn. The forum post was removed and we kept a small audit record.",
        flags: 64,
      },
    });
    assert.equal(observedSupabaseWrites[0]?.status, "withdrawn");
    assert.equal(observedSupabaseWrites[0]?.details, null);
    assert.equal(observedSupabaseWrites[0]?.steps_to_reproduce, null);
    assert.equal(observedSupabaseWrites[0]?.screenshot_url, null);
    assert.equal(observedSupabaseWrites[1]?.discord_forum_applied_tag_ids?.[0], "tag-feature");
    assert.equal(observedSupabaseWrites[1]?.discord_forum_applied_tag_ids?.[1], "tag-withdrawn");
    const starterPatch = observedDiscordBodies.find((entry) => entry.path.endsWith("/messages/1504673475489562746") && entry.method === "PATCH");
    assert.match(starterPatch?.body?.content ?? "", /Status: Withdrawn/);
    assert.match(starterPatch?.body?.content ?? "", /\*\*Description\*\*\s+Not provided/);
    assert.doesNotMatch(starterPatch?.body?.content ?? "", /Severity:/);
    assert.deepEqual(starterPatch?.body?.allowed_mentions, {
      parse: [],
      users: [],
      roles: [],
      replied_user: false,
    });
    const withdrawAuditComment = observedDiscordBodies.find((entry) => entry.path.endsWith("/messages") && entry.method === "POST");
    assert.equal(
      withdrawAuditComment?.body?.content,
      "Feedback withdrawn by reporter.\nDetails and attachments were removed from the public card.",
    );
    assert.equal(
      observedDiscordBodies.some((entry) => entry.path === "/api/v10/channels/1504673475489562745" && entry.method === "DELETE"),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route reuses withdraw logic for the feedback withdraw modal", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];
  const observedSupabaseWrites = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname === "/api/v10/interactions/interaction-withdraw/interaction-token/callback") {
      observedDiscordBodies.push({ path: url.pathname, method, body });
      return new Response(null, { status: 204 });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && method === "GET") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "feature",
        area: "Routines",
        summary: "Let me share a routine",
        discord_forum_applied_tag_ids: ["tag-feature", "tag-new", "tag-medium"],
        discord_forum_title: "Feature: Routines — Let me share a routine",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && method === "PATCH") {
      observedSupabaseWrites.push(body);
      if (observedSupabaseWrites.length === 1) {
        return new Response(JSON.stringify(buildFeedbackReportRow({
          report_type: "feature",
          status: "withdrawn",
          area: "Routines",
          summary: "Let me share a routine",
          details: null,
          steps_to_reproduce: null,
          screenshot_url: null,
          details_pruned: true,
          status_note: "Withdrawing because I solved it.",
        })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744") {
      return new Response(JSON.stringify({
        id: "1504673475489562744",
        available_tags: [
          { id: "tag-bug", name: "Bug" },
          { id: "tag-withdrawn", name: "Withdrawn" },
          { id: "tag-medium", name: "Medium" },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745" && method === "PATCH") {
      observedDiscordBodies.push({ path: url.pathname, method, body });
      return new Response(JSON.stringify({ id: "1504673475489562745" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages/1504673475489562746") {
      observedDiscordBodies.push({ path: url.pathname, method, body });
      return new Response(JSON.stringify({ id: "1504673475489562746" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages") {
      observedDiscordBodies.push({ path: url.pathname, method, body });
      return new Response(JSON.stringify({ id: "discord-message-withdraw-modal" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745" && method === "DELETE") {
      observedDiscordBodies.push({ path: url.pathname, method, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/webhooks/1504700208251146371/interaction-token/messages/@original") {
      observedDiscordBodies.push({ path: url.pathname, method, body });
      return new Response(JSON.stringify({ id: "original-message" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "interaction-withdraw",
      application_id: "1504700208251146371",
      token: "interaction-token",
      type: 5,
      guild_id: "1504668396338413670",
      member: {
        permissions: "0",
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_feedback_withdraw_modal",
        components: [
          { type: 1, components: [{ type: 4, custom_id: "feedback_withdraw_report_id", value: "11111111-1111-4111-8111-111111111111" }] },
          { type: 1, components: [{ type: 4, custom_id: "feedback_withdraw_note", value: "Withdrawing because I solved it." }] },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 202);
    const deferCall = observedDiscordBodies.find((entry) => entry.path === "/api/v10/interactions/interaction-withdraw/interaction-token/callback");
    const editCall = observedDiscordBodies.find((entry) => entry.path === "/api/v10/webhooks/1504700208251146371/interaction-token/messages/@original");
    assert.deepEqual(deferCall?.body, {
      type: 5,
      data: {
        flags: 64,
      },
    });
    assert.deepEqual(editCall?.body, {
      content: "Feedback withdrawn. The forum post was removed and we kept a small audit record.",
    });
    assert.equal(observedSupabaseWrites[0]?.status_note, "Withdrawing because I solved it.");
    const withdrawAuditComment = observedDiscordBodies.find((entry) => entry.path.endsWith("/messages") && entry.method === "POST");
    assert.equal(
      withdrawAuditComment?.body?.content,
      "Feedback withdrawn by reporter.\nDetails and attachments were removed from the public card.",
    );
    assert.equal(observedDiscordBodies.some((entry) => entry.method === "DELETE"), true);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route archives duplicate feedback threads after staff marks them duplicate", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];
  const observedSupabaseWrites = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        status: "confirmed",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "PATCH") {
      observedSupabaseWrites.push(body);
      if (observedSupabaseWrites.length === 1) {
        return new Response(JSON.stringify(buildFeedbackReportRow({
          status: "duplicate",
          status_updated_at: "2026-05-15T14:00:00.000Z",
          status_updated_by_discord_user_id: "222222222222222222",
          status_note: "Matches existing login report.",
        })), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(buildFeedbackReportRow({
        status: "duplicate",
        status_updated_at: "2026-05-15T14:00:00.000Z",
        status_updated_by_discord_user_id: "222222222222222222",
        status_note: "Matches existing login report.",
        completion_review_status: "not_required",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744") {
      return new Response(JSON.stringify({
        id: "1504673475489562744",
        available_tags: [
          { id: "tag-bug", name: "Bug" },
          { id: "tag-duplicate", name: "Duplicate" },
          { id: "tag-medium", name: "Medium" },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745") {
      observedDiscordBodies.push({ path: url.pathname, method: String(init?.method ?? "GET"), body });
      return new Response(JSON.stringify({ id: "1504673475489562745" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages/1504673475489562746") {
      observedDiscordBodies.push({ path: url.pathname, method: "PATCH", body });
      return new Response(JSON.stringify({ id: "1504673475489562746" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages") {
      observedDiscordBodies.push({ path: url.pathname, method: "POST", body });
      return new Response(JSON.stringify({ id: "discord-message-duplicate" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(3)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "feedback-status",
        options: [
          { type: 3, name: "report_id", value: "11111111-1111-4111-8111-111111111111" },
          { type: 3, name: "status", value: "duplicate" },
          { type: 3, name: "note", value: "Matches existing login report." },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback updated.",
        flags: 64,
      },
    });
    assert.equal(observedSupabaseWrites[0]?.status, "duplicate");
    assert.equal(
      observedDiscordBodies.some((entry) => entry.path === "/api/v10/channels/1504673475489562745" && entry.body?.archived === true),
      true,
    );
    assert.equal(
      observedDiscordBodies.some((entry) => entry.path === "/api/v10/channels/1504673475489562745" && entry.body?.locked === true),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route adds the resolved success reaction to the starter message for fixed feedback", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];
  const observedSupabaseWrites = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "feature",
        status: "confirmed",
        area: "Routines",
        summary: "Let me share a routine",
        discord_forum_applied_tag_ids: ["tag-feature", "tag-confirmed", "tag-medium"],
        discord_forum_title: "Feature: Routines â€” Let me share a routine",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "PATCH") {
      observedSupabaseWrites.push(body);
      if (observedSupabaseWrites.length === 1) {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "feature",
        status: "fixed",
        area: "Routines",
        summary: "Let me share a routine",
        status_updated_at: "2026-05-15T14:00:00.000Z",
        status_updated_by_discord_user_id: "222222222222222222",
        status_note: "Shipped in the latest deploy.",
        completion_review_status: "not_required",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "feature",
        status: "fixed",
        area: "Routines",
        summary: "Let me share a routine",
        status_updated_at: "2026-05-15T14:00:00.000Z",
        status_updated_by_discord_user_id: "222222222222222222",
        status_note: "Shipped in the latest deploy.",
        completion_review_status: "pending",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744") {
      return new Response(JSON.stringify({
        id: "1504673475489562744",
        available_tags: [
          { id: "tag-feature", name: "Feature" },
          { id: "tag-fixed", name: "Fixed" },
          { id: "tag-medium", name: "Medium" },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745") {
      observedDiscordBodies.push({ path: url.pathname, method: String(init?.method ?? "GET"), body });
      return new Response(JSON.stringify({ id: "1504673475489562745" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages/1504673475489562746") {
      observedDiscordBodies.push({ path: url.pathname, method: "PATCH", body });
      return new Response(JSON.stringify({ id: "1504673475489562746" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages") {
      observedDiscordBodies.push({ path: url.pathname, method: "POST", body });
      return new Response(JSON.stringify({ id: "discord-message-fixed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages/1504673475489562746/reactions/fawxzzy%3A1507384062166302851/@me") {
      observedDiscordBodies.push({ path: url.pathname, method: "PUT", body: null });
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(3)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "feedback-status",
        options: [
          { type: 3, name: "report_id", value: "11111111-1111-4111-8111-111111111111" },
          { type: 3, name: "status", value: "fixed" },
          { type: 3, name: "note", value: "Shipped in the latest deploy." },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback updated.",
        flags: 64,
      },
    });
    assert.equal(observedSupabaseWrites[0]?.status, "fixed");
    assert.equal(observedSupabaseWrites[1]?.completion_review_status, "pending");
    const auditReply = observedDiscordBodies.find((entry) => entry.path === "/api/v10/channels/1504673475489562745/messages");
    assert.match(auditReply?.body?.content ?? "", /Marked resolved by Fawx Security\./);
    assert.match(auditReply?.body?.content ?? "", /Status: Confirmed -> Resolved/);
    assert.match(auditReply?.body?.content ?? "", /Completion Review: Pending Fawxzzy review\./);
    assert.equal(
      observedDiscordBodies.some((entry) => entry.path.endsWith("/messages/1504673475489562746/reactions/fawxzzy%3A1507384062166302851/@me") && entry.method === "PUT"),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route keeps fixed status updates successful when the resolved reaction fails", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];
  const observedSupabaseWrites = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        discord_forum_message_id: null,
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "PATCH") {
      observedSupabaseWrites.push(body);
      if (observedSupabaseWrites.length === 1) {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        status: "fixed",
        discord_forum_message_id: null,
        status_updated_at: "2026-05-15T14:00:00.000Z",
        status_updated_by_discord_user_id: "222222222222222222",
        status_note: body?.status_note ?? null,
        completion_review_status: "not_required",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

      return new Response(JSON.stringify(buildFeedbackReportRow({
        status: "fixed",
        discord_forum_message_id: null,
        status_updated_at: "2026-05-15T14:00:00.000Z",
        status_updated_by_discord_user_id: "222222222222222222",
        status_note: body?.status_note ?? null,
        completion_review_status: "pending",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744") {
      return new Response(JSON.stringify({
        id: "1504673475489562744",
        available_tags: [
          { id: "tag-bug", name: "Bug" },
          { id: "tag-fixed", name: "Fixed" },
          { id: "tag-medium", name: "Medium" },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745") {
      observedDiscordBodies.push({ path: url.pathname, method: String(init?.method ?? "GET"), body });
      return new Response(JSON.stringify({ id: "1504673475489562745" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages") {
      observedDiscordBodies.push({ path: url.pathname, method: "POST", body });
      return new Response(JSON.stringify({ id: "discord-message-fixed-fallback" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages/discord-message-fixed-fallback/reactions/fawxzzy%3A1507384062166302851/@me") {
      return new Response(JSON.stringify({ message: "Missing Permissions" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(3)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "feedback-status",
        options: [
          { type: 3, name: "report_id", value: "11111111-1111-4111-8111-111111111111" },
          { type: 3, name: "status", value: "fixed" },
          { type: 3, name: "note", value: "Reply fallback reaction path." },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback updated. Warning: Discord could not verify the resolved success reaction because the public starter post id is missing.",
        flags: 64,
      },
    });
    assert.equal(observedSupabaseWrites[1]?.completion_review_status, "pending");
    const auditReply = observedDiscordBodies.find((entry) => entry.path === "/api/v10/channels/1504673475489562745/messages");
    assert.match(auditReply?.body?.content ?? "", /Marked resolved by Fawx Security\./);
    assert.match(auditReply?.body?.content ?? "", /Status: New -> Fixed/);
    assert.match(auditReply?.body?.content ?? "", /Completion Review: Pending Fawxzzy review\./);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route does not require completion review for testing canary cards", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";
  process.env.DISCORD_FEEDBACK_TESTING_FORUM_CHANNEL_ID = "1505827424766660780";

  const originalFetch = globalThis.fetch;
  const observedSupabaseWrites = [];
  const observedDiscordBodies = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "feature",
        status: "confirmed",
        area: "Discord Feedback Qa",
        summary: "Canonical Discord feedback canary",
        details: "Internal reusable test fixture for bot-run Discord feedback verification.",
        discord_forum_channel_id: "1505827424766660780",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "PATCH") {
      observedSupabaseWrites.push(body);
      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "feature",
        status: "fixed",
        area: "Discord Feedback Qa",
        summary: "Canonical Discord feedback canary",
        details: "Internal reusable test fixture for bot-run Discord feedback verification.",
        discord_forum_channel_id: "1505827424766660780",
        completion_review_status: "not_required",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1505827424766660780") {
      return new Response(JSON.stringify({
        id: "1505827424766660780",
        available_tags: [
          { id: "tag-feature", name: "Feature" },
          { id: "tag-fixed", name: "Fixed" },
          { id: "tag-medium", name: "Medium" },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745") {
      observedDiscordBodies.push({ path: url.pathname, method: String(init?.method ?? "GET"), body });
      return new Response(JSON.stringify({ id: "1504673475489562745" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages/1504673475489562746") {
      observedDiscordBodies.push({ path: url.pathname, method: "PATCH", body });
      return new Response(JSON.stringify({ id: "1504673475489562746" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages") {
      observedDiscordBodies.push({ path: url.pathname, method: "POST", body });
      return new Response(JSON.stringify({ id: "discord-message-fixed-testing" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages/1504673475489562746/reactions/fawxzzy%3A1507384062166302851/@me") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(3)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "feedback-status",
        options: [
          { type: 3, name: "report_id", value: "11111111-1111-4111-8111-111111111111" },
          { type: 3, name: "status", value: "fixed" },
          { type: 3, name: "note", value: "Canary complete." },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.equal(observedSupabaseWrites.some((entry) => entry?.completion_review_status === "pending"), false);
    const auditReply = observedDiscordBodies.find((entry) => entry.path === "/api/v10/channels/1504673475489562745/messages");
    assert.doesNotMatch(auditReply?.body?.content ?? "", /Completion Review:/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
    delete process.env.DISCORD_FEEDBACK_TESTING_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route approves completion review for finished feedback", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const originalFetch = globalThis.fetch;
  const observedSupabaseWrites = [];
  const observedDiscordBodies = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        status: "fixed",
        completion_review_status: "pending",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "PATCH") {
      observedSupabaseWrites.push(body);
      return new Response(JSON.stringify(buildFeedbackReportRow({
        status: "fixed",
        completion_review_status: "approved",
        completion_review_note: "Matches shipped acceptance criteria.",
        completion_reviewed_by_discord_user_id: "222222222222222222",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages") {
      observedDiscordBodies.push({ path: url.pathname, method: "POST", body });
      return new Response(JSON.stringify({ id: "discord-message-review-approved" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages/1504673475489562746/reactions/fawxzzy%3A1507384062166302851/@me") {
      observedDiscordBodies.push({ path: url.pathname, method: "PUT", body: null });
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(3)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "feedback-completion-review",
        options: [
          { type: 3, name: "report_id", value: "11111111-1111-4111-8111-111111111111" },
          { type: 3, name: "decision", value: "approved" },
          { type: 3, name: "note", value: "Matches shipped acceptance criteria." },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Completion review updated. Status: Approved.",
        flags: 64,
      },
    });
    assert.equal(observedSupabaseWrites[0]?.completion_review_status, "approved");
    const auditReply = observedDiscordBodies.find((entry) => entry.path === "/api/v10/channels/1504673475489562745/messages");
    assert.match(auditReply?.body?.content ?? "", /Completion Review approved by Fawx Security\./);
    assert.equal(
      observedDiscordBodies.some((entry) => entry.path.endsWith("/messages/1504673475489562746/reactions/fawxzzy%3A1507384062166302851/@me") && entry.method === "PUT"),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route keeps completion review approval successful when the resolved reaction fails", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        status: "fixed",
        completion_review_status: "pending",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "PATCH") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        status: "fixed",
        completion_review_status: "approved",
        completion_review_note: "Matches shipped acceptance criteria.",
        completion_reviewed_by_discord_user_id: "222222222222222222",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages") {
      observedDiscordBodies.push({ path: url.pathname, method: "POST", body });
      return new Response(JSON.stringify({ id: "discord-message-review-approved" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages/1504673475489562746/reactions/fawxzzy%3A1507384062166302851/@me") {
      return new Response(JSON.stringify({ message: "Missing Permissions" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(3)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "feedback-completion-review",
        options: [
          { type: 3, name: "report_id", value: "11111111-1111-4111-8111-111111111111" },
          { type: 3, name: "decision", value: "approved" },
          { type: 3, name: "note", value: "Matches shipped acceptance criteria." },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Completion review updated. Status: Approved. Warning: Discord could not apply the resolved success reaction on the public starter post.",
        flags: 64,
      },
    });
    const auditReply = observedDiscordBodies.find((entry) => entry.path === "/api/v10/channels/1504673475489562745/messages");
    assert.match(auditReply?.body?.content ?? "", /Completion Review approved by Fawx Security\./);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route marks completion review needs follow-up for finished feedback", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "feature",
        status: "fixed",
        completion_review_status: "pending",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "PATCH") {
      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "feature",
        status: "fixed",
        completion_review_status: "needs_followup",
        completion_review_note: "Needs one more Today-view check.",
        completion_reviewed_by_discord_user_id: "222222222222222222",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages") {
      observedDiscordBodies.push({ path: url.pathname, method: "POST", body });
      return new Response(JSON.stringify({ id: "discord-message-review-followup" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(3)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "feedback-completion-review",
        options: [
          { type: 3, name: "report_id", value: "11111111-1111-4111-8111-111111111111" },
          { type: 3, name: "decision", value: "needs_followup" },
          { type: 3, name: "note", value: "Needs one more Today-view check." },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Completion review updated. Status: Needs Follow-Up.",
        flags: 64,
      },
    });
    const auditReply = observedDiscordBodies.find((entry) => entry.path === "/api/v10/channels/1504673475489562745/messages");
    assert.match(auditReply?.body?.content ?? "", /Completion Review needs follow-up\./);
    assert.match(auditReply?.body?.content ?? "", /Note: Needs one more Today-view check\./);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route rejects completion review for users without staff permissions", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);

  const response = await POST(createSignedRequest(JSON.stringify({
    type: 2,
    guild_id: "1504668396338413670",
    member: {
      permissions: "0",
      user: {
        id: "123456789012345678",
        username: "zac",
      },
    },
    data: {
      name: "feedback-completion-review",
      options: [
        { type: 3, name: "report_id", value: "11111111-1111-4111-8111-111111111111" },
        { type: 3, name: "decision", value: "approved" },
      ],
    },
  }), keyPair));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    type: 4,
    data: {
      content: "You do not have permission to review completed feedback.",
      flags: 64,
    },
  });
});

test("Discord interactions route rejects feedback-withdraw for non-reporters without staff permissions", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "GET") {
      return new Response(JSON.stringify(buildFeedbackReportRow()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: "0",
        user: {
          id: "999999999999999999",
          username: "zac",
        },
      },
      data: {
        name: "feedback-withdraw",
        options: [
          { type: 3, name: "report_id", value: "11111111-1111-4111-8111-111111111111" },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "You can only withdraw feedback you submitted.",
        flags: 64,
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route rejects purgatory for users without staff permissions", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const response = await POST(createSignedRequest(JSON.stringify({
    type: 2,
    guild_id: "1504668396338413670",
    member: {
      permissions: "0",
      user: {
        id: "222222222222222222",
        username: "member",
      },
    },
    data: {
      name: "purgatory",
      options: [
        { type: 6, name: "user", value: "123456789012345678" },
        { type: 3, name: "reason", value: "Testing" },
      ],
    },
  }), keyPair));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    type: 4,
    data: {
      content: "You do not have permission to use Purgatory.",
      flags: 64,
    },
  });
});

test("Discord interactions route rejects warn for users without staff permissions", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const response = await POST(createSignedRequest(JSON.stringify({
    type: 2,
    guild_id: "1504668396338413670",
    member: {
      permissions: "0",
      user: {
        id: "222222222222222222",
        username: "member",
      },
    },
    data: {
      name: "warn",
      options: [
        { type: 6, name: "user", value: "123456789012345678" },
        { type: 3, name: "severity", value: "warning" },
        { type: 3, name: "reason", value: "Testing" },
      ],
    },
  }), keyPair));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    type: 4,
    data: {
      content: "You do not have permission to log warnings.",
      flags: 64,
    },
  });
});

test("Discord interactions route rejects server-inventory for users without staff permissions", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const response = await POST(createSignedRequest(JSON.stringify({
    type: 2,
    guild_id: "1504668396338413670",
    member: {
      permissions: "0",
      user: {
        id: "222222222222222222",
        username: "member",
      },
    },
    data: {
      name: "server-inventory",
    },
  }), keyPair));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    type: 4,
    data: {
      content: "You do not have permission to view server inventory.",
      flags: 64,
    },
  });
});

test("Discord interactions route verifies a numbered human member and syncs the nickname", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_VERIFICATION_TOKEN_PEPPER = "test-pepper";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_VERIFIED_ROLE_ID = "1504700000000000000";
  delete process.env.DISCORD_UNVERIFIED_ROLE_ID;

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];
  const observedRpcBodies = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/rpc/consume_discord_verification_token")) {
      observedRpcBodies.push({ path: url.pathname, body });
      return new Response(JSON.stringify([{
        ok: true,
        user_id: "00000000-0000-0000-0000-000000000123",
        user_number: 12,
        user_kind: "human",
        expires_at: "2026-05-15T12:00:00.000Z",
        consumed_at: "2026-05-15T11:59:00.000Z",
        error: null,
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/rpc/upsert_discord_member_link")) {
      observedRpcBodies.push({ path: url.pathname, body });
      return new Response(JSON.stringify([{ id: "11111111-1111-1111-1111-111111111111" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com") {
      observedDiscordBodies.push({
        path: url.pathname,
        method: String(init?.method ?? "GET"),
        body,
      });

      if (init?.method === "PUT") {
        return new Response(null, { status: 204 });
      }

      if (init?.method === "PATCH") {
        return new Response(JSON.stringify({ nick: "Zac · 12" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    throw new Error(`Unexpected fetch: ${url.toString()}`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 5,
      guild_id: "1504668396338413670",
      member: {
        nick: "Zac",
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_verify_modal",
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "fitness_token",
                value: "FWX-ABCD-EFGH",
              },
            ],
          },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Verified as Member 12. You now have access to the server.",
        flags: 64,
      },
    });
    assert.deepEqual(observedDiscordBodies, [
      {
        path: "/api/v10/guilds/1504668396338413670/members/123456789012345678/roles/1504700000000000000",
        method: "PUT",
        body: null,
      },
      {
        path: "/api/v10/guilds/1504668396338413670/members/123456789012345678",
        method: "PATCH",
        body: { nick: "Zac · 12" },
      },
    ]);
    assert.equal(observedRpcBodies[1]?.body.input_nickname_sync_status, "synced");
    assert.equal(observedRpcBodies[1]?.body.input_user_number, 12);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route treats verification as successful when the member already has Verified after a failed add-role call", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_VERIFICATION_TOKEN_PEPPER = "test-pepper";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_VERIFIED_ROLE_ID = "1504700000000000000";
  delete process.env.DISCORD_UNVERIFIED_ROLE_ID;

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/rpc/consume_discord_verification_token")) {
      return new Response(JSON.stringify([{
        ok: true,
        user_id: "00000000-0000-0000-0000-000000000123",
        user_number: 12,
        user_kind: "human",
        expires_at: "2026-05-15T12:00:00.000Z",
        consumed_at: "2026-05-15T11:59:00.000Z",
        error: null,
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/rpc/upsert_discord_member_link")) {
      return new Response(JSON.stringify([{ id: "11111111-1111-1111-1111-111111111111" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com") {
      if (
        url.pathname === "/api/v10/guilds/1504668396338413670/members/123456789012345678/roles/1504700000000000000"
        && init?.method === "PUT"
      ) {
        return new Response(JSON.stringify({ message: "Missing Permissions" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (
        url.pathname === "/api/v10/guilds/1504668396338413670/members/123456789012345678"
        && init?.method === "GET"
      ) {
        return new Response(JSON.stringify({
          roles: ["1504700000000000000", "1504675249600336013"],
          user: {
            id: "123456789012345678",
            username: "zac",
          },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (
        url.pathname === "/api/v10/guilds/1504668396338413670/roles"
        && init?.method === "GET"
      ) {
        return new Response(JSON.stringify([
          { id: "1504700000000000000", name: "Verified", position: 2, permissions: "0", managed: false },
          { id: "1504675249600336013", name: "Fawxzzies", position: 1, permissions: "0", managed: false },
          { id: "1504700208251146371", name: "Fawx Security", position: 5, permissions: String((BigInt(1) << BigInt(3)).toString()), managed: true },
        ]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (
        url.pathname === "/api/v10/guilds/1504668396338413670/members/1504700208251146371"
        && init?.method === "GET"
      ) {
        return new Response(JSON.stringify({
          roles: ["1504700208251146371"],
          user: {
            id: "1504700208251146371",
            username: "Fawx Security",
          },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/api/v10/guilds/1504668396338413670/members/123456789012345678" && init?.method === "PATCH") {
        return new Response(JSON.stringify({ nick: "Zac Â· 12" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    throw new Error(`Unexpected fetch: ${url.toString()} ${init?.method ?? "GET"} ${JSON.stringify(body)}`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 5,
      guild_id: "1504668396338413670",
      member: {
        nick: "Zac",
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_verify_modal",
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "fitness_token",
                value: "FWX-ABCD-EFGH",
              },
            ],
          },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Verified as Member 12. You now have access to the server.",
        flags: 64,
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route rejects setup-music-sesh for users without setup permissions", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const response = await POST(createSignedRequest(JSON.stringify({
    type: 2,
    guild_id: "1504668396338413670",
    member: {
      permissions: "0",
      user: {
        id: "222222222222222222",
        username: "member",
      },
    },
    data: {
      name: "setup-music-sesh",
    },
  }), keyPair));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    type: 4,
    data: {
      content: "You do not have permission to set up Music Sesh.",
      flags: 64,
    },
  });
});

test("Discord interactions route posts setup-music-sesh in the invoking channel and removes the old launcher channel", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_SPOTIFY_CLUB_CHANNEL_ID = "1506131171208200302";

  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);
    calls.push({ method, pathname: url.pathname, body });

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "POST") {
      return new Response(JSON.stringify(buildSpotifyClubLobbyRow({
        panel_channel_id: "1504668396338413671",
        panel_message_id: "new-music-sesh-panel",
      })), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname !== "discord.com") {
      throw new Error(`Unexpected fetch host: ${url.toString()} (${method})`);
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671" && method === "GET") {
      return new Response(JSON.stringify({ id: "1504668396338413671", type: 0, name: "main" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1504668396338413671/messages" && method === "POST") {
      assert.equal(body?.components?.[0]?.components?.[0]?.label, "Open Music Sesh Controls");
      return new Response(JSON.stringify({ id: "new-music-sesh-panel" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/guilds/1504668396338413670/channels" && method === "GET") {
      return new Response(JSON.stringify([
        { id: "1504668396338413671", type: 0, name: "main" },
        { id: "1506131171208200302", type: 0, name: "music-sesh" },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1506131171208200302/messages" && method === "GET") {
      return new Response(JSON.stringify([{
        id: "old-music-sesh-panel",
        author: { id: "1504700208251146371" },
        components: [
          {
            type: 1,
            components: [
              { type: 2, custom_id: "spotify_controls_open", label: "Open Music Sesh Controls" },
            ],
          },
        ],
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/v10/channels/1506131171208200302/messages/old-music-sesh-panel" && method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/api/v10/channels/1506131171208200302" && method === "DELETE") {
      return new Response(JSON.stringify({ id: "1506131171208200302", name: "music-sesh" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      channel_id: "1504668396338413671",
      member: {
        permissions: String(BigInt(1) << BigInt(5)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "setup-music-sesh",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Music Sesh panel created in <#1504668396338413671>.",
        flags: 64,
      },
    });
    assert.equal(calls.some((call) => call.method === "POST" && call.pathname === "/api/v10/channels/1504668396338413671/messages"), true);
    assert.equal(calls.some((call) => call.method === "DELETE" && call.pathname === "/api/v10/channels/1506131171208200302/messages/old-music-sesh-panel"), true);
    assert.equal(calls.some((call) => call.method === "DELETE" && call.pathname === "/api/v10/channels/1506131171208200302"), true);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_SPOTIFY_CLUB_CHANNEL_ID;
  }
});

test("Discord interactions route defers the Spotify control hub opener and shows Connect plus refresh for disconnected non-managers", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedDiscordCalls = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([buildSpotifyClubLobbyRow()]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_room_members") && method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Content-Range": "*/0" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-controls-open-interaction/spotify-controls-open-token/callback") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-controls-open-token/messages/@original") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-controls-open-interaction",
      application_id: "1504700208251146371",
      token: "spotify-controls-open-token",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        permissions: "0",
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "panel-message-1",
      },
      data: {
        custom_id: "spotify_controls_open",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.equal(observedDiscordCalls[0]?.body?.type, 5);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /\*\*Music Sesh Controls\*\*/);
    assert.deepEqual(listDiscordMessageComponentCustomIds(observedDiscordCalls[1]?.body), [
      "spotify_connect_open",
      "spotify_status_check",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route shows manager controls in the Spotify control hub even when Spotify is disconnected", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedDiscordCalls = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([buildSpotifyClubLobbyRow()]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_room_members") && method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Content-Range": "*/0" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-controls-manager-interaction/spotify-controls-manager-token/callback") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-controls-manager-token/messages/@original") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-controls-manager-interaction",
      application_id: "1504700208251146371",
      token: "spotify-controls-manager-token",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        permissions: "32",
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "panel-message-1",
      },
      data: {
        custom_id: "spotify_controls_open",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.equal(observedDiscordCalls[0]?.body?.type, 5);
    assert.deepEqual(listDiscordMessageComponentCustomIds(observedDiscordCalls[1]?.body), [
      "spotify_connect_open",
      "spotify_status_check",
      "spotify_room_open",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route shows Join and Disconnect in the Spotify control hub for connected members who are not joined", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedDiscordCalls = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([buildSpotifyClubLobbyRow()]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_room_members") && method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Content-Range": "*/0" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify(buildSpotifyConnectionRow()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-controls-connected-interaction/spotify-controls-connected-token/callback") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-controls-connected-token/messages/@original") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-controls-connected-interaction",
      application_id: "1504700208251146371",
      token: "spotify-controls-connected-token",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        permissions: "0",
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "panel-message-1",
      },
      data: {
        custom_id: "spotify_controls_open",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.equal(observedDiscordCalls[0]?.body?.type, 5);
    assert.deepEqual(listDiscordMessageComponentCustomIds(observedDiscordCalls[1]?.body), [
      "spotify_disconnect_auth",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route shows queue and playback actions in the Spotify control hub for joined members", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedDiscordCalls = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([buildSpotifyClubLobbyRow({
        status: "open",
        host_discord_user_id: "999999999999999999",
        spotify_mirror_enabled: true,
        opened_at: "2026-05-19T00:00:00.000Z",
        closed_at: null,
      })]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_room_members") && method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Content-Range": "0-0/1" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_room_members") && method === "GET") {
      return new Response(JSON.stringify({
        id: "member-1",
        lobby_id: "lobby-1",
        discord_user_id: "123456789012345678",
        spotify_user_id: "spotify-user-1",
        status: "joined",
        joined_at: "2026-05-19T00:00:00.000Z",
        left_at: null,
        last_seen_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([
        {
          id: "spotify-up-next-1",
          lobby_id: "lobby-1",
          status: "approved",
          source_type: "spotify_mirror",
          approval_state: "approved",
          playback_state: "queued",
          spotify_uri: "spotify:track:3333333333333333333333",
          spotify_url: "https://open.spotify.com/track/3333333333333333333333",
          track_title: "Mirror Song",
          artist_name: "Mirror Artist",
          album_name: null,
          duration_ms: null,
          suggested_by_discord_user_id: "999999999999999999",
          suggested_by_spotify_user_id: null,
          approved_by_discord_user_id: "999999999999999999",
          rejected_by_discord_user_id: null,
          removed_by_discord_user_id: null,
          rejection_reason: null,
          removal_reason: null,
          queue_position: null,
          display_position: 1,
          dedupe_key: "mirror-key",
          mirror_first_seen_at: "2026-05-19T00:00:00.000Z",
          mirror_last_seen_at: "2026-05-19T00:00:00.000Z",
          cleared_reason: null,
          approved_at: "2026-05-19T00:00:00.000Z",
          rejected_at: null,
          removed_at: null,
          played_at: null,
          skipped_at: null,
          playback_started_at: null,
          playback_finished_at: null,
          created_at: "2026-05-19T00:00:00.000Z",
          updated_at: "2026-05-19T00:00:00.000Z",
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify(buildSpotifyConnectionRow()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-controls-joined-interaction/spotify-controls-joined-token/callback") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-controls-joined-token/messages/@original") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-controls-joined-interaction",
      application_id: "1504700208251146371",
      token: "spotify-controls-joined-token",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        permissions: "0",
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "panel-message-1",
      },
      data: {
        custom_id: "spotify_controls_open",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.equal(observedDiscordCalls[0]?.body?.type, 5);
    assert.deepEqual(listDiscordMessageComponentCustomIds(observedDiscordCalls[1]?.body), [
      "spotify_queue_search_open",
      "spotify_queue_suggest_open",
      "spotify_queue_view",
      "spotify_start_queue",
      "spotify_status_check",
      "spotify_leave_room",
      "spotify_disconnect_auth",
    ]);
    assert.equal(findDiscordMessageButtonByCustomId(observedDiscordCalls[1]?.body, "spotify_start_queue")?.disabled, false);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /Room Queue: 0 active \/ 0 pending/);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /Mirror: On \/ 1 Spotify Up Next/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route returns an immediate Spotify auth link from the ephemeral control hub", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.SPOTIFY_CLIENT_ID = "spotify-client-id";
  process.env.SPOTIFY_REDIRECT_URI = "https://example.com/api/spotify/oauth/callback";
  process.env.SPOTIFY_OAUTH_STATE_SECRET = "spotify-oauth-state-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedFetches = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    observedFetches.push({ method, path: url.pathname, host: url.hostname });

    throw new Error(`Connect button should not fetch before responding: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-connect-interaction",
      application_id: "1504700208251146371",
      token: "spotify-connect-token",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "spotify-controls-message-1",
        flags: 64,
      },
      data: {
        custom_id: "spotify_connect_open",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(observedFetches, []);

    const body = await response.json();
    assert.equal(body.type, 4);
    assert.match(body.data?.content ?? "", /After authorizing, return here and press Refresh Spotify Status/);
    assert.doesNotMatch(body.data?.content ?? "", /https:\/\/accounts\.spotify\.com\/authorize\?/);
    const oauthButton = findDiscordMessageLinkButtonByLabel(body.data, "Authorize Spotify");
    assert.equal(oauthButton?.style, 5);
    assert.match(oauthButton?.url ?? "", /^https:\/\/example\.com\/api\/spotify\/oauth\/start\?token=/);
    assert.doesNotMatch(oauthButton?.url ?? "", /https:\/\/accounts\.spotify\.com\/authorize\?/);
    assert.equal((oauthButton?.url ?? "").length <= 512, true);
    assert.deepEqual(listDiscordMessageComponentCustomIds(body.data), [
      "spotify_status_check",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route defers Spotify controls before loading lobby state", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const callOrder = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-controls-slow-interaction/spotify-controls-slow-token/callback") {
      callOrder.push("discord-defer");
      return new Response(null, { status: 204 });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      callOrder.push("lobbies-get");
      return new Response(JSON.stringify([buildSpotifyClubLobbyRow({
        status: "closed",
        panel_message_id: "panel-message-1",
      })]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_room_members") && method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Content-Range": "*/0" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-controls-slow-token/messages/@original") {
      callOrder.push("discord-edit");
      assert.match(body?.content ?? "", /\*\*Music Sesh Controls\*\*/);
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-controls-slow-interaction",
      application_id: "1504700208251146371",
      token: "spotify-controls-slow-token",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        permissions: "0",
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "panel-message-1",
      },
      data: {
        custom_id: "spotify_controls_open",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.ok(callOrder.indexOf("discord-defer") !== -1);
    assert.ok(callOrder.indexOf("lobbies-get") !== -1);
    assert.ok(callOrder.indexOf("discord-defer") < callOrder.indexOf("lobbies-get"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route defers Spotify room open before loading lobby state", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const callOrder = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-room-open-slow-interaction/spotify-room-open-slow-token/callback") {
      callOrder.push("discord-defer");
      return new Response(null, { status: 204 });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      callOrder.push("lobbies-get");
      return new Response(JSON.stringify([buildSpotifyClubLobbyRow({
        status: "closed",
        panel_message_id: "panel-message-1",
      })]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_room_members") && method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Content-Range": "*/0" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-room-open-slow-token/messages/@original") {
      callOrder.push("discord-edit");
      assert.match(body?.content ?? "", /\*\*Music Sesh Controls\*\*/);
      assert.match(body?.content ?? "", /You do not have permission to manage the Music Sesh room/);
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-room-open-slow-interaction",
      application_id: "1504700208251146371",
      token: "spotify-room-open-slow-token",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        permissions: "0",
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "spotify-controls-message-1",
        flags: 64,
      },
      data: {
        custom_id: "spotify_room_open",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.ok(callOrder.indexOf("discord-defer") !== -1);
    assert.ok(callOrder.indexOf("lobbies-get") !== -1);
    assert.ok(callOrder.indexOf("discord-defer") < callOrder.indexOf("lobbies-get"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route refreshes disconnected Spotify status back to authorize controls", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.SPOTIFY_CLIENT_ID = "spotify-client-id";
  process.env.SPOTIFY_REDIRECT_URI = "https://example.com/api/spotify/oauth/callback";
  process.env.SPOTIFY_OAUTH_STATE_SECRET = "spotify-oauth-state-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedDiscordCalls = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-status-disconnected-interaction/spotify-status-disconnected-token/callback") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-status-disconnected-token/messages/@original") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-status-disconnected-interaction",
      application_id: "1504700208251146371",
      token: "spotify-status-disconnected-token",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "spotify-controls-message-1",
        flags: 64,
      },
      data: {
        custom_id: "spotify_status_check",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.equal(observedDiscordCalls[0]?.body?.type, 5);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /After authorizing, return here and press Refresh Spotify Status/);
    assert.equal(findDiscordMessageLinkButtonByLabel(observedDiscordCalls[1]?.body, "Authorize Spotify")?.style, 5);
    assert.deepEqual(listDiscordMessageComponentCustomIds(observedDiscordCalls[1]?.body), [
      "spotify_status_check",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route refreshes connected Spotify status back to the control hub", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedDiscordCalls = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify(buildSpotifyConnectionRow({
        spotify_product: "free",
        is_premium: false,
        scopes: ["user-read-private"],
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([buildSpotifyClubLobbyRow({
        status: "closed",
      })]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_room_members") && method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Content-Range": "*/0" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-status-connected-interaction/spotify-status-connected-token/callback") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-status-connected-token/messages/@original") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-status-connected-interaction",
      application_id: "1504700208251146371",
      token: "spotify-status-connected-token",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "spotify-controls-message-1",
        flags: 64,
      },
      data: {
        custom_id: "spotify_status_check",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.equal(observedDiscordCalls[0]?.body?.type, 5);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /\*\*Music Sesh Controls\*\*/);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /Spotify: Connected \/ Not Premium/);
    assert.doesNotMatch(observedDiscordCalls[1]?.body?.content ?? "", /use \/spotify connect/i);
    assert.deepEqual(listDiscordMessageComponentCustomIds(observedDiscordCalls[1]?.body), [
      "spotify_disconnect_auth",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route returns a playback-upgrade prompt when playback readiness is missing scopes", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.SPOTIFY_CLIENT_ID = "spotify-client-id";
  process.env.SPOTIFY_REDIRECT_URI = "https://example.com/api/spotify/oauth/callback";
  process.env.SPOTIFY_OAUTH_STATE_SECRET = "spotify-oauth-state-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedDiscordCalls = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([{
        id: "lobby-1",
        status: "open",
        host_discord_user_id: "999999999999999999",
        host_spotify_user_id: null,
        title: null,
        description: null,
        panel_channel_id: "1504668396338413670",
        panel_message_id: "panel-message-1",
        opened_at: "2026-05-18T00:00:00.000Z",
        closed_at: null,
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify({
        id: "connection-1",
        discord_user_id: "123456789012345678",
        spotify_user_id: "spotify-user-1",
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
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "PATCH") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-scope-interaction/spotify-scope-token/callback") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-scope-token/messages/@original") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-scope-interaction",
      application_id: "1504700208251146371",
      token: "spotify-scope-token",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "spotify-controls-message-1",
        flags: 64,
      },
      data: {
        custom_id: "spotify_device_check",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /live queue permissions are missing/i);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /https:\/\/accounts\.spotify\.com\/authorize\?/);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /user-read-playback-state/);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /user-modify-playback-state/);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /user-read-currently-playing/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route disconnect button tombstones the Spotify connection", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY = "spotify-token-encryption-secret";

  const originalFetch = globalThis.fetch;
  const observedSupabaseBodies = [];
  const observedDiscordCalls = [];
  let connectionReadCount = 0;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([{
        id: "lobby-1",
        status: "closed",
        host_discord_user_id: null,
        host_spotify_user_id: null,
        title: null,
        description: null,
        panel_channel_id: "1504668396338413670",
        panel_message_id: "panel-message-1",
        opened_at: null,
        closed_at: "2026-05-18T00:00:00.000Z",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      connectionReadCount += 1;
      if (connectionReadCount === 1) {
        return new Response(JSON.stringify({
          id: "connection-1",
          discord_user_id: "123456789012345678",
          spotify_user_id: "spotify-user-1",
          spotify_display_name: "zac",
          spotify_product: "premium",
          is_premium: true,
          encrypted_refresh_token: "ciphertext",
          access_token_expires_at: null,
          scopes: ["user-read-private"],
          connected_at: "2026-05-19T00:00:00.000Z",
          last_checked_at: "2026-05-19T00:00:00.000Z",
          disconnected_at: null,
          created_at: "2026-05-19T00:00:00.000Z",
          updated_at: "2026-05-19T00:00:00.000Z",
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "PATCH") {
      observedSupabaseBodies.push(body);
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-disconnect-interaction/spotify-disconnect-token/callback") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-disconnect-token/messages/@original") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-disconnect-interaction",
      application_id: "1504700208251146371",
      token: "spotify-disconnect-token",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "spotify-controls-message-1",
        flags: 64,
      },
      data: {
        custom_id: "spotify_disconnect",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.equal(observedDiscordCalls[0]?.body?.type, 5);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /Spotify disconnected/);
    assert.equal(observedSupabaseBodies.length, 1);
    assert.equal(observedSupabaseBodies[0]?.is_premium, false);
    assert.equal(observedSupabaseBodies[0]?.spotify_product, "unknown");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route returns an outdated-panel fallback for stale Music Sesh buttons", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && String(init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify([{
        id: "lobby-1",
        status: "closed",
        host_discord_user_id: null,
        host_spotify_user_id: null,
        title: null,
        description: null,
        panel_channel_id: "1504668396338413670",
        panel_message_id: "panel-message-current",
        opened_at: null,
        closed_at: "2026-05-18T00:00:00.000Z",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "panel-message-stale",
      },
      data: {
        custom_id: "spotify_status_check",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "This Music Sesh panel is outdated. Ask staff to run /setup-music-sesh.",
        flags: 64,
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route returns an outdated-panel fallback for unknown Music Sesh panel buttons", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && String(init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify([{
        id: "lobby-1",
        status: "closed",
        host_discord_user_id: null,
        host_spotify_user_id: null,
        title: null,
        description: null,
        panel_channel_id: "1504668396338413670",
        panel_message_id: "panel-message-1",
        opened_at: null,
        closed_at: "2026-05-18T00:00:00.000Z",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "panel-message-1",
      },
      data: {
        custom_id: "spotify_queue_legacy",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "This Music Sesh panel is outdated. Ask staff to run /setup-music-sesh.",
        flags: 64,
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route opens the Spotify queue suggestion modal from the ephemeral control hub", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && String(init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify([{
        id: "lobby-1",
        status: "open",
        host_discord_user_id: "999999999999999999",
        host_spotify_user_id: null,
        title: null,
        description: null,
        panel_channel_id: "1504668396338413670",
        panel_message_id: "panel-message-1",
        opened_at: "2026-05-19T00:00:00.000Z",
        closed_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "spotify-controls-message-1",
        flags: 64,
      },
      data: {
        custom_id: "spotify_queue_suggest_open",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.type, 9);
    assert.equal(payload.data.custom_id, "spotify_queue_suggest_modal");
    assert.equal(payload.data.components[0]?.component?.custom_id, "spotify_track");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route defers playback device checks from the ephemeral control hub and edits the original response", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.SPOTIFY_CLIENT_ID = "spotify-client-id";
  process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY = "spotify-token-encryption-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedDiscordCalls = [];
  const encryptedRefreshToken = encryptSpotifyRefreshToken("refresh-token");

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([{
        id: "lobby-1",
        status: "open",
        host_discord_user_id: "999999999999999999",
        host_spotify_user_id: null,
        title: null,
        description: null,
        panel_channel_id: "1504668396338413670",
        panel_message_id: "panel-message-1",
        opened_at: "2026-05-19T00:00:00.000Z",
        closed_at: null,
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify({
        id: "connection-1",
        discord_user_id: "123456789012345678",
        spotify_user_id: "spotify-user-1",
        spotify_display_name: "zac",
        spotify_product: "premium",
        is_premium: true,
        encrypted_refresh_token: encryptedRefreshToken,
        access_token_expires_at: null,
        scopes: ["user-read-private", "user-read-playback-state", "user-modify-playback-state", "user-read-currently-playing"],
        connected_at: "2026-05-19T00:00:00.000Z",
        last_checked_at: "2026-05-19T00:00:00.000Z",
        disconnected_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "PATCH") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "accounts.spotify.com" && url.pathname === "/api/token" && method === "POST") {
      return new Response(JSON.stringify({
        access_token: "spotify-access-token",
        expires_in: 3600,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "api.spotify.com" && url.pathname === "/v1/me/player/devices" && method === "GET") {
      return new Response(JSON.stringify({
        devices: [
          {
            id: "device-1",
            is_active: true,
            is_private_session: false,
            is_restricted: false,
            name: "Web Player",
            type: "Computer",
          },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-interaction-1/spotify-token-1/callback") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-token-1/messages/@original") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-interaction-1",
      application_id: "1504700208251146371",
      token: "spotify-token-1",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "spotify-controls-message-1",
        flags: 64,
      },
      data: {
        custom_id: "spotify_device_check",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.equal(observedDiscordCalls[0]?.path, "/api/v10/interactions/spotify-interaction-1/spotify-token-1/callback");
    assert.equal(observedDiscordCalls[0]?.body?.type, 5);
    assert.equal(observedDiscordCalls[1]?.path, "/api/v10/webhooks/1504700208251146371/spotify-token-1/messages/@original");
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /Playback Ready on Web Player\./);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route reports when no active Spotify device is available from the control hub", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.SPOTIFY_CLIENT_ID = "spotify-client-id";
  process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY = "spotify-token-encryption-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedDiscordCalls = [];
  const encryptedRefreshToken = encryptSpotifyRefreshToken("refresh-token");

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([{
        id: "lobby-1",
        status: "open",
        host_discord_user_id: "999999999999999999",
        host_spotify_user_id: null,
        title: null,
        description: null,
        panel_channel_id: "1504668396338413670",
        panel_message_id: "panel-message-1",
        opened_at: "2026-05-19T00:00:00.000Z",
        closed_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify({
        id: "connection-1",
        discord_user_id: "123456789012345678",
        spotify_user_id: "spotify-user-1",
        spotify_display_name: "zac",
        spotify_product: "premium",
        is_premium: true,
        encrypted_refresh_token: encryptedRefreshToken,
        access_token_expires_at: null,
        scopes: ["user-read-private", "user-read-playback-state", "user-modify-playback-state", "user-read-currently-playing"],
        connected_at: "2026-05-19T00:00:00.000Z",
        last_checked_at: "2026-05-19T00:00:00.000Z",
        disconnected_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "PATCH") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "accounts.spotify.com" && url.pathname === "/api/token" && method === "POST") {
      return new Response(JSON.stringify({
        access_token: "spotify-access-token",
        expires_in: 3600,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "api.spotify.com" && url.pathname === "/v1/me/player/devices" && method === "GET") {
      return new Response(JSON.stringify({
        devices: [],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-interaction-2/spotify-token-2/callback") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-token-2/messages/@original") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-interaction-2",
      application_id: "1504700208251146371",
      token: "spotify-token-2",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "spotify-controls-message-2",
        flags: 64,
      },
      data: {
        custom_id: "spotify_device_check",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /Open Spotify on your phone, desktop, or browser first, then try again\./);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route blocks Spotify playback handoff for non-Premium users from the control hub", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedDiscordCalls = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([{
        id: "lobby-1",
        status: "open",
        host_discord_user_id: "999999999999999999",
        host_spotify_user_id: null,
        title: null,
        description: null,
        panel_channel_id: "1504668396338413670",
        panel_message_id: "panel-message-1",
        opened_at: "2026-05-19T00:00:00.000Z",
        closed_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify({
        id: "connection-1",
        discord_user_id: "123456789012345678",
        spotify_user_id: "spotify-user-1",
        spotify_display_name: "zac",
        spotify_product: "free",
        is_premium: false,
        encrypted_refresh_token: "ciphertext",
        access_token_expires_at: null,
        scopes: ["user-read-private"],
        connected_at: "2026-05-19T00:00:00.000Z",
        last_checked_at: "2026-05-19T00:00:00.000Z",
        disconnected_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "PATCH") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-interaction-3/spotify-token-3/callback") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-token-3/messages/@original") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-interaction-3",
      application_id: "1504700208251146371",
      token: "spotify-token-3",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "spotify-controls-message-3",
        flags: 64,
      },
      data: {
        custom_id: "spotify_start_queue",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /this account is not Premium/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route blocks Spotify playback handoff when no approved tracks are queued", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.SPOTIFY_CLIENT_ID = "spotify-client-id";
  process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY = "spotify-token-encryption-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedDiscordCalls = [];
  const encryptedRefreshToken = encryptSpotifyRefreshToken("refresh-token");

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([{
        id: "lobby-1",
        status: "open",
        host_discord_user_id: "999999999999999999",
        host_spotify_user_id: null,
        title: null,
        description: null,
        panel_channel_id: "1504668396338413670",
        panel_message_id: "panel-message-1",
        opened_at: "2026-05-19T00:00:00.000Z",
        closed_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify({
        id: "connection-1",
        discord_user_id: "123456789012345678",
        spotify_user_id: "spotify-user-1",
        spotify_display_name: "zac",
        spotify_product: "premium",
        is_premium: true,
        encrypted_refresh_token: encryptedRefreshToken,
        access_token_expires_at: null,
        scopes: ["user-read-private", "user-read-playback-state", "user-modify-playback-state", "user-read-currently-playing"],
        connected_at: "2026-05-19T00:00:00.000Z",
        last_checked_at: "2026-05-19T00:00:00.000Z",
        disconnected_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "PATCH") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "accounts.spotify.com" && url.pathname === "/api/token" && method === "POST") {
      return new Response(JSON.stringify({
        access_token: "spotify-access-token",
        expires_in: 3600,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "api.spotify.com" && url.pathname === "/v1/me/player/devices" && method === "GET") {
      return new Response(JSON.stringify({
        devices: [
          {
            id: "device-1",
            is_active: true,
            is_private_session: false,
            is_restricted: false,
            name: "Desktop Spotify",
            type: "Computer",
          },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-interaction-5/spotify-token-5/callback") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-token-5/messages/@original") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-interaction-5",
      application_id: "1504700208251146371",
      token: "spotify-token-5",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "spotify-controls-message-5",
        flags: 64,
      },
      data: {
        custom_id: "spotify_start_queue",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /No Room Queue tracks are queued yet\./);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route starts the approved queue on the user's active Spotify device", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.SPOTIFY_CLIENT_ID = "spotify-client-id";
  process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY = "spotify-token-encryption-secret";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedDiscordCalls = [];
  const observedSpotifyCalls = [];
  const encryptedRefreshToken = encryptSpotifyRefreshToken("refresh-token");

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([{
        id: "lobby-1",
        status: "open",
        host_discord_user_id: "999999999999999999",
        host_spotify_user_id: null,
        title: null,
        description: null,
        panel_channel_id: "1504668396338413670",
        panel_message_id: "panel-message-1",
        opened_at: "2026-05-19T00:00:00.000Z",
        closed_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify({
        id: "connection-1",
        discord_user_id: "123456789012345678",
        spotify_user_id: "spotify-user-1",
        spotify_display_name: "zac",
        spotify_product: "premium",
        is_premium: true,
        encrypted_refresh_token: encryptedRefreshToken,
        access_token_expires_at: null,
        scopes: ["user-read-private", "user-read-playback-state", "user-modify-playback-state", "user-read-currently-playing"],
        connected_at: "2026-05-19T00:00:00.000Z",
        last_checked_at: "2026-05-19T00:00:00.000Z",
        disconnected_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "PATCH") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([
        {
          id: "abcdef12-0000-4000-8000-000000000000",
          lobby_id: "lobby-1",
          status: "approved",
          spotify_uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
          spotify_url: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp",
          track_title: "Hey Ya!",
          artist_name: "Outkast",
          album_name: null,
          duration_ms: null,
          suggested_by_discord_user_id: "123456789012345678",
          suggested_by_spotify_user_id: null,
          approved_by_discord_user_id: "999999999999999999",
          rejected_by_discord_user_id: null,
          removed_by_discord_user_id: null,
          rejection_reason: null,
          removal_reason: null,
          queue_position: 1,
          approved_at: "2026-05-19T00:00:00.000Z",
          rejected_at: null,
          removed_at: null,
          played_at: null,
          skipped_at: null,
          created_at: "2026-05-19T00:00:00.000Z",
          updated_at: "2026-05-19T00:00:00.000Z",
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "PATCH") {
      return new Response(JSON.stringify({
        id: "abcdef12-0000-4000-8000-000000000000",
        lobby_id: "lobby-1",
        status: "approved",
        source_type: "discord_link",
        approval_state: "approved",
        playback_state: "playing",
        spotify_uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
        spotify_url: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp",
        track_title: "Hey Ya!",
        artist_name: "Outkast",
        album_name: null,
        duration_ms: null,
        suggested_by_discord_user_id: "123456789012345678",
        suggested_by_spotify_user_id: null,
        approved_by_discord_user_id: "999999999999999999",
        rejected_by_discord_user_id: null,
        removed_by_discord_user_id: null,
        rejection_reason: null,
        removal_reason: null,
        queue_position: 1,
        dedupe_key: null,
        mirror_first_seen_at: null,
        mirror_last_seen_at: null,
        display_position: 1,
        cleared_reason: null,
        approved_at: "2026-05-19T00:00:00.000Z",
        rejected_at: null,
        removed_at: null,
        played_at: null,
        skipped_at: null,
        playback_started_at: "2026-05-19T00:00:00.000Z",
        playback_finished_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "accounts.spotify.com" && url.pathname === "/api/token" && method === "POST") {
      observedSpotifyCalls.push({ method, path: url.pathname, body: typeof init?.body === "string" ? init.body : null });
      return new Response(JSON.stringify({
        access_token: "spotify-access-token",
        expires_in: 3600,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "api.spotify.com" && url.pathname === "/v1/me/player/devices" && method === "GET") {
      observedSpotifyCalls.push({ method, path: url.pathname, body });
      return new Response(JSON.stringify({
        devices: [
          {
            id: "device-1",
            is_active: true,
            is_private_session: false,
            is_restricted: false,
            name: "Desktop Spotify",
            type: "Computer",
          },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "api.spotify.com" && url.pathname === "/v1/me/player/play" && method === "PUT") {
      observedSpotifyCalls.push({ method, path: `${url.pathname}?${url.searchParams.toString()}`, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-interaction-4/spotify-token-4/callback") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-token-4/messages/@original") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-interaction-4",
      application_id: "1504700208251146371",
      token: "spotify-token-4",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "spotify-controls-message-4",
        flags: 64,
      },
      data: {
        custom_id: "spotify_start_queue",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /Starting 1 Room Queue track on your active Spotify device\./);
    assert.deepEqual(observedSpotifyCalls.some((call) => call.path === "/v1/me/player/queue"), false);
    assert.equal(observedSpotifyCalls.some((call) => String(call.path).startsWith("/v1/me/player/play?device_id=device-1")), true);
    const playCall = observedSpotifyCalls.find((call) => String(call.path).startsWith("/v1/me/player/play?device_id=device-1"));
    assert.deepEqual(playCall?.body, {
      uris: ["spotify:track:3n3Ppam7vgaVa1iaRUc9Lp"],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route returns the Spotify queue summary from the ephemeral control hub", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedDiscordCalls = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = parseJsonBody(init?.body);

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([{
        id: "lobby-1",
        status: "open",
        host_discord_user_id: "999999999999999999",
        host_spotify_user_id: null,
        title: null,
        description: null,
        panel_channel_id: "1504668396338413670",
        panel_message_id: "panel-message-1",
        opened_at: "2026-05-19T00:00:00.000Z",
        closed_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([
        {
          id: "abcdef12-0000-4000-8000-000000000000",
          lobby_id: "lobby-1",
          status: "approved",
          spotify_uri: "spotify:track:1111111111111111111111",
          spotify_url: "https://open.spotify.com/track/1111111111111111111111",
          track_title: "Song A",
          artist_name: "Artist A",
          album_name: null,
          duration_ms: null,
          suggested_by_discord_user_id: "123456789012345678",
          suggested_by_spotify_user_id: null,
          approved_by_discord_user_id: "999999999999999999",
          rejected_by_discord_user_id: null,
          removed_by_discord_user_id: null,
          rejection_reason: null,
          removal_reason: null,
          queue_position: 1,
          approved_at: "2026-05-19T00:00:00.000Z",
          rejected_at: null,
          removed_at: null,
          played_at: null,
          skipped_at: null,
          created_at: "2026-05-19T00:00:00.000Z",
          updated_at: "2026-05-19T00:00:00.000Z",
        },
        {
          id: "abcdef12-0000-4000-8000-000000000001",
          lobby_id: "lobby-1",
          status: "pending",
          spotify_uri: "spotify:track:2222222222222222222222",
          spotify_url: "https://open.spotify.com/track/2222222222222222222222",
          track_title: "Song B",
          artist_name: "Artist B",
          album_name: null,
          duration_ms: null,
          suggested_by_discord_user_id: "123456789012345678",
          suggested_by_spotify_user_id: null,
          approved_by_discord_user_id: null,
          rejected_by_discord_user_id: null,
          removed_by_discord_user_id: null,
          rejection_reason: null,
          removal_reason: null,
          queue_position: null,
          approved_at: null,
          rejected_at: null,
          removed_at: null,
          played_at: null,
          skipped_at: null,
          created_at: "2026-05-19T00:00:00.000Z",
          updated_at: "2026-05-19T00:00:00.000Z",
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && method === "POST" && url.pathname === "/api/v10/interactions/spotify-queue-view-interaction/spotify-queue-view-token/callback") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && method === "PATCH" && url.pathname === "/api/v10/webhooks/1504700208251146371/spotify-queue-view-token/messages/@original") {
      observedDiscordCalls.push({ method, path: url.pathname, body });
      return new Response(JSON.stringify({ id: "@original" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      id: "spotify-queue-view-interaction",
      application_id: "1504700208251146371",
      token: "spotify-queue-view-token",
      type: 3,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      message: {
        id: "spotify-controls-message-queue",
        flags: 64,
      },
      data: {
        custom_id: "spotify_queue_view",
      },
    }), keyPair));

    assert.equal(response.status, 202);
    assert.equal(observedDiscordCalls[0]?.body?.type, 5);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /\*\*Room Queue\*\*/);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /1\. Song A - Artist A/);
    assert.match(observedDiscordCalls[1]?.body?.content ?? "", /Pending suggestions: 1/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route stores an auto-approved Spotify queue suggestion and refreshes the panel", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  delete process.env.DISCORD_SPOTIFY_CLUB_TEST_CHANNEL_ID;
  delete process.env.SPOTIFY_CLIENT_ID;
  delete process.env.SPOTIFY_CLIENT_SECRET;

  const originalFetch = globalThis.fetch;
  const observedQueueBodies = [];
  const observedDiscordBodies = [];
  const queueItems = [];
  const currentLobby = {
    id: "lobby-1",
    status: "open",
    host_discord_user_id: "999999999999999999",
    host_spotify_user_id: null,
    title: null,
    description: null,
    panel_channel_id: "1504668396338413670",
    panel_message_id: "panel-message-1",
    opened_at: "2026-05-19T00:00:00.000Z",
    closed_at: null,
    created_at: "2026-05-19T00:00:00.000Z",
    updated_at: "2026-05-19T00:00:00.000Z",
  };

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([currentLobby]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify(buildSpotifyConnectionRow({
        discord_user_id: "123456789012345678",
        spotify_user_id: "spotify-user-1",
        spotify_product: "premium",
        is_premium: true,
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "POST") {
      observedQueueBodies.push(body);
      const row = {
        id: "abcdef12-0000-4000-8000-000000000000",
        ...body,
      };
      queueItems.push(row);
      return new Response(JSON.stringify(row), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify(queueItems), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504668396338413670/messages/panel-message-1" && method === "PATCH") {
      observedDiscordBodies.push(body);
      return new Response(JSON.stringify({ id: "panel-message-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        name: "jam-queue",
        options: [
          {
            type: 1,
            name: "suggest",
            options: [
              {
                type: 3,
                name: "track",
                value: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
              },
            ],
          },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Track added to the Music Sesh queue.",
        flags: 64,
      },
    });
    assert.equal(observedQueueBodies[0]?.status, "approved");
    assert.equal(observedQueueBodies[0]?.approval_state, "approved");
    assert.equal(observedQueueBodies[0]?.playback_state, "queued");
    assert.equal(observedQueueBodies[0]?.spotify_uri, "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp");
    assert.equal(observedDiscordBodies.length, 1);
    assert.match(observedDiscordBodies[0]?.embeds?.[0]?.description ?? "", /Now \/ next: 1\. spotify:track:3n3Ppam7vgaVa1iaRUc9Lp \(Discord link\)/);
    assert.match(observedDiscordBodies[0]?.embeds?.[0]?.description ?? "", /Room Queue: 1 active \/ 0 pending/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route blocks normal queue adds in host-only approval mode", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  delete process.env.SPOTIFY_CLIENT_ID;
  delete process.env.SPOTIFY_CLIENT_SECRET;

  const originalFetch = globalThis.fetch;
  let queueInsertCount = 0;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([buildSpotifyClubLobbyRow({
        id: "lobby-1",
        status: "open",
        host_discord_user_id: "999999999999999999",
        approval_mode: "host_only",
      })]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify(buildSpotifyConnectionRow({
        discord_user_id: "123456789012345678",
        spotify_product: "premium",
        is_premium: true,
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "POST") {
      queueInsertCount += 1;
      return new Response(JSON.stringify({}), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: "0",
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        name: "jam-queue",
        options: [
          {
            type: 1,
            name: "suggest",
            options: [
              {
                type: 3,
                name: "track",
                value: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
              },
            ],
          },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "This Music Sesh room is host-only right now.",
        flags: 64,
      },
    });
    assert.equal(queueInsertCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route sends Spotify queue proof logs only to the private testing channel when configured", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_SPOTIFY_CLUB_TEST_CHANNEL_ID = "1504999999999999999";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];
  const queueItems = [{
    id: "abcdef12-0000-4000-8000-000000000000",
    lobby_id: "lobby-1",
    status: "pending",
    spotify_uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
    spotify_url: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp",
    track_title: "Song A",
    artist_name: "Artist A",
    album_name: null,
    duration_ms: null,
    suggested_by_discord_user_id: "123456789012345678",
    suggested_by_spotify_user_id: null,
    approved_by_discord_user_id: null,
    rejected_by_discord_user_id: null,
    removed_by_discord_user_id: null,
    rejection_reason: null,
    removal_reason: null,
    queue_position: null,
    approved_at: null,
    rejected_at: null,
    removed_at: null,
    played_at: null,
    skipped_at: null,
    created_at: "2026-05-19T00:00:00.000Z",
    updated_at: "2026-05-19T00:00:00.000Z",
  }];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([{
        id: "lobby-1",
        status: "open",
        host_discord_user_id: "123456789012345678",
        host_spotify_user_id: null,
        title: null,
        description: null,
        panel_channel_id: "1504668396338413670",
        panel_message_id: "panel-message-1",
        opened_at: "2026-05-19T00:00:00.000Z",
        closed_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify(queueItems), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "PATCH") {
      queueItems[0] = {
        ...queueItems[0],
        ...body,
        queue_position: 1,
        status: "approved",
      };
      return new Response(JSON.stringify(queueItems[0]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504668396338413670/messages/panel-message-1" && method === "PATCH") {
      observedDiscordBodies.push({ path: url.pathname, body });
      return new Response(JSON.stringify({ id: "panel-message-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504999999999999999/messages" && method === "POST") {
      observedDiscordBodies.push({ path: url.pathname, body });
      return new Response(JSON.stringify({ id: "proof-log-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(28)),
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        name: "jam-queue",
        options: [
          {
            type: 1,
            name: "approve",
            options: [
              {
                type: 3,
                name: "item_id",
                value: "abcdef12",
              },
            ],
          },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Queue item approved.",
        flags: 64,
      },
    });
    assert.equal(observedDiscordBodies.length, 2);
    assert.equal(observedDiscordBodies[0]?.path, "/api/v10/channels/1504668396338413670/messages/panel-message-1");
    assert.match(observedDiscordBodies[0]?.body?.embeds?.[0]?.description ?? "", /1\. Song A - Artist A/);
    assert.equal(observedDiscordBodies[1]?.path, "/api/v10/channels/1504999999999999999/messages");
    assert.match(observedDiscordBodies[1]?.body?.content ?? "", /^Queue approved:/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_SPOTIFY_CLUB_TEST_CHANNEL_ID;
  }
});

test("Discord interactions route blocks queue approval for non-host non-staff members", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && String(init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify([{
        id: "lobby-1",
        status: "open",
        host_discord_user_id: "999999999999999999",
        host_spotify_user_id: null,
        title: null,
        description: null,
        panel_channel_id: "1504668396338413670",
        panel_message_id: "panel-message-1",
        opened_at: "2026-05-19T00:00:00.000Z",
        closed_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: "0",
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        name: "jam-queue",
        options: [
          {
            type: 1,
            name: "approve",
            options: [
              {
                type: 3,
                name: "item_id",
                value: "abcdef12",
              },
            ],
          },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "You do not have permission to manage the Music Sesh queue.",
        flags: 64,
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route opens the jam lobby and refreshes the Music Sesh panel", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];
  const observedSupabaseBodies = [];
  let currentLobby = {
    id: "lobby-1",
    status: "closed",
    host_discord_user_id: null,
    host_spotify_user_id: null,
    title: null,
    description: null,
    panel_channel_id: "1504668396338413670",
    panel_message_id: "panel-message-1",
    opened_at: null,
    closed_at: "2026-05-18T00:00:00.000Z",
    created_at: "2026-05-18T00:00:00.000Z",
    updated_at: "2026-05-18T00:00:00.000Z",
  };

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([currentLobby]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "POST") {
      observedSupabaseBodies.push(body);
      currentLobby = {
        ...body,
        id: "lobby-2",
        created_at: "2026-05-19T00:00:00.000Z",
      };
      return new Response(JSON.stringify({
        id: "lobby-2",
        ...currentLobby,
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504668396338413670/messages/panel-message-1" && method === "PATCH") {
      observedDiscordBodies.push(body);
      return new Response(JSON.stringify({ id: "panel-message-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(28)),
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        name: "jam-lobby",
        options: [
          { type: 1, name: "open" },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Music Sesh lobby is now Open.",
        flags: 64,
      },
    });
    assert.equal(observedSupabaseBodies[0]?.status, "open");
    assert.equal(observedSupabaseBodies[0]?.host_discord_user_id, "123456789012345678");
    assert.match(observedDiscordBodies[0]?.embeds?.[0]?.description ?? "", /Status: \*\*Open\*\*/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route recreates the Music Sesh panel when Discord blocks edits on an aged message", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;
  const observed = {
    createdDiscordBodies: [] as Array<Record<string, unknown>>,
    deletedMessageIds: [] as string[],
  };
  let currentLobby = {
    id: "lobby-1",
    status: "open",
    host_discord_user_id: "123456789012345678",
    host_spotify_user_id: null,
    title: null,
    description: null,
    panel_channel_id: "1504668396338413670",
    panel_message_id: "panel-message-1",
    opened_at: "2026-05-19T00:00:00.000Z",
    closed_at: null,
    created_at: "2026-05-19T00:00:00.000Z",
    updated_at: "2026-05-19T00:00:00.000Z",
  };

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_spotify_connections") && method === "GET") {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "GET") {
      return new Response(JSON.stringify([currentLobby]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_lobbies") && method === "PATCH") {
      currentLobby = {
        ...currentLobby,
        ...body,
      };
      return new Response(JSON.stringify(currentLobby), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_room_members") && method === "PATCH") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_spotify_queue_items") && method === "PATCH") {
      return new Response(JSON.stringify({
        id: "abcdef12-0000-4000-8000-000000000000",
        lobby_id: "lobby-1",
        status: "approved",
        source_type: "discord_link",
        approval_state: "approved",
        playback_state: "playing",
        spotify_uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
        spotify_url: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp",
        track_title: "Hey Ya!",
        artist_name: "Outkast",
        album_name: null,
        duration_ms: null,
        suggested_by_discord_user_id: "123456789012345678",
        suggested_by_spotify_user_id: null,
        approved_by_discord_user_id: "999999999999999999",
        rejected_by_discord_user_id: null,
        removed_by_discord_user_id: null,
        rejection_reason: null,
        removal_reason: null,
        queue_position: 1,
        dedupe_key: null,
        mirror_first_seen_at: null,
        mirror_last_seen_at: null,
        display_position: 1,
        cleared_reason: null,
        approved_at: "2026-05-19T00:00:00.000Z",
        rejected_at: null,
        removed_at: null,
        played_at: null,
        skipped_at: null,
        playback_started_at: "2026-05-19T00:00:00.000Z",
        playback_finished_at: null,
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504668396338413670/messages/panel-message-1" && method === "PATCH") {
      return new Response(JSON.stringify({ message: "Maximum number of edits to messages older than 1 hour reached." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504668396338413670/messages" && method === "POST") {
      observed.createdDiscordBodies.push(body);
      return new Response(JSON.stringify({ id: "panel-message-2" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504668396338413670/messages/panel-message-1" && method === "DELETE") {
      observed.deletedMessageIds.push("panel-message-1");
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${method})`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(28)),
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        name: "jam-lobby",
        options: [
          { type: 1, name: "close" },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Music Sesh lobby is now Closed.",
        flags: 64,
      },
    });
    assert.equal(currentLobby.status, "closed");
    assert.equal(currentLobby.panel_message_id, "panel-message-2");
    assert.deepEqual(observed.deletedMessageIds, ["panel-message-1"]);
    assert.match(observed.createdDiscordBodies[0]?.embeds?.[0]?.description ?? "", /Status: \*\*Closed\*\*/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route explains when Fawx Security is below the Verified role", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_VERIFICATION_TOKEN_PEPPER = "test-pepper";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_VERIFIED_ROLE_ID = "1504700000000000000";
  delete process.env.DISCORD_UNVERIFIED_ROLE_ID;

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));

    if (url.pathname.endsWith("/rest/v1/rpc/consume_discord_verification_token")) {
      return new Response(JSON.stringify([{
        ok: true,
        user_id: "00000000-0000-0000-0000-000000000123",
        user_number: 12,
        user_kind: "human",
        expires_at: "2026-05-15T12:00:00.000Z",
        consumed_at: "2026-05-15T11:59:00.000Z",
        error: null,
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com") {
      if (
        url.pathname === "/api/v10/guilds/1504668396338413670/members/123456789012345678/roles/1504700000000000000"
        && init?.method === "PUT"
      ) {
        return new Response(JSON.stringify({ message: "Missing Permissions" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (
        url.pathname === "/api/v10/guilds/1504668396338413670/members/123456789012345678"
        && init?.method === "GET"
      ) {
        return new Response(JSON.stringify({
          roles: ["1504675249600336013"],
          user: {
            id: "123456789012345678",
            username: "zac",
          },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (
        url.pathname === "/api/v10/guilds/1504668396338413670/roles"
        && init?.method === "GET"
      ) {
        return new Response(JSON.stringify([
          { id: "1504700000000000000", name: "Verified", position: 8, permissions: "0", managed: false },
          { id: "1504675249600336013", name: "Fawxzzies", position: 1, permissions: "0", managed: false },
          { id: "1504700208251146371", name: "Fawx Security", position: 5, permissions: String((BigInt(1) << BigInt(3)).toString()), managed: true },
        ]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (
        url.pathname === "/api/v10/guilds/1504668396338413670/members/1504700208251146371"
        && init?.method === "GET"
      ) {
        return new Response(JSON.stringify({
          roles: ["1504700208251146371"],
          user: {
            id: "1504700208251146371",
            username: "Fawx Security",
          },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    throw new Error(`Unexpected fetch: ${url.toString()} ${init?.method ?? "GET"}`);
  };

  try {
    const response = await POST(createSignedRequest(JSON.stringify({
      type: 5,
      guild_id: "1504668396338413670",
      member: {
        user: {
          id: "123456789012345678",
          username: "zac",
        },
      },
      data: {
        custom_id: "fitness_verify_modal",
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "fitness_token",
                value: "FWX-ABCD-EFGH",
              },
            ],
          },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Fitness verified your token, but the Fawx Security role is not above Verified in Discord's role list. Move it higher and try again.",
        flags: 64,
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
