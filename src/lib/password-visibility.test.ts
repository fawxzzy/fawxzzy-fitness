import test from "node:test";
import assert from "node:assert/strict";

import {
  resolvePasswordInputType,
  resolvePasswordVisibilityToggleLabel,
} from "./password-visibility.ts";

test("password inputs stay hidden by default", () => {
  assert.equal(resolvePasswordInputType(false), "password");
  assert.equal(resolvePasswordVisibilityToggleLabel(false), "Show password");
});

test("password visibility toggle resolves text input and hide label when enabled", () => {
  assert.equal(resolvePasswordInputType(true), "text");
  assert.equal(resolvePasswordVisibilityToggleLabel(true), "Hide password");
});
