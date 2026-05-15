import assert from "node:assert/strict";
import test from "node:test";
import {
  createDiscordForumThreadWithMessage,
  createDiscordThreadMessage,
  resolveDiscordForumTagIdsByName,
  updateDiscordForumThreadTags,
  updateDiscordForumThreadTitle,
  updateDiscordGuildMemberNickname,
} from "./rest.ts";

test("updateDiscordGuildMemberNickname PATCHes the guild member nickname", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;
  let observedRequest = null;

  globalThis.fetch = async (input, init) => {
    observedRequest = {
      url: String(input),
      method: String(init?.method ?? "GET"),
      authorization: init?.headers instanceof Headers
        ? init.headers.get("Authorization")
        : Array.isArray(init?.headers)
          ? null
          : String((init?.headers ?? {}).Authorization ?? ""),
      body: typeof init?.body === "string" ? init.body : null,
    };

    return new Response(JSON.stringify({ nick: "Zac · 12" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await updateDiscordGuildMemberNickname({
      guildId: "1504668396338413670",
      userId: "123456789012345678",
      nickname: "Zac · 12",
    });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(observedRequest, {
      url: "https://discord.com/api/v10/guilds/1504668396338413670/members/123456789012345678",
      method: "PATCH",
      authorization: "Bot test-bot-token",
      body: JSON.stringify({ nick: "Zac · 12" }),
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
      nickname: "Zac · 12",
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

test("createDiscordForumThreadWithMessage POSTs the forum thread creation payload with tags and safe mentions", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;
  let observedRequest = null;

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
      threadName: "Bug: Settings — Copy button does not work",
      messageContent: "**Bug Report**",
      appliedTagIds: ["tag-bug", "tag-new", "tag-medium"],
      allowedMentions: {
        parse: [],
        users: ["123456789012345678"],
        roles: [],
        replied_user: false,
      },
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
        name: "Bug: Settings — Copy button does not work",
        message: {
          content: "**Bug Report**",
          allowed_mentions: {
            parse: [],
            users: ["123456789012345678"],
            replied_user: false,
          },
        },
        applied_tags: ["tag-bug", "tag-new", "tag-medium"],
      }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createDiscordThreadMessage POSTs a message inside an existing thread with safe mentions", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;
  let observedRequest = null;

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
      allowedMentions: {
        parse: [],
        users: [],
        roles: [],
        replied_user: false,
      },
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
        allowed_mentions: {
          parse: [],
          replied_user: false,
        },
      }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resolveDiscordForumTagIdsByName matches tags case-insensitively and reports missing tags", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response(JSON.stringify({
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

  try {
    const result = await resolveDiscordForumTagIdsByName({
      channelId: "1504673475489562744",
      tagNames: ["bug", "new", "High"],
    });

    assert.deepEqual(result, {
      ok: true,
      matchedTagIds: ["tag-bug", "tag-new"],
      missingTagNames: ["High"],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateDiscordForumThreadTags PATCHes the applied tags", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;
  let observedRequest = null;

  globalThis.fetch = async (input, init) => {
    observedRequest = {
      url: String(input),
      method: String(init?.method ?? "GET"),
      body: typeof init?.body === "string" ? init.body : null,
    };

    return new Response(JSON.stringify({ id: "1504673475489562745" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await updateDiscordForumThreadTags({
      threadId: "1504673475489562745",
      appliedTagIds: ["tag-bug", "tag-confirmed", "tag-medium"],
    });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(observedRequest, {
      url: "https://discord.com/api/v10/channels/1504673475489562745",
      method: "PATCH",
      body: JSON.stringify({
        applied_tags: ["tag-bug", "tag-confirmed", "tag-medium"],
      }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateDiscordForumThreadTitle PATCHes the thread title", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;
  let observedRequest = null;

  globalThis.fetch = async (input, init) => {
    observedRequest = {
      url: String(input),
      method: String(init?.method ?? "GET"),
      body: typeof init?.body === "string" ? init.body : null,
    };

    return new Response(JSON.stringify({ id: "1504673475489562745" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await updateDiscordForumThreadTitle({
      threadId: "1504673475489562745",
      title: "Bug: Settings — Copy button does not work",
    });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(observedRequest, {
      url: "https://discord.com/api/v10/channels/1504673475489562745",
      method: "PATCH",
      body: JSON.stringify({
        name: "Bug: Settings — Copy button does not work",
      }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
