import assert from "node:assert/strict";
import test from "node:test";

import {
  proxyDiscordOsMessageCommandPoll,
  resolveDiscordOsMessageCommandPollUrl,
} from "./discordos-message-command-poll-proxy.ts";

function testEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...overrides,
  } as NodeJS.ProcessEnv;
}

test("discordos message-command poll proxy defaults to the hosted DiscordOS endpoint", () => {
  assert.equal(
    resolveDiscordOsMessageCommandPollUrl(testEnv()),
    "https://fawxzzy-discordos.vercel.app/api/discord-message-commands-poll",
  );
  assert.equal(
    resolveDiscordOsMessageCommandPollUrl(testEnv({
      DISCORDOS_MESSAGE_COMMAND_POLL_PROXY_URL: "https://discordos.example.com/api/poll",
    })),
    "https://discordos.example.com/api/poll",
  );
});

test("discordos message-command poll proxy forwards auth headers and upstream payloads", async () => {
  const request = new Request("https://fitness.example.com/api/discord/message-commands/poll", {
    headers: {
      authorization: "Bearer secret",
      "x-discord-message-command-secret": "fallback-secret",
    },
  });

  const response = await proxyDiscordOsMessageCommandPoll(request, {
    env: testEnv({
      DISCORDOS_MESSAGE_COMMAND_POLL_PROXY_URL: "https://discordos.example.com/api/poll",
    }),
    fetchImpl: async (input, init) => {
      assert.equal(String(input), "https://discordos.example.com/api/poll");
      const forwardedHeaders = new Headers(init?.headers);
      assert.equal(forwardedHeaders.get("authorization"), "Bearer secret");
      assert.equal(forwardedHeaders.get("x-discord-message-command-secret"), "fallback-secret");

      return new Response(JSON.stringify({
        ok: true,
        processed: [],
      }), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      });
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    processed: [],
  });
});
