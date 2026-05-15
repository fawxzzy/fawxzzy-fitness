import assert from "node:assert/strict";
import test from "node:test";
import nacl from "tweetnacl";
import { POST } from "@/app/api/discord/interactions/route.ts";

function toHex(value: Uint8Array): string {
  return Buffer.from(value).toString("hex");
}

function createSignedRequest(body: string, keyPair: nacl.SignKeyPair) {
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

test("Discord interactions route returns 401 for malformed signature payloads instead of throwing", async () => {
  process.env.DISCORD_PUBLIC_KEY = "00".repeat(32);

  const response = await POST(new Request("http://localhost/api/discord/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Signature-Ed25519": "00",
      "X-Signature-Timestamp": "1715702400",
    },
    body: JSON.stringify({ type: 1 }),
  }));

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Invalid request signature." });
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
  const observedRpcBodies: Array<{ path: string; body: Record<string, unknown> }> = [];
  const observedDiscordBodies: Array<{ path: string; method: string; body: Record<string, unknown> | null }> = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : null;

    if (url.pathname.endsWith("/rest/v1/rpc/consume_discord_verification_token")) {
      observedRpcBodies.push({ path: url.pathname, body: body ?? {} });
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
      observedRpcBodies.push({ path: url.pathname, body: body ?? {} });
      return new Response(JSON.stringify([{
        id: "11111111-1111-1111-1111-111111111111",
      }]), {
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
        return new Response(JSON.stringify({ nick: "#12 · Zac" }), {
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
        content: "Verified as Member #12. You now have access to the server.",
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
        body: { nick: "#12 · Zac" },
      },
    ]);
    assert.equal(observedRpcBodies[1]?.body.input_nickname_sync_status, "synced");
    assert.equal(observedRpcBodies[1]?.body.input_user_number, 12);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route keeps verification active when nickname sync fails", async () => {
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
  const observedRpcBodies: Array<{ path: string; body: Record<string, unknown> }> = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : null;

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
      observedRpcBodies.push({ path: url.pathname, body: body ?? {} });
      return new Response(JSON.stringify([{
        id: "11111111-1111-1111-1111-111111111111",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.hostname === "discord.com" && init?.method === "PUT") {
      return new Response(null, { status: 204 });
    }

    if (url.hostname === "discord.com" && init?.method === "PATCH") {
      return new Response(JSON.stringify({ message: "Missing Permissions" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
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
        content: "Verified as Member #12. Your access is active, but Discord could not update your nickname.",
        flags: 64,
      },
    });
    assert.equal(observedRpcBodies[0]?.body.input_nickname_sync_status, "failed");
    assert.equal(observedRpcBodies[0]?.body.input_last_error_code, "DISCORD_NICKNAME_UPDATE_FORBIDDEN");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
