import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSessionDraftStorageKey,
  buildTodayCacheDbKey,
  buildTodayCacheStorageKey,
  isOfflineSnapshotStale,
} from "./client-storage.ts";

test("offline storage keys are user-scoped", () => {
  assert.notEqual(buildTodayCacheStorageKey("user-1"), buildTodayCacheStorageKey("user-2"));
  assert.notEqual(buildTodayCacheDbKey("user-1"), buildTodayCacheDbKey("user-2"));
  assert.notEqual(
    buildSessionDraftStorageKey("user-1", "session-1", "exercise-1"),
    buildSessionDraftStorageKey("user-2", "session-1", "exercise-1"),
  );
});

test("offline snapshot staleness rejects missing and expired timestamps", () => {
  assert.equal(isOfflineSnapshotStale(null, 1000), true);
  assert.equal(isOfflineSnapshotStale(Date.now() - 5000, 1000), true);
  assert.equal(isOfflineSnapshotStale(Date.now(), 1000), false);
});
