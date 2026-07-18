export function collectPositiveMemberNumberGaps(numbers) {
  const sorted = [...new Set(numbers.filter((value) => Number.isInteger(value) && value >= 1))]
    .sort((left, right) => left - right);
  if (sorted.length === 0) {
    return [];
  }

  const occupied = new Set(sorted);
  const gaps = [];
  for (let candidate = 1; candidate <= sorted.at(-1); candidate += 1) {
    if (!occupied.has(candidate)) {
      gaps.push(candidate);
    }
  }
  return gaps;
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

export function summarizeMemberNumberSafety(profiles) {
  const profileRows = Array.isArray(profiles) ? profiles : [];
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
  const positiveHumanNumbers = humanNumbers.filter((number) => number >= 1);
  const negativeHumanNumbers = humanNumbers.filter((number) => number < 0).sort((left, right) => left - right);
  const automationProfilesWithNumbers = profileRows.filter(
    (profile) => profile?.user_kind === "automation" && profile?.user_number !== null,
  );

  return {
    automationProfilesWithNumbers,
    duplicateNumbers,
    negativeHumanNumbers,
    positiveGaps: collectPositiveMemberNumberGaps(positiveHumanNumbers),
    zeroCount: profileRows.filter((profile) => profile?.user_number === 0).length,
  };
}
