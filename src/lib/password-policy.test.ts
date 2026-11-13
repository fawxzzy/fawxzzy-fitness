import assert from "node:assert/strict";
import test from "node:test";
import {
  CHANGE_PASSWORD_COPY,
  classifyChangePasswordProviderError,
  isValidNewPassword,
  NEW_PASSWORD_MINIMUM,
  NEW_PASSWORD_REQUIREMENT,
  validateChangePasswordInput,
} from "@/lib/password-policy";

test("new passwords use the shared ten-character minimum", () => {
  assert.equal(NEW_PASSWORD_MINIMUM, 10);
  for (let length = 0; length < 10; length += 1) assert.equal(isValidNewPassword("x".repeat(length)), false);
  assert.equal(isValidNewPassword("x".repeat(10)), true);
  assert.match(NEW_PASSWORD_REQUIREMENT, /10 characters/);
});

test("password validation neither coerces input nor invokes getters", () => {
  let reads = 0;
  const value = { get length() { reads += 1; return 20; }, toString() { reads += 1; return "synthetic password"; } };
  for (const input of [null, undefined, 1234567890, true, [], value]) assert.equal(isValidNewPassword(input), false);
  assert.equal(reads, 0);
});

test("new passphrases preserve spaces and Unicode without an application cap", () => {
  for (const value of ["  passphrase  ", "e\u0301".repeat(10), "x".repeat(64), "x".repeat(128), "x".repeat(1024)]) {
    const before = value;
    assert.equal(isValidNewPassword(value), true);
    assert.equal(value, before);
  }
});

test("change-password input uses the same ten-character rule and exact-match comparisons", () => {
  const ok = validateChangePasswordInput({ current: "old password", next: "x".repeat(10), confirmation: "x".repeat(10) });
  assert.deepEqual(ok, { ok: true, current: "old password", next: "x".repeat(10) });

  assert.deepEqual(validateChangePasswordInput({ current: "", next: "x".repeat(10), confirmation: "x".repeat(10) }), { ok: false, problem: "current_missing" });
  assert.deepEqual(validateChangePasswordInput({ current: "old", next: "x".repeat(9), confirmation: "x".repeat(9) }), { ok: false, problem: "new_too_short" });
  assert.deepEqual(validateChangePasswordInput({ current: "old", next: "x".repeat(10), confirmation: "x".repeat(11) }), { ok: false, problem: "confirmation_mismatch" });
  assert.deepEqual(validateChangePasswordInput({ current: "x".repeat(10), next: "x".repeat(10), confirmation: "x".repeat(10) }), { ok: false, problem: "same_password" });

  // Opaque strings: whitespace and Unicode differences are real differences, nothing is trimmed or normalised.
  assert.equal(validateChangePasswordInput({ current: "old", next: "  passphrase  ", confirmation: "passphrase" }).ok, false);
  assert.equal(validateChangePasswordInput({ current: "old", next: "e\u0301".repeat(10), confirmation: "\u00e9".repeat(10) }).ok, false);
  assert.equal(validateChangePasswordInput({ current: "  old  ", next: "old       ", confirmation: "old       " }).ok, true);
  assert.equal(validateChangePasswordInput({ current: "x".repeat(1024), next: "y".repeat(1024), confirmation: "y".repeat(1024) }).ok, true);
});

test("change-password input never coerces non-string values or reads getters", () => {
  let reads = 0;
  const hostile = { get length() { reads += 1; return 20; }, toString() { reads += 1; return "synthetic password"; } };
  for (const value of [null, undefined, 1234567890, true, [], hostile]) {
    assert.equal(validateChangePasswordInput({ current: value, next: "x".repeat(10), confirmation: "x".repeat(10) }).ok, false);
    assert.equal(validateChangePasswordInput({ current: "old", next: value, confirmation: value }).ok, false);
    assert.equal(validateChangePasswordInput({ current: "old", next: "x".repeat(10), confirmation: value }).ok, false);
  }
  assert.equal(reads, 0);
});

test("change-password copy is a fixed table and the new-password rule reuses the shared requirement", () => {
  assert.equal(CHANGE_PASSWORD_COPY.new_too_short, NEW_PASSWORD_REQUIREMENT);
  assert.deepEqual(Object.keys(CHANGE_PASSWORD_COPY).sort(), [
    "confirmation_mismatch",
    "current_incorrect",
    "current_missing",
    "new_too_short",
    "password_rejected",
    "rate_limited",
    "same_password",
    "update_failed",
  ]);
});

test("provider rejections classify to safe codes by stage", () => {
  const credentials = { code: "invalid_credentials", status: 400, message: "Invalid login credentials" };
  assert.equal(classifyChangePasswordProviderError("verify", credentials), "current_incorrect");
  assert.equal(classifyChangePasswordProviderError("verify", { status: 503, message: "down" }), "update_failed");
  assert.equal(classifyChangePasswordProviderError("verify", { code: "user_banned", status: 403 }), "update_failed");
  assert.equal(classifyChangePasswordProviderError("update", { code: "same_password", status: 422 }), "same_password");
  assert.equal(classifyChangePasswordProviderError("update", { code: "weak_password", status: 422 }), "password_rejected");
  assert.equal(classifyChangePasswordProviderError("update", { code: "reauthentication_needed", status: 400 }), "update_failed");
  for (const stage of ["verify", "update"] as const) {
    assert.equal(classifyChangePasswordProviderError(stage, { status: 429 }), "rate_limited");
    assert.equal(classifyChangePasswordProviderError(stage, { code: "over_request_rate_limit" }), "rate_limited");
    assert.equal(classifyChangePasswordProviderError(stage, { message: "Email rate limit exceeded" }), "rate_limited");
    assert.equal(classifyChangePasswordProviderError(stage, null), "update_failed");
    assert.equal(classifyChangePasswordProviderError(stage, undefined), "update_failed");
    assert.equal(classifyChangePasswordProviderError(stage, "boom"), "update_failed");
  }
  // A wrong current password is only recognised at the verify stage.
  assert.equal(classifyChangePasswordProviderError("update", credentials), "update_failed");
});
