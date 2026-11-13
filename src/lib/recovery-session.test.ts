import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRecoverySessionToken, RECOVERY_SESSION_WINDOW_SECONDS } from "./recovery-session.ts";

const NOW = 1_800_000_000;
const b64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = (claims: Record<string, unknown>) => `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: "member-1", exp: NOW + 3600, ...claims })}.sig`;
const recovery = (age: number, method = "recovery") => token({ amr: [{ method, timestamp: NOW - age }] });

test("the window is fifteen minutes", () => {
  assert.equal(RECOVERY_SESSION_WINDOW_SECONDS, 900);
});

test("a fresh recovery (or otp-labelled) session is accepted and yields the member id", () => {
  assert.deepEqual(evaluateRecoverySessionToken(recovery(5), NOW), { ok: true, userId: "member-1" });
  assert.deepEqual(evaluateRecoverySessionToken(recovery(5, "otp"), NOW), { ok: true, userId: "member-1" });
  assert.equal(evaluateRecoverySessionToken(recovery(RECOVERY_SESSION_WINDOW_SECONDS), NOW).ok, true);
  assert.equal(evaluateRecoverySessionToken(token({ amr: [{ method: "password", timestamp: NOW - 86400 }, { method: "recovery", timestamp: NOW - 60 }] }), NOW).ok, true);
});

test("a normal sign-in session is refused as not_recovery, however fresh", () => {
  for (const amr of [[{ method: "password", timestamp: NOW - 1 }], [{ method: "token_refresh", timestamp: NOW - 1 }], [], undefined, "recovery", [null, 7, "recovery"], [{ method: "recovery" }]]) {
    const result = evaluateRecoverySessionToken(token({ amr }), NOW);
    assert.equal(result.ok, false, JSON.stringify(amr));
  }
  assert.deepEqual(evaluateRecoverySessionToken(token({ amr: [{ method: "password", timestamp: NOW - 1 }] }), NOW), { ok: false, reason: "not_recovery" });
  assert.deepEqual(evaluateRecoverySessionToken(token({}), NOW), { ok: false, reason: "not_recovery" });
});

test("a recovery session older than the window, or dated in the future, is session_expired", () => {
  assert.deepEqual(evaluateRecoverySessionToken(recovery(RECOVERY_SESSION_WINDOW_SECONDS + 1), NOW), { ok: false, reason: "session_expired" });
  assert.deepEqual(evaluateRecoverySessionToken(recovery(-3600), NOW), { ok: false, reason: "session_expired" });
  assert.equal(evaluateRecoverySessionToken(recovery(-30), NOW).ok, true);
});

test("expired, undecodable and subject-less tokens are refused", () => {
  assert.deepEqual(evaluateRecoverySessionToken(token({ exp: NOW - 1, amr: [{ method: "recovery", timestamp: NOW }] }), NOW), { ok: false, reason: "session_expired" });
  for (const bad of ["", "abc", "a.b", "a.b.c", null, undefined, `x.${b64url([1])}.y`]) {
    assert.deepEqual(evaluateRecoverySessionToken(bad, NOW), { ok: false, reason: "session_expired" }, String(bad));
  }
  assert.equal(evaluateRecoverySessionToken(token({ sub: "", amr: [{ method: "recovery", timestamp: NOW }] }), NOW).ok, false);
});
