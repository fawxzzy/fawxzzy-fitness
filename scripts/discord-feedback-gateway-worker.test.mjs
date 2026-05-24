import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDiscordGatewayReconnectDelayMs,
  callDiscordMessageCommandPoll,
  createDiscordGatewayChannelMessage,
  createDiscordGatewayMessageReaction,
  getTimeZoneDateKey,
  getRequestedBotMessageReactions,
  isDiscordMessageAtOrBeforeCheckpoint,
  isScheduledBotPostDue,
  messageRequestsComputaArchiveCheckedCards,
  messageRequestsComputaCommandCardRepair,
  messageRequestsComputaFeedbackReactionSync,
  messageRequestsComputaFeedbackLauncherRepair,
  messageRequestsComputaLive,
  messageRequestsComputaMenu,
  messageRequestsComputaOwnerMenu,
  messageRequestsComputaReleaseCheck,
  messageRequestsComputaUpdate,
  messageRequestsBotReaction,
  messageRequestsDiscordMessageCommand,
  messageRequestsFeedbackSetup,
  messageRequestsGoodnight,
  messageRequestsGrandRising,
  normalizeDiscordMessageCommandContent,
  normalizeDiscordWorkerMessageActivityState,
  resolveDiscordMessageCommandPollIntervalMs,
  resolveDiscordMessageCommandPollUrl,
  resolveScheduledPostIntervalMs,
  trimDiscordWorkerRecentMessageIds,
} from "./discord-feedback-gateway-worker.mjs";

test("feedback gateway worker normalizes trigger text", () => {
  assert.equal(normalizeDiscordMessageCommandContent("Yo   COMPUTA Feedback SETUP please"), "yo computa feedback setup please");
});

