import assert from "node:assert/strict";
import test from "node:test";
import {
  SESSION_PAUSE_ARIA_LABEL,
  SESSION_PAUSE_LABEL,
  resolveSessionPauseTarget,
  shouldPauseUseHistoryBack,
} from "@/components/sessionBackAction";

test("Pause is labelled for what it does: pause the workout and go to Today", () => {
  assert.equal(SESSION_PAUSE_LABEL, "Pause");
  assert.match(SESSION_PAUSE_ARIA_LABEL, /pause/i);
  assert.match(SESSION_PAUSE_ARIA_LABEL, /Today/);
});

test("Pause always targets Today: a Today return link is kept, anything else falls back to /today", () => {
  assert.equal(resolveSessionPauseTarget("/today"), "/today");
  assert.equal(resolveSessionPauseTarget("/today?day=3"), "/today?day=3");
  assert.equal(resolveSessionPauseTarget("/routines"), "/today");
  assert.equal(resolveSessionPauseTarget("/history/abc"), "/today");
  assert.equal(resolveSessionPauseTarget(undefined), "/today");
  assert.equal(resolveSessionPauseTarget(""), "/today");
});

test("history back only when the previous in-app screen is Today; otherwise push Today", () => {
  assert.equal(shouldPauseUseHistoryBack("/today"), true);
  assert.equal(shouldPauseUseHistoryBack("/today?day=2"), true);
  assert.equal(shouldPauseUseHistoryBack("/routines"), false);
  assert.equal(shouldPauseUseHistoryBack("/today-archive"), false);
  assert.equal(shouldPauseUseHistoryBack(null), false);
});
