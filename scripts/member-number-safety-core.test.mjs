import assert from "node:assert/strict";
import test from "node:test";
import {
  collectCompleteMemberNumberProfileRows,
  collectPositiveMemberNumberGaps,
  deriveAssignedMemberIdentity,
  getMemberNumberSafetyFatalReasons,
  hasMemberIdentityChanged,
  loadCompleteMemberNumberSafety,
  MAX_REPORTED_MEMBER_NUMBER_GAPS,
  MEMBER_NUMBER_PROFILE_PAGE_SIZE,
  MEMBER_NUMBER_PROFILE_SELECT,
  summarizeMemberNumberSafety,
  summarizePositiveMemberNumberGaps,
} from "./member-number-safety-core.mjs";

const ASSIGNED_AT = "2026-01-01T00:00:00.000Z";

function buildProfiles(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `profile-${String(index).padStart(6, "0")}`,
    user_kind: "human",
    user_number: index,
    user_number_assigned_at: ASSIGNED_AT,
  }));
}

function createPageFetcher(rows, override = () => null) {
  let requestIndex = 0;
  const calls = [];
  return {
    calls,
    fetchPage: async ({ afterProfileId, pageSize }) => {
      const call = { afterProfileId, pageSize, requestIndex };
      calls.push(call);
      const replacement = override(call);
      requestIndex += 1;
      const availableRows = afterProfileId === null
        ? rows
        : rows.filter((row) => row.id > afterProfileId);
      return replacement ?? {
        count: rows.length,
        data: availableRows.slice(0, pageSize),
        error: null,
      };
    },
  };
}