test("feedback gateway worker detects only main-channel human trigger messages", () => {
  assert.equal(
    messageRequestsFeedbackSetup({
      channel_id: "main-channel",
      content: "please computa feedback setup",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsFeedbackSetup({
      channel_id: "main-channel",
      content: "please computa setup feedback",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsFeedbackSetup({
      channel_id: "other-channel",
      content: "computa feedback setup",
      author: { bot: false },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsFeedbackSetup({
      channel_id: "main-channel",
      content: "computa feedback setup",
      author: { bot: true },
    }, "main-channel"),
    false,
  );
});

test("feedback gateway worker detects owner live message command shapes", () => {
  assert.equal(
    messageRequestsComputaLive({
      channel_id: "main-channel",
      content: "live",
      author: { bot: false },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsComputaLive({
      channel_id: "main-channel",
      content: "computa post live twitch",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsComputaLive({
      channel_id: "main-channel",
      content: "computa post live [https://example.com/live]",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsComputaLive({
      channel_id: "main-channel",
      content: "computa live twitch",
      author: { bot: false },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsComputaLive({
      channel_id: "main-channel",
      content: "computa post live twitch",
      author: { bot: true },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsComputaLive({
      channel_id: "other-channel",
      content: "live",
      author: { bot: false },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsDiscordMessageCommand({
      channel_id: "main-channel",
      content: "computa setup feedback",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
});

test("feedback gateway worker detects owner formatted update command shapes", () => {
  assert.equal(
    messageRequestsComputaUpdate({
      channel_id: "main-channel",
      content: "computa post update [Title | Body copy]",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsComputaUpdate({
      channel_id: "main-channel",
      content: "computa update [Title | Body copy]",
      author: { bot: false },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsComputaUpdate({
      channel_id: "main-channel",
      content: "computa post update [Title | Body copy]",
      author: { bot: true },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsDiscordMessageCommand({
      channel_id: "main-channel",
      content: "computa post update [Title | Body copy]",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
});

test("feedback gateway worker detects grand rising aliases in the main channel", () => {
  assert.equal(
    messageRequestsGrandRising({
      channel_id: "main-channel",
      content: "good morning",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsGrandRising({
      channel_id: "main-channel",
      content: "grand rising computa",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsGrandRising({
      channel_id: "main-channel",
      content: "gm",
      author: { bot: false },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsDiscordMessageCommand({
      channel_id: "main-channel",
      content: "morning computa",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
});

test("feedback gateway worker detects goodnight aliases in the main channel", () => {
  assert.equal(
    messageRequestsGoodnight({
      channel_id: "main-channel",
      content: "goodnight",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsGoodnight({
      channel_id: "main-channel",
      content: "good night computa",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsGoodnight({
      channel_id: "main-channel",
      content: "night",
      author: { bot: false },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsDiscordMessageCommand({
      channel_id: "main-channel",
      content: "goodnight computa",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
});

test("feedback gateway worker detects exact computa menu messages", () => {
  assert.equal(
    messageRequestsComputaMenu({
      channel_id: "main-channel",
      content: "  ComPuTa  ",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsComputaMenu({
      channel_id: "main-channel",
      content: "computa post live twitch",
      author: { bot: false },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsComputaMenu({
      channel_id: "other-channel",
      content: "computa",
      author: { bot: false },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsComputaMenu({
      channel_id: "main-channel",
      content: "computa",
      author: { bot: true },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsDiscordMessageCommand({
      channel_id: "main-channel",
      content: "computa",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
});

test("feedback gateway worker detects exact computa owner menu messages", () => {
  assert.equal(
    messageRequestsComputaOwnerMenu({
      channel_id: "main-channel",
      content: "  ComPuTa owner  ",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsComputaOwnerMenu({
      channel_id: "main-channel",
      content: "computa",
      author: { bot: false },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsComputaOwnerMenu({
      channel_id: "other-channel",
      content: "computa owner",
      author: { bot: false },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsComputaOwnerMenu({
      channel_id: "main-channel",
      content: "computa owner",
      author: { bot: true },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsDiscordMessageCommand({
      channel_id: "main-channel",
      content: "computa owner",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
});

test("feedback gateway worker detects canonical repair command messages", () => {
  assert.equal(
    messageRequestsComputaCommandCardRepair({
      channel_id: "main-channel",
      content: "computa repair command card",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsComputaCommandCardRepair({
      channel_id: "main-channel",
      content: "please computa repair command card",
      author: { bot: false },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsComputaFeedbackLauncherRepair({
      channel_id: "main-channel",
      content: "please computa repair feedback launcher",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsComputaFeedbackLauncherRepair({
      channel_id: "main-channel",
      content: "computa repair feedback launcher",
      author: { bot: true },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsDiscordMessageCommand({
      channel_id: "main-channel",
      content: "computa repair command card",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
});

test("feedback gateway worker detects archive checked card command aliases", () => {
  assert.equal(
    messageRequestsComputaArchiveCheckedCards({
      channel_id: "main-channel",
      content: "computa archive checked cards",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsComputaArchiveCheckedCards({
      channel_id: "main-channel",
      content: "please computa archive resolved cards",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsComputaArchiveCheckedCards({
      channel_id: "main-channel",
      content: "computa archive checked cards",
      author: { bot: true },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsDiscordMessageCommand({
      channel_id: "main-channel",
      content: "computa archive checked cards",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
});

test("feedback gateway worker detects feedback reaction sync command aliases", () => {
  assert.equal(
    messageRequestsComputaFeedbackReactionSync({
      channel_id: "main-channel",
      content: "computa sync feedback reactions",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsComputaFeedbackReactionSync({
      channel_id: "main-channel",
      content: "please computa feedback sync reactions",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsComputaFeedbackReactionSync({
      channel_id: "main-channel",
      content: "computa sync checked cards",
      author: { bot: true },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsDiscordMessageCommand({
      channel_id: "main-channel",
      content: "computa sync checked cards",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
});

test("feedback gateway worker detects release ledger check command aliases", () => {
  assert.equal(
    messageRequestsComputaReleaseCheck({
      channel_id: "main-channel",
      content: "computa release check",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsComputaReleaseCheck({
      channel_id: "main-channel",
      content: "please computa ledger check",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsComputaReleaseCheck({
      channel_id: "main-channel",
      content: "computa release check",
      author: { bot: true },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsDiscordMessageCommand({
      channel_id: "main-channel",
      content: "computa check release",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
});

test("feedback gateway worker detects passive bot reaction rules in any channel", () => {
  const message = {
    id: "message-epic",
    channel_id: "any-channel",
    content: "that was EPIC.",
    author: { bot: false },
  };

  assert.equal(messageRequestsBotReaction(message), true);
  assert.deepEqual(getRequestedBotMessageReactions(message), [
    { key: "epic", emoji: "epic:1507434865505603757" },
  ]);
  assert.equal(
    messageRequestsBotReaction({
      id: "message-bot",
      channel_id: "any-channel",
      content: "epic",
      author: { bot: true },
    }),
    false,
  );
  assert.equal(
    messageRequestsBotReaction({
      id: "message-not-word",
      channel_id: "any-channel",
      content: "this is an epicenter",
      author: { bot: false },
    }),
    false,
  );
});

test("feedback gateway worker creates passive bot reactions through Discord REST", async () => {
  const requests = [];
  const result = await createDiscordGatewayMessageReaction({
    token: "bot-token",
    channelId: "channel-1",
    messageId: "message-1",
    emoji: "epic:1507434865505603757",
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(null, { status: 204 });
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 204);
  assert.equal(
    requests[0].url,
    "https://discord.com/api/v10/channels/channel-1/messages/message-1/reactions/epic%3A1507434865505603757/@me",
  );
  assert.equal(requests[0].init.method, "PUT");
  assert.equal(requests[0].init.headers.authorization, "Bot bot-token");
});

test("feedback gateway worker identifies scheduled Grand Rising window in Eastern time", () => {
  const rule = {
    key: "grand-rising",
    enabled: true,
    timeZone: "America/New_York",
    hour: 10,
    minuteStart: 0,
    minuteWindow: 15,
  };
  const now = new Date("2026-05-22T14:05:00.000Z");
  const dateKey = getTimeZoneDateKey(now, "America/New_York");

  assert.equal(dateKey, "2026-05-22");
  assert.equal(isScheduledBotPostDue({ now, rule, lastPostedDateKey: null }), true);
  assert.equal(isScheduledBotPostDue({ now, rule, lastPostedDateKey: "2026-05-22" }), false);
  assert.equal(
    isScheduledBotPostDue({
      now: new Date("2026-05-22T14:30:00.000Z"),
      rule,
      lastPostedDateKey: null,
    }),
    false,
  );
});

test("feedback gateway worker identifies scheduled Goodnight window in Eastern time", () => {
  const rule = {
    key: "goodnight",
    enabled: true,
    timeZone: "America/New_York",
    hour: 22,
    minuteStart: 0,
    minuteWindow: 15,
  };
  const now = new Date("2026-05-23T02:05:00.000Z");
  const dateKey = getTimeZoneDateKey(now, "America/New_York");

  assert.equal(dateKey, "2026-05-22");
  assert.equal(isScheduledBotPostDue({ now, rule, lastPostedDateKey: null }), true);
  assert.equal(isScheduledBotPostDue({ now, rule, lastPostedDateKey: "2026-05-22" }), false);
  assert.equal(
    isScheduledBotPostDue({
      now: new Date("2026-05-23T02:30:00.000Z"),
      rule,
      lastPostedDateKey: null,
    }),
    false,
  );
});

test("feedback gateway worker creates scheduled channel messages through Discord REST", async () => {
  const requests = [];
  const result = await createDiscordGatewayChannelMessage({
    token: "bot-token",
    channelId: "main-channel",
    body: {
      content: "<:GM:1507443437916524675> Grand Rising",
      allowed_mentions: { parse: [] },
    },
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(JSON.stringify({ id: "message-gm" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.body.id, "message-gm");
  assert.equal(requests[0].url, "https://discord.com/api/v10/channels/main-channel/messages");
  assert.equal(requests[0].init.method, "POST");
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    content: "<:GM:1507443437916524675> Grand Rising",
    allowed_mentions: { parse: [] },
  });
});

test("feedback gateway worker resolves the production poll URL safely", () => {
  assert.equal(
    resolveDiscordMessageCommandPollUrl({ NEXT_PUBLIC_SITE_URL: "https://fitness.example.com/" }),
    "https://fitness.example.com/api/discord/interactions",
  );
  assert.equal(
    resolveDiscordMessageCommandPollUrl({ VERCEL_PROJECT_PRODUCTION_URL: "fitness.example.com" }),
    "https://fitness.example.com/api/discord/interactions",
  );
  assert.equal(
    resolveDiscordMessageCommandPollUrl({ DISCORD_MESSAGE_COMMAND_POLL_URL: "https://worker.example.com/poll" }),
    "https://worker.example.com/poll",
  );
});

test("feedback gateway worker bounds the fallback poll interval", () => {
  assert.equal(resolveDiscordMessageCommandPollIntervalMs({}), 5_000);
  assert.equal(resolveDiscordMessageCommandPollIntervalMs({ DISCORD_MESSAGE_COMMAND_POLL_INTERVAL_MS: "1000" }), 5_000);
  assert.equal(resolveDiscordMessageCommandPollIntervalMs({ DISCORD_MESSAGE_COMMAND_POLL_INTERVAL_MS: "30000" }), 30_000);
  assert.equal(resolveDiscordMessageCommandPollIntervalMs({ DISCORD_MESSAGE_COMMAND_POLL_INTERVAL_MS: "999999" }), 120_000);
  assert.equal(resolveScheduledPostIntervalMs({}), 60_000);
  assert.equal(resolveScheduledPostIntervalMs({ DISCORD_SCHEDULED_POST_INTERVAL_MS: "1000" }), 30_000);
});

test("feedback gateway worker normalizes persisted message activity state", () => {
  assert.deepEqual(
    normalizeDiscordWorkerMessageActivityState({
      messageActivity: {
        recentMessageIds: ["  a  ", null, "b", "", "c"],
        lastSeenByChannel: {
          " main-channel ": {
            messageId: " 123 ",
            timestamp: "2026-05-24T08:00:00.000Z",
          },
          bad: {
            messageId: "",
            timestamp: "not-a-date",
          },
        },
      },
    }),
    {
      recentMessageIds: ["a", "b", "c"],
      lastSeenByChannel: {
        "main-channel": {
          messageId: "123",
          timestamp: "2026-05-24T08:00:00.000Z",
        },
      },
    },
  );
});

test("feedback gateway worker trims recent message ids to the newest entries", () => {
  assert.deepEqual(
    trimDiscordWorkerRecentMessageIds(["1", "2", "3", "4"], 2),
    ["3", "4"],
  );
});

test("feedback gateway worker compares message checkpoints safely", () => {
  assert.equal(
    isDiscordMessageAtOrBeforeCheckpoint(
      {
        id: "message-2",
        timestamp: "2026-05-24T08:10:00.000Z",
      },
      {
        messageId: "message-2",
        timestamp: "2026-05-24T08:10:00.000Z",
      },
    ),
    true,
  );

  assert.equal(
    isDiscordMessageAtOrBeforeCheckpoint(
      {
        id: "message-1",
        timestamp: "2026-05-24T08:09:59.000Z",
      },
      {
        messageId: "message-2",
        timestamp: "2026-05-24T08:10:00.000Z",
      },
    ),
    true,
  );

  assert.equal(
    isDiscordMessageAtOrBeforeCheckpoint(
      {
        id: "message-3",
        timestamp: "2026-05-24T08:10:01.000Z",
      },
      {
        messageId: "message-2",
        timestamp: "2026-05-24T08:10:00.000Z",
      },
    ),
    false,
  );
});

test("feedback gateway worker calls the secured poll endpoint", async () => {
  const requests = [];
  const result = await callDiscordMessageCommandPoll({
    pollUrl: "https://fitness.example.com/api/discord/interactions",
    secret: "secret-value",
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      return new Response(JSON.stringify({ ok: true, processed: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.body, { ok: true, processed: [] });
  assert.equal(requests[0].url, "https://fitness.example.com/api/discord/interactions");
  assert.equal(requests[0].init.method, "GET");
  assert.equal(requests[0].init.headers.authorization, "Bearer secret-value");
});

test("feedback gateway worker backs off reconnects", () => {
  assert.equal(calculateDiscordGatewayReconnectDelayMs(0), 1000);
  assert.equal(calculateDiscordGatewayReconnectDelayMs(3), 8000);
  assert.equal(calculateDiscordGatewayReconnectDelayMs(99), 30000);
});
