"use client";

import { RestDayCard } from "@/components/day-list/RoutineDayCardPresentation";
import { CardEmptyState, cardTokens } from "@/components/ui/card-system";
import { shouldRenderTodayRestDayCard } from "@/app/today/todayRestDayCard";
import { TodayExerciseCard, type TodayExerciseCardState } from "@/app/today/TodayExerciseCard";
import type { ExerciseRowCardProgress } from "@/components/workout/ExerciseRowCard";
import { deriveSessionExerciseProgressState, type SessionExerciseProgressState } from "@/lib/session-exercise-progress";
import type { WorkoutCardSurface } from "@/lib/workout-card-surface-policy";

export type TodayExerciseRow = {
  id: string;
  exerciseId?: string;
  name: string;
  targets: string | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
  slug?: string | null;
  loggedSetCount?: number;
  isSkipped?: boolean;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
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

/**
 * Logged-set progress as text first (`2 / 4 sets`, or `3 logged` when the day sets no set goal); the bar is
 * decorative. A skipped exercise shows progress only when something was logged before it was skipped.
 */
export function buildTodayExerciseLoggedProgress(
  progressState: Pick<SessionExerciseProgressState, "loggedSetCount" | "goalSetTarget" | "cardState">,
  isSkipped: boolean,
): ExerciseRowCardProgress | null {
  const { loggedSetCount, goalSetTarget } = progressState;
  if (isSkipped && loggedSetCount === 0) {
    return null;
  }

  const tone = progressState.cardState === "completed" ? "complete" : "default";
  if (goalSetTarget !== null) {
    return {
      label: `${loggedSetCount} / ${goalSetTarget} sets`,
      percent: Math.min(100, Math.round((Math.min(loggedSetCount, goalSetTarget) / goalSetTarget) * 100)),
      tone,
    };
  }

  return loggedSetCount > 0 ? { label: `${loggedSetCount} logged`, percent: null, tone } : null;
}

export function TodayExerciseRows({
  exercises,
  emptyMessage,
  showProgress = true,
  surface = "today",
  isRestDay = false,
  showInfo = true,
}: {
  exercises: TodayExerciseRow[];
  emptyMessage: string;
  showProgress?: boolean;
  surface?: WorkoutCardSurface;
  /**
   * Whether the day this list is rendered for is a rest day. When true and
   * there are no exercises to show, the empty row renders as a deliberate
   * rest-day card (shared with the Routine Overview rest-day treatment)
   * instead of a plain "no exercises" empty state.
   */
  isRestDay?: boolean;
  /** Off where the info sheet cannot load (offline session list). */
  showInfo?: boolean;
}) {
  return (
    <ul className={cardTokens.list}>
      {exercises.map((exercise) => {
        const isSkipped = exercise.isSkipped === true;
        const progressState = showProgress
          ? deriveSessionExerciseProgressState({
              loggedSetCount: exercise.loggedSetCount ?? 0,
              isSkipped,
              targetSetsMin: exercise.targetSetsMin,
              targetSetsMax: exercise.targetSetsMax,
              surface: "summary",
            })
          : null;
        const state: TodayExerciseCardState = progressState?.cardState === "completed"
          ? "completed"
          : isSkipped
            ? "skipped"
            : "default";

        return (
          <li key={exercise.id} className="min-w-0">
            <TodayExerciseCard
              exercise={exercise}
              surface={surface}
              state={state}
              progress={progressState ? buildTodayExerciseLoggedProgress(progressState, state === "skipped") : null}
              showInfo={showInfo}
            />
          </li>
        );
      })}
      {exercises.length === 0 ? (
        <li className="min-w-0">
          {shouldRenderTodayRestDayCard({ exerciseCount: exercises.length, isRestDay }) ? (
            <RestDayCard headingLevel={2} />
          ) : (
            <CardEmptyState title={emptyMessage} />
          )}
        </li>
      ) : null}
    </ul>
  );
}
