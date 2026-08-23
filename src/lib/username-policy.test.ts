import test from "node:test";
import assert from "node:assert/strict";

import {
  isUsernameIdentifier,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_VALIDATION_MESSAGE,
} from "./username-policy.ts";

test("username syntax matches the shared Web and Mazer contract", () => {
  assert.equal(USERNAME_MIN_LENGTH, 2);
  assert.equal(USERNAME_MAX_LENGTH, 15);
  assert.equal(isUsernameIdentifier("fawxzzy"), true);
  assert.equal(isUsernameIdentifier("._"), true);
  assert.equal(isUsernameIdentifier("user-name_15"), true);
  assert.equal(isUsernameIdentifier("a"), false);
  assert.equal(isUsernameIdentifier("sixteen_chars_ok"), false);
  assert.equal(isUsernameIdentifier("space name"), false);
  assert.equal(isUsernameIdentifier("email@example.com"), false);
  assert.equal(
    USERNAME_VALIDATION_MESSAGE,
    "Username must be 2-15 characters and use letters, numbers, periods, underscores, or hyphens.",
  );
});
