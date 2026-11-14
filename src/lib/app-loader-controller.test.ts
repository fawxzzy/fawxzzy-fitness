import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { LOADER_WAIT_CEILING_MS, createLoaderMachine, stepLoader, LOADER_MIN_HOLD_MS } from "@/lib/app-loader";
import {
  acquireLoaderWait,
  getLiveLoaderWaitCount,
  getLiveLoaderWaitLabel,
  getLoaderWaitCount,
  resetLoaderWaitsForTests,
  subscribeLoaderWaits,
  takeStaleLoaderWaits,
} from "@/lib/app-loader-controller";

const CEILING = LOADER_WAIT_CEILING_MS;

beforeEach(() => {
  resetLoaderWaitsForTests();
});

test("waits are counted while registered and released exactly once", () => {
  assert.equal(getLoaderWaitCount(), 0);
  assert.equal(getLiveLoaderWaitLabel(0, CEILING), "");

  const releaseA = acquireLoaderWait("Opening Fitness", 0);
  const releaseB = acquireLoaderWait("Loading tab...", 0);
  assert.equal(getLoaderWaitCount(), 2);
  assert.equal(getLiveLoaderWaitLabel(0, CEILING), "Loading tab...", "the most recent wait is announced");

  releaseB();
  releaseB();
  assert.equal(getLoaderWaitCount(), 1);
  assert.equal(getLiveLoaderWaitLabel(0, CEILING), "Opening Fitness");

  releaseA();
  assert.equal(getLoaderWaitCount(), 0);
  assert.equal(getLiveLoaderWaitLabel(0, CEILING), "");
});

test("a wait that moves between route segments is one continuous wait", () => {
  // loading.tsx of the old segment unmounts and the next mounts in the same commit: never a gap of zero for a listener
  // that reads after the commit, because the new registration happens before the old release is observed.
  const seen: number[] = [];
  const unsubscribe = subscribeLoaderWaits(() => seen.push(getLoaderWaitCount()));
  const first = acquireLoaderWait("a", 0);
  const second = acquireLoaderWait("b", 0);
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
  const release = acquireLoaderWait("x", 0);
  release();
  assert.equal(calls, 2);
  unsubscribe();
  acquireLoaderWait("y", 0)();
  assert.equal(calls, 2);
});

test("a wait older than the ceiling stops holding the loader, and is reported exactly once", () => {
  const stuck = acquireLoaderWait("Checking install state", 1000);
  const fresh = acquireLoaderWait("Loading tab...", 10_000);

  assert.equal(getLiveLoaderWaitCount(1000 + CEILING - 1, CEILING), 2);
  assert.deepEqual(takeStaleLoaderWaits(1000 + CEILING - 1, CEILING), []);

  assert.equal(getLiveLoaderWaitCount(1000 + CEILING, CEILING), 1, "the stuck wait no longer counts at the ceiling");
  assert.equal(getLiveLoaderWaitLabel(1000 + CEILING, CEILING), "Loading tab...");
  assert.deepEqual(takeStaleLoaderWaits(1000 + CEILING, CEILING), [{ label: "Checking install state", ageMs: CEILING }]);
  assert.deepEqual(takeStaleLoaderWaits(1000 + CEILING + 500, CEILING), [], "reported once");
  assert.equal(getLoaderWaitCount(), 2, "the registry still holds it until its screen unmounts");

  assert.equal(getLiveLoaderWaitCount(10_000 + CEILING, CEILING), 0, "nothing live: the loader may leave");
  assert.equal(getLiveLoaderWaitLabel(10_000 + CEILING, CEILING), "");

  stuck();
  fresh();
  assert.equal(getLoaderWaitCount(), 0);
});

test("a stuck wait lets the pure timeline fade out and does not bring the loader back", () => {
  acquireLoaderWait("never resolves", 0);
  let machine = createLoaderMachine();
  let sawFadeOut = false;
  let lastAlpha = 1;
  for (let t = 0; t <= CEILING + 2000; t += 16) {
    const active = getLiveLoaderWaitCount(t, CEILING) > 0;
    const frame = stepLoader(machine, active, t, false);
    machine = frame.machine;
    if (machine.phase === "fading-out") {
      sawFadeOut = true;
    }
    if (t > 600 && t < CEILING) {
      assert.equal(frame.alpha, 1, "the loader stays up until the ceiling");
    }
    lastAlpha = frame.alpha;
  }
  assert.equal(sawFadeOut, true);
  assert.equal(lastAlpha, 0, "gone after the ceiling");
  assert.equal(machine.phase, "idle");
  assert.ok(CEILING > LOADER_MIN_HOLD_MS);
});
