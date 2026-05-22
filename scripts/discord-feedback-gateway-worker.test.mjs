import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDiscordGatewayReconnectDelayMs,
  callDiscordMessageCommandPoll,
  messageRequestsComputaArchiveCheckedCards,
  messageRequestsComputaFeedbackReactionSync,
  messageRequestsComputaLive,
  messageRequestsComputaMenu,
  messageRequestsComputaUpdate,
  messageRequestsDiscordMessageCommand,
  messageRequestsFeedbackSetup,
  normalizeDiscordMessageCommandContent,
  resolveDiscordMessageCommandPollIntervalMs,
  resolveDiscordMessageCommandPollUrl,
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
  assert.equal(resolveDiscordMessageCommandPollIntervalMs({}), 15_000);
  assert.equal(resolveDiscordMessageCommandPollIntervalMs({ DISCORD_MESSAGE_COMMAND_POLL_INTERVAL_MS: "1000" }), 5_000);
  assert.equal(resolveDiscordMessageCommandPollIntervalMs({ DISCORD_MESSAGE_COMMAND_POLL_INTERVAL_MS: "30000" }), 30_000);
  assert.equal(resolveDiscordMessageCommandPollIntervalMs({ DISCORD_MESSAGE_COMMAND_POLL_INTERVAL_MS: "999999" }), 120_000);
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
