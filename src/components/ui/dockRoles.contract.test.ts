import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const SRC_ROOT = path.resolve(process.cwd(), "src");

test("dock roles: amber is not a dock or action-chrome button colour (DESIGN-CONTRACT C3/C9)", () => {
  const css = readFileSync(path.join(SRC_ROOT, "app", "globals.css"), "utf8");
  for (const selector of [
    ".bottom-action--secondary {",
    '.bottom-action[data-bottom-action-intent="toggleActive"] {',
    '.bottom-action[data-bottom-action-intent="toggleInactive"] {',
    '.action-chrome[data-action-chrome-intent="info"] {',
    '.action-chrome[data-action-chrome-intent="toggleInactive"] {',
    '.action-chrome[data-action-chrome-intent="toggleActive"] {',
  ]) {
    const start = css.indexOf(selector);
    assert.notEqual(start, -1, `${selector} missing`);
    const block = css.slice(start, css.indexOf("\n}", start));
    assert.doesNotMatch(block, /secondary-action-rgb/, `${selector} still uses the amber secondary-action colour`);
  }
});

test("dock roles: attached action dividers use the neutral border, not amber", () => {
  for (const file of [
    ["components", "ui", "card-system", "CardActionRow.tsx"],
    ["components", "ui", "ConfirmDestructiveModal.tsx"],
    ["components", "session", "ExerciseTimerControl.tsx"],
    ["components", "session", "SessionExerciseBlock.tsx"],
    ["components", "session", "SetLoggerCard.tsx"],
    ["components", "session", "sessionLoggerModel.tsx"],
    ["app", "dev", "mobile-regression", "EditDayRegressionSurface.tsx"],
  ]) {
    const source = readFileSync(path.join(SRC_ROOT, ...file), "utf8");
    assert.doesNotMatch(source, /secondary-action-rgb/, `${file.join("/")} still uses amber for a button divider`);
  }
});

test("dock roles: the session dock pairs a secondary Add with a primary Finish (DESIGN-CONTRACT C11)", () => {
  const addSource = readFileSync(path.join(SRC_ROOT, "app", "session", "[id]", "QuickAddExerciseSheet.tsx"), "utf8");
  assert.match(addSource, /intent="info"/);
  const sessionSource = readFileSync(path.join(SRC_ROOT, "components", "SessionPageClient.tsx"), "utf8");
  assert.match(sessionSource, /intent="positive"[\s\S]{0,600}>\s*Finish\s*<\/BottomDockButton>/);
});
