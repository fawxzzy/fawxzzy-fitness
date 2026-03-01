"use client";

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { getExerciseIconSrc, getExerciseMusclesImageSrc } from "@/lib/exerciseImages";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export type ExerciseInfoSheetExercise = {
  id: string;
  exercise_id?: string | null;
  name: string;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  image_muscles_path?: string | null;
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
};

const tagClassName = "rounded-full bg-surface-2-soft px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted";

function MetaTag({ value }: { value: string | null }) {
  if (!value) return null;
  return <span className={tagClassName}>{value}</span>;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
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

  const infoHowToSrc = exercise ? getExerciseIconSrc(exercise) : null;
  const hasHowToImage = !!infoHowToSrc && infoHowToSrc !== "/exercises/icons/_placeholder.svg";
  const infoMusclesSrc = getExerciseMusclesImageSrc(infoDetails?.image_muscles_path);
  const canonicalExerciseId = exercise ? (exercise.exercise_id ?? exercise.id) : null;
  const hasLast = stats
    ? (stats.last_weight != null && stats.last_reps != null && stats.last_performed_at != null)
    : false;
  const hasPR = stats
    ? ((stats.pr_weight != null && stats.pr_reps != null) || stats.pr_est_1rm != null)
    : false;

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

              {stats && (hasLast || hasPR) ? (
                <div className="space-y-1 rounded-md border border-border/50 bg-[rgb(var(--bg)/0.2)] px-2 py-1.5 text-xs text-muted">
                  <p className="text-xs uppercase tracking-wide text-muted">Personal</p>
                  {process.env.NODE_ENV === "development" ? (
                    <p className="font-mono text-[10px] text-muted/90">
                      DEBUG canonicalExerciseId={canonicalExerciseId ?? "none"} statsFound={stats ? "yes" : "no"} stats.exercise_id={stats.exercise_id ?? "none"}
                    </p>
                  ) : null}
                  {hasLast ? (
                    <p>
                      Last: {stats.last_weight} × {stats.last_reps}
                      {stats.last_performed_at ? ` · ${formatShortDate(stats.last_performed_at)}` : ""}
                    </p>
                  ) : null}
                  {hasPR ? (
                    <p>
                      PR: {stats.pr_weight != null && stats.pr_reps != null ? `${stats.pr_weight} × ${stats.pr_reps}` : ""}
                      {stats.pr_est_1rm != null ? `${stats.pr_weight != null && stats.pr_reps != null ? " · " : ""}Est 1RM ${Math.round(stats.pr_est_1rm)}` : ""}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {hasHowToImage && infoHowToSrc ? (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted">How-to</p>
                  <div className="aspect-[4/3] overflow-hidden rounded-md border border-border">
                    <ExerciseAssetImage
                      key={exercise.id ?? exercise.slug ?? infoHowToSrc ?? undefined}
                      src={infoHowToSrc}
                      alt="How-to visual"
                      className="h-full w-full object-contain object-center"
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted">Muscles</p>
                <ExerciseAssetImage src={infoMusclesSrc} alt="Muscles visual" className="w-full rounded-md border border-border" fallbackSrc="/exercises/placeholders/muscles.svg" />
              </div>

              {infoDetails?.how_to_short ? <p className="text-sm text-text">{infoDetails.how_to_short}</p> : null}

              {infoDetails && infoDetails.primary_muscles.length > 0 ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Primary muscles</p>
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
