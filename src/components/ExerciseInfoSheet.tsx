"use client";

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { getExerciseHowToImageSrcOrNull, getExerciseMusclesImageSrc } from "@/lib/exerciseImages";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export type ExerciseInfoSheetExercise = {
  id: string;
  exercise_id?: string | null;
  name: string;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  image_muscles_path?: string | null;
  image_howto_path?: string | null;
  how_to_short?: string | null;
  image_icon_path?: string | null;
  slug?: string | null;
};

type ExerciseInfoSheetStats = {
  exercise_id?: string;
  last_weight: number | null;
  last_reps: number | null;
  last_unit: string | null;
  last_performed_at: string | null;
  pr_weight: number | null;
  pr_reps: number | null;
  pr_est_1rm: number | null;
  actual_pr_weight: number | null;
  actual_pr_reps: number | null;
  actual_pr_at: string | null;
};

const tagClassName = "rounded-full bg-surface-2-soft px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted";
const sectionTitleClassName = "text-xs font-semibold uppercase tracking-wide text-muted";

function MetaTag({ value }: { value: string | null }) {
  if (!value) return null;
  return <span className={tagClassName}>{value}</span>;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatWeight(weight: number) {
  return Number.isInteger(weight) ? String(weight) : weight.toFixed(1).replace(/\.0$/, "");
}

function formatWeightReps(weight: number | null, reps: number | null, unit: string | null) {
  const weightLabel = typeof weight === "number" && Number.isFinite(weight) && weight > 0 ? formatWeight(weight) : null;
  const repsLabel = typeof reps === "number" && Number.isFinite(reps) && reps > 0 ? String(reps) : null;
  const normalizedUnit = unit === "lb" || unit === "lbs" ? "lb" : unit === "kg" ? "kg" : "";
  const unitSuffix = weightLabel && normalizedUnit ? normalizedUnit : "";

  if (weightLabel && repsLabel) {
    return `${weightLabel}${unitSuffix}×${repsLabel}`;
  }

  return null;
}

export function ExerciseInfoSheet({
  exercise,
  stats,
  open,
  onOpenChange,
}: {
  exercise: ExerciseInfoSheetExercise | null;
  stats?: ExerciseInfoSheetStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  const infoDetails = useMemo(() => {
    if (!exercise) {
      return null;
    }

    const primaryMuscles = exercise.primary_muscle ? [exercise.primary_muscle] : [];
    return {
      ...exercise,
      primary_muscles: primaryMuscles,
    };
  }, [exercise]);

  const resolvedHowToSrc = exercise ? getExerciseHowToImageSrcOrNull(exercise) : null;
  const infoMusclesSrc = getExerciseMusclesImageSrc(infoDetails?.image_muscles_path);
  const canonicalExerciseId = exercise ? (exercise.exercise_id ?? exercise.id) : null;
  const lastSummary = stats ? formatWeightReps(stats.last_weight, stats.last_reps, stats.last_unit) : null;
  const actualPrSummary = stats ? formatWeightReps(stats.actual_pr_weight, stats.actual_pr_reps, stats.last_unit) : null;
  const e1rmSummary = stats?.pr_est_1rm != null && stats.pr_est_1rm > 0
    ? `e1RM ${Math.round(stats.pr_est_1rm)}${stats.pr_weight != null && stats.pr_reps != null ? ` (from ${formatWeightReps(stats.pr_weight, stats.pr_reps, stats.last_unit) ?? `${stats.pr_weight}×${stats.pr_reps}`})` : ""}`
    : null;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !exercise) return;

    console.log("[ExerciseInfoSheet:Stats]", {
      canonicalExerciseId,
      statsFound: Boolean(stats),
      statsExerciseId: stats?.exercise_id ?? null,
    });
  }, [canonicalExerciseId, exercise, stats]);

  if (!open || !exercise) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Exercise info"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div className="absolute inset-0 h-[100dvh] w-full bg-[rgb(var(--bg))]">
        <section className="flex h-full w-full flex-col">
          <div className="sticky top-0 z-10 border-b border-border bg-[rgb(var(--bg))] pt-[max(env(safe-area-inset-top),0px)]">
            <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 px-4 py-3">
              <h2 className="text-2xl font-semibold">Exercise info</h2>
              <button type="button" onClick={() => onOpenChange(false)} className={getAppButtonClassName({ variant: "ghost", size: "sm" })}>Close</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-xl space-y-3 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
              <div>
                <p className="text-base font-semibold text-text">{exercise.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <MetaTag value={exercise.equipment} />
                  <MetaTag value={exercise.primary_muscle} />
                  <MetaTag value={exercise.movement_pattern} />
                </div>
              </div>

              {stats ? (
                <div className="space-y-1 rounded-md border border-border/60 bg-[rgb(var(--bg)/0.28)] px-2.5 py-2 text-xs text-muted">
                  <p className={sectionTitleClassName}>Stats</p>
                  {process.env.NODE_ENV === "development" ? (
                    <p className="font-mono text-[10px] text-muted/90">
                      DEBUG canonicalExerciseId={canonicalExerciseId ?? "none"} statsFound={stats ? "yes" : "no"} stats.exercise_id={stats.exercise_id ?? "none"}
                    </p>
                  ) : null}
                  {lastSummary ? (
                    <p>
                      Last: {lastSummary}
                      {stats.last_performed_at ? ` · ${formatShortDate(stats.last_performed_at)}` : ""}
                    </p>
                  ) : null}
                  {actualPrSummary ? (
                    <p>
                      Actual PR: {actualPrSummary}
                      {stats.actual_pr_at ? ` · ${formatShortDate(stats.actual_pr_at)}` : ""}
                    </p>
                  ) : null}
                  {e1rmSummary ? <p>Strength PR: {e1rmSummary}</p> : null}
                  {!lastSummary && !actualPrSummary && !e1rmSummary ? (
                    <p className="text-muted">No history yet</p>
                  ) : null}
                </div>
              ) : null}

              {resolvedHowToSrc ? (
                <div className="space-y-1">
                  <p className={sectionTitleClassName}>How-to</p>
                  <div className="flex h-44 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-[rgb(var(--bg)/0.28)] p-3 sm:h-48">
                    <ExerciseAssetImage
                      key={exercise.id ?? exercise.slug ?? resolvedHowToSrc}
                      src={resolvedHowToSrc}
                      alt="How-to visual"
                      className="h-full w-full object-contain object-center"
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-1">
                <p className={sectionTitleClassName}>Muscles</p>
                <div className="flex h-44 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-[rgb(var(--bg)/0.28)] p-3 sm:h-48">
                  <ExerciseAssetImage
                    src={infoMusclesSrc}
                    alt="Muscles visual"
                    className="h-full w-full object-contain object-center"
                    fallbackSrc="/exercises/placeholders/muscles.svg"
                  />
                </div>
              </div>

              {infoDetails?.how_to_short ? <p className="text-sm text-text">{infoDetails.how_to_short}</p> : null}

              {infoDetails && infoDetails.primary_muscles.length > 0 ? (
                <div>
                  <p className={sectionTitleClassName}>Primary muscles</p>
                  <div className="mt-1 flex flex-wrap gap-1">{infoDetails.primary_muscles.map((item) => <span key={item} className={tagClassName}>{item}</span>)}</div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
