import assert from "node:assert/strict";
import test from "node:test";

import {
  proxyDiscordOsInteractionRequest,
  resolveDiscordOsInteractionsUrl,
} from "@/lib/discord/discordos-interactions-proxy.ts";

test("DiscordOS interactions proxy resolves the hosted production endpoint by default", () => {
  assert.equal(
    resolveDiscordOsInteractionsUrl({}),
    "https://fawxzzy-discordos.vercel.app/api/discord-interactions",
  );
});

test("DiscordOS interactions proxy honors an explicit override", () => {
  assert.equal(
    resolveDiscordOsInteractionsUrl({
      DISCORDOS_INTERACTIONS_PROXY_URL: "https://discordos.example.com/api/interactions",
    }),
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
  let observedInit: RequestInit | null = null;
  const response = await proxyDiscordOsInteractionRequest(
    request,
    JSON.stringify({ type: 2, data: { name: "computa" } }),
    {
      env: {
        DISCORDOS_INTERACTIONS_PROXY_URL: "https://discordos.example.com/api/interactions",
      },
      fetchImpl: async (input, init) => {
        observedUrl = String(input);
        observedInit = init ?? null;
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
  if (observedInit === null) {
    throw new Error("Expected DiscordOS interaction proxy to forward a request.");
  }
  const forwardedInit = observedInit as RequestInit;
  const observedHeaders = new Headers(forwardedInit.headers);
  assert.equal(forwardedInit.method, "POST");
  assert.equal(forwardedInit.headers instanceof Headers, true);
  assert.equal(observedHeaders.get("x-signature-ed25519"), "signature");
  assert.equal(observedHeaders.get("x-signature-timestamp"), "1715702400");
  assert.equal(observedHeaders.get("cache-control"), "no-cache");
  assert.equal(forwardedInit.body, JSON.stringify({ type: 2, data: { name: "computa" } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, source: "discordos" });
});
