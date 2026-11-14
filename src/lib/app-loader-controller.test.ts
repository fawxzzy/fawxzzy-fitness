import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import {
  acquireLoaderWait,
  getLoaderWaitCount,
  getLoaderWaitLabel,
  resetLoaderWaitsForTests,
  subscribeLoaderWaits,
} from "@/lib/app-loader-controller";

beforeEach(() => {
  resetLoaderWaitsForTests();
});

test("waits are counted while registered and released exactly once", () => {
  assert.equal(getLoaderWaitCount(), 0);
  assert.equal(getLoaderWaitLabel(), "");

  const releaseA = acquireLoaderWait("Opening Fitness");
  const releaseB = acquireLoaderWait("Loading tab...");
  assert.equal(getLoaderWaitCount(), 2);
  assert.equal(getLoaderWaitLabel(), "Loading tab...", "the most recent wait is announced");

  releaseB();
  releaseB();
  assert.equal(getLoaderWaitCount(), 1);
  assert.equal(getLoaderWaitLabel(), "Opening Fitness");

  releaseA();
  assert.equal(getLoaderWaitCount(), 0);
  assert.equal(getLoaderWaitLabel(), "");
});

test("a wait that moves between route segments is one continuous wait", () => {
  // loading.tsx of the old segment unmounts and the next mounts in the same commit: never a gap of zero for a listener
  // that reads after the commit, because the new registration happens before the old release is observed.
  const seen: number[] = [];
  const unsubscribe = subscribeLoaderWaits(() => seen.push(getLoaderWaitCount()));
  const first = acquireLoaderWait("a");
  const second = acquireLoaderWait("b");
  first();
  second();
  unsubscribe();
  assert.deepEqual(seen, [1, 2, 1, 0]);
});

test("subscribers are notified on acquire and release and can unsubscribe", () => {
  let calls = 0;
  const unsubscribe = subscribeLoaderWaits(() => {
    calls += 1;
  });
  const release = acquireLoaderWait("x");
  release();
  assert.equal(calls, 2);
  unsubscribe();
  acquireLoaderWait("y")();
  assert.equal(calls, 2);
});
