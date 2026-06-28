import assert from "node:assert/strict";
import test from "node:test";

import {
  proxyDiscordOsInteractionRequest,
  resolveDiscordOsInteractionsUrl,
} from "@/lib/discord/discordos-interactions-proxy.ts";

function testEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...overrides,
  } as NodeJS.ProcessEnv;
}

test("DiscordOS interactions proxy resolves the hosted production endpoint by default", () => {
  assert.equal(
    resolveDiscordOsInteractionsUrl(testEnv()),
    "https://fawxzzy-discordos.vercel.app/api/discord-interactions",
  );
});

test("DiscordOS interactions proxy honors an explicit override", () => {
  assert.equal(
    resolveDiscordOsInteractionsUrl(testEnv({
      DISCORDOS_INTERACTIONS_PROXY_URL: "https://discordos.example.com/api/interactions",
    })),
    "https://discordos.example.com/api/interactions",
  );
});

test("DiscordOS interactions proxy forwards signed requests upstream", async () => {
  const request = new Request("https://fitness.example.com/api/discord/interactions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature-ed25519": "signature",
      "x-signature-timestamp": "1715702400",
    },
    body: JSON.stringify({ type: 2, data: { name: "computa" } }),
  });

  let observedUrl = "";
  let observedMethod = "";
  let observedSignature = "";
  let observedTimestamp = "";
  let observedCacheControl = "";
  let observedBody = "";
  const response = await proxyDiscordOsInteractionRequest(
    request,
    JSON.stringify({ type: 2, data: { name: "computa" } }),
    {
      env: testEnv({
        DISCORDOS_INTERACTIONS_PROXY_URL: "https://discordos.example.com/api/interactions",
      }),
      fetchImpl: async (input, init) => {
        observedUrl = String(input);
        observedMethod = init?.method ?? "";
        const forwardedHeaders = new Headers(init?.headers);
        observedSignature = forwardedHeaders.get("x-signature-ed25519") ?? "";
        observedTimestamp = forwardedHeaders.get("x-signature-timestamp") ?? "";
        observedCacheControl = forwardedHeaders.get("cache-control") ?? "";
        observedBody = typeof init?.body === "string" ? init.body : "";
        return new Response(JSON.stringify({ ok: true, source: "discordos" }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      },
    },
  );

  assert.equal(observedUrl, "https://discordos.example.com/api/interactions");
  assert.equal(observedMethod, "POST");
  assert.equal(observedSignature, "signature");
  assert.equal(observedTimestamp, "1715702400");
  assert.equal(observedCacheControl, "no-cache");
  assert.equal(observedBody, JSON.stringify({ type: 2, data: { name: "computa" } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, source: "discordos" });
});
