import assert from "node:assert/strict";
import test from "node:test";
import {
  consumeInstallEarnedMoment,
  readInstallEarnedMoment,
  recordInstallReturnVisit,
  writeInstallEarnedMoment,
} from "./earned-install-prompt.ts";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

test("earned install moment stores and consumes supported values", () => {
  const storage = createStorage();
  writeInstallEarnedMoment("workout-completed", storage);
  assert.equal(readInstallEarnedMoment(storage), "workout-completed");
  assert.equal(consumeInstallEarnedMoment(storage), "workout-completed");
  assert.equal(readInstallEarnedMoment(storage), null);
});

test("stable return is earned once after three distinct local visit days", () => {
  const storage = createStorage();
  assert.equal(recordInstallReturnVisit({ now: new Date("2026-07-01T12:00:00Z"), storage }), null);
  assert.equal(recordInstallReturnVisit({ now: new Date("2026-07-01T20:00:00Z"), storage }), null);
  assert.equal(recordInstallReturnVisit({ now: new Date("2026-07-03T12:00:00Z"), storage }), null);
  assert.equal(recordInstallReturnVisit({ now: new Date("2026-07-08T12:00:00Z"), storage }), "stable-return");
  assert.equal(recordInstallReturnVisit({ now: new Date("2026-07-09T12:00:00Z"), storage }), null);
});
