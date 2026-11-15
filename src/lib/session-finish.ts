import { resolvePlannedSetCount, summarizeSessionSetProgress } from "@/lib/session-analytics";

export type SessionFinishCheckExercise = {
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  loggedSetCount: number;
  isSkipped: boolean;
};

export type SessionFinishCheck = {
  needsConfirm: boolean;
  plannedSets: number;
  loggedSets: number;
  /** "3 of 5 sets logged." (empty when nothing is unfinished). */
  message: string;
};

/**
 * Decides whether Finish needs a confirm sheet: only when planned sets are unfinished.
 * `live` is the client's live per-exercise snapshot (queued sets included), index-aligned with `exercises`;
 * when present it wins over the server-rendered counts.
 */
export function buildSessionFinishCheck(args: {
  exercises: SessionFinishCheckExercise[];
  live?: Array<{ loggedSetCount: number; isSkipped: boolean }> | null;
}): SessionFinishCheck {
  const progress = summarizeSessionSetProgress(
    args.exercises.map((exercise, index) => {
      const live = args.live?.[index];
      return {
        plannedSets: resolvePlannedSetCount({ targetSetsMin: exercise.targetSetsMin, targetSetsMax: exercise.targetSetsMax }),
        loggedSets: live ? live.loggedSetCount : exercise.loggedSetCount,
        isSkipped: live ? live.isSkipped : exercise.isSkipped,
      };
    }),
  );

  const needsConfirm = progress.loggedSets < progress.plannedSets;
  return {
    needsConfirm,
    plannedSets: progress.plannedSets,
    loggedSets: progress.loggedSets,
    message: needsConfirm ? `${progress.loggedSets} of ${progress.plannedSets} sets logged.` : "",
  };
}
