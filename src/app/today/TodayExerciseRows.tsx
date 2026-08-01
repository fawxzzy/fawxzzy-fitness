"use client";

import type { ReactNode } from "react";
import { ExerciseInfoIconButton } from "@/components/ExerciseInfoIconButton";
import { RestDayCard } from "@/components/day-list/RoutineDayCardPresentation";
import {
  SHARED_PLANNED_CARD_CONTENT_CLASS_NAME,
  SHARED_PLANNED_CARD_INFO_BUTTON_CLASS_NAME,
  SHARED_PLANNED_CARD_INFO_OVERLAY_CLASS_NAME,
  SHARED_PLANNED_CARD_TITLE_CONTAINER_CLASS_NAME,
} from "@/components/workout/ExerciseCardSurfaceChrome";
import { shouldRenderTodayRestDayCard } from "@/app/today/todayRestDayCard";
import { PlannedExerciseSummaryRow } from "@/components/workout/PlannedExerciseSummaryRow";
import { deriveLoggedSetCountProgressFill } from "@/lib/exercise-card-progress-fill";
import { deriveSessionExerciseProgressState } from "@/lib/session-exercise-progress";
import type { ProgressionProgressFill } from "@/lib/progression-progress-percent";
import type { WorkoutCardSurface } from "@/lib/workout-card-surface-policy";

const TODAY_RESUME_CARD_CORNER_META_CLASS_NAME = "!right-[0.18rem] !top-[0.56rem]";
const TODAY_RESUME_CARD_CONTENT_CLASS_NAME = "pl-3 pr-[0.3rem]";
const TODAY_RESUME_CARD_TITLE_CONTAINER_CLASS_NAME = "!pr-[2.7rem] sm:!pr-[3.2rem] pb-[1.9rem]";

export type TodayExerciseRow = {
  id: string;
  exerciseId: string;
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
  progressFill?: ProgressionProgressFill | null;
};

function formatLoggedSetFraction(loggedSetCount: number, goalSetTarget: number | null) {
  if (goalSetTarget !== null) {
    return `${loggedSetCount} / ${goalSetTarget}`;
  }

  return `${loggedSetCount} logged`;
}

function renderProgressTitleMeta(progressLabel?: string, completed = false) {
  if (!progressLabel) {
    return undefined;
  }

  return (
    <span className={completed ? "text-[rgb(var(--success-rgb)/0.98)]" : undefined}>
      {progressLabel}
    </span>
  );
}

