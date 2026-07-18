import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPositiveMemberNumberGaps,
  deriveAssignedMemberIdentity,
  hasMemberIdentityChanged,
  summarizeMemberNumberSafety,
} from "./member-number-safety-core.mjs";

test("permanent positive gaps are valid safety information", () => {
  const summary = summarizeMemberNumberSafety([
    { user_kind: "human", user_number: 0 },
    { user_kind: "human", user_number: 1 },
    { user_kind: "human", user_number: 3 },
    { user_kind: "automation", user_number: null },
  ]);

  assert.deepEqual(summary.positiveGaps, [2]);
  assert.deepEqual(summary.duplicateNumbers, []);
  assert.deepEqual(summary.negativeHumanNumbers, []);
  assert.equal(summary.automationProfilesWithNumbers.length, 0);
  assert.equal(summary.zeroCount, 1);
  assert.deepEqual(collectPositiveMemberNumberGaps([5, 1, 3, 5]), [2, 4]);
});

test("duplicates, negatives, multiple zero, and numbered automation remain invalid", () => {
  const summary = summarizeMemberNumberSafety([
    { user_kind: "human", user_number: 0 },
    { user_kind: "unknown", user_number: 0 },
    { user_kind: "human", user_number: -2 },
    { user_kind: "human", user_number: 4 },
    { user_kind: "unknown", user_number: 4 },
    { user_kind: "automation", user_number: 9 },
  ]);

  assert.deepEqual(summary.duplicateNumbers, [
    { number: 0, count: 2 },
    { number: 4, count: 2 },
  ]);
  assert.deepEqual(summary.negativeHumanNumbers, [-2]);
  assert.equal(summary.automationProfilesWithNumbers.length, 1);
  assert.equal(summary.zeroCount, 2);
});

test("member identity permits same-value updates and rejects any identity change", () => {
  const original = {
    user_number: 12,
    user_kind: "human",
    user_number_assigned_at: "2026-01-01T00:00:00.000Z",
  };

  assert.equal(hasMemberIdentityChanged(original, { ...original }), false);
  assert.equal(hasMemberIdentityChanged(original, { ...original, user_number: 13 }), true);
  assert.equal(hasMemberIdentityChanged(original, { ...original, user_kind: "automation" }), true);
  assert.equal(hasMemberIdentityChanged(original, { ...original, user_number_assigned_at: null }), true);
});

test("assignment ignores supplied human identity and leaves automation unnumbered", () => {
  assert.deepEqual(
    deriveAssignedMemberIdentity({
      isAutomation: false,
      nextNumber: 53,
      assignedAt: "2026-07-18T00:00:00.000Z",
      supplied: { user_number: 2, user_kind: "unknown", user_number_assigned_at: "old" },
    }),
    {
      user_number: 53,
      user_kind: "human",
      user_number_assigned_at: "2026-07-18T00:00:00.000Z",
    },
  );
  assert.deepEqual(
    deriveAssignedMemberIdentity({
      isAutomation: true,
      nextNumber: 53,
      assignedAt: "2026-07-18T00:00:00.000Z",
      supplied: { user_number: 7, user_kind: "human", user_number_assigned_at: "old" },
    }),
    {
      user_number: null,
      user_kind: "automation",
      user_number_assigned_at: null,
    },
  );
});
