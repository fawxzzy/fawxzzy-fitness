import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { friendlyActionError } from "./action-error-copy";

const FALLBACK = "Could not delete this session. Try again.";

test("internal codes never reach the notice", () => {
  assert.equal(friendlyActionError("session_expired", FALLBACK), "Your sign-in expired. Sign in again, then retry.");
  assert.equal(friendlyActionError("not_found", FALLBACK), "That item is no longer there.");
  assert.equal(friendlyActionError("delete_failed", FALLBACK), FALLBACK);
  assert.equal(friendlyActionError("ERR42", FALLBACK), FALLBACK);
  assert.equal(friendlyActionError("history.delete.rejected", FALLBACK), FALLBACK);
});

test("'screen has been refreshed' only when the caller really refreshes", () => {
  assert.equal(friendlyActionError("not_found", FALLBACK, { refreshes: true }), "That item is no longer there. The screen has been refreshed.");
  assert.equal(friendlyActionError("not_found", FALLBACK, { refreshes: false }), "That item is no longer there.");
  assert.equal(friendlyActionError("not_found", FALLBACK), "That item is no longer there.");
});

test("raw database and runtime text falls back", () => {
  assert.equal(
    friendlyActionError('update or delete on table "sessions" violates foreign key constraint "sets_session_id_fkey"', FALLBACK),
    FALLBACK,
  );
  assert.equal(friendlyActionError("TypeError: Cannot read properties of undefined", FALLBACK), FALLBACK);
  assert.equal(friendlyActionError("JWT expired", FALLBACK), "Your sign-in expired. Sign in again, then retry.");
  assert.equal(friendlyActionError("Failed to fetch", FALLBACK), "You look offline. Check your connection and try again.");
});

test("short human messages from other flows pass through unchanged", () => {
  assert.equal(friendlyActionError("Set not found.", FALLBACK), "Set not found.");
  assert.equal(friendlyActionError("No session found", FALLBACK), "No session found");
  assert.equal(friendlyActionError("Session not found.", FALLBACK), "Session not found.");
  assert.equal(friendlyActionError("Network is slow", FALLBACK), "Network is slow");
});

test("human sentences and empty values", () => {
  assert.equal(friendlyActionError("Use seconds or mm:ss for duration.", FALLBACK), "Use seconds or mm:ss for duration.");
  assert.equal(friendlyActionError("Set not found for this session.", FALLBACK), "Set not found for this session.");
  assert.equal(friendlyActionError("", FALLBACK), FALLBACK);
  assert.equal(friendlyActionError("   ", FALLBACK), FALLBACK);
  assert.equal(friendlyActionError(undefined, FALLBACK), FALLBACK);
  assert.equal(friendlyActionError(42, FALLBACK), FALLBACK);
});

test("the app-wide toastActionResult shows the action's own message (mapping is History-scoped)", () => {
  const source = readFileSync(new URL("./action-feedback.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /friendlyActionError/);
  assert.match(source, /toast\.error\(result\.error \|\| messages\.error\)/);
  const history = readFileSync(new URL("./history-action-feedback.ts", import.meta.url), "utf8");
  assert.match(history, /friendlyActionError/);
});
