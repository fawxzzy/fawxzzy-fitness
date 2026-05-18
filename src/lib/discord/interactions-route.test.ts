// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";
import nacl from "tweetnacl";
import { POST } from "@/app/api/discord/interactions/route.ts";

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
    reporter_mentioned_at: "2026-05-15T13:00:00.000Z",
    created_at: "2026-05-15T13:00:00.000Z",
    updated_at: "2026-05-15T13:00:00.000Z",
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
    assert.equal(observedDiscordBodies[0]?.components?.[0]?.components?.[0]?.custom_id, "fitness_verify_open");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_VERIFY_CHANNEL_ID;
  }
});

test("Discord interactions route updates an existing feedback panel when setup-feedback is rerun", async () => {
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
      && String(init?.method ?? "GET") === "PATCH"
    ) {
      observedDiscordBodies.push(body);
      return new Response(JSON.stringify({ id: "1504673475489562747" }), {
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

test("Discord interactions route cleans duplicate feedback launcher messages on setup-feedback", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_FEEDBACK_PANEL_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const deletedMessageIds = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744") {
      return new Response(JSON.stringify({ id: "1504673475489562744", type: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504673475489562744/messages"
      && method === "GET"
      && url.searchParams.get("limit") === "50"
    ) {
      return new Response(JSON.stringify([
        {
          id: "1504673475489562747",
          author: { id: "1504700208251146371" },
          components: [
            { type: 1, components: [
              { type: 2, custom_id: "fitness_feedback_submit_open" },
              { type: 2, custom_id: "fitness_feedback_update_open" },
            ] },
          ],
        },
        {
          id: "1504673475489562755",
          author: { id: "1504700208251146371" },
          components: [
            { type: 1, components: [
              { type: 2, custom_id: "fitness_feedback_submit_open" },
              { type: 2, custom_id: "fitness_feedback_update_open" },
            ] },
          ],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504673475489562744/messages/1504673475489562747"
      && method === "PATCH"
    ) {
      return new Response(JSON.stringify({ id: "1504673475489562747" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504673475489562744/messages/1504673475489562755"
      && method === "DELETE"
    ) {
      deletedMessageIds.push("1504673475489562755");
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
        name: "setup-feedback",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback launcher updated in configured channel. Removed 1 stale panel item.",
        flags: 64,
      },
    });
    assert.deepEqual(deletedMessageIds, ["1504673475489562755"]);
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
      && String(init?.method ?? "GET") === "PATCH"
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
        content: "Feedback launcher created in configured channel.",
        flags: 64,
      },
    });
    assert.equal(observedDiscordBodies[0]?.embeds?.[0]?.title, "Submit Feedback Here");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_FEEDBACK_PANEL_CHANNEL_ID;
  }
});

test("Discord interactions route can create the submit-feedback launcher channel beside the forum", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  delete process.env.DISCORD_FEEDBACK_PANEL_CHANNEL_ID;
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedBodies = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744") {
      return new Response(JSON.stringify({
        id: "1504673475489562744",
        type: 15,
        parent_id: "1504673475489562000",
        position: 8,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/guilds/1504668396338413670/channels" && method === "GET") {
      return new Response(JSON.stringify([
        {
          id: "1504673475489562744",
          type: 15,
          name: "feedback",
          parent_id: "1504673475489562000",
          position: 8,
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/guilds/1504668396338413670/channels" && method === "POST") {
      observedBodies.push(body);
      return new Response(JSON.stringify({
        id: "1504673475489562999",
        type: 0,
        name: "submit-feedback",
        parent_id: "1504673475489562000",
        position: 8,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504673475489562999"
    ) {
      return new Response(JSON.stringify({ id: "1504673475489562999", type: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504673475489562999/messages"
      && method === "GET"
      && url.searchParams.get("limit") === "50"
    ) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504673475489562999/messages"
      && method === "POST"
    ) {
      observedBodies.push(body);
      return new Response(JSON.stringify({ id: "1504673475489563001" }), {
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
        content: "Feedback launcher created in #submit-feedback.",
        flags: 64,
      },
    });
    assert.equal(observedBodies[0]?.name, "submit-feedback");
    assert.equal(observedBodies[0]?.type, 0);
    assert.equal(observedBodies[0]?.parent_id, "1504673475489562000");
    assert.equal(observedBodies[0]?.position, 8);
    assert.equal(observedBodies[1]?.embeds?.[0]?.title, "Submit Feedback Here");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route cleans duplicate verify messages on setup-verify", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_VERIFY_CHANNEL_ID = "1504668700000000000";

  const originalFetch = globalThis.fetch;
  const deletedMessageIds = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504668700000000000/messages"
      && method === "GET"
      && url.searchParams.get("limit") === "50"
    ) {
      return new Response(JSON.stringify([
        {
          id: "1504668700000000100",
          author: { id: "1504700208251146371" },
          components: [
            { type: 1, components: [{ type: 2, custom_id: "fitness_verify_open" }] },
          ],
        },
        {
          id: "1504668700000000101",
          author: { id: "1504700208251146371" },
          components: [
            { type: 1, components: [{ type: 2, custom_id: "fitness_verify_open" }] },
          ],
        },
      ]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504668700000000000/messages/1504668700000000100"
      && method === "PATCH"
    ) {
      return new Response(JSON.stringify({ id: "1504668700000000100" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504668700000000000/messages/1504668700000000101"
      && method === "DELETE"
    ) {
      deletedMessageIds.push("1504668700000000101");
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
        name: "setup-verify",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Verification message updated in the configured verify channel. Removed 1 stale panel item.",
        flags: 64,
      },
    });
    assert.deepEqual(deletedMessageIds, ["1504668700000000101"]);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_VERIFY_CHANNEL_ID;
  }
});

test("Discord interactions route cleans duplicate feedback launcher threads when the panel lives in a forum", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_FEEDBACK_PANEL_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const deletedThreadIds = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = String(init?.method ?? "GET");

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562744") {
      return new Response(JSON.stringify({ id: "1504673475489562744", type: 15 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/guilds/1504668396338413670/threads/active"
      && method === "GET"
    ) {
      return new Response(JSON.stringify({
        threads: [
          {
            id: "1504673475489562745",
            parent_id: "1504673475489562744",
            owner_id: "1504700208251146371",
            name: "Fawxzzy Feedback",
          },
          {
            id: "1504673475489562748",
            parent_id: "1504673475489562744",
            owner_id: "1504700208251146371",
            name: "Fawxzzy Feedback",
          },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504673475489562745/messages/1504673475489562745"
      && method === "PATCH"
    ) {
      return new Response(JSON.stringify({ id: "1504673475489562745" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      url.hostname === "discord.com"
      && url.pathname === "/api/v10/channels/1504673475489562748"
      && method === "DELETE"
    ) {
      deletedThreadIds.push("1504673475489562748");
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
        name: "setup-feedback",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback launcher updated in configured channel. Removed 1 stale panel item.",
        flags: 64,
      },
    });
    assert.deepEqual(deletedThreadIds, ["1504673475489562748"]);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_FEEDBACK_PANEL_CHANNEL_ID;
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

test("Discord interactions route returns a clean fallback for outdated feedback launcher buttons", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);

  const response = await POST(createSignedRequest(JSON.stringify({
    type: 3,
    data: {
      custom_id: "fitness_feedback_withdraw_open",
    },
  }), keyPair));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    type: 4,
    data: {
      content: "This feedback panel is outdated. Ask staff to run /setup-feedback.",
      flags: 64,
    },
  });
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
  assert.equal(payload.data.components[0]?.component?.custom_id, "feedback_type");
  assert.equal(payload.data.components[4]?.component?.custom_id, "feedback_attachment");
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

test("Discord interactions route accepts the optional Fawxzzy review status", async () => {
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
        discord_forum_applied_tag_ids: ["tag-bug", "tag-confirmed", "tag-medium"],
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "PATCH") {
      observedSupabaseWrites.push(body);
      if (observedSupabaseWrites.length === 1) {
        return new Response(JSON.stringify(buildFeedbackReportRow({
          status: "fawxzzy_review",
          status_updated_at: "2026-05-18T14:00:00.000Z",
          status_updated_by_discord_user_id: "222222222222222222",
          status_note: "Selected for manual owner review.",
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
          { id: "tag-review", name: "Fawxzzy Review" },
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
      return new Response(JSON.stringify({ id: "discord-message-review" }), {
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
          { type: 3, name: "status", value: "fawxzzy_review" },
          { type: 3, name: "note", value: "Selected for manual owner review." },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Feedback updated.\nStatus: Ready for Fawxzzy Review",
        flags: 64,
      },
    });
    assert.equal(observedSupabaseWrites[0]?.status, "fawxzzy_review");
    assert.deepEqual(observedSupabaseWrites[1]?.discord_forum_applied_tag_ids, ["tag-bug", "tag-review", "tag-medium"]);
    const auditReply = observedDiscordBodies.find((entry) => entry.path === "/api/v10/channels/1504673475489562745/messages");
    assert.match(auditReply?.body?.content ?? "", /Status: Confirmed -> Ready for Fawxzzy Review/);
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

test("Discord interactions route adds a resolved checkmark to the starter message for fixed feedback", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];

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
      return new Response(JSON.stringify(buildFeedbackReportRow({
        report_type: "feature",
        status: "fixed",
        area: "Routines",
        summary: "Let me share a routine",
        status_updated_at: "2026-05-15T14:00:00.000Z",
        status_updated_by_discord_user_id: "222222222222222222",
        status_note: "Shipped in the latest deploy.",
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

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages/1504673475489562746/reactions/%E2%9C%85/@me") {
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
    const auditReply = observedDiscordBodies.find((entry) => entry.path === "/api/v10/channels/1504673475489562745/messages");
    assert.match(auditReply?.body?.content ?? "", /Marked resolved by Fawx Security\./);
    assert.match(auditReply?.body?.content ?? "", /Status: Confirmed -> Completed/);
    assert.equal(
      observedDiscordBodies.some((entry) => entry.path.endsWith("/messages/1504673475489562746/reactions/%E2%9C%85/@me") && entry.method === "PUT"),
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
      return new Response(JSON.stringify(buildFeedbackReportRow({
        status: "fixed",
        discord_forum_message_id: null,
        status_updated_at: "2026-05-15T14:00:00.000Z",
        status_updated_by_discord_user_id: "222222222222222222",
        status_note: body?.status_note ?? null,
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

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504673475489562745/messages/discord-message-fixed-fallback/reactions/%E2%9C%85/@me") {
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
        content: "Feedback updated.",
        flags: 64,
      },
    });
    const auditReply = observedDiscordBodies.find((entry) => entry.path === "/api/v10/channels/1504673475489562745/messages");
    assert.match(auditReply?.body?.content ?? "", /Marked resolved by Fawx Security\./);
    assert.match(auditReply?.body?.content ?? "", /Status: New -> Fixed/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
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
