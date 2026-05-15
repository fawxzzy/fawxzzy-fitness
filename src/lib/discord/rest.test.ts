import assert from "node:assert/strict";
import test from "node:test";
import {
  createDiscordForumThreadWithMessage,
  createDiscordThreadMessage,
  updateDiscordGuildMemberNickname,
} from "./rest.ts";

test("updateDiscordGuildMemberNickname PATCHes the guild member nickname", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;
  let observedRequest: { url: string; method: string; authorization: string | null; body: string | null } | null = null;

  globalThis.fetch = async (input, init) => {
    observedRequest = {
      url: String(input),
      method: String(init?.method ?? "GET"),
      authorization: init?.headers instanceof Headers
        ? init.headers.get("Authorization")
        : Array.isArray(init?.headers)
          ? null
          : String((init?.headers as Record<string, string> | undefined)?.Authorization ?? ""),
      body: typeof init?.body === "string" ? init.body : null,
    };

    return new Response(JSON.stringify({ nick: "#12 · Zac" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await updateDiscordGuildMemberNickname({
      guildId: "1504668396338413670",
      userId: "123456789012345678",
      nickname: "#12 · Zac",
    });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(observedRequest, {
      url: "https://discord.com/api/v10/guilds/1504668396338413670/members/123456789012345678",
      method: "PATCH",
      authorization: "Bot test-bot-token",
      body: JSON.stringify({ nick: "#12 · Zac" }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateDiscordGuildMemberNickname returns a safe forbidden failure", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response(JSON.stringify({ message: "Missing Permissions" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });

  try {
    const result = await updateDiscordGuildMemberNickname({
      guildId: "1504668396338413670",
      userId: "123456789012345678",
      nickname: "#12 · Zac",
    });

    assert.deepEqual(result, {
      ok: false,
      code: "DISCORD_NICKNAME_UPDATE_FORBIDDEN",
      status: 403,
      message: "Missing Permissions",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createDiscordForumThreadWithMessage POSTs the forum thread creation payload", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;
  let observedRequest: { url: string; method: string; body: string | null } | null = null;

  globalThis.fetch = async (input, init) => {
    observedRequest = {
      url: String(input),
      method: String(init?.method ?? "GET"),
      body: typeof init?.body === "string" ? init.body : null,
    };

    return new Response(JSON.stringify({
      id: "1504673475489562745",
      last_message_id: "1504673475489562746",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await createDiscordForumThreadWithMessage({
      channelId: "1504673475489562744",
      threadName: "[Bug][Medium] Settings — Copy button does not work",
      messageContent: "**Bug Report**",
    });

    assert.deepEqual(result, {
      ok: true,
      threadId: "1504673475489562745",
      messageId: "1504673475489562746",
    });
    assert.deepEqual(observedRequest, {
      url: "https://discord.com/api/v10/channels/1504673475489562744/threads",
      method: "POST",
      body: JSON.stringify({
        name: "[Bug][Medium] Settings — Copy button does not work",
        message: {
          content: "**Bug Report**",
        },
      }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createDiscordThreadMessage POSTs a message inside an existing thread", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;
  let observedRequest: { url: string; method: string; body: string | null } | null = null;

  globalThis.fetch = async (input, init) => {
    observedRequest = {
      url: String(input),
      method: String(init?.method ?? "GET"),
      body: typeof init?.body === "string" ? init.body : null,
    };

    return new Response(JSON.stringify({ id: "1504673475489562747" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await createDiscordThreadMessage({
      threadId: "1504673475489562745",
      content: "Another report matched this bug.",
    });

    assert.deepEqual(result, {
      ok: true,
      messageId: "1504673475489562747",
    });
    assert.deepEqual(observedRequest, {
      url: "https://discord.com/api/v10/channels/1504673475489562745/messages",
      method: "POST",
      body: JSON.stringify({
        content: "Another report matched this bug.",
      }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
