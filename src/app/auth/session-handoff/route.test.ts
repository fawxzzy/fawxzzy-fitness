import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  createSessionHandoffHandlers,
} from "@/lib/auth-handoff-handlers";
import {
  FITNESS_HANDOFF_AUDIENCE,
  FITNESS_HANDOFF_ISSUER,
  FITNESS_HANDOFF_MASTER_PROJECT_REF,
  FITNESS_HANDOFF_READINESS_CONTRACT_VERSION,
  FITNESS_PORTAL_ORIGIN,
  type FitnessHandoffReadiness,
  type FitnessHandoffRecord,
} from "@/lib/auth-handoff";

const FITNESS_ORIGIN = "https://fitness.fawxzzy.com";
const URL = `${FITNESS_ORIGIN}/auth/session-handoff`;
const cacheControl = "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
const sourceCommit = "a".repeat(40);
const readiness: FitnessHandoffReadiness = {
  authProjectRef: FITNESS_HANDOFF_MASTER_PROJECT_REF,
  contractVersion: FITNESS_HANDOFF_READINESS_CONTRACT_VERSION,
  handoffStore: "available",
  sourceCommit,
};

function request(body: string, origin = FITNESS_PORTAL_ORIGIN) {
  return new Request(URL, {
    body,
    headers: { "content-type": "application/json", origin },
    method: "POST",
  });
}

test("handoff begin is disabled by default and does not establish a browser binding", async () => {
  const handlers = createSessionHandoffHandlers();
  const response = await handlers.POST(request(JSON.stringify({ returnTo: "/today" })));

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: "Session handoff unavailable." });
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("handoff begin binds an opaque challenge to the Fitness browser and normalizes returnTo", async () => {
  const records: FitnessHandoffRecord[] = [];
  const handlers = createSessionHandoffHandlers({
    getReadiness: () => readiness,
    getRuntime: () => ({
      now: () => 1_700_000_000,
      store: {
        begin: async (record) => {
          records.push(record);
          return true;
        },
        consume: async () => null,
      },
    }),
  });
  const response = await handlers.POST(request(JSON.stringify({ returnTo: "https://hostile.example" })));
  const payload = await response.json() as { ok: boolean; handoffId: string; readiness: FitnessHandoffReadiness; returnTo: string };

  assert.equal(response.status, 200);
  assert.deepEqual(payload.ok, true);
  assert.match(payload.handoffId, /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(payload.readiness, readiness);
  assert.equal(payload.returnTo, "/entry");
  assert.equal(response.headers.get("access-control-allow-origin"), FITNESS_PORTAL_ORIGIN);
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  assert.equal(response.headers.get("cache-control"), cacheControl);
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /__Host-fitness-handoff=/);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=lax/i);
  assert.match(setCookie, /Path=\//);
  assert.doesNotMatch(setCookie, /Domain=/i);
  const stored = records[0];
  assert.ok(stored);
  assert.equal(stored.handoffId, payload.handoffId);
  assert.equal(stored.returnTo, "/entry");
  assert.equal(stored.audience, FITNESS_HANDOFF_AUDIENCE);
  assert.equal(stored.issuer, FITNESS_HANDOFF_ISSUER);
  assert.equal(stored.expiresAt, 1_700_000_060);
  assert.equal(stored.bindingDigest.length, 43);
  assert.notEqual(stored.bindingDigest, setCookie.match(/__Host-fitness-handoff=([^;]+)/)?.[1]);
});

test("handoff begin rejects hostile origins without touching the atomic store", async () => {
  let begins = 0;
  const handlers = createSessionHandoffHandlers({
    getReadiness: () => readiness,
    getRuntime: () => ({
      now: () => 0,
      store: {
        begin: async () => {
          begins += 1;
          return true;
        },
        consume: async () => null,
      },
    }),
  });
  const response = await handlers.POST(request(JSON.stringify({ returnTo: "/today" }), "https://hostile.example"));

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(begins, 0);
});

test("handoff begin rejects non-JSON and oversized payloads before it touches the atomic store", async () => {
  let begins = 0;
  const handlers = createSessionHandoffHandlers({
    getReadiness: () => readiness,
    getRuntime: () => ({
      now: () => 0,
      store: {
        begin: async () => {
          begins += 1;
          return true;
        },
        consume: async () => null,
      },
    }),
  });
  const nonJson = await handlers.POST(new Request(URL, {
    body: "returnTo=/today",
    headers: { "content-type": "text/plain", origin: FITNESS_PORTAL_ORIGIN },
    method: "POST",
  }));
  assert.equal(nonJson.status, 415);
  assert.equal(nonJson.headers.get("set-cookie"), null);

  const declaredOversize = await handlers.POST(new Request(URL, {
    body: "{}",
    headers: {
      "content-length": "8193",
      "content-type": "application/json",
      origin: FITNESS_PORTAL_ORIGIN,
    },
    method: "POST",
  }));
  assert.equal(declaredOversize.status, 413);
  assert.equal(declaredOversize.headers.get("set-cookie"), null);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("x".repeat(8193)));
      controller.close();
    },
  });
  const streamedOversize = await handlers.POST(new Request(URL, {
    body: stream,
    duplex: "half",
    headers: { "content-type": "application/json", origin: FITNESS_PORTAL_ORIGIN },
    method: "POST",
  } as RequestInit));
  assert.equal(streamedOversize.status, 413);
  assert.equal(streamedOversize.headers.get("set-cookie"), null);
  assert.equal(begins, 0);
});

test("session route modules export only Next-supported handler methods", () => {
  const syncSource = readFileSync(fileURLToPath(new globalThis.URL("../session-sync/route.ts", import.meta.url)), "utf8");
  const handoffSource = readFileSync(fileURLToPath(new globalThis.URL("route.ts", import.meta.url)), "utf8");
  const readExports = (source: string) => [...source.matchAll(/^export const (\w+)/gm)].map((match) => match[1]);

  assert.deepEqual(readExports(syncSource), ["POST", "DELETE", "OPTIONS"]);
  assert.deepEqual(readExports(handoffSource), ["OPTIONS", "POST"]);
  assert.doesNotMatch(syncSource, /^export (?:async )?function /m);
  assert.doesNotMatch(handoffSource, /^export (?:async )?function /m);
});

test("handoff preflight is enabled only when the exact portal runtime is ready", async () => {
  const handlers = createSessionHandoffHandlers({
    getReadiness: () => readiness,
    getRuntime: () => ({
      now: () => 0,
      store: { begin: async () => true, consume: async () => null },
    }),
  });
  const response = await handlers.OPTIONS(new Request(URL, {
    headers: { origin: FITNESS_PORTAL_ORIGIN },
    method: "OPTIONS",
  }));

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), FITNESS_PORTAL_ORIGIN);
  assert.equal(response.headers.get("access-control-allow-methods"), "POST, OPTIONS");
});

test("handoff begin fails closed before storing when runtime attestation is unavailable", async () => {
  let begins = 0;
  const handlers = createSessionHandoffHandlers({
    getReadiness: () => null,
    getRuntime: () => ({
      now: () => 0,
      store: {
        begin: async () => {
          begins += 1;
          return true;
        },
        consume: async () => null,
      },
    }),
  });

  const response = await handlers.POST(request(JSON.stringify({ returnTo: "/today" })));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: "Session handoff unavailable." });
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(begins, 0);
});
