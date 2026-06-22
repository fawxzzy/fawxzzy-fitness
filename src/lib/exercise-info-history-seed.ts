import type { ExerciseInfoSheetExercise, ExerciseInfoSheetStats } from "@/components/ExerciseInfoSheet";
import type { ExerciseBrowserRow } from "@/lib/exercises-browser";
import { mapExerciseAnalyticsFamilyToPresentationKind, resolveExerciseAnalyticsFamily } from "@/lib/exercise-analytics-family";

function resolvePresentationKind(row: ExerciseBrowserRow) {
  const family = row.analyticsFamily ?? resolveExerciseAnalyticsFamily({
    presentationKind: row.kind === "cardio"
      ? (row.measurement_type === "time" || row.measurement_type === "duration" ? "timed" : "cardio")
      : "strength",
    measurement_type: row.measurement_type ?? null,
    defaultUnit: row.default_unit ?? null,
    equipment: row.equipment,
    movement_pattern: row.movement_pattern,
    primary_muscle: row.primary_muscle,
  });

  return {
    family,
    presentationKind: mapExerciseAnalyticsFamilyToPresentationKind(family),
  };
}

export function buildExerciseInfoSeedFromHistoryRow(row: ExerciseBrowserRow): {
  exercise: ExerciseInfoSheetExercise;
  stats: ExerciseInfoSheetStats | null;
} {
  const { presentationKind } = resolvePresentationKind(row);
  const surfaceMetrics = [
    { label: "Sessions", value: String(row.sessionCount) },
    { label: "Sets", value: String(row.setCount ?? 0) },
    { label: "Last", value: row.lastSummary ?? "Not yet" },
    { label: "Best", value: row.bestSummary ?? "Not yet" },
  ];

  return {
    exercise: {
      id: row.exerciseId,
      exercise_id: row.exerciseId,
      name: row.name,
      primary_muscle: row.primary_muscle,
      primary_muscles: row.primary_muscles ?? null,
      secondary_muscles: row.secondary_muscles ?? null,
      equipment: row.equipment,
      movement_pattern: row.movement_pattern,
      image_howto_path: row.image_howto_path,
      how_to_short: row.how_to_short,
      image_icon_path: row.image_icon_path,
      slug: row.slug,
    },
    stats: {
      exercise_id: row.exerciseId,
      kind: row.kind,
      presentationKind,
      recent: {
        lastPerformedAt: row.last_performed_at,
        lastSummary: row.lastSummary,
      },
      totals: {
        sessions: row.sessionCount,
        sets: row.setCount ?? 0,
      },
      bests: {
        bestSetSummary: row.bestSummary ?? undefined,
      },
      prLabel: row.prLabel,
      prCount: row.prCount,
      quickMetrics: surfaceMetrics,
      performanceMetrics: [],
      surfaceMetrics,
      progress: {
        metrics: [],
        reviewSections: [],
        performances: [],
      },
      progression: row.progressionSummary ?? null,
    },
  };
}
