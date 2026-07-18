import assert from "node:assert/strict";
import test from "node:test";
import {
  collectPositiveMemberNumberGaps,
  deriveAssignedMemberIdentity,
  getMemberNumberSafetyFatalReasons,
  hasMemberIdentityChanged,
  MAX_REPORTED_MEMBER_NUMBER_GAPS,
  summarizeMemberNumberSafety,
  summarizePositiveMemberNumberGaps,
} from "./member-number-safety-core.mjs";

const ASSIGNED_AT = "2026-01-01T00:00:00.000Z";

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
  assert.equal(summary.maxReservedNumber, 3);
  assert.equal(summary.minimumSafeNextNumber, 4);
  assert.equal(summary.positiveGapCount, 1);
  assert.equal(summary.positiveGapsTruncated, false);
  assert.equal(summary.reservedNumberHighWaterError, null);
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
  assert.equal(summary.maxReservedNumber, 9);
  assert.equal(summary.minimumSafeNextNumber, null);
  assert.equal(summary.reservedNumberHighWaterError, "invalid-reserved-number");
  assert.equal(summary.zeroCount, 2);
});

test("legacy unknown and numbered automation profiles reserve the all-profile high-water", () => {
  const unknownHigh = summarizeMemberNumberSafety([
    { user_kind: "human", user_number: 12 },
    { user_kind: "unknown", user_number: 80 },
  ]);
  assert.equal(unknownHigh.maxReservedNumber, 80);
  assert.equal(unknownHigh.minimumSafeNextNumber, 81);
  assert.equal(unknownHigh.unknownProfilesWithNumbers.length, 1);

  const automationHigh = summarizeMemberNumberSafety([
    { user_kind: "human", user_number: 12 },
    { user_kind: "automation", user_number: 90 },
  ]);
  assert.equal(automationHigh.maxReservedNumber, 90);
  assert.equal(automationHigh.minimumSafeNextNumber, 91);
  assert.equal(automationHigh.automationProfilesWithNumbers.length, 1);
});

test("mixed profile categories reserve numbers before gap analysis", () => {
  const summary = summarizeMemberNumberSafety([
    { user_kind: "human", user_number: 0 },
    { user_kind: "human", user_number: 3 },
    { user_kind: "unknown", user_number: 4 },
    { user_kind: "automation", user_number: 5 },
  ]);

  assert.equal(summary.maxReservedNumber, 5);
  assert.equal(summary.minimumSafeNextNumber, 6);
  assert.deepEqual(summary.positiveGaps, [1, 2]);
  assert.equal(summary.positiveGapCount, 2);
  assert.equal(summary.unknownProfilesWithNumbers.length, 1);
  assert.equal(summary.automationProfilesWithNumbers.length, 1);
});

test("zero-only and empty profile sets have deterministic safe successors", () => {
  const zeroOnly = summarizeMemberNumberSafety([
    { user_kind: "human", user_number: 0 },
  ]);
  assert.equal(zeroOnly.maxReservedNumber, 0);
  assert.equal(zeroOnly.minimumSafeNextNumber, 1);

  const empty = summarizeMemberNumberSafety([]);
  assert.equal(empty.maxReservedNumber, null);
  assert.equal(empty.minimumSafeNextNumber, 1);
  assert.equal(empty.reservedNumberHighWaterError, null);
});

test("duplicate high values remain invalid while reserving their high-water", () => {
  const summary = summarizeMemberNumberSafety([
    { user_kind: "human", user_number: 51 },
    { user_kind: "unknown", user_number: 51 },
  ]);

  assert.deepEqual(summary.duplicateNumbers, [{ number: 51, count: 2 }]);
  assert.equal(summary.maxReservedNumber, 51);
  assert.equal(summary.minimumSafeNextNumber, 52);
});

