import type { ExerciseInfoSheetExercise, ExerciseInfoSheetStats } from "@/components/ExerciseInfoSheet";
import type { MetricDatum } from "@/components/ui/MetricItem";
import type { ExerciseBrowserRow } from "@/lib/exercises-browser";
import type { ExerciseInfoReviewSection } from "@/lib/exercise-info-presentation";
import { mapExerciseAnalyticsFamilyToPresentationKind, resolveExerciseAnalyticsFamily } from "@/lib/exercise-analytics-family";

function sanitizeMetrics(metrics: MetricDatum[] | undefined) {
  return Array.isArray(metrics) ? metrics.slice(0, 4) : [];
}

function sanitizeReviewSections(sections: Array<{ title: string; items: string[] }> | undefined): ExerciseInfoReviewSection[] {
  if (!Array.isArray(sections)) {
    return [];
  }

  return sections
    .filter((section) => Boolean(section?.title) && Array.isArray(section?.items) && section.items.length > 0)
    .map((section) => ({
      title: section.title,
      items: section.items.slice(0, 4),
    }));
}

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
  const { family, presentationKind } = resolvePresentationKind(row);
  const metrics = sanitizeMetrics(row.detailedMetrics);
  const reviewSections = sanitizeReviewSections(row.detailSections);

  return {
    exercise: {
      id: row.exerciseId,
      exercise_id: row.exerciseId,
      name: row.name,
      primary_muscle: row.primary_muscle,
      equipment: row.equipment,
      movement_pattern: row.movement_pattern,
      image_howto_path: row.image_howto_path,
      how_to_short: row.how_to_short,
      image_icon_path: row.image_icon_path,
      slug: row.slug,
      measurement_type: row.measurement_type ?? null,
      default_unit: row.default_unit ?? null,
    },
    stats: {
      exercise_id: row.exerciseId,
      kind: row.kind,
      analyticsFamily: family,
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
      quickMetrics: metrics,
      performanceMetrics: metrics,
      surfaceMetrics: metrics,
      progress: {
        metrics: metrics,
        reviewSections,
        performances: [],
      },
      progression: row.progressionSummary ?? null,
    },
  };
}
