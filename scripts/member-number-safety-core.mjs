export const MAX_REPORTED_MEMBER_NUMBER_GAPS = 100;

export function summarizePositiveMemberNumberGaps(
  numbers,
  limit = MAX_REPORTED_MEMBER_NUMBER_GAPS,
) {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new Error("gap report limit must be a non-negative safe integer");
  }

  const sorted = [...new Set(
    (Array.isArray(numbers) ? numbers : [])
      .filter((value) => Number.isSafeInteger(value) && value >= 1),
  )].sort((left, right) => left - right);
  const reportedGaps = [];
  let gapCount = 0;
  let priorReservedNumber = 0;

  for (const reservedNumber of sorted) {
    const gapStart = priorReservedNumber + 1;
    const gapEnd = reservedNumber - 1;
    if (gapStart <= gapEnd) {
      const intervalSize = gapEnd - gapStart + 1;
      gapCount += intervalSize;

      const reportCapacity = limit - reportedGaps.length;
      const reportedFromInterval = Math.min(reportCapacity, intervalSize);
      for (let offset = 0; offset < reportedFromInterval; offset += 1) {
        reportedGaps.push(gapStart + offset);
      }
    }
    priorReservedNumber = reservedNumber;
  }

  return {
    gapCount,
    reportedGaps,
    truncated: gapCount > reportedGaps.length,
  };
}

export function collectPositiveMemberNumberGaps(numbers) {
  return summarizePositiveMemberNumberGaps(numbers).reportedGaps;
}

export function hasMemberIdentityChanged(before, after) {
  return before?.user_number !== after?.user_number
    || before?.user_kind !== after?.user_kind
    || before?.user_number_assigned_at !== after?.user_number_assigned_at;
}

export function deriveAssignedMemberIdentity({ isAutomation, nextNumber, assignedAt }) {
  if (isAutomation) {
    return {
      user_number: null,
      user_kind: "automation",
      user_number_assigned_at: null,
    };
  }

  if (!Number.isInteger(nextNumber) || nextNumber < 1) {
    throw new Error("nextNumber must be a positive integer");
  }
  if (typeof assignedAt !== "string" || assignedAt.length === 0) {
    throw new Error("assignedAt must be a non-empty timestamp string");
  }

  return {
    user_number: nextNumber,
    user_kind: "human",
    user_number_assigned_at: assignedAt,
  };
}

export function getMemberNumberSafetyFatalReasons(summary) {
  const reasons = [];

  if (summary?.zeroCount !== 1) {
    reasons.push("invalid-zero-count");
  } else if (!summary?.hasExactlyOneHumanZero) {
    reasons.push("invalid-zero-human-reservation");
  } else if (!summary?.reservedZeroAssignmentMetadataPresent) {
    reasons.push("reserved-zero-assignment-metadata-missing");
  }
  if ((summary?.automationProfilesWithNumbers?.length ?? 0) > 0) {
    reasons.push("numbered-automation-profile");
  }
  if ((summary?.unknownProfilesWithNumbers?.length ?? 0) > 0) {
    reasons.push("numbered-unknown-profile");
  }
  if ((summary?.duplicateNumbers?.length ?? 0) > 0) {
    reasons.push("duplicate-member-number");
  }
  if ((summary?.negativeHumanNumbers?.length ?? 0) > 0) {
    reasons.push("negative-human-member-number");
  }
  if (summary?.reservedNumberHighWaterError) {
    reasons.push(`reserved-number-high-water:${summary.reservedNumberHighWaterError}`);
  }
  if (!Number.isSafeInteger(summary?.minimumSafeNextNumber) || summary.minimumSafeNextNumber < 1) {
    reasons.push("minimum-safe-next-number-unavailable");
  }

  return reasons;
}

export function summarizeMemberNumberSafety(profiles) {
  const profileRows = Array.isArray(profiles) ? profiles : [];
  const zeroProfiles = profileRows.filter((profile) => profile?.user_number === 0);
  const humanZeroProfiles = zeroProfiles.filter((profile) => profile?.user_kind === "human");
  const hasExactlyOneHumanZero = zeroProfiles.length === 1 && humanZeroProfiles.length === 1;
  const reservedZeroAssignmentMetadataPresent = hasExactlyOneHumanZero
    && humanZeroProfiles[0]?.user_number_assigned_at !== null
    && humanZeroProfiles[0]?.user_number_assigned_at !== undefined;
  const reservedNumberValues = profileRows
    .map((profile) => profile?.user_number)
    .filter((value) => value !== null && value !== undefined);
  const invalidReservedNumbers = reservedNumberValues.filter(
    (value) => !Number.isSafeInteger(value) || value < 0,
  );
  const validReservedNumbers = reservedNumberValues.filter(
    (value) => Number.isSafeInteger(value) && value >= 0,
  );
  let maxReservedNumber = null;
  for (const value of validReservedNumbers) {
    maxReservedNumber = maxReservedNumber === null
      ? value
      : Math.max(maxReservedNumber, value);
  }
  const reservedNumberHighWaterError = invalidReservedNumbers.length > 0
    ? "invalid-reserved-number"
    : maxReservedNumber === Number.MAX_SAFE_INTEGER
      ? "safe-integer-successor-unavailable"
      : null;
  const minimumSafeNextNumber = reservedNumberHighWaterError
    ? null
    : maxReservedNumber === null
      ? 1
      : maxReservedNumber + 1;
  const allNumbers = profileRows
    .map((profile) => profile?.user_number)
    .filter(Number.isInteger);
  const numberCounts = new Map();
  for (const number of allNumbers) {
    numberCounts.set(number, (numberCounts.get(number) ?? 0) + 1);
  }

  const duplicateNumbers = [...numberCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([number, count]) => ({ number, count }))
    .sort((left, right) => left.number - right.number);
  const humanNumbers = profileRows
    .filter((profile) => profile?.user_kind === "human" && Number.isInteger(profile?.user_number))
    .map((profile) => profile.user_number);
  const negativeHumanNumbers = humanNumbers.filter((number) => number < 0).sort((left, right) => left - right);
  const automationProfilesWithNumbers = profileRows.filter(
    (profile) => profile?.user_kind === "automation"
      && profile?.user_number !== null
      && profile?.user_number !== undefined,
  );
  const unknownProfilesWithNumbers = profileRows.filter(
    (profile) => profile?.user_kind !== "human"
      && profile?.user_kind !== "automation"
      && profile?.user_number !== null
      && profile?.user_number !== undefined,
  );
  const positiveGapSummary = reservedNumberHighWaterError
    ? {
      gapCount: null,
      reportedGaps: [],
      truncated: false,
    }
    : summarizePositiveMemberNumberGaps(validReservedNumbers);

  return {
    automationProfilesWithNumbers,
    duplicateNumbers,
    hasExactlyOneHumanZero,
    invalidReservedNumbers,
    maxReservedNumber,
    minimumSafeNextNumber,
    negativeHumanNumbers,
    positiveGapCount: positiveGapSummary.gapCount,
    positiveGaps: positiveGapSummary.reportedGaps,
    positiveGapsTruncated: positiveGapSummary.truncated,
    reservedZeroAssignmentMetadataPresent,
    reservedNumberHighWaterError,
    unknownProfilesWithNumbers,
    zeroCount: zeroProfiles.length,
  };
}
