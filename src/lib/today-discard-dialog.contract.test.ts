import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Source contracts for the Today review 2026-11-19 discard and notice fixes (behaviour is covered by
// tests/dom/today-discard.dom.test.tsx and tests/dom/today-start.dom.test.tsx).

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Today's discard action reports failures as a result instead of an ?error= redirect", () => {
  const page = read("../app/today/page.tsx");
  const start = page.indexOf("async function discardInProgressSessionAction");
  const end = page.indexOf("export default async function TodayPage");
  assert.ok(start > 0 && end > start);
  const action = page.slice(start, end);
  assert.match(action, /Promise<ActionResult>/);
  assert.doesNotMatch(action, /\/today\?error=/);
  assert.match(action, /return \{ ok: false, error: DISCARD_IN_PROGRESS_FAILED_MESSAGE \}/);
  assert.match(action, /redirect\("\/today"\)/, "success still lands on a fresh Today");
  assert.match(page, /failureMessage=\{DISCARD_IN_PROGRESS_FAILED_MESSAGE\}/);
});

test("the discard dialog blurs and dims the screen behind it and uses tokens only", () => {
  const modal = read("../components/ui/ConfirmDestructiveModal.tsx");
  const blur = /MODAL_SHELL_CONTENT_FILTER = "blur\((\d+(?:\.\d+)?)px\)/.exec(modal);
  assert.ok(blur, "the shell filter is a named constant");
  assert.ok(Number(blur[1]) >= 5, `backdrop blur is noticeable (was 1.5px, now ${blur[1]}px)`);
  assert.match(modal, /MODAL_BACKDROP_CLASSNAME =\s+"bg-\[rgb\(var\(--bg-app\)\/0\.\d+\)\]"/);
  assert.doesNotMatch(modal, /rgba\(7,\s*17,\s*27/, "no hard-coded app background colour");
  assert.match(modal, /MODAL_PANEL_CLASSNAME =[\s\S]*rounded-\[var\(--card-radius\)\][\s\S]*shadow-\[var\(--glass-shadow-overlay\)\]/);
});

test("notices anchor top-right under the header through shared CSS variables", () => {
  const css = read("../app/globals.css");
  assert.match(css, /--app-notice-top: calc\(var\(--app-top-offset/);
  assert.match(css, /--app-notice-inset-x: var\(--screen-gutter\)/);
  assert.match(css, /--app-notice-max-width:/);
  const provider = read("../components/ui/ToastProvider.tsx");
  assert.match(provider, /top-\[var\(--app-notice-top\)\]/);
  assert.match(provider, /items-end/);
  assert.doesNotMatch(provider, /\bbottom-\[/, "notices no longer sit at the bottom of the screen");
  const shell = read("../components/shared/mobile-shell/MobileScreenShell.tsx");
  assert.match(shell, /useAppNoticeAnchor\(/);
});