test("invalid and unsafe reserved values fail closed", () => {
  const invalid = summarizeMemberNumberSafety([
    { user_kind: "human", user_number: -1 },
    { user_kind: "unknown", user_number: 2.5 },
    { user_kind: "unknown", user_number: Number.MAX_SAFE_INTEGER + 1 },
    { user_kind: "human", user_number: 10 },
  ]);
  assert.deepEqual(invalid.invalidReservedNumbers, [-1, 2.5, Number.MAX_SAFE_INTEGER + 1]);
  assert.equal(invalid.maxReservedNumber, 10);
  assert.equal(invalid.minimumSafeNextNumber, null);
  assert.equal(invalid.positiveGapCount, null);
  assert.deepEqual(invalid.positiveGaps, []);
  assert.equal(invalid.reservedNumberHighWaterError, "invalid-reserved-number");

  const noSafeSuccessor = summarizeMemberNumberSafety([
    { user_kind: "unknown", user_number: Number.MAX_SAFE_INTEGER },
  ]);
  assert.equal(noSafeSuccessor.maxReservedNumber, Number.MAX_SAFE_INTEGER);
  assert.equal(noSafeSuccessor.minimumSafeNextNumber, null);
  assert.equal(noSafeSuccessor.positiveGapCount, null);
  assert.equal(noSafeSuccessor.reservedNumberHighWaterError, "safe-integer-successor-unavailable");
});

test("every invalid JavaScript numeric class fails closed without gap enumeration", () => {
  for (const invalidNumber of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    2.5,
    -1,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    const summary = summarizeMemberNumberSafety([
      { user_kind: "human", user_number: 0 },
      { user_kind: "unknown", user_number: invalidNumber },
    ]);

    assert.equal(summary.reservedNumberHighWaterError, "invalid-reserved-number");
    assert.equal(summary.minimumSafeNextNumber, null);
    assert.equal(summary.positiveGapCount, null);
    assert.deepEqual(summary.positiveGaps, []);
  }

  const maximum = summarizeMemberNumberSafety([
    { user_kind: "human", user_number: 0 },
    { user_kind: "unknown", user_number: Number.MAX_SAFE_INTEGER },
  ]);
  assert.equal(maximum.reservedNumberHighWaterError, "safe-integer-successor-unavailable");
  assert.equal(maximum.minimumSafeNextNumber, null);
  assert.equal(maximum.positiveGapCount, null);
  assert.deepEqual(maximum.positiveGaps, []);
});

test("large sparse safe numbers produce bounded deterministic gap evidence", () => {
  const largeReservedNumber = Number.MAX_SAFE_INTEGER - 1;
  const summary = summarizeMemberNumberSafety([
    { user_kind: "human", user_number: 0 },
    { user_kind: "human", user_number: largeReservedNumber },
  ]);

  assert.equal(summary.reservedNumberHighWaterError, null);
  assert.equal(summary.minimumSafeNextNumber, Number.MAX_SAFE_INTEGER);
  assert.equal(summary.positiveGapCount, largeReservedNumber - 1);
  assert.equal(summary.positiveGaps.length, MAX_REPORTED_MEMBER_NUMBER_GAPS);
  assert.deepEqual(summary.positiveGaps.slice(0, 3), [1, 2, 3]);
  assert.equal(summary.positiveGaps.at(-1), MAX_REPORTED_MEMBER_NUMBER_GAPS);
  assert.equal(summary.positiveGapsTruncated, true);

  const gapSummary = summarizePositiveMemberNumberGaps([largeReservedNumber]);
  assert.equal(gapSummary.gapCount, largeReservedNumber - 1);
  assert.equal(gapSummary.reportedGaps.length, MAX_REPORTED_MEMBER_NUMBER_GAPS);
  assert.equal(gapSummary.truncated, true);
  assert.equal(collectPositiveMemberNumberGaps([largeReservedNumber]).length, MAX_REPORTED_MEMBER_NUMBER_GAPS);
});

test("normal current 0 through 52 state reports 53 without filling gaps", () => {
  const profiles = Array.from({ length: 53 }, (_, userNumber) => ({
    user_kind: "human",
    user_number: userNumber,
    user_number_assigned_at: ASSIGNED_AT,
  }));
  const summary = summarizeMemberNumberSafety(profiles);

  assert.equal(summary.maxReservedNumber, 52);
  assert.equal(summary.minimumSafeNextNumber, 53);
  assert.equal(summary.positiveGapCount, 0);
  assert.deepEqual(summary.positiveGaps, []);
  assert.equal(summary.positiveGapsTruncated, false);
  assert.deepEqual(summary.duplicateNumbers, []);
  assert.equal(summary.hasExactlyOneHumanZero, true);
  assert.equal(summary.reservedZeroAssignmentMetadataPresent, true);
  assert.deepEqual(getMemberNumberSafetyFatalReasons(summary), []);
});

