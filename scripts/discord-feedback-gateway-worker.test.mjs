import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDiscordGatewayReconnectDelayMs,
  callDiscordMessageCommandPoll,
  messageRequestsFeedbackSetup,
  normalizeDiscordMessageCommandContent,
  resolveDiscordMessageCommandPollUrl,
} from "./discord-feedback-gateway-worker.mjs";

test("feedback gateway worker normalizes trigger text", () => {
  assert.equal(normalizeDiscordMessageCommandContent("Yo   BOT Feedback SETUP please"), "yo bot feedback setup please");
});

test("feedback gateway worker detects only main-channel human trigger messages", () => {
  assert.equal(
    messageRequestsFeedbackSetup({
      channel_id: "main-channel",
      content: "please bot feedback setup",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsFeedbackSetup({
      channel_id: "main-channel",
      content: "please bot setup feedback",
      author: { bot: false },
    }, "main-channel"),
    true,
  );
  assert.equal(
    messageRequestsFeedbackSetup({
      channel_id: "other-channel",
      content: "bot feedback setup",
      author: { bot: false },
    }, "main-channel"),
    false,
  );
  assert.equal(
    messageRequestsFeedbackSetup({
      channel_id: "main-channel",
      content: "bot feedback setup",
      author: { bot: true },
    }, "main-channel"),
    false,
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
