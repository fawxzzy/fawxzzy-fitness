"use client";

import type { ReactNode } from "react";
import { ExerciseInfoIconButton } from "@/components/ExerciseInfoIconButton";
import { CardChips, CardStatusChip } from "@/components/ui/card-system";
import { buildExerciseCardMetadataItems } from "@/components/workout/ExerciseCardStandardTitle";
import { ExerciseRowCard, type ExerciseRowCardProgress } from "@/components/workout/ExerciseRowCard";
import {
  formatExerciseProgressionLabel,
  normalizeExerciseTargetSummary,
  splitExerciseTargetValues,
} from "@/components/workout/exerciseRowCardValues";
import { isStretchHubExercise } from "@/lib/stretch-library";
import { resolveWorkoutCardSurfacePolicy, type WorkoutCardSurface } from "@/lib/workout-card-surface-policy";

export type TodayExerciseCardExercise = {
  /** Catalog exercise id for the info control. Without it (or with `showInfo` false) the card has no info control. */
  exerciseId?: string;
  name: string;
  targets: string | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
  slug?: string | null;
  primary_muscle?: string | null;
  equipment?: string | null;
  movement_pattern?: string | null;
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  isCardio?: boolean | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
  progressionStateLabel?: string | null;
};

export type TodayExerciseCardState = "default" | "completed" | "skipped";

/** Meta line on Today shows two facts (muscle, pattern); the view-day list shows all three. */
const TODAY_META_FACT_LIMIT = 2;

/**
 * Planned exercise on Today (selected day rows, in-session summary, offline fallback) and the view-day list.
 * One `ExerciseRowCard` (the same card as the day editor): thumbnail, name, meta, target, progress text.
 *
 * - The card is static: Today rows never navigate or expand (`interaction: none`), so there is no header button.
 * - The info control is a 44px `CardInfoButton` in the trailing slot (it was a 26px overlay button).
 * - `completed` = success tone plus a DONE chip; `skipped` = SKIPPED chip on a compact card (no media, no target).
 *   Status is a text chip, never colour alone, and the card is not dimmed (opacity lowered text contrast).
 * - `progress` is text first (`2 / 4 sets`, `Progression: 3/4 sets`); the bar is decorative.
 * - `footer` is the attached action strip (progression update) and renders inside the surface.
 */
export function TodayExerciseCard({
  exercise,
  surface = "today",
  state = "default",
  progress = null,
  footer,
  showInfo = true,
}: {
  exercise: TodayExerciseCardExercise;
  surface?: WorkoutCardSurface;
  state?: TodayExerciseCardState;
  progress?: ExerciseRowCardProgress | null;
  footer?: ReactNode;
  /** Off for screens that cannot open the info sheet (the offline session list: it fetches from the network). */
  showInfo?: boolean;
}) {
  const isStretchHub = isStretchHubExercise(exercise);
  const isSkipped = state === "skipped";
  const policy = resolveWorkoutCardSurfacePolicy(surface, "compact");
  const facts = buildExerciseCardMetadataItems({
    primaryMuscle: exercise.primary_muscle,
    movementPattern: exercise.movement_pattern,
    equipment: exercise.equipment,
  });
  const metaItems = isSkipped ? [] : surface === "today" ? facts.slice(0, TODAY_META_FACT_LIMIT) : facts;
  const targetValues = isSkipped || isStretchHub ? [] : splitExerciseTargetValues(normalizeExerciseTargetSummary(exercise.targets));
  const progressionLabel = isSkipped || isStretchHub ? null : formatExerciseProgressionLabel(exercise.progressionStateLabel);

  return (
    <ExerciseRowCard
      exercise={{
        name: exercise.name,
        slug: exercise.slug,
        image_path: exercise.image_path,
        image_icon_path: exercise.image_icon_path,
        image_howto_path: exercise.image_howto_path,
      }}
      metaItems={metaItems}
      targetValues={targetValues}
      noTargetLabel={isSkipped || isStretchHub ? null : "No target set"}
      progressionLabel={progressionLabel}
      progress={progress}
      chips={state === "completed" ? (
        <CardChips><CardStatusChip status="done" /></CardChips>
      ) : isSkipped ? (
        <CardChips><CardStatusChip status="skipped" /></CardChips>
      ) : undefined}
      showMedia={policy.showMedia && !isSkipped}
      tone={state === "completed" ? "completed" : "neutral"}
      interaction={{ kind: "none" }}
      trailing={showInfo && exercise.exerciseId ? <ExerciseInfoIconButton exerciseId={exercise.exerciseId} exerciseName={exercise.name} /> : undefined}
      footer={footer}
    />
  );
}
