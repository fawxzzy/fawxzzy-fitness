import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { requestResetForIdentifier } from "./password-reset-request.ts";

const actions = readFileSync(new URL("../app/auth/actions.ts", import.meta.url), "utf8");

test("both public reset callers use the same indexed resolution and request path", () => {
  assert.match(actions, /export async function requestPasswordReset\([\s\S]*?requestResetForIdentifier\(\{[\s\S]*?resolveUsername: resolveIndexedUsername/);
  assert.match(actions, /export async function requestPasswordResetInline\([\s\S]*?requestResetForIdentifier\(\{[\s\S]*?resolveUsername: resolveIndexedUsername/);
  assert.doesNotMatch(actions, /listUsers\(/);
});

test("canonical username and unique alias reach one reset send", async () => {
  for (const identifier of ["fawxzzy", "legacyalias"]) {
    const sends: string[] = [];
    assert.equal(await requestResetForIdentifier({
      identifier,
      resolveUsername: async (name) => name === identifier ? "user@example.com" : null,
      sendReset: async (email) => { sends.push(email); return {}; },
    }), "requested");
    assert.deepEqual(sends, ["user@example.com"]);
  }
});

test("ambiguous alias, missing identity, and lookup failure send no reset", async () => {
  let sends = 0;
  for (const resolver of [async () => null, async () => { throw new Error("lookup unavailable"); }]) {
    const result = await requestResetForIdentifier({
      identifier: "sharedalias",
      resolveUsername: async () => { try { return await resolver(); } catch { return null; } },
      sendReset: async () => { sends++; return {}; },
    });
    assert.equal(result, "requested");
  }
  assert.equal(sends, 0);
});

test("email identifier preserves direct reset path", async () => {
  let lookups = 0;
  let sent = "";
  assert.equal(await requestResetForIdentifier({
    identifier: "user@example.com",
    resolveUsername: async () => { lookups++; return null; },
    sendReset: async (email) => { sent = email; return {}; },
  }), "requested");
  assert.equal(lookups, 0);
  assert.equal(sent, "user@example.com");
});

test("send errors disclose only bounded codes to diagnostics", async () => {
  const diagnostics: string[] = [];
  assert.equal(await requestResetForIdentifier({
    identifier: "fawxzzy",
    resolveUsername: async () => "user@example.com",
    sendReset: async () => ({ error: { message: "Rate limit exceeded for user@example.com" } }),
    onSendError: (code) => diagnostics.push(code),
  }), "rate_limited");
  assert.deepEqual(diagnostics, ["rate_limited"]);
});
