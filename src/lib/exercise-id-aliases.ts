import { EXERCISE_OPTIONS } from "@/lib/exercise-options";

// Both keys are historical Pull-Up ids from `EXERCISE_OPTIONS` (66666666... was
// renumbered to de1f9f53... in 923c01bc, then de1f9f53... itself was superseded).
// The target, 2466d550..., is intentionally NOT an EXERCISE_OPTIONS id: it is the
// canonical Supabase `exercises.id` used by stats/migration lookups (see 76c50ea8
// and docs/CHANGELOG.md's "Fix Exercise Info to use canonical exercise ids for
// stats lookups"). EXERCISE_OPTIONS ids can be renumbered independently of the
// underlying database row id, so do not "fix" this by pointing de1f9f53... at
// itself -- that would break stats lookups for any routine day still storing
// the pre-76c50ea8 id.
const LEGACY_EXERCISE_ID_ALIASES: Record<string, string> = {
  "66666666-6666-6666-6666-666666666666": "2466d550-004f-4b94-af04-26ae24f990b3",
  "de1f9f53-120f-4f4e-88b4-bd30f6ce1240": "2466d550-004f-4b94-af04-26ae24f990b3",
};

const LEGACY_EXERCISE_IDS = new Set<string>([
  ...Object.keys(LEGACY_EXERCISE_ID_ALIASES),
  ...EXERCISE_OPTIONS.map((exercise) => exercise.id),
]);

export function resolveCanonicalExerciseId(exerciseId: string): string {
  const normalized = exerciseId.trim();
  return LEGACY_EXERCISE_ID_ALIASES[normalized] ?? normalized;
}

export function isKnownLegacyExerciseId(exerciseId: string): boolean {
  return LEGACY_EXERCISE_IDS.has(exerciseId.trim());
}
