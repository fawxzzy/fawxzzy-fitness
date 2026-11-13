import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildFitnessRecoveryRedirectUrl, FITNESS_RECOVERY_PATH, requestResetForIdentifier } from "./password-reset-request.ts";

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

test("the recovery redirect is Fitness's own reset page on the app origin, with the same shape for both reset callers", () => {
  assert.equal(FITNESS_RECOVERY_PATH, "/reset-password?recovery=1");
  assert.equal(buildFitnessRecoveryRedirectUrl("https://fitness.fawxzzy.com"), "https://fitness.fawxzzy.com/reset-password?recovery=1");
  assert.equal(buildFitnessRecoveryRedirectUrl("https://fitness.fawxzzy.com/"), "https://fitness.fawxzzy.com/reset-password?recovery=1");
  assert.equal(buildFitnessRecoveryRedirectUrl("http://localhost:3016"), "http://localhost:3016/reset-password?recovery=1");
  const url = new URL(buildFitnessRecoveryRedirectUrl("https://fitness.fawxzzy.com"));
  assert.equal(url.pathname, "/reset-password");
  assert.deepEqual([...url.searchParams.entries()], [["recovery", "1"]]);

  // No caller assembles its own redirect: both go through the one builder.
  assert.equal((actions.match(/buildFitnessRecoveryRedirectUrl\(getAppOrigin\(\)\)/g) ?? []).length, 2);
  assert.doesNotMatch(actions, /\/reset-password\?recovery=1/);
});

test("a reset requested from Fitness must not target the account portal recovery URL (the portal rejects fragment tokens)", () => {
  // Supabase's server client defaults to the implicit flow, so the emailed link returns with `#access_token=...`.
  // Fitness's /reset-password bridge reads that fragment; the portal's reset page (parseRecoveryPayload in
  // FawxzzyWeb src/lib/auth/callback-contract.ts) rejects any fragment and only accepts a PKCE `code`, so a link
  // aimed at https://account.fawxzzy.com/reset-password?recovery=1&app=fitness would show "Recovery link invalid."
  const redirect = buildFitnessRecoveryRedirectUrl("https://fitness.fawxzzy.com");
  assert.ok(!redirect.includes("account.fawxzzy.com"));
  assert.ok(!redirect.includes("app=fitness"));
  assert.doesNotMatch(actions, /account\.fawxzzy\.com/);

  const bridge = readFileSync(new URL("../app/reset-password/RecoverySessionBridge.tsx", import.meta.url), "utf8");
  assert.match(bridge, /readRecoveryTokensFromHash\(window\.location\.hash\)/);
  const page = readFileSync(new URL("../app/reset-password/page.tsx", import.meta.url), "utf8");
  assert.match(page, /searchParams\?\.recovery === "1"/);
});
