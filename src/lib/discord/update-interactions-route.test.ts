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

function buildUpdateDraftRow(overrides = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    source: "vercel",
    status: "draft",
    deployment_id: "dpl_123",
    deployment_url: "https://fawxzzy-fitness-preview.vercel.app/",
    production_url: "https://fawxzzy-fitness-local.vercel.app/",
    vercel_project_id: "prj_rtlFVOMFAWCRoJ3SQjHloi89881K",
    vercel_project_name: "fawxzzy-fitness",
    vercel_target: "production",
    git_commit_sha: "abcdef1234567890",
    git_commit_ref: "main",
    git_commit_message: "internal raw message",
    user_facing_title: null,
    user_facing_changes: null,
    user_facing_why_it_matters: null,
    discord_channel_id: null,
    discord_message_id: null,
    published_by_discord_user_id: null,
    published_at: null,
    skipped_by_discord_user_id: null,
    skipped_at: null,
    skip_reason: null,
    webhook_received_at: "2026-05-16T11:00:00.000Z",
    created_at: "2026-05-16T11:00:00.000Z",
    updated_at: "2026-05-16T11:00:00.000Z",
    ...overrides,
  };
}

test("Discord interactions route shows the latest update drafts ephemerally", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));

    if (url.pathname.endsWith("/rest/v1/discord_update_drafts") && init?.method === "GET") {
      return new Response(JSON.stringify([
        buildUpdateDraftRow(),
        buildUpdateDraftRow({
          id: "22222222-2222-4222-8222-222222222222",
          deployment_id: "dpl_456",
          git_commit_sha: "123456abcdef7890",
          created_at: "2026-05-16T11:05:00.000Z",
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
      type: 2,
      guild_id: "1504668396338413670",
      member: {
        permissions: String(BigInt(1) << BigInt(13)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        name: "update-latest",
      },
    }), keyPair));

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.type, 4);
    assert.equal(payload.data.flags, 64);
    assert.match(payload.data.content, /Latest production update drafts:/);
    assert.match(payload.data.content, /Use \/update-publish/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route opens the publish update modal for a valid draft", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));

    if (url.pathname.endsWith("/rest/v1/discord_update_drafts") && init?.method === "GET") {
      return new Response(JSON.stringify([buildUpdateDraftRow()]), {
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
        name: "update-publish",
        options: [
          { type: 3, name: "draft_id", value: "11111111" },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.type, 9);
    assert.equal(
      payload.data.custom_id,
      "fitness_update_publish_modal:11111111-1111-4111-8111-111111111111",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route publishes curated updates into DISCORD_UPDATES_CHANNEL_ID", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_UPDATES_CHANNEL_ID = "1504671871512346695";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies = [];
  let updateCount = 0;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_update_drafts") && init?.method === "GET") {
      return new Response(JSON.stringify([buildUpdateDraftRow()]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_update_drafts") && init?.method === "PATCH") {
      updateCount += 1;
      return new Response(JSON.stringify(buildUpdateDraftRow({
        status: "published",
        user_facing_title: body.user_facing_title,
        user_facing_changes: body.user_facing_changes,
        user_facing_why_it_matters: body.user_facing_why_it_matters,
        discord_channel_id: body.discord_channel_id,
        discord_message_id: body.discord_message_id,
        published_by_discord_user_id: body.published_by_discord_user_id,
        published_at: body.published_at,
        updated_at: body.updated_at,
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && url.pathname === "/api/v10/channels/1504671871512346695/messages") {
      observedDiscordBodies.push(body);
      return new Response(JSON.stringify({ id: "1505000000000000001" }), {
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
        permissions: String(BigInt(1) << BigInt(13)),
        user: {
          id: "222222222222222222",
          username: "staffer",
        },
      },
      data: {
        custom_id: "fitness_update_publish_modal:11111111-1111-4111-8111-111111111111",
        components: [
          { type: 1, components: [{ type: 4, custom_id: "update_title", value: "Better feedback tools are live" }] },
          { type: 1, components: [{ type: 4, custom_id: "update_what_changed", value: "- Submit feedback from one panel\n- Add more detail to your own report" }] },
          { type: 1, components: [{ type: 4, custom_id: "update_why_it_matters", value: "It is easier to send useful feedback without memorizing commands." }] },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Update posted.",
        flags: 64,
      },
    });
    assert.equal(updateCount, 1);
    assert.equal(observedDiscordBodies[0]?.content ?? "", "");
    assert.equal(observedDiscordBodies[0]?.flags, undefined);
    assert.equal(observedDiscordBodies[0]?.embeds?.[0]?.title, "Better feedback tools are live");
    assert.equal(observedDiscordBodies[0]?.embeds?.[0]?.color, 0x22c55e);
    assert.match(observedDiscordBodies[0]?.embeds?.[0]?.description ?? "", /A new update is live\./);
    assert.match(observedDiscordBodies[0]?.embeds?.[0]?.description ?? "", /Open Fitness:\n<https:\/\/fawxzzy-fitness-local\.vercel\.app\/login>/);
    assert.deepEqual(observedDiscordBodies[0]?.allowed_mentions, {
      parse: [],
      replied_user: false,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route skips update drafts without posting to Discord", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_update_drafts") && init?.method === "GET") {
      return new Response(JSON.stringify([buildUpdateDraftRow()]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_update_drafts") && init?.method === "PATCH") {
      return new Response(JSON.stringify(buildUpdateDraftRow({
        status: "skipped",
        skipped_by_discord_user_id: body.skipped_by_discord_user_id,
        skipped_at: body.skipped_at,
        skip_reason: body.skip_reason,
        updated_at: body.updated_at,
      })), {
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
        name: "update-skip",
        options: [
          { type: 3, name: "draft_id", value: "11111111" },
          { type: 3, name: "reason", value: "Internal-only infrastructure work." },
        ],
      },
    }), keyPair));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      type: 4,
      data: {
        content: "Update draft skipped.",
        flags: 64,
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