test("shared fatal reasons cover doctor pass and every member-number failure class", () => {
  const valid = summarizeMemberNumberSafety(
    Array.from({ length: 53 }, (_, userNumber) => ({
      user_kind: "human",
      user_number: userNumber,
      user_number_assigned_at: ASSIGNED_AT,
    })),
  );
  assert.deepEqual(getMemberNumberSafetyFatalReasons(valid), []);

  const cases = [
    [summarizeMemberNumberSafety([]), "invalid-zero-count"],
    [summarizeMemberNumberSafety([
      { user_kind: "human", user_number: 0, user_number_assigned_at: ASSIGNED_AT },
      { user_kind: "automation", user_number: 4 },
    ]), "numbered-automation-profile"],
    [summarizeMemberNumberSafety([
      { user_kind: "human", user_number: 0, user_number_assigned_at: ASSIGNED_AT },
      { user_kind: "unknown", user_number: 4 },
    ]), "numbered-unknown-profile"],
    [summarizeMemberNumberSafety([
      { user_kind: "human", user_number: 0, user_number_assigned_at: ASSIGNED_AT },
      { user_kind: "human", user_number: 4 },
      { user_kind: "human", user_number: 4 },
    ]), "duplicate-member-number"],
    [summarizeMemberNumberSafety([
      { user_kind: "human", user_number: 0, user_number_assigned_at: ASSIGNED_AT },
      { user_kind: "human", user_number: -1 },
    ]), "negative-human-member-number"],
    [summarizeMemberNumberSafety([
      { user_kind: "human", user_number: 0, user_number_assigned_at: ASSIGNED_AT },
      { user_kind: "unknown", user_number: Number.NaN },
    ]), "reserved-number-high-water:invalid-reserved-number"],
  ];

  for (const [summary, expectedReason] of cases) {
    assert.ok(getMemberNumberSafetyFatalReasons(summary).includes(expectedReason));
  }

  assert.ok(getMemberNumberSafetyFatalReasons({
    ...valid,
    minimumSafeNextNumber: null,
  }).includes("minimum-safe-next-number-unavailable"));
});

test("shared fatal reasons require exact human #0 assignment metadata", () => {
  const missingMetadata = summarizeMemberNumberSafety([
    { user_kind: "human", user_number: 0, user_number_assigned_at: null },
  ]);
  assert.equal(missingMetadata.hasExactlyOneHumanZero, true);
  assert.equal(missingMetadata.reservedZeroAssignmentMetadataPresent, false);
  assert.ok(getMemberNumberSafetyFatalReasons(missingMetadata).includes(
    "reserved-zero-assignment-metadata-missing",
  ));

  const nonHumanZero = summarizeMemberNumberSafety([
    { user_kind: "unknown", user_number: 0, user_number_assigned_at: ASSIGNED_AT },
  ]);
  assert.equal(nonHumanZero.hasExactlyOneHumanZero, false);
  assert.ok(getMemberNumberSafetyFatalReasons(nonHumanZero).includes("invalid-zero-human-reservation"));
});

test("shared fatal reasons make audit inputs fail for missing #0 and every numbered nonhuman kind", () => {
  assert.ok(getMemberNumberSafetyFatalReasons(summarizeMemberNumberSafety([])).includes("invalid-zero-count"));

  for (const userKind of ["unknown", null, "future-kind"]) {
    const summary = summarizeMemberNumberSafety([
      { user_kind: "human", user_number: 0, user_number_assigned_at: ASSIGNED_AT },
      { user_kind: userKind, user_number: 7, user_number_assigned_at: ASSIGNED_AT },
    ]);
    assert.ok(getMemberNumberSafetyFatalReasons(summary).includes("numbered-unknown-profile"));
  }
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
