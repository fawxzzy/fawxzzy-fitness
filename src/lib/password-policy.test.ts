import assert from "node:assert/strict";
import test from "node:test";
import { isValidNewPassword, NEW_PASSWORD_MINIMUM, NEW_PASSWORD_REQUIREMENT } from "@/lib/password-policy";

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
