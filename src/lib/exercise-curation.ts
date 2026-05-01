export const EXERCISE_CURATION_GROUPS = [
  { key: "pattern_detail", label: "Pattern Detail" },
  { key: "plane_of_motion", label: "Plane" },
  { key: "exercise_utility", label: "Utility" },
  { key: "body_position", label: "Body Position" },
  { key: "training_goal", label: "Training Goal" },
  { key: "difficulty", label: "Difficulty" },
  { key: "setup_cost", label: "Setup Cost" },
  { key: "stability_requirement", label: "Stability" },
  { key: "unilateral_profile", label: "Unilateral" },
  { key: "loading_profile", label: "Loading" },
  { key: "joint_emphasis", label: "Joint Emphasis" },
  { key: "spine_demand", label: "Spine Demand" },
  { key: "grip_constraint", label: "Constraints" },
] as const;

export type ExerciseCurationGroupKey = (typeof EXERCISE_CURATION_GROUPS)[number]["key"];

export type ExerciseCurationTags = Partial<Record<ExerciseCurationGroupKey, string[]>>;

function normalizeTagValue(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function formatExerciseTagLabel(tag: string) {
  return tag
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeExerciseCurationTags(value: unknown): ExerciseCurationTags | null {
  if (typeof value === "string") {
    try {
      return normalizeExerciseCurationTags(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const entries = EXERCISE_CURATION_GROUPS.flatMap(({ key }) => {
    const groupValue = (value as Record<string, unknown>)[key];
    if (!Array.isArray(groupValue)) {
      return [];
    }

    const normalizedValues = [...new Set(groupValue.map(normalizeTagValue).filter((item): item is string => Boolean(item)))];
    if (normalizedValues.length === 0) {
      return [];
    }

    return [[key, normalizedValues] as const];
  });

  return entries.length > 0 ? Object.fromEntries(entries) as ExerciseCurationTags : null;
}

export function buildScopedExerciseCurationTagValue(groupKey: ExerciseCurationGroupKey, value: string) {
  return `${groupKey}:${value}`;
}

export function flattenExerciseCurationTagValues(curationTags: ExerciseCurationTags | null | undefined) {
  if (!curationTags) {
    return [];
  }

  return EXERCISE_CURATION_GROUPS.flatMap(({ key }) => {
    const values = curationTags[key] ?? [];
    return values.map((value) => buildScopedExerciseCurationTagValue(key, value));
  });
}
