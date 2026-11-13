import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const focusSource = readFileSync(new URL("./SessionExerciseFocus.tsx", import.meta.url), "utf8");
const syncHookSource = readFileSync(new URL("./session/useSessionSetLogSync.ts", import.meta.url), "utf8");

test("collapsed-row quick log goes through the offline set-log queue route, not a bare addSetAction call", () => {
  assert.match(focusSource, /import \{ enqueueSetLog \} from "@\/lib\/offline\/set-log-queue"/);
  assert.match(focusSource, /submitQuickLogSet\(\{/);
  assert.match(focusSource, /enqueue: \(\) => enqueueSetLog\(\{/);
  assert.match(focusSource, /payload: toOfflineSetPayload\(quickLogPayload\)/);
  assert.match(focusSource, /markSnapshotSetQueued\(/);

  // The server action is only reachable through submitQuickLogSet's addSet callback (the single call site).
  const addSetActionCalls = focusSource.match(/addSetAction\(/g) ?? [];
  assert.equal(addSetActionCalls.length, 1);
  assert.match(focusSource, /addSet: \(\) => addSetAction\(\{/);
});

test("quick log reuses the expanded logger's dedupe key (the optimistic set's clientLogId)", () => {
  assert.match(focusSource, /const clientLogId = createStableSetId\(\);/);
  assert.match(focusSource, /clientLogId,\r?\n\s+\}\),\r?\n\s+enqueue:/);
  assert.match(focusSource, /sessionExerciseId: exercise\.id,\r?\n\s+clientLogId,\r?\n\s+createdAt: loggedAtIso,\r?\n\s+payload: toOfflineSetPayload/);
  // FF-SESSION-005: the queued set keeps the tap time even when the request only failed after a delay.
  assert.match(focusSource, /const loggedAtIso = new Date\(\)\.toISOString\(\);/);
  assert.match(focusSource, /logged_at: loggedAtIso,/);
});

test("a session-level set-log worker covers the state where every row is collapsed", () => {
  assert.match(focusSource, /useSessionSetLogSync\(\{/);
  assert.match(focusSource, /shouldRunSessionSetLogSync\(\{/);
  assert.match(focusSource, /syncSetLogsAction: syncQueuedSetLogsAction/);

  assert.match(syncHookSource, /createSetLogSyncEngine\(/);
  assert.match(syncHookSource, /if \(!enabled\) \{/);
  assert.match(syncHookSource, /engine\.start\(\)/);
  assert.match(syncHookSource, /engine\.stop\(\)/);
});

test("cold start restores queued sets into collapsed rows, independent of which engine owns the replay", () => {
  assert.match(focusSource, /seedQueuedSetsIntoSnapshots\(current, queued, serverSetsFor\)/);
  assert.match(focusSource, /applySyncedItemToSnapshotMap\(current, item, serverSetId, userId, serverSetsFor\)/);
  // The one-time read is keyed on the user only: it must not wait for `enabled` (an expanded row owns the engine).
  assert.match(syncHookSource, /void readPendingSetLogs\(userId\)\s*\.then\(\(queued\) => \{[\s\S]*?\}, \[userId\]\);/);
});

test("the set-log replay engine is bounded, caught and stoppable", () => {
  const engineSource = readFileSync(new URL("../lib/offline/sync-engine.ts", import.meta.url), "utf8");

  assert.match(engineSource, /try \{\s*const response = await replayWithTimeout\(/);
  assert.match(engineSource, /let stopped = false;/);
  assert.match(engineSource, /if \(stopped \|\| timer !== null/);
  assert.match(engineSource, /const inFlightItemIds = new Set<string>\(\);/);
  assert.match(engineSource, /isSetLogQueueItemParked\(/);
  assert.match(engineSource, /Promise\.race\(\[syncSetLogsAction\(payload\), timeout\]\)/);
  assert.match(engineSource, /Number\.isFinite\(queuedItem\.retryCount\)/);
  assert.match(engineSource, /retryCount: 0, nextRetryAt: undefined/);
});

test("a parked set is never silent: both the card engine and the session worker report it", () => {
  const timersSource = readFileSync(new URL("./SessionTimers.tsx", import.meta.url), "utf8");

  for (const source of [timersSource, syncHookSource]) {
    assert.match(source, /onTerminalFailure: \(\) => \{/);
    assert.match(source, /Could not sync a saved set\. It stays saved on this device\./);
    assert.match(source, /onUnexpectedError: \(\) => \{/);
  }
});

test("a collapsed row takes the server identity of a set replayed by another row's card engine", () => {
  // The session worker listens to every replay in the tab, not only to the ones its own engine ran.
  assert.match(syncHookSource, /subscribeToSetLogSynced\(\(payload\) => \{\s*onItemSyncedRef\.current\(payload\);/);
});
