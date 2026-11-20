import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildTodayNoticeHref,
  isTodayNoticeCode,
  resolveMissingSessionNoticeCode,
  resolveTodayNoticeMessage,
  TODAY_NOTICE_MESSAGES,
} from "./today-notice.ts";
import { SESSION_RESUME_FAILED_MESSAGE, SESSION_START_FAILED_MESSAGE } from "./session-action-response.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("allow-listed notice codes resolve to fixed copy; unknown codes and free text never render", () => {
  assert.equal(
    resolveTodayNoticeMessage({ notice: "session-not-found" }),
    TODAY_NOTICE_MESSAGES["session-not-found"],
  );
  assert.equal(resolveTodayNoticeMessage({ notice: "<b>hi</b>" }), null);
  assert.equal(resolveTodayNoticeMessage({ notice: "toString" }), null);
  assert.equal(isTodayNoticeCode("__proto__"), false);
});

test("the legacy free-text ?error= path is gone: Today only renders allow-listed codes", () => {
  const page = read("../app/today/page.tsx");
  assert.match(page, /resolveTodayNoticeMessage\(\{ notice: searchParams\?\.notice \}\)/);
  assert.doesNotMatch(page, /searchParams\?\.error/);
  assert.doesNotMatch(read("./today-notice.ts"), /getTodayGlobalErrorMessage|args\.error/);
});

test("a missing row is not-found; any other read error is a load failure", () => {
  assert.equal(resolveMissingSessionNoticeCode(null), "session-not-found");
  assert.equal(resolveMissingSessionNoticeCode({ code: "PGRST116" }), "session-not-found");
  assert.equal(resolveMissingSessionNoticeCode({ code: "22P02" }), "session-not-found", "a malformed non-UUID id cannot exist");
  assert.equal(resolveMissingSessionNoticeCode({ code: null }), "session-load-failed");
  assert.equal(resolveMissingSessionNoticeCode({ code: "08006" }), "session-load-failed");
  assert.equal(buildTodayNoticeHref("session-not-found"), "/today?notice=session-not-found");
});

test("notice copy fits one line of the top-right notice on a 390px phone (measured: 41 chars fit in 269px)", () => {
  for (const message of [...Object.values(TODAY_NOTICE_MESSAGES), SESSION_START_FAILED_MESSAGE, SESSION_RESUME_FAILED_MESSAGE]) {
    assert.ok(message.length <= 44, message);
  }
});

test("a missing or foreign /session id redirects to Today with a notice, not silently", () => {
  const queries = read("../app/session/[id]/queries.ts");
  assert.doesNotMatch(queries, /redirect\("\/today"\)/);
  assert.match(queries, /redirect\(buildTodayNoticeHref\(resolveMissingSessionNoticeCode\(sessionError\)\)\)/);
});

test("Today shows its notice through the persistent host and the root toast bridge leaves /today alone", () => {
  const page = read("../app/today/page.tsx");
  assert.match(page, /<TodayNoticeHost message=\{todayNotice\} \/>/);
  assert.doesNotMatch(page, /<CardNotice tone="danger">\{todayGlobalError\}/);
  const bridge = read("../components/ActionFeedbackToasts.tsx");
  assert.match(bridge, /SCREEN_OWNED_NOTICE_ROUTES = new Set\(\["\/today"\]\)/);
});
