export const WORKOUT_PLAN_TEMPLATE_NAME_MAX_LENGTH = 15;

const FALLBACK_WORKOUT_PLAN_TEMPLATE_NAME = "Workout Plan";

function normalizeWorkoutPlanTemplateNameKey(value: string) {
  return value.trim().toLowerCase();
}

function normalizeWorkoutPlanTemplateNameValue(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length === 0) {
    return "";
  }

  return normalized.slice(0, WORKOUT_PLAN_TEMPLATE_NAME_MAX_LENGTH);
}

function buildSuffixedWorkoutPlanTemplateName(baseName: string, copyNumber: number) {
  const suffix = ` ${copyNumber}`;
  const maxBaseLength = Math.max(1, WORKOUT_PLAN_TEMPLATE_NAME_MAX_LENGTH - suffix.length);
  const trimmedBaseName = baseName.slice(0, maxBaseLength).trimEnd();
  const safeBaseName = trimmedBaseName.length > 0
    ? trimmedBaseName
    : FALLBACK_WORKOUT_PLAN_TEMPLATE_NAME.slice(0, maxBaseLength).trimEnd();

  return `${safeBaseName}${suffix}`;
}

export function normalizeWorkoutPlanTemplateNameCandidate(value: string | null | undefined) {
  return normalizeWorkoutPlanTemplateNameValue(value ?? "");
}

export function hasWorkoutPlanTemplateNameConflict(args: {
  candidateName?: string | null;
  templateNames?: Array<string | null | undefined>;
}) {
  const normalizedCandidateName = normalizeWorkoutPlanTemplateNameKey(
    normalizeWorkoutPlanTemplateNameValue(args.candidateName ?? ""),
  );
  if (!normalizedCandidateName) {
    return false;
  }

  return (args.templateNames ?? [])
    .some((name) => normalizeWorkoutPlanTemplateNameKey(normalizeWorkoutPlanTemplateNameValue(name ?? "")) === normalizedCandidateName);
}

export function resolveUniqueWorkoutPlanTemplateName(args: {
  sourceName?: string | null;
  requestedName?: string | null;
  existingNames: Array<string | null | undefined>;
}) {
  const normalizedRequestedName = normalizeWorkoutPlanTemplateNameValue(args.requestedName ?? "");
  const normalizedSourceName = normalizeWorkoutPlanTemplateNameValue(args.sourceName ?? "");
  const baseName = normalizedRequestedName || normalizedSourceName || FALLBACK_WORKOUT_PLAN_TEMPLATE_NAME;
  const takenNames = new Set(
    args.existingNames
      .map((name) => normalizeWorkoutPlanTemplateNameKey(normalizeWorkoutPlanTemplateNameValue(name ?? "")))
      .filter((name) => name.length > 0),
  );

  if (!takenNames.has(normalizeWorkoutPlanTemplateNameKey(baseName))) {
    return baseName;
  }

  for (let copyNumber = 2; copyNumber < 1000; copyNumber += 1) {
    const candidateName = buildSuffixedWorkoutPlanTemplateName(baseName, copyNumber);
    if (!takenNames.has(normalizeWorkoutPlanTemplateNameKey(candidateName))) {
      return candidateName;
    }
  }

  return buildSuffixedWorkoutPlanTemplateName(baseName, takenNames.size + 2);
}
