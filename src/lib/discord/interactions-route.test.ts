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

test("Discord interactions route opens the bug report modal for /bug", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);

  const response = await POST(createSignedRequest(JSON.stringify({
    type: 2,
    data: {
      name: "bug",
    },
  }), keyPair));

  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.equal(payload.type, 9);
  assert.equal(payload.data.custom_id, "fitness_bug_report_modal");
});

test("Discord interactions route accepts bug reports even when the forum env is not configured", async () => {
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

    if (url.pathname.endsWith("/rest/v1/discord_bug_reports") && init?.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "content-range": "0-0/0" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_bug_reports") && init?.method === "GET") {
      return new Response("null", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_bug_reports") && init?.method === "POST") {
      return new Response(JSON.stringify({
        id: "report-1",
        source: "discord",
        status: "new",
        severity: "medium",
        area: "Settings",
        summary: "Token copy button failed",
        details: "I tapped Copy and nothing happened.",
        steps_to_reproduce: "Open Settings -> Account -> Generate token -> tap Copy",
        screenshot_url: null,
        reporter_discord_user_id: "123456789012345678",
        reporter_discord_username: "zac",
        reporter_fitness_user_id: null,
        reporter_member_number: null,
        reporter_user_kind: null,
        discord_interaction_id: "interaction-1",
        duplicate_fingerprint: "abc123",
        duplicate_count: 1,
        first_seen_at: "2026-05-15T13:00:00.000Z",
        last_seen_at: "2026-05-15T13:00:00.000Z",
        discord_forum_channel_id: null,
        discord_forum_thread_id: null,
        discord_forum_message_id: null,
        staff_channel_message_id: null,
        closed_at: null,
        pruned_at: null,
        details_pruned: false,
        triage_notes: null,
        created_at: "2026-05-15T13:00:00.000Z",
        updated_at: "2026-05-15T13:00:00.000Z",
      }), {
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
        custom_id: "fitness_bug_report_modal",
        components: [
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
        content: "Bug report received. Thanks for helping improve Fitness.",
        flags: 64,
      },
    });
    assert.equal(discordCallCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord interactions route stores a unique bug report and creates a forum thread", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies: Array<{ path: string; method: string; body: Record<string, unknown> | null }> = [];
  const observedSupabaseWrites: Array<{ path: string; method: string; body: Record<string, unknown> | null }> = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : null;

    if (url.pathname.endsWith("/rest/v1/discord_bug_reports") && init?.method === "HEAD") {
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

    if (url.pathname.endsWith("/rest/v1/discord_bug_reports") && init?.method === "POST") {
      observedSupabaseWrites.push({ path: url.pathname, method: "POST", body });
      return new Response(JSON.stringify({
        id: "report-1",
        source: "discord",
        status: "new",
        severity: "medium",
        area: "Settings",
        summary: "Token copy button failed",
        details: "I tapped Copy and nothing happened.",
        steps_to_reproduce: "Open Settings -> Account -> Generate token -> tap Copy",
        screenshot_url: null,
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
        discord_forum_channel_id: null,
        discord_forum_thread_id: null,
        discord_forum_message_id: null,
        staff_channel_message_id: null,
        closed_at: null,
        pruned_at: null,
        details_pruned: false,
        triage_notes: null,
        created_at: "2026-05-15T13:00:00.000Z",
        updated_at: "2026-05-15T13:00:00.000Z",
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_bug_reports") && init?.method === "GET") {
      return new Response("null", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_bug_reports") && init?.method === "PATCH") {
      observedSupabaseWrites.push({ path: url.pathname, method: "PATCH", body });
      return new Response(JSON.stringify([]), {
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
        custom_id: "fitness_bug_report_modal",
        components: [
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
        content: "Bug report received from Member #4. Thanks for helping improve Fitness.",
        flags: 64,
      },
    });
    assert.equal(observedSupabaseWrites[0]?.method, "POST");
    assert.equal(observedSupabaseWrites[0]?.body?.summary, "Token copy button failed");
    assert.equal(observedDiscordBodies[0]?.path, "/api/v10/channels/1504673475489562744/threads");
    assert.equal(observedDiscordBodies[0]?.body?.name, "[Bug][Medium] Settings — Token copy button failed");
    assert.equal(observedSupabaseWrites[1]?.body?.discord_forum_thread_id, "1504673475489562745");
    assert.equal(observedSupabaseWrites[1]?.body?.discord_forum_message_id, "1504673475489562746");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route folds duplicate bug reports and posts only a compact forum reply", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID = "1504673475489562744";

  const originalFetch = globalThis.fetch;
  const observedDiscordBodies: Array<{ path: string; method: string; body: Record<string, unknown> | null }> = [];
  const observedSupabaseWrites: Array<{ path: string; method: string; body: Record<string, unknown> | null }> = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : null;

    if (url.pathname.endsWith("/rest/v1/discord_bug_reports") && init?.method === "HEAD") {
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

    if (url.pathname.endsWith("/rest/v1/discord_bug_reports") && init?.method === "GET") {
      return new Response(JSON.stringify({
        id: "report-1",
        source: "discord",
        status: "new",
        severity: "medium",
        area: "Settings",
        summary: "Token copy button failed",
        details: "I tapped Copy and nothing happened.",
        steps_to_reproduce: "Open Settings -> Account -> Generate token -> tap Copy",
        screenshot_url: null,
        reporter_discord_user_id: "123456789012345678",
        reporter_discord_username: null,
        reporter_fitness_user_id: null,
        reporter_member_number: null,
        reporter_user_kind: null,
        discord_interaction_id: "interaction-1",
        duplicate_fingerprint: "abc123",
        duplicate_count: 2,
        first_seen_at: "2026-05-10T13:00:00.000Z",
        last_seen_at: "2026-05-14T13:00:00.000Z",
        discord_forum_channel_id: "1504673475489562744",
        discord_forum_thread_id: "1504673475489562745",
        discord_forum_message_id: "1504673475489562746",
        staff_channel_message_id: null,
        closed_at: null,
        pruned_at: null,
        details_pruned: false,
        triage_notes: null,
        created_at: "2026-05-10T13:00:00.000Z",
        updated_at: "2026-05-14T13:00:00.000Z",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_bug_reports") && init?.method === "PATCH") {
      observedSupabaseWrites.push({ path: url.pathname, method: "PATCH", body });
      return new Response(JSON.stringify({
        id: "report-1",
        source: "discord",
        status: "new",
        severity: "medium",
        area: "Settings",
        summary: "Token copy button failed",
        details: "I tapped Copy and nothing happened.",
        steps_to_reproduce: "Open Settings -> Account -> Generate token -> tap Copy",
        screenshot_url: null,
        reporter_discord_user_id: "123456789012345678",
        reporter_discord_username: "zac",
        reporter_fitness_user_id: "00000000-0000-0000-0000-000000000123",
        reporter_member_number: 4,
        reporter_user_kind: "human",
        discord_interaction_id: "interaction-1",
        duplicate_fingerprint: "abc123",
        duplicate_count: 3,
        first_seen_at: "2026-05-10T13:00:00.000Z",
        last_seen_at: "2026-05-15T13:00:00.000Z",
        discord_forum_channel_id: "1504673475489562744",
        discord_forum_thread_id: "1504673475489562745",
        discord_forum_message_id: "1504673475489562746",
        staff_channel_message_id: null,
        closed_at: null,
        pruned_at: null,
        details_pruned: false,
        triage_notes: null,
        created_at: "2026-05-10T13:00:00.000Z",
        updated_at: "2026-05-15T13:00:00.000Z",
      }), {
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
        custom_id: "fitness_bug_report_modal",
        components: [
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
        content: "Bug report received. It looks similar to an existing report, so we added your signal to that issue.",
        flags: 64,
      },
    });
    assert.equal(observedSupabaseWrites.length, 1);
    assert.equal(observedSupabaseWrites[0]?.body?.duplicate_count, 3);
    assert.equal(observedDiscordBodies[0]?.path, "/api/v10/channels/1504673475489562745/messages");
    assert.equal(observedDiscordBodies[0]?.body?.content, "Another report matched this bug.\nReporter: Member #4\nDuplicate signals: 3");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
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
