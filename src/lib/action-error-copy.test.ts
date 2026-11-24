import assert from "node:assert/strict";
import test from "node:test";
import { friendlyActionError } from "./action-error-copy";

const FALLBACK = "Could not delete this session. Try again.";

test("internal codes never reach the notice", () => {
  assert.equal(friendlyActionError("session_expired", FALLBACK), "Your sign-in expired. Sign in again, then retry.");
  assert.equal(friendlyActionError("not_found", FALLBACK), "That item is no longer there. The screen has been refreshed.");
  assert.equal(friendlyActionError("delete_failed", FALLBACK), FALLBACK);
  assert.equal(friendlyActionError("ERR42", FALLBACK), FALLBACK);
  assert.equal(friendlyActionError("history.delete.rejected", FALLBACK), FALLBACK);
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

test("human sentences and empty values", () => {
  assert.equal(friendlyActionError("Use seconds or mm:ss for duration.", FALLBACK), "Use seconds or mm:ss for duration.");
  assert.equal(friendlyActionError("Set not found for this session.", FALLBACK), "Set not found for this session.");
  assert.equal(friendlyActionError("", FALLBACK), FALLBACK);
  assert.equal(friendlyActionError("   ", FALLBACK), FALLBACK);
  assert.equal(friendlyActionError(undefined, FALLBACK), FALLBACK);
  assert.equal(friendlyActionError(42, FALLBACK), FALLBACK);
});
