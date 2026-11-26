import assert from "node:assert/strict";
import test from "node:test";
import { ROUTINE_LIMIT_PRO_REQUIRED_MESSAGE } from "@/lib/pro-tier-limits";
import {
  ROUTINE_LIMIT_UPGRADE_HREF,
  isDatabaseError,
  isRoutineLimitError,
  resolveRoutineLimitNotice,
  toPlainActionError,
} from "./routine-copy";

test("routine limit notice shows only for Free users at or over the cap", () => {
  assert.equal(resolveRoutineLimitNotice({ accessState: "pro", routineCount: 9 }), null);
  assert.equal(resolveRoutineLimitNotice({ accessState: "free", routineCount: 2 }), null);
  assert.equal(resolveRoutineLimitNotice({ accessState: "free", routineCount: null }), null);
  const notice = resolveRoutineLimitNotice({ accessState: "free", routineCount: 3 });
  assert.ok(notice);
  assert.equal(notice.upgradeHref, ROUTINE_LIMIT_UPGRADE_HREF);
  assert.match(notice.message, /^The Free plan includes up to 3 routines\./);
  assert.doesNotMatch(notice.message, /\bBase\b/);
});

test("the server cap message is recognised so the client can show the notice copy instead", () => {
  assert.equal(isRoutineLimitError(ROUTINE_LIMIT_PRO_REQUIRED_MESSAGE), true);
  assert.equal(isRoutineLimitError("Routine name already exists."), false);
});

test("database errors become plain fallback copy", () => {
  const originalError = console.error;
  console.error = () => undefined;
  try {
    assert.equal(
      toPlainActionError({ message: "Could not find the 'x' column of 'y' in the schema cache", code: "PGRST204" }, "Could not save the day."),
      "Could not save the day.",
    );
    assert.equal(toPlainActionError("duplicate key value violates unique constraint", "Could not save."), "Could not save.");
    assert.equal(toPlainActionError({ message: "new row violates row-level security policy" }, "Could not save."), "Could not save.");
    assert.equal(toPlainActionError("TypeError: fetch failed", "Could not save."), "Could not save.");
  } finally {
    console.error = originalError;
  }
});

test("authored messages and empty errors are handled", () => {
  assert.equal(toPlainActionError("Day name is required.", "Could not save."), "Day name is required.");
  assert.equal(toPlainActionError(null, "Could not save."), "Could not save.");
  assert.equal(toPlainActionError({ message: "   " }, "Could not save."), "Could not save.");
  assert.equal(isDatabaseError({ message: "Anything", code: "23505" }), true);
  assert.equal(isDatabaseError("Routine not found."), false);
});
