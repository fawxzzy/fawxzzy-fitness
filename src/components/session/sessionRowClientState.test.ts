import test from "node:test";
import assert from "node:assert/strict";

import {
  buildInitialSessionRowClientState,
  reconcileSessionRowClientState,
} from "./sessionRowClientState.ts";

test("reconcileSessionRowClientState drops stale rows and keeps pending flags for stable ids", () => {
  const initial = buildInitialSessionRowClientState([
    { id: "row-a", loggedSetCount: 1, isSkipped: false },
    { id: "row-b", loggedSetCount: 0, isSkipped: false },
  ]);

  const optimistic = {
    ...initial,
    "row-b": {
      ...initial["row-b"],
      isSkipped: true,
      isSkipPending: true,
    },
    "row-zombie": {
      loggedSetCount: 9,
      isSkipped: true,
      isQuickLogPending: true,
      isSkipPending: true,
    },
  };

  const reconciled = reconcileSessionRowClientState({
    current: optimistic,
    rows: [
      { id: "row-a", loggedSetCount: 2, isSkipped: false },
      { id: "row-b", loggedSetCount: 0, isSkipped: true },
    ],
    mergedLoggedSetCount: { "row-a": 2, "row-b": 0 },
  });

  assert.deepEqual(Object.keys(reconciled).sort(), ["row-a", "row-b"]);
  assert.equal(reconciled["row-b"]?.isSkipPending, true);
  assert.equal(reconciled["row-b"]?.isSkipped, true);
});
