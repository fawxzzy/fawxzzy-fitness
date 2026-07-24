import test from "node:test";
import assert from "node:assert/strict";

import { deriveCompletedVisibilityOverride } from "./session-completed-visibility.ts";

test("retains a completed row when it needs post-close feedback", () => {
  const result = deriveCompletedVisibilityOverride({
    previousLoggedSetCount: 2,
    nextLoggedSetCount: 3,
    isSkipped: false,
    targetSetsMin: 3,
    targetSetsMax: 3,
    previousShowWhenCompleted: true,
    retainWhenFirstCompleted: true,
  });

  assert.equal(result, true);
});

test("preserves manual unhide visibility while the row stays completed", () => {
  const result = deriveCompletedVisibilityOverride({
    previousLoggedSetCount: 3,
    nextLoggedSetCount: 3,
    isSkipped: false,
    targetSetsMin: 3,
    targetSetsMax: 3,
    previousShowWhenCompleted: true,
  });

  assert.equal(result, true);
});

test("preserves hidden state while the row stays completed", () => {
  const result = deriveCompletedVisibilityOverride({
    previousLoggedSetCount: 3,
    nextLoggedSetCount: 3,
    isSkipped: false,
    targetSetsMin: 3,
    targetSetsMax: 3,
    previousShowWhenCompleted: false,
  });

  assert.equal(result, false);
});

test("allows a fresh retained close after the row drops below target and completes again", () => {
  const result = deriveCompletedVisibilityOverride({
    previousLoggedSetCount: 2,
    nextLoggedSetCount: 3,
    isSkipped: false,
    targetSetsMin: 3,
    targetSetsMax: 3,
    previousShowWhenCompleted: true,
    retainWhenFirstCompleted: true,
  });

  assert.equal(result, true);
});
