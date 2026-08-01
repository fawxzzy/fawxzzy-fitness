import test from "node:test";
import assert from "node:assert/strict";

import {
  buildInitialSessionRowClientState,
  reconcileSessionRowClientState,
  type SessionRowClientState,
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
      isSkipOverrideActive: true,
    },
    "row-zombie": {
      loggedSetCount: 9,
      setCountOverrideActive: false,
      isSkipped: true,
      isSkipOverrideActive: false,
      isQuickLogPending: true,
      isSkipPending: true,
      showWhenCompleted: false,
    } satisfies SessionRowClientState,
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
  const current: Record<string, SessionRowClientState> = {
    "row-a": {
      loggedSetCount: 3,
      setCountOverrideActive: true,
      isSkipped: false,
      isSkipOverrideActive: false,
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

// ---------------------------------------------------------------------------
// Skip persistence: the reported production bug and its fix.
//
// Bug (pre-fix): reconcileSessionRowClientState unconditionally set
// `isSkipped: row.isSkipped` from the freshly-passed `rows` (== `exercises`
// prop) argument, with no analog to the `shouldPreserveLocalCount` guard used
// for `loggedSetCount`. Any unrelated `exercises`-identity change (e.g. the
// revalidatePath triggered by `updateSessionExerciseTimerAction` for a
// completely different exercise's rest timer) would silently stomp a
// just-completed, successful skip toggle back to its pre-toggle value if the
// freshly-revalidated row data hadn't yet caught up to the write.
//
// Fix: SessionRowClientState now carries `isSkipOverrideActive`, mirroring
// `setCountOverrideActive`. It is set true whenever isSkipped is changed
// optimistically (see SessionExerciseFocus.tsx's handleSkipToggle), and
// reconcileSessionRowClientState preserves the locally-known isSkipped value
// while the override is active and the server row disagrees, clearing the
// override once the server row actually catches up -- at which point a
// genuinely new/independent server-side change reconciles normally again.
// ---------------------------------------------------------------------------

test("BUG REPRO (fixed): a completed skip toggle is not stomped by an unrelated exercises-array refresh carrying a stale is_skipped", () => {
  const initial = buildInitialSessionRowClientState([
    { id: "row-a", loggedSetCount: 0, isSkipped: false },
  ]);

  // User taps skip; handleSkipToggle sets isSkipped optimistically and marks
  // the override active; the server round-trip then completes successfully
  // (isSkipPending -> false), independent of whether `exercises` has caught up.
  const afterCompletedToggle: Record<string, SessionRowClientState> = {
    ...initial,
    "row-a": {
      ...initial["row-a"],
      isSkipped: true,
      isSkipOverrideActive: true,
      isSkipPending: false,
    },
  };

  // Unrelated timer-driven revalidate (updateSessionExerciseTimerAction on a
  // DIFFERENT exercise) hands back a fresh `exercises` array whose row for
  // THIS exercise is still stale (server hasn't caught up to the write yet).
  const reconciledAfterStaleRefresh = reconcileSessionRowClientState({
    current: afterCompletedToggle,
    rows: [{ id: "row-a", loggedSetCount: 0, isSkipped: false }],
    mergedLoggedSetCount: { "row-a": 0 },
  });

  assert.equal(reconciledAfterStaleRefresh["row-a"]?.isSkipped, true);
  assert.equal(reconciledAfterStaleRefresh["row-a"]?.isSkipOverrideActive, true);

  // The bug's actual trigger is repeatable: a SECOND unrelated refresh must
  // still not stomp the value while the server remains stale.
  const reconciledAfterSecondStaleRefresh = reconcileSessionRowClientState({
    current: reconciledAfterStaleRefresh,
    rows: [{ id: "row-a", loggedSetCount: 0, isSkipped: false }],
    mergedLoggedSetCount: { "row-a": 0 },
  });
  assert.equal(reconciledAfterSecondStaleRefresh["row-a"]?.isSkipped, true);
});

test("skip persistence: exercises-array-new-identity with stale server value keeps isSkipped true across many reconciles (unrelated rerenders)", () => {
  const state: Record<string, SessionRowClientState> = {
    "row-a": {
      loggedSetCount: 1,
      setCountOverrideActive: false,
      isSkipped: true,
      isSkipOverrideActive: true,
      isQuickLogPending: false,
      isSkipPending: false,
      showWhenCompleted: false,
    },
  };

  // Simulate several unrelated rerenders (each producing a brand new
  // `exercises` array reference, per React/Next.js RSC prop-passing) before
  // the server value catches up.
  let current = state;
  for (let i = 0; i < 5; i += 1) {
    current = reconcileSessionRowClientState({
      current,
      // A fresh array literal every call == new identity, exactly like a new
      // `exercises` prop from a revalidated server render.
      rows: [{ id: "row-a", loggedSetCount: 1, isSkipped: false }],
      mergedLoggedSetCount: { "row-a": 1 },
    });
    assert.equal(current["row-a"]?.isSkipped, true, `expected isSkipped to survive rerender #${i + 1}`);
  }
});

test("skip persistence: timer-driven revalidation trigger (stale row from updateSessionExerciseTimerAction's revalidatePath) does not revert a different exercise's skip", () => {
  // Two exercises in the session: row-a was just skipped by the user;
  // row-b's timer command is what triggered the revalidatePath (and hence
  // the fresh `exercises` prop) that also re-renders row-a's client state.
  const current: Record<string, SessionRowClientState> = {
    "row-a": {
      loggedSetCount: 0,
      setCountOverrideActive: false,
      isSkipped: true,
      isSkipOverrideActive: true,
      isQuickLogPending: false,
      isSkipPending: false,
      showWhenCompleted: false,
    },
    "row-b": {
      loggedSetCount: 0,
      setCountOverrideActive: false,
      isSkipped: false,
      isSkipOverrideActive: false,
      isQuickLogPending: false,
      isSkipPending: false,
      showWhenCompleted: false,
    },
  };

  const reconciled = reconcileSessionRowClientState({
    current,
    rows: [
      // row-a's server row is stale (still false) -- exactly the scenario
      // the packet flagged as "the actual reported trigger".
      { id: "row-a", loggedSetCount: 0, isSkipped: false },
      { id: "row-b", loggedSetCount: 0, isSkipped: false },
    ],
    mergedLoggedSetCount: { "row-a": 0, "row-b": 0 },
  });

  assert.equal(reconciled["row-a"]?.isSkipped, true);
  assert.equal(reconciled["row-b"]?.isSkipped, false);
});

test("skip persistence: expand/collapse (unmount/remount via the module-level cache) reconciles through the same mount-time path without losing skip", () => {
  // SessionExerciseFocus seeds its useState from `sessionExerciseLocalStateCache`
  // via reconcileSessionRowClientState on (re)mount -- e.g. navigating to
  // ExerciseInfo and back, or collapsing/expanding across a full remount.
  const cachedFromBeforeUnmount: Record<string, SessionRowClientState> = {
    "row-a": {
      loggedSetCount: 2,
      setCountOverrideActive: false,
      isSkipped: true,
      isSkipOverrideActive: true,
      isQuickLogPending: false,
      isSkipPending: false,
      showWhenCompleted: false,
    },
  };

  const reconciledOnRemount = reconcileSessionRowClientState({
    current: cachedFromBeforeUnmount,
    rows: [{ id: "row-a", loggedSetCount: 2, isSkipped: false }],
    mergedLoggedSetCount: { "row-a": 2 },
  });

  assert.equal(reconciledOnRemount["row-a"]?.isSkipped, true);
});

test("skip persistence: skipping one exercise then logging a set on a different exercise does not disturb the skipped row", () => {
  const current: Record<string, SessionRowClientState> = {
    "row-skipped": {
      loggedSetCount: 0,
      setCountOverrideActive: false,
      isSkipped: true,
      isSkipOverrideActive: true,
      isQuickLogPending: false,
      isSkipPending: false,
      showWhenCompleted: false,
    },
    "row-logged": {
      loggedSetCount: 0,
      setCountOverrideActive: false,
      isSkipped: false,
      isSkipOverrideActive: false,
      isQuickLogPending: false,
      isSkipPending: false,
      showWhenCompleted: false,
    },
  };

  // Logging a set on row-logged bumps its loggedSetCount and (via the
  // sibling effect) sets its own setCountOverrideActive -- this must have
  // zero effect on row-skipped's isSkipped.
  const reconciled = reconcileSessionRowClientState({
    current: {
      ...current,
      "row-logged": { ...current["row-logged"], loggedSetCount: 1, setCountOverrideActive: true },
    },
    rows: [
      { id: "row-skipped", loggedSetCount: 0, isSkipped: false },
      { id: "row-logged", loggedSetCount: 0, isSkipped: false },
    ],
    mergedLoggedSetCount: { "row-skipped": 0, "row-logged": 0 },
  });

  assert.equal(reconciled["row-skipped"]?.isSkipped, true);
  assert.equal(reconciled["row-logged"]?.loggedSetCount, 1);
  assert.equal(reconciled["row-logged"]?.setCountOverrideActive, true);
});

test("skip persistence: optimistic update converges to server acknowledgement and clears the override", () => {
  const initial = buildInitialSessionRowClientState([
    { id: "row-a", loggedSetCount: 0, isSkipped: false },
  ]);

  const optimistic: Record<string, SessionRowClientState> = {
    ...initial,
    "row-a": { ...initial["row-a"], isSkipped: true, isSkipOverrideActive: true, isSkipPending: true },
  };

  // Server hasn't caught up yet -- must preserve.
  const stillStale = reconcileSessionRowClientState({
    current: optimistic,
    rows: [{ id: "row-a", loggedSetCount: 0, isSkipped: false }],
    mergedLoggedSetCount: { "row-a": 0 },
  });
  assert.equal(stillStale["row-a"]?.isSkipped, true);
  assert.equal(stillStale["row-a"]?.isSkipOverrideActive, true);

  // Server acknowledgement lands: the `exercises` row now reflects true.
  const caughtUp = reconcileSessionRowClientState({
    current: stillStale,
    rows: [{ id: "row-a", loggedSetCount: 0, isSkipped: true }],
    mergedLoggedSetCount: { "row-a": 0 },
  });
  assert.equal(caughtUp["row-a"]?.isSkipped, true);
  assert.equal(caughtUp["row-a"]?.isSkipOverrideActive, false);
});

test("skip persistence: server failure/rollback reverts isSkipped and the rolled-back value survives subsequent reconciles", () => {
  const initial = buildInitialSessionRowClientState([
    { id: "row-a", loggedSetCount: 0, isSkipped: false },
  ]);

  // Optimistic set (as handleSkipToggle does before the action resolves).
  const optimistic: Record<string, SessionRowClientState> = {
    ...initial,
    "row-a": { ...initial["row-a"], isSkipped: true, isSkipOverrideActive: true, isSkipPending: true },
  };

  // Server action fails; handleSkipToggle rolls isSkipped back to
  // previousSkipped (false) but the row is still marked as a local override
  // until the exercises prop is confirmed to agree.
  const afterRollback: Record<string, SessionRowClientState> = {
    ...optimistic,
    "row-a": { ...optimistic["row-a"], isSkipped: false, isSkipOverrideActive: true, isSkipPending: false },
  };

  // An unrelated stale refresh still showing the original (never-changed)
  // server value must not disturb the rolled-back, already-correct state.
  const reconciled = reconcileSessionRowClientState({
    current: afterRollback,
    rows: [{ id: "row-a", loggedSetCount: 0, isSkipped: false }],
    mergedLoggedSetCount: { "row-a": 0 },
  });

  assert.equal(reconciled["row-a"]?.isSkipped, false);
  // Server already agrees with the rolled-back value, so the override
  // clears immediately -- there is nothing left to protect.
  assert.equal(reconciled["row-a"]?.isSkipOverrideActive, false);
});

test("skip persistence: a genuinely newer legitimate server state still reconciles once the override has converged (not a permanent one-way door)", () => {
  const initial = buildInitialSessionRowClientState([
    { id: "row-a", loggedSetCount: 0, isSkipped: false },
  ]);

  // Local toggle to skipped, with override active.
  const toggled: Record<string, SessionRowClientState> = {
    ...initial,
    "row-a": { ...initial["row-a"], isSkipped: true, isSkipOverrideActive: true },
  };

  // Stale server row still says false -- must be preserved (this is the bug fix).
  const stale = reconcileSessionRowClientState({
    current: toggled,
    rows: [{ id: "row-a", loggedSetCount: 0, isSkipped: false }],
    mergedLoggedSetCount: { "row-a": 0 },
  });
  assert.equal(stale["row-a"]?.isSkipped, true);

  // Server catches up to our own write -- override converges and clears.
  const converged = reconcileSessionRowClientState({
    current: stale,
    rows: [{ id: "row-a", loggedSetCount: 0, isSkipped: true }],
    mergedLoggedSetCount: { "row-a": 0 },
  });
  assert.equal(converged["row-a"]?.isSkipped, true);
  assert.equal(converged["row-a"]?.isSkipOverrideActive, false);

  // NOW a genuinely new, independent server-side change arrives (e.g. a
  // real routine/session mutation from another device or admin action) --
  // since the override is no longer active, this must be allowed through
  // rather than being permanently stuck on the old local value.
  const genuinelyNewer = reconcileSessionRowClientState({
    current: converged,
    rows: [{ id: "row-a", loggedSetCount: 0, isSkipped: false }],
    mergedLoggedSetCount: { "row-a": 0 },
  });
  assert.equal(genuinelyNewer["row-a"]?.isSkipped, false);
  assert.equal(genuinelyNewer["row-a"]?.isSkipOverrideActive, false);
});
