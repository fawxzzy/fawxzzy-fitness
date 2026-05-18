import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("testing board script includes dry-run and apply guardrails", () => {
  const script = readFileSync(new URL("./setup-discord-testing-board.mjs", import.meta.url), "utf8");

  assert.match(script, /--apply/);
  assert.match(script, /Mode: \$\{summary\.apply \? "apply" : "dry-run"\}/);
  assert.match(script, /DISCORD_TESTING_CATEGORY_ID/);
  assert.match(script, /DISCORD_FEEDBACK_TESTING_FORUM_CHANNEL_ID/);
  assert.match(script, /DISCORD_STAFF_ROLE_ID/);
});

test("testing board script hides the category from everyone", () => {
  const script = readFileSync(new URL("./setup-discord-testing-board.mjs", import.meta.url), "utf8");

  assert.match(script, /PERMISSION_VIEW_CHANNEL/);
  assert.match(script, /@everyone deny/);
  assert.match(script, /buildDenyPostingOverwrite/);
});

test("testing board script provisions a private bug canary thread", () => {
  const script = readFileSync(new URL("./setup-discord-testing-board.mjs", import.meta.url), "utf8");

  assert.match(script, /BUG_CANARY_THREAD_NAME/);
  assert.match(script, /Canonical private bug canary/);
});
