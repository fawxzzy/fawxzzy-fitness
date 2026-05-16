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

test("Discord interactions route opens the feedback modal for /feedback type:feat", async () => {
  const keyPair = nacl.sign.keyPair();
  process.env.DISCORD_PUBLIC_KEY = toHex(keyPair.publicKey);

  const response = await POST(createSignedRequest(JSON.stringify({
    type: 2,
    data: {
      name: "feedback",
      options: [
        { type: 3, name: "type", value: "feat" },
      ],
    },
  }), keyPair));

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.type, 9);
  assert.equal(payload.data.custom_id, "fitness_feedback_report_modal:feat");
  assert.equal(payload.data.title, "Suggest a feature");
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
        custom_id: "fitness_feedback_report_modal:bug",
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
        content: "Feedback received. Thanks for helping improve Fitness.",
        flags: 64,
      },
    });
    assert.equal(discordCallCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
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
        report_type: "feat",
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
          { id: "tag-feat", name: "Feat" },
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
        custom_id: "fitness_feedback_report_modal:feat",
        components: [
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
        content: "Feedback received from Member #4. Thanks for helping improve Fitness.",
        flags: 64,
      },
    });
    assert.equal(observedSupabaseWrites[0]?.body?.report_type, "feat");
    assert.equal(observedDiscordBodies[1]?.body?.name, "Feat: Routines — Let me share a routine");
    assert.deepEqual(observedDiscordBodies[1]?.body?.applied_tags, ["tag-feat", "tag-new", "tag-medium"]);
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
        custom_id: "fitness_feedback_report_modal:bug",
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
        content: "Feedback received. It looks similar to an existing report, so we added your signal to that issue.",
        flags: 64,
      },
    });
    assert.equal(observedSupabaseWrites[0]?.duplicate_count, 3);
    assert.equal(observedDiscordBodies[0]?.content, "Another report matched this feedback.\nReporter: Member #7\nDuplicate signals: 3");
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

test("Discord interactions route syncs feedback-status into Supabase and forum tags", async () => {
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
        status: "new",
      })), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "PATCH") {
      observedSupabaseWrites.push(body);
      if (observedSupabaseWrites.length === 1) {
        return new Response(JSON.stringify(buildFeedbackReportRow({
          status: "needs_info",
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
          { id: "tag-bug", name: "Bug" },
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
    assert.equal(observedSupabaseWrites[1]?.discord_forum_title, "Bug: Settings — Token copy button failed");
    assert.deepEqual(observedSupabaseWrites[1]?.discord_forum_applied_tag_ids, ["tag-bug", "tag-needs-info", "tag-medium"]);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.DISCORD_BUG_REPORT_FORUM_CHANNEL_ID;
  }
});

test("Discord interactions route allows reporters to withdraw and redact their feedback", async () => {
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
      return new Response(JSON.stringify(buildFeedbackReportRow()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_feedback_reports") && init?.method === "PATCH") {
      observedSupabaseWrites.push(body);
      if (observedSupabaseWrites.length === 1) {
        return new Response(JSON.stringify(buildFeedbackReportRow({
          status: "withdrawn",
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
          { id: "tag-bug", name: "Bug" },
          { id: "tag-withdrawn", name: "Withdrawn" },
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
      return new Response(JSON.stringify({ id: "discord-message-4" }), {
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
        content: "Feedback withdrawn. We removed the detailed text and kept a small audit record.",
        flags: 64,
      },
    });
    assert.equal(observedSupabaseWrites[0]?.status, "withdrawn");
    assert.equal(observedSupabaseWrites[0]?.details, null);
    assert.equal(observedSupabaseWrites[0]?.steps_to_reproduce, null);
    assert.equal(observedSupabaseWrites[0]?.screenshot_url, null);
    assert.equal(observedSupabaseWrites[1]?.discord_forum_applied_tag_ids?.[1], "tag-withdrawn");
    assert.match(observedDiscordBodies[1]?.body?.content ?? "", /Status: Withdrawn/);
    assert.match(observedDiscordBodies[1]?.body?.content ?? "", /\*\*What happened\*\*\s+Not provided/);
    assert.deepEqual(observedDiscordBodies[1]?.body?.allowed_mentions, {
      parse: [],
      users: [],
      roles: [],
      replied_user: false,
    });
    assert.equal(observedDiscordBodies[2]?.body?.content, "This feedback was withdrawn by the reporter.");
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