export function TodayExerciseRows({
  exercises,
  emptyMessage,
  density = "compact",
  showProgress = true,
  sourceContext = "TodayExerciseRows",
  surface = "today",
  rowClassName,
  rowContentClassName = SHARED_PLANNED_CARD_CONTENT_CLASS_NAME,
  rightIcon,
  isRestDay = false,
}: {
  exercises: TodayExerciseRow[];
  emptyMessage: string;
  density?: "compact" | "detailed";
  showProgress?: boolean;
  sourceContext?: string;
  surface?: WorkoutCardSurface;
  rowClassName?: string;
  rowContentClassName?: string;
  rightIcon?: ReactNode;
  /**
   * Whether the day this list is rendered for is a rest day. When true and
   * there are no exercises to show, the empty row renders as a deliberate
   * rest-day card (shared with the Routine Overview rest-day treatment)
   * instead of a plain "no exercises" text row.
   */
  isRestDay?: boolean;
}) {
  return (
    <>
      <ul className="flex flex-col gap-[0.375rem]">
        {exercises.map((exercise) => {
          const progressState = showProgress
            ? deriveSessionExerciseProgressState({
                loggedSetCount: exercise.loggedSetCount ?? 0,
                isSkipped: exercise.isSkipped === true,
                targetSetsMin: exercise.targetSetsMin,
                targetSetsMax: exercise.targetSetsMax,
                surface: "summary",
              })
            : null;
          const progressLabel = progressState && progressState.goalSetTarget !== null
            ? formatLoggedSetFraction(progressState.loggedSetCount, progressState.goalSetTarget)
            : undefined;
          const resolvedProgressFill = deriveLoggedSetCountProgressFill({
            loggedSetCount: progressState?.loggedSetCount ?? exercise.loggedSetCount ?? 0,
            goalSetTarget: progressState?.goalSetTarget ?? null,
          });
          const shouldRenderCompactSkippedRow =
            surface === "today"
            && exercise.isSkipped === true
            && progressState?.cardState !== "completed";
          const resolvedRightIcon = rightIcon ?? null;
          const titleMeta = renderProgressTitleMeta(progressLabel, progressState?.cardState === "completed");
          const infoButton = (
            <ExerciseInfoIconButton
              exerciseId={exercise.exerciseId}
              exerciseName={exercise.name}
              className={SHARED_PLANNED_CARD_INFO_BUTTON_CLASS_NAME}
            />
          );
          return (
            <li key={exercise.id}>
              {shouldRenderCompactSkippedRow ? (
                <div
                  className={[
                    "relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-none rounded-r-[var(--card-radius)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.86)] px-4 py-2.5 text-left opacity-60 saturate-[0.78]",
                    rowClassName,
                  ].filter(Boolean).join(" ")}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-px left-px top-px z-[2] w-[4px] rounded-r-full bg-[rgb(var(--accent-divider-rgb)/0.96)]"
                  />
                  <p className="relative z-[1] min-w-0 flex-1 whitespace-normal break-words text-[0.95rem] font-semibold leading-[1.2] text-[rgb(var(--text)/0.96)]">
                    {exercise.name}
                  </p>
                  <div className="pointer-events-none absolute right-[0.58rem] top-[0.58rem] z-[2]">
                    {resolvedRightIcon}
                  </div>
                  {infoButton}
                </div>
              ) : (
                <PlannedExerciseSummaryRow
                  exercise={exercise}
                  density={density}
                  surface={surface}
                  rowClassName={[
                    rowClassName,
                    progressState?.cardState === "completed"
                      ? "border-[rgb(var(--success-rgb)/0.96)] bg-[linear-gradient(180deg,rgb(var(--success-rgb)/0.72),rgb(var(--surface-2-rgb)/0.99))] ring-1 ring-[rgb(var(--success-rgb)/0.42)]"
                      : undefined,
                    exercise.isSkipped && progressState && progressState.cardState !== "completed" ? "opacity-60 saturate-[0.78]" : undefined,
                  ].filter(Boolean).join(" ")}
                  rowContentClassName={resolvedRightIcon ? rowContentClassName : TODAY_RESUME_CARD_CONTENT_CLASS_NAME}
                  state={progressState?.cardState ?? "default"}
                  semanticTone={progressState?.cardState === "completed" ? "completed" : undefined}
                  badgeText={progressState && progressState.goalSetTarget === null ? progressState.badgeText : undefined}
                  rightIcon={resolvedRightIcon}
                  rightIconMode="overlay"
                  titleContainerClassName={resolvedRightIcon ? SHARED_PLANNED_CARD_TITLE_CONTAINER_CLASS_NAME : TODAY_RESUME_CARD_TITLE_CONTAINER_CLASS_NAME}
                  titleMeta={resolvedRightIcon ? titleMeta : undefined}
                  titleMetaClassName={resolvedRightIcon ? undefined : undefined}
                  cornerMeta={resolvedRightIcon ? undefined : titleMeta}
                  cornerMetaClassName={resolvedRightIcon ? undefined : TODAY_RESUME_CARD_CORNER_META_CLASS_NAME}
                  titleMetaMode={resolvedRightIcon && titleMeta ? "overlay-tight" : undefined}
                  overlayActions={infoButton}
                  overlayActionsClassName={SHARED_PLANNED_CARD_INFO_OVERLAY_CLASS_NAME}
                  progressFill={resolvedProgressFill}
                />
              )}
            </li>
          );
        })}
        {exercises.length === 0 ? (
          shouldRenderTodayRestDayCard({ exerciseCount: exercises.length, isRestDay }) ? (
            <li>
              <RestDayCard />
            </li>
          ) : (
            <li className="rounded-[var(--radius-md)] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.72)] px-3 py-3 text-center text-sm leading-normal text-[rgb(var(--text-muted)/0.96)]">{emptyMessage}</li>
          )
        ) : null}
      </ul>
    </>
  );
}
