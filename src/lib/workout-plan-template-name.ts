export const WORKOUT_PLAN_NAME_MAX_LENGTH = 15;

const FALLBACK_WORKOUT_PLAN_NAME = "Workout Plan";

function normalizeWorkoutPlanNameKey(value: string) {
  return value.trim().toLowerCase();
}

function normalizeWorkoutPlanNameValue(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length === 0) {
    return "";
  }

  return normalized.slice(0, WORKOUT_PLAN_NAME_MAX_LENGTH);
}

function buildSuffixedWorkoutPlanName(baseName: string, copyNumber: number) {
  const suffix = ` ${copyNumber}`;
  const maxBaseLength = Math.max(1, WORKOUT_PLAN_NAME_MAX_LENGTH - suffix.length);
  const trimmedBaseName = baseName.slice(0, maxBaseLength).trimEnd();
  const safeBaseName = trimmedBaseName.length > 0
    ? trimmedBaseName
    : FALLBACK_WORKOUT_PLAN_NAME.slice(0, maxBaseLength).trimEnd();

  return `${safeBaseName}${suffix}`;
}

export function normalizeWorkoutPlanNameCandidate(value: string | null | undefined) {
  return normalizeWorkoutPlanNameValue(value ?? "");
}

export function hasWorkoutPlanNameConflict(args: {
  candidateName?: string | null;
  workoutPlanNames?: Array<string | null | undefined>;
}) {
  const normalizedCandidateName = normalizeWorkoutPlanNameKey(
    normalizeWorkoutPlanNameValue(args.candidateName ?? ""),
  );
  if (!normalizedCandidateName) {
    return false;
  }

  return (args.workoutPlanNames ?? [])
    .some((name) => normalizeWorkoutPlanNameKey(normalizeWorkoutPlanNameValue(name ?? "")) === normalizedCandidateName);
}

export function resolveUniqueWorkoutPlanName(args: {
  sourceName?: string | null;
  requestedName?: string | null;
  existingNames: Array<string | null | undefined>;
}) {
  const normalizedRequestedName = normalizeWorkoutPlanNameValue(args.requestedName ?? "");
  const normalizedSourceName = normalizeWorkoutPlanNameValue(args.sourceName ?? "");
  const baseName = normalizedRequestedName || normalizedSourceName || FALLBACK_WORKOUT_PLAN_NAME;
  const takenNames = new Set(
    args.existingNames
      .map((name) => normalizeWorkoutPlanNameKey(normalizeWorkoutPlanNameValue(name ?? "")))
      .filter((name) => name.length > 0),
  );

  if (!takenNames.has(normalizeWorkoutPlanNameKey(baseName))) {
    return baseName;
  }

  for (let copyNumber = 2; copyNumber < 1000; copyNumber += 1) {
    const candidateName = buildSuffixedWorkoutPlanName(baseName, copyNumber);
    if (!takenNames.has(normalizeWorkoutPlanNameKey(candidateName))) {
      return candidateName;
    }
  }

  return buildSuffixedWorkoutPlanName(baseName, takenNames.size + 2);
}

export const WORKOUT_PLAN_TEMPLATE_NAME_MAX_LENGTH = WORKOUT_PLAN_NAME_MAX_LENGTH;

export const normalizeWorkoutPlanTemplateNameCandidate = normalizeWorkoutPlanNameCandidate;

export function hasWorkoutPlanTemplateNameConflict(args: {
  candidateName?: string | null;
  templateNames?: Array<string | null | undefined>;
}) {
  return hasWorkoutPlanNameConflict({
    candidateName: args.candidateName,
    workoutPlanNames: args.templateNames,
  });
}

export const resolveUniqueWorkoutPlanTemplateName = resolveUniqueWorkoutPlanName;
