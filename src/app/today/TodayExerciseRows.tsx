"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { WorkoutExerciseCardDetails } from "@/components/workout/WorkoutExerciseCardDetails";
import { deriveSessionExerciseProgressState } from "@/lib/session-exercise-progress";
import type { ProgressionProgressFill } from "@/lib/progression-progress-percent";
import { isStretchHubExercise } from "@/lib/stretch-library";
import { buildPlannedExerciseDetailMetrics } from "@/lib/workout-card-view-models";
import { applyWorkoutCardSurfacePolicy, type WorkoutCardSurface } from "@/lib/workout-card-surface-policy";

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
  progressFill?: ProgressionProgressFill | null;
};

function formatLoggedSetFraction(loggedSetCount: number, goalSetTarget: number | null) {
  if (goalSetTarget !== null) {
    return `${loggedSetCount} / ${goalSetTarget}`;
  }

  return `${loggedSetCount} logged`;
}

function renderProgressChevron(progressLabel?: string, completed = false) {
  return (
    <div className="flex min-w-[4.75rem] shrink-0 items-center justify-end gap-1.5 self-center">
      {progressLabel ? (
        <span className={[
          "whitespace-nowrap leading-none text-[0.85rem] font-semibold tabular-nums",
          completed ? "text-[rgb(var(--success-rgb)/0.98)]" : "text-[rgb(var(--text-muted)/0.94)]",
        ].join(" ")}>
          {progressLabel}
        </span>
      ) : null}
      <ChevronRightIcon className={[
        "h-5 w-5 shrink-0 self-center",
        completed ? "text-[rgb(var(--success-rgb)/0.98)]" : "text-[rgb(var(--text-muted)/0.92)]",
      ].join(" ")} />
    </div>
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
  rowContentClassName = "pl-3",
  rightIcon,
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
}) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  return (
    <>
      <ul className="flex flex-col gap-[0.375rem]">
        {exercises.map((exercise) => {
          const isStretchHub = isStretchHubExercise(exercise);
          const resolvedSummary = isStretchHub ? null : exercise.targets;
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
          const executionProgressFill = !exercise.progressFill && progressState?.goalSetTarget
            ? {
                percent: Math.max(0, Math.min(100, Math.round((progressState.loggedSetCount / progressState.goalSetTarget) * 100))),
                state: progressState.isGoalCompleted ? "ready" as const : progressState.loggedSetCount > 0 ? "partial" as const : "no_history" as const,
                label: progressLabel ?? "",
              }
            : null;
          const resolvedProgressFill = exercise.progressFill ?? executionProgressFill;
          const compactProgressFillPercent = resolvedProgressFill && resolvedProgressFill.percent > 0
            ? Math.max(0, Math.min(100, resolvedProgressFill.percent))
            : null;
          const compactProgressFillStyle = compactProgressFillPercent !== null
            ? ({
                width: `${compactProgressFillPercent}%`,
              } satisfies CSSProperties)
            : null;
          const isCompactProgressFillComplete = compactProgressFillPercent !== null && compactProgressFillPercent >= 100;
          const detailedMetrics = buildPlannedExerciseDetailMetrics({
            name: exercise.name,
            slug: exercise.slug,
            measurementType: exercise.measurement_type,
            isCardio: exercise.isCardio,
            kind: exercise.kind,
            type: exercise.type,
            equipment: exercise.equipment,
            movementPattern: exercise.movement_pattern,
            primaryMuscle: exercise.primary_muscle,
            tags: exercise.tags,
            categories: exercise.categories,
            loggedSetCount: exercise.loggedSetCount ?? 0,
            isSkipped: exercise.isSkipped === true,
            targetSetsMin: exercise.targetSetsMin,
            targetSetsMax: exercise.targetSetsMax,
          });
          const { policy, chips, detailedMetrics: visibleDetailedMetrics } = applyWorkoutCardSurfacePolicy({
            surface,
            density,
            detailedMetrics,
          });
          const shouldRenderCompactSkippedRow =
            surface === "today"
            && exercise.isSkipped === true
            && progressState?.cardState !== "completed";
          return (
            <li key={exercise.id}>
              {shouldRenderCompactSkippedRow ? (
                <button
                  type="button"
                  className={[
                    "relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-none rounded-r-[var(--card-radius)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.86)] px-4 py-2.5 text-left opacity-60 saturate-[0.78] transition-[filter,transform] duration-75 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.2)]",
                    rowClassName,
                  ].filter(Boolean).join(" ")}
                  onClick={() => {
                    if (process.env.NODE_ENV === "development") {
                      console.debug(`[ExerciseInfo:open] ${sourceContext}`, { exerciseId: exercise.exerciseId, exercise });
                    }
                    setSelectedExerciseId(exercise.exerciseId);
                  }}
                >
                  {compactProgressFillStyle ? (
                    <span
                      aria-hidden="true"
                      className={[
                        "pointer-events-none absolute bottom-0 left-0 top-0 z-0 bg-[linear-gradient(90deg,rgb(var(--accent)/0.30),rgb(var(--accent)/0.17))]",
                        isCompactProgressFillComplete
                          ? "right-0 rounded-br-[var(--card-radius)] rounded-tr-[var(--card-radius)] shadow-[inset_-10px_0_18px_rgb(var(--accent)/0.20)]"
                          : "rounded-r-[999px] shadow-[0_0_18px_rgb(var(--accent)/0.12)]",
                      ].join(" ")}
                      style={compactProgressFillStyle}
                    />
                  ) : null}
                  <p className="relative z-[1] min-w-0 flex-1 whitespace-normal break-words text-[0.95rem] font-semibold leading-[1.2] text-[rgb(var(--text)/0.96)]">
                    {exercise.name}
                  </p>
                  <div className="relative z-[1]">
                    {renderProgressChevron(progressLabel, false)}
                  </div>
                </button>
              ) : (
                <StandardExerciseRow
                  exercise={exercise}
                  summary={resolvedSummary}
                  subtitleTone="plain"
                  variant="interactive"
                  density={density}
                  contentClassName={rowContentClassName}
                  state={progressState?.cardState ?? "default"}
                  semanticTone={progressState?.cardState === "completed" ? "completed" : undefined}
                  badgeText={progressState && progressState.goalSetTarget === null ? progressState.badgeText : undefined}
                  className={[
                    rowClassName,
                    progressState?.cardState === "completed"
      ? "border-[rgb(var(--success-rgb)/0.96)] bg-[linear-gradient(180deg,rgb(var(--success-rgb)/0.72),rgb(var(--surface-2-rgb)/0.99))] ring-1 ring-[rgb(var(--success-rgb)/0.42)]"
                      : undefined,
                    exercise.isSkipped && progressState && progressState.cardState !== "completed" ? "opacity-60 saturate-[0.78]" : undefined,
                  ].filter(Boolean).join(" ")}
                  rightIcon={rightIcon ?? renderProgressChevron(progressLabel, progressState?.cardState === "completed")}
                  onPress={() => {
                    if (process.env.NODE_ENV === "development") {
                      console.debug(`[ExerciseInfo:open] ${sourceContext}`, { exerciseId: exercise.exerciseId, exercise });
                    }
                    setSelectedExerciseId(exercise.exerciseId);
                  }}
                  surface={surface}
                  showLeadingVisual={policy.showMedia}
                  showAccentRail={!isStretchHub}
                  hideEmptySummary={isStretchHub}
                  progressFill={resolvedProgressFill}
                >
                  <WorkoutExerciseCardDetails
                    density={density}
                    chips={chips}
                    detailedMetrics={visibleDetailedMetrics}
                  />
                </StandardExerciseRow>
              )}
            </li>
          );
        })}
        {exercises.length === 0 ? <li className="rounded-[var(--radius-md)] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.72)] px-3 py-3 text-center text-sm leading-normal text-[rgb(var(--text-muted)/0.96)]">{emptyMessage}</li> : null}
      </ul>

      <ExerciseInfo
        exerciseId={selectedExerciseId}
        open={Boolean(selectedExerciseId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedExerciseId(null);
          }
        }}
        onClose={() => {
          setSelectedExerciseId(null);
        }}
        sourceContext={sourceContext}
      />
    </>
  );
}
