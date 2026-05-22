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
      setCountOverrideActive: false,
      isSkipped: true,
      isQuickLogPending: true,
      isSkipPending: true,
      showWhenCompleted: false,
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

test("reconcileSessionRowClientState preserves local set-count overrides until the server catches up", () => {
  const initial = buildInitialSessionRowClientState([
    { id: "row-a", loggedSetCount: 4, isSkipped: false },
  ]);

  const optimistic = {
    ...initial,
    "row-a": {
      ...initial["row-a"],
      loggedSetCount: 2,
      setCountOverrideActive: true,
    },
  };

  const staleServer = reconcileSessionRowClientState({
    current: optimistic,
    rows: [{ id: "row-a", loggedSetCount: 4, isSkipped: false }],
    mergedLoggedSetCount: { "row-a": 4 },
  });

  assert.equal(staleServer["row-a"]?.loggedSetCount, 2);
  assert.equal(staleServer["row-a"]?.setCountOverrideActive, true);

  const caughtUpServer = reconcileSessionRowClientState({
    current: staleServer,
    rows: [{ id: "row-a", loggedSetCount: 2, isSkipped: false }],
    mergedLoggedSetCount: { "row-a": 2 },
  });

  assert.equal(caughtUpServer["row-a"]?.loggedSetCount, 2);
  assert.equal(caughtUpServer["row-a"]?.setCountOverrideActive, false);
});

test("reconcileSessionRowClientState preserves completed-row visibility intent and pending flags across stale refreshes", () => {
  const current = {
    "row-a": {
      loggedSetCount: 3,
      setCountOverrideActive: true,
      isSkipped: false,
      isQuickLogPending: true,
      isSkipPending: false,
      showWhenCompleted: true,
    },
  };

  const reconciled = reconcileSessionRowClientState({
    current,
    rows: [{ id: "row-a", loggedSetCount: 2, isSkipped: false }],
    mergedLoggedSetCount: { "row-a": 2 },
  });

  assert.equal(reconciled["row-a"]?.loggedSetCount, 3);
  assert.equal(reconciled["row-a"]?.setCountOverrideActive, true);
  assert.equal(reconciled["row-a"]?.isQuickLogPending, true);
  assert.equal(reconciled["row-a"]?.showWhenCompleted, true);
});
