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
  assert.match(action, /return discardInProgressFailed\(\);/);
  assert.doesNotMatch(action, /return \{ ok: false/, "every failure goes through the revalidating helper");
  assert.match(
    page,
    /function discardInProgressFailed\(\): ActionResult \{\s+revalidatePath\("\/today"\);\s+return \{ ok: false, error: DISCARD_IN_PROGRESS_FAILED_MESSAGE \};/,
  );
  assert.match(action, /redirect\("\/today"\)/, "success still lands on a fresh Today");
  assert.match(page, /failureMessage=\{DISCARD_IN_PROGRESS_FAILED_MESSAGE\}/);
});

test("telemetry after the discard delete is best-effort and runs only once the session row is gone", () => {
  const page = read("../app/today/page.tsx");
  const action = page.slice(page.indexOf("async function discardInProgressSessionAction"), page.indexOf("export default async function TodayPage"));
  const deleted = action.indexOf("if (sessionDeleteError)");
  const bestEffort = action.indexOf("await runBestEffortSteps(");
  assert.ok(deleted > 0 && bestEffort > deleted, "telemetry starts after the delete succeeded");
  assert.doesNotMatch(action, /await (recordFitnessSignalForMember|publishFitnessIntegrationStateForMember)\(/, "no bare awaited telemetry that can throw");
  assert.match(action.slice(bestEffort), /recordFitnessSignalForMember\([\s\S]*publishFitnessIntegrationStateForMember\([\s\S]*redirect\("\/today"\)/);
  const button = read("../components/destructive/ConfirmedServerFormButton.tsx");
  assert.equal((button.match(/router\.refresh\(\)/g) ?? []).length, 2, "both failure paths refresh the route");
});

test("the discard dialog blurs and dims the screen behind it and uses tokens only", () => {
  // Design foundation: the confirm renders on the shared Sheet, whose scrim does the dim + blur for every sheet.
  const modal = read("../components/ui/ConfirmDestructiveModal.tsx");
  const sheet = read("../components/ui/Sheet.tsx");
  assert.match(modal, /<Sheet\b/);
  const scrim = /SHEET_SCRIM_CLASSNAME = "([^"]+)"/.exec(sheet);
  assert.ok(scrim, "the scrim is a named constant");
  assert.match(scrim[1], /bg-\[rgb\(var\(--bg-app\)\/0\.\d+\)\]/);
  const blur = /backdrop-blur-\[(\d+(?:\.\d+)?)px\]/.exec(scrim[1]);
  assert.ok(blur && Number(blur[1]) >= 5, `backdrop blur is noticeable (was 1.5px, now ${blur?.[1]}px)`);
  for (const source of [modal, sheet]) {
    assert.doesNotMatch(source, /rgba\(7,\s*17,\s*27/, "no hard-coded app background colour");
  }
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