function createProfileClient(rows, calls) {
  return {
    from(table) {
      const call = { table };
      calls.push(call);
      const builder = {
        gt(column, value) {
          call.gt = { column, value };
          return builder;
        },
        limit(value) {
          call.limit = value;
          return builder;
        },
        order(column, options) {
          call.order = { column, options };
          return builder;
        },
        select(columns, options) {
          call.select = { columns, options };
          return builder;
        },
        then(resolve, reject) {
          const isCountRequest = call.select?.options?.head === true;
          const availableRows = call.gt
            ? rows.filter((row) => row.id > call.gt.value)
            : rows;
          const result = isCountRequest
            ? { count: rows.length, data: null, error: null }
            : {
              count: null,
              data: availableRows.slice(0, call.limit),
              error: null,
            };
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

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

test("shared fatal reasons reject every human profile without a member number", () => {
  for (const missingNumber of [null, undefined]) {
    const summary = summarizeMemberNumberSafety([
      { user_kind: "human", user_number: 0, user_number_assigned_at: ASSIGNED_AT },
      { user_kind: "human", user_number: missingNumber, user_number_assigned_at: ASSIGNED_AT },
    ]);

    assert.equal(summary.humanProfilesMissingNumberCount, 1);
    assert.ok(getMemberNumberSafetyFatalReasons(summary).includes("human-member-number-missing"));
  }

  const multipleMissing = summarizeMemberNumberSafety([
    { user_kind: "human", user_number: 0, user_number_assigned_at: ASSIGNED_AT },
    { user_kind: "human", user_number: null, user_number_assigned_at: ASSIGNED_AT },
    { user_kind: "human", user_number: undefined, user_number_assigned_at: null },
  ]);
  assert.equal(multipleMissing.humanProfilesMissingNumberCount, 2);

  const valid = summarizeMemberNumberSafety([
    { user_kind: "human", user_number: 0, user_number_assigned_at: ASSIGNED_AT },
    { user_kind: "human", user_number: 7, user_number_assigned_at: ASSIGNED_AT },
    { user_kind: "automation", user_number: null, user_number_assigned_at: null },
  ]);
  assert.equal(valid.humanProfilesMissingNumberCount, 0);
  assert.deepEqual(getMemberNumberSafetyFatalReasons(valid), []);
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

test("complete profile pagination reads every row with exact stable evidence", async () => {
  const profiles = buildProfiles(1_201);
  const calls = [];
  const report = await loadCompleteMemberNumberSafety(
    createProfileClient(profiles, calls),
    { pageSize: 500 },
  );

  assert.equal(report.exactCount, 1_201);
  assert.equal(report.dataPageCount, 3);
  assert.equal(report.requestCount, 4);
  assert.equal(report.rows.length, 1_201);
  assert.deepEqual(report.fatalReasons, []);
  const countCalls = calls.filter((call) => call.select.options?.head === true);
  const pageCalls = calls.filter((call) => call.select.options?.head !== true);
  assert.equal(countCalls.length, 4);
  assert.equal(pageCalls.length, 4);
  assert.deepEqual(pageCalls.map((call) => call.gt?.value ?? null), [
    null,
    "profile-000499",
    "profile-000999",
    "profile-001200",
  ]);
  assert.ok(calls.every((call) => call.table === "profiles"));
  assert.ok(calls.every((call) => call.select.columns === MEMBER_NUMBER_PROFILE_SELECT));
  assert.ok(countCalls.every((call) => call.select.options.count === "exact"));
  assert.ok(countCalls.every((call) => call.select.options.head === true));
  assert.ok(pageCalls.every((call) => call.order.column === "id"));
  assert.ok(pageCalls.every((call) => call.order.options.ascending === true));
  assert.ok(pageCalls.every((call) => call.limit === 500));
  assert.ok(pageCalls.every((call) => !("range" in call) && !("offset" in call)));
  assert.ok(pageCalls.slice(1).every((call) => call.gt.column === "id"));
});

test("complete profile pagination handles exact pages, final short pages, and empty denominators", async () => {
  const exactProfiles = buildProfiles(1_000);
  const exactFetcher = createPageFetcher(exactProfiles);
  const exact = await collectCompleteMemberNumberProfileRows(exactFetcher.fetchPage, { pageSize: 500 });
  assert.equal(exact.exactCount, 1_000);
  assert.equal(exact.dataPageCount, 2);
  assert.equal(exact.requestCount, 3);

  const shortProfiles = buildProfiles(1_001);
  const shortFetcher = createPageFetcher(shortProfiles);
  const short = await collectCompleteMemberNumberProfileRows(shortFetcher.fetchPage, { pageSize: 500 });
  assert.equal(short.exactCount, 1_001);
  assert.equal(short.dataPageCount, 3);
  assert.equal(short.requestCount, 4);

  const emptyFetcher = createPageFetcher([]);
  const empty = await collectCompleteMemberNumberProfileRows(emptyFetcher.fetchPage);
  assert.equal(empty.exactCount, 0);
  assert.equal(empty.dataPageCount, 0);
  assert.equal(empty.requestCount, 1);
  assert.deepEqual(empty.rows, []);
});

test("complete profile pagination includes safety violations after the first thousand rows", async () => {
  const profiles = buildProfiles(1_001);
  profiles[1_000] = {
    ...profiles[1_000],
    user_kind: "unknown",
  };
  const calls = [];
  const report = await loadCompleteMemberNumberSafety(
    createProfileClient(profiles, calls),
    { pageSize: MEMBER_NUMBER_PROFILE_PAGE_SIZE },
  );

  assert.equal(report.rows.length, 1_001);
  assert.ok(report.fatalReasons.includes("numbered-unknown-profile"));
  assert.equal(report.summary.unknownProfilesWithNumbers.length, 1);
  assert.equal(JSON.stringify(report.summary).includes("profile-"), false);
});

test("complete profile pagination rejects duplicate, non-increasing, and repeated page identities", async () => {
  const duplicateProfiles = buildProfiles(501);
  duplicateProfiles[500] = { ...duplicateProfiles[500], id: duplicateProfiles[499].id };
  const duplicateFetcher = createPageFetcher(duplicateProfiles, ({ requestIndex }) => (
    requestIndex === 1
      ? { count: duplicateProfiles.length, data: [duplicateProfiles[500]], error: null }
      : null
  ));
  await assert.rejects(
    collectCompleteMemberNumberProfileRows(duplicateFetcher.fetchPage, { pageSize: 500 }),
    /ids are not strictly increasing/u,
  );

  const nonIncreasingProfiles = buildProfiles(501);
  nonIncreasingProfiles[500] = { ...nonIncreasingProfiles[500], id: "profile-000100" };
  const nonIncreasingFetcher = createPageFetcher(nonIncreasingProfiles, ({ requestIndex }) => (
    requestIndex === 1
      ? { count: nonIncreasingProfiles.length, data: [nonIncreasingProfiles[500]], error: null }
      : null
  ));
  await assert.rejects(
    collectCompleteMemberNumberProfileRows(nonIncreasingFetcher.fetchPage, { pageSize: 500 }),
    /ids are not strictly increasing/u,
  );

  const repeatedProfiles = buildProfiles(1_000);
  const repeatedFetcher = createPageFetcher(repeatedProfiles, ({ requestIndex }) => (
    requestIndex === 1
      ? { count: repeatedProfiles.length, data: repeatedProfiles.slice(0, 500), error: null }
      : null
  ));
  await assert.rejects(
    collectCompleteMemberNumberProfileRows(repeatedFetcher.fetchPage, { pageSize: 500 }),
    /ids are not strictly increasing/u,
  );
});

test("keyset pagination does not skip the next row after an offset-shifting mutation", async () => {
  const profiles = buildProfiles(1_000);
  const calls = [];
  const observedPageStarts = [];
  const fetchPage = async ({ afterProfileId, pageSize, ...unexpected }) => {
    assert.deepEqual(unexpected, {});
    calls.push({ afterProfileId, pageSize });
    if (calls.length === 2) {
      profiles.splice(100, 1);
      profiles.push({
        ...buildProfiles(1)[0],
        id: "profile-999999",
        user_number: 999_999,
      });
    }
    const availableRows = afterProfileId === null
      ? profiles
      : profiles.filter((row) => row.id > afterProfileId);
    const data = availableRows.slice(0, pageSize);
    observedPageStarts.push(data[0]?.id ?? null);
    return { count: profiles.length, data, error: null };
  };

  await assert.rejects(
    collectCompleteMemberNumberProfileRows(fetchPage, { pageSize: 500 }),
    (error) => error.message === "profile safety pagination returned rows after the exact denominator"
      && !error.message.includes("profile-"),
  );
  assert.deepEqual(calls.map((call) => call.afterProfileId), [
    null,
    "profile-000499",
    "profile-000999",
  ]);
  assert.deepEqual(observedPageStarts, [
    "profile-000000",
    "profile-000500",
    "profile-999999",
  ]);
  assert.ok(calls.every((call) => !("from" in call) && !("to" in call)));
});

test("complete profile pagination fails closed on count drift and incomplete denominators", async () => {
  const profiles = buildProfiles(1_000);
  const changedCountFetcher = createPageFetcher(profiles, ({ requestIndex }) => (
    requestIndex === 1
      ? { count: profiles.length + 1, data: profiles.slice(500), error: null }
      : null
  ));
  await assert.rejects(
    collectCompleteMemberNumberProfileRows(changedCountFetcher.fetchPage, { pageSize: 500 }),
    /count changed/u,
  );

  const earlyShortFetcher = createPageFetcher(profiles, ({ requestIndex }) => (
    requestIndex === 1
      ? { count: profiles.length, data: profiles.slice(500, 900), error: null }
      : null
  ));
  await assert.rejects(
    collectCompleteMemberNumberProfileRows(earlyShortFetcher.fetchPage, { pageSize: 500 }),
    /ended before the exact denominator/u,
  );

  const extraFetcher = createPageFetcher(buildProfiles(500), ({ requestIndex }) => (
    requestIndex === 1
      ? { count: 500, data: [buildProfiles(501)[500]], error: null }
      : null
  ));
  await assert.rejects(
    collectCompleteMemberNumberProfileRows(extraFetcher.fetchPage, { pageSize: 500 }),
    /rows after the exact denominator/u,
  );
});

test("complete profile pagination fails closed on invalid counts, provider errors, and overflow", async () => {
  for (const invalidCount of [null, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(
      collectCompleteMemberNumberProfileRows(async () => ({
        count: invalidCount,
        data: [],
        error: null,
      })),
      /count is invalid/u,
    );
  }

  await assert.rejects(
    collectCompleteMemberNumberProfileRows(async () => ({
      count: 0,
      data: [],
      error: { message: "sensitive provider detail" },
    })),
    (error) => error.message === "profile safety pagination provider error",
  );
  await assert.rejects(
    collectCompleteMemberNumberProfileRows(async () => {
      throw new Error("sensitive provider detail");
    }),
    (error) => error.message === "profile safety pagination provider error",
  );
  await assert.rejects(
    collectCompleteMemberNumberProfileRows(async () => ({
      count: 3,
      data: buildProfiles(2),
      error: null,
    }), { maxPages: 1, pageSize: 2 }),
    /pagination overflow/u,
  );
});

test("numbered humans without assignment metadata fail the shared safety predicate", () => {
  const summary = summarizeMemberNumberSafety([
    { user_kind: "human", user_number: 0, user_number_assigned_at: ASSIGNED_AT },
    { user_kind: "human", user_number: 1, user_number_assigned_at: null },
  ]);

  assert.equal(summary.numberedHumanProfilesMissingAssignmentMetadata.length, 1);
  assert.ok(getMemberNumberSafetyFatalReasons(summary).includes(
    "numbered-human-assignment-metadata-missing",
  ));
});
