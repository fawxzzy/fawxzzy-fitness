import assert from "node:assert/strict";
import test from "node:test";
import {
  createDiscordChannelMessage,
  createDiscordChannel,
  createDiscordRole,
  createDiscordForumThreadWithMessage,
  createDiscordMessageReaction,
  createDiscordThreadMessage,
  deleteDiscordChannel,
  deferDiscordInteractionEphemeral,
  DISCORD_MESSAGE_FLAG_SUPPRESS_EMBEDS,
  editDiscordOriginalInteractionResponse,
  fetchDiscordApplicationEmojis,
  fetchDiscordGuildMember,
  fetchDiscordGuildRoles,
  fetchDiscordGuildEmojis,
  resolveDiscordForumTagIdsByName,
  updateDiscordChannelPermissionOverwrite,
  updateDiscordForumThreadArchiveState,
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

test("createDiscordMessageReaction PUTs a resolved checkmark reaction using an encoded emoji path", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;
  let observedRequest = null;

  globalThis.fetch = async (input, init) => {
    observedRequest = {
      url: String(input),
      method: String(init?.method ?? "GET"),
      body: typeof init?.body === "string" ? init.body : null,
    };

    return new Response(null, { status: 204 });
  };

  try {
    const result = await createDiscordMessageReaction({
      channelId: "1504673475489562745",
      messageId: "1504673475489562746",
      emoji: "✅",
    });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(observedRequest, {
      url: "https://discord.com/api/v10/channels/1504673475489562745/messages/1504673475489562746/reactions/%E2%9C%85/@me",
      method: "PUT",
      body: null,
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

test("createDiscordChannelMessage forwards flags for embed suppression", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;
  let observedRequest = null;

  globalThis.fetch = async (input, init) => {
    observedRequest = {
      url: String(input),
      method: String(init?.method ?? "GET"),
      body: typeof init?.body === "string" ? init.body : null,
    };

    return new Response(JSON.stringify({ id: "1505098072089296966" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await createDiscordChannelMessage({
      channelId: "1504671871512346695",
      body: {
        content: "## Discord Feedback Update",
        flags: DISCORD_MESSAGE_FLAG_SUPPRESS_EMBEDS,
      },
    });

    assert.deepEqual(result, {
      ok: true,
      messageId: "1505098072089296966",
    });
    assert.deepEqual(observedRequest, {
      url: "https://discord.com/api/v10/channels/1504671871512346695/messages",
      method: "POST",
      body: JSON.stringify({
        content: "## Discord Feedback Update",
        flags: DISCORD_MESSAGE_FLAG_SUPPRESS_EMBEDS,
      }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchDiscordGuildEmojis returns guild emoji records", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response(JSON.stringify([
    { id: "1505007702924066916", name: "Bug", available: true },
    { id: "1505007651308703877", name: "Feature", available: true },
  ]), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  try {
    const result = await fetchDiscordGuildEmojis({ guildId: "1504668396338413670" });
    assert.deepEqual(result, {
      ok: true,
      emojis: [
        { id: "1505007702924066916", name: "Bug", available: true },
        { id: "1505007651308703877", name: "Feature", available: true },
      ],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchDiscordApplicationEmojis returns application emoji records from the items envelope", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response(JSON.stringify({
    items: [
      { id: "1505007702924066916", name: "Bug", available: true },
      { id: "1505007651308703877", name: "Feature", available: true },
    ],
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  try {
    const result = await fetchDiscordApplicationEmojis({ applicationId: "1504700208251146371" });
    assert.deepEqual(result, {
      ok: true,
      emojis: [
        { id: "1505007702924066916", name: "Bug", available: true },
        { id: "1505007651308703877", name: "Feature", available: true },
      ],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchDiscordGuildRoles returns guild role records", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response(JSON.stringify([
    { id: "role-1", name: "Purgatory", permissions: "0", position: 3 },
  ]), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  try {
    const result = await fetchDiscordGuildRoles({ guildId: "1504668396338413670" });
    assert.deepEqual(result, {
      ok: true,
      roles: [
        { id: "role-1", name: "Purgatory", permissions: "0", position: 3 },
      ],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchDiscordGuildMember returns guild member records", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response(JSON.stringify({
    user: { id: "123456789012345678", username: "target-user" },
    roles: ["verified-role"],
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  try {
    const result = await fetchDiscordGuildMember({
      guildId: "1504668396338413670",
      userId: "123456789012345678",
    });
    assert.deepEqual(result, {
      ok: true,
      member: {
        user: { id: "123456789012345678", username: "target-user" },
        roles: ["verified-role"],
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createDiscordRole POSTs the guild role payload", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;
  let observedRequest = null;

  globalThis.fetch = async (input, init) => {
    observedRequest = {
      url: String(input),
      method: String(init?.method ?? "GET"),
      body: typeof init?.body === "string" ? init.body : null,
    };

    return new Response(JSON.stringify({ id: "role-1", name: "Purgatory" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await createDiscordRole({
      guildId: "1504668396338413670",
      name: "Purgatory",
    });

    assert.deepEqual(result, {
      ok: true,
      role: { id: "role-1", name: "Purgatory" },
    });
    assert.deepEqual(observedRequest, {
      url: "https://discord.com/api/v10/guilds/1504668396338413670/roles",
      method: "POST",
      body: JSON.stringify({ name: "Purgatory" }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createDiscordChannel POSTs the guild channel payload", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;
  let observedRequest = null;

  globalThis.fetch = async (input, init) => {
    observedRequest = {
      url: String(input),
      method: String(init?.method ?? "GET"),
      body: typeof init?.body === "string" ? init.body : null,
    };

    return new Response(JSON.stringify({ id: "channel-1", name: "purgatory", type: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await createDiscordChannel({
      guildId: "1504668396338413670",
      name: "purgatory",
      type: 0,
      parentId: "category-1",
    });

    assert.deepEqual(result, {
      ok: true,
      channel: { id: "channel-1", name: "purgatory", type: 0 },
    });
    assert.deepEqual(observedRequest, {
      url: "https://discord.com/api/v10/guilds/1504668396338413670/channels",
      method: "POST",
      body: JSON.stringify({ name: "purgatory", type: 0, parent_id: "category-1" }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateDiscordChannelPermissionOverwrite PUTs the overwrite payload", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;
  let observedRequest = null;

  globalThis.fetch = async (input, init) => {
    observedRequest = {
      url: String(input),
      method: String(init?.method ?? "GET"),
      body: typeof init?.body === "string" ? init.body : null,
    };

    return new Response(null, { status: 204 });
  };

  try {
    const result = await updateDiscordChannelPermissionOverwrite({
      channelId: "channel-1",
      overwriteId: "role-1",
      overwrite: {
        allow: "123",
        deny: "456",
        type: 0,
      },
    });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(observedRequest, {
      url: "https://discord.com/api/v10/channels/channel-1/permissions/role-1",
      method: "PUT",
      body: JSON.stringify({ allow: "123", deny: "456", type: 0 }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("deferDiscordInteractionEphemeral posts a deferred ephemeral callback", async () => {
  const originalFetch = globalThis.fetch;
  let observedRequest = null;

  globalThis.fetch = async (input, init) => {
    observedRequest = {
      url: String(input),
      method: String(init?.method ?? "GET"),
      body: typeof init?.body === "string" ? init.body : null,
    };

    return new Response(null, { status: 204 });
  };

  try {
    const result = await deferDiscordInteractionEphemeral({
      interactionId: "interaction-1",
      interactionToken: "interaction-token",
    });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(observedRequest, {
      url: "https://discord.com/api/v10/interactions/interaction-1/interaction-token/callback",
      method: "POST",
      body: JSON.stringify({
        type: 5,
        data: {
          flags: 64,
        },
      }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("editDiscordOriginalInteractionResponse PATCHes the original interaction message", async () => {
  const originalFetch = globalThis.fetch;
  let observedRequest = null;

  globalThis.fetch = async (input, init) => {
    observedRequest = {
      url: String(input),
      method: String(init?.method ?? "GET"),
      body: typeof init?.body === "string" ? init.body : null,
    };

    return new Response(JSON.stringify({ id: "message-1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await editDiscordOriginalInteractionResponse({
      applicationId: "1504700208251146371",
      interactionToken: "interaction-token",
      content: "Feedback received. Thanks for helping improve Fitness.",
    });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(observedRequest, {
      url: "https://discord.com/api/v10/webhooks/1504700208251146371/interaction-token/messages/@original",
      method: "PATCH",
      body: JSON.stringify({
        content: "Feedback received. Thanks for helping improve Fitness.",
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

test("updateDiscordForumThreadArchiveState PATCHes the archived state", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;
  let observedRequest = null;

  globalThis.fetch = async (input, init) => {
    observedRequest = {
      url: String(input),
      method: String(init?.method ?? "GET"),
      body: typeof init?.body === "string" ? init.body : null,
    };

    return new Response(JSON.stringify({ id: "1504673475489562745", archived: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await updateDiscordForumThreadArchiveState({
      threadId: "1504673475489562745",
      archived: true,
      locked: false,
    });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(observedRequest, {
      url: "https://discord.com/api/v10/channels/1504673475489562745",
      method: "PATCH",
      body: JSON.stringify({
        archived: true,
        locked: false,
      }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteDiscordChannel DELETEs the forum thread channel", async () => {
  process.env.DISCORD_BOT_TOKEN = "test-bot-token";
  const originalFetch = globalThis.fetch;
  let observedRequest = null;

  globalThis.fetch = async (input, init) => {
    observedRequest = {
      url: String(input),
      method: String(init?.method ?? "GET"),
      body: typeof init?.body === "string" ? init.body : null,
    };

    return new Response(null, { status: 204 });
  };

  try {
    const result = await deleteDiscordChannel({
      channelId: "1504673475489562745",
    });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(observedRequest, {
      url: "https://discord.com/api/v10/channels/1504673475489562745",
      method: "DELETE",
      body: null,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
