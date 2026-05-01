import assert from "node:assert/strict";
import test from "node:test";

import { buildForgotPasswordAliasTarget } from "./alias-target.ts";

test("forgot-password alias preserves auth feedback query params", () => {
  assert.equal(
    buildForgotPasswordAliasTarget({
      error: "send_failed",
      info: "reset_requested",
      verified: "1",
    }),
    "/login?error=send_failed&info=reset_requested&verified=1",
  );
});

test("forgot-password alias falls back to login when no query params exist", () => {
  assert.equal(buildForgotPasswordAliasTarget(), "/login");
});
