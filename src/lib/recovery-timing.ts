/**
 * Observed rest ("recovery timing"), FF-SESSION-005.
 *
 * Contract (see docs/recovery-timing-contract.md):
 * - Source of truth is the set row's `logged_at` instant, nothing else. The exercise timer
 *   (`session_exercises.exercise_timer_*`) is a different concern and is never read here.
 * - Pure and deterministic: instants only, no wall-clock day, no time zone, no `Date.now()`.
 *   A session that crosses local midnight, or is read from another time zone, gives the same result.
 * - Explainable: the figure is the median gap between consecutive working sets of one exercise,
 *   limited to plausible gaps (15 s to 15 min). Fewer than two usable gaps gives `null`, never a guess.
 * - Descriptive only: it reports what happened. It never recommends a rest, claims recovery or coaches.
 */
export type RecoveryTimingSet = {
  logged_at?: string | null;
  is_warmup?: boolean | null;
};

export const RECOVERY_MIN_INTERVAL_SECONDS = 15;
export const RECOVERY_MAX_INTERVAL_SECONDS = 15 * 60;
export const RECOVERY_MIN_INTERVAL_SAMPLES = 2;
/** A session summary needs at least this many exercises with their own observed rest. */
export const RECOVERY_MIN_SUMMARY_EXERCISES = 2;

export type RecoveryTimingInsight = {
  /** Provenance marker so analytics can tell derived rest data from exercise-timer data. */
  source: "between_set_intervals";
  observedIntervalSeconds: number;
  sampleCount: number;
  label: string;
};

export type SessionRecoverySummary = {
  source: "between_set_intervals";
  observedIntervalSeconds: number;
  exerciseCount: number;
  sampleCount: number;
  label: string;
  /** Short scope line shown under the figure; the full rule is in docs/recovery-timing-contract.md. */
  detail: string;
};

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

export function formatRecoveryClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function buildRecoveryTimingInsight(sets: RecoveryTimingSet[]): RecoveryTimingInsight | null {
  const timestamps = sets
    .filter((set) => !set.is_warmup && set.logged_at)
    .map((set) => Date.parse(set.logged_at as string))
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  const intervals: number[] = [];
  for (let index = 1; index < timestamps.length; index += 1) {
    const seconds = Math.round((timestamps[index] - timestamps[index - 1]) / 1000);
    if (seconds >= RECOVERY_MIN_INTERVAL_SECONDS && seconds <= RECOVERY_MAX_INTERVAL_SECONDS) {
      intervals.push(seconds);
    }
  }
  if (intervals.length < RECOVERY_MIN_INTERVAL_SAMPLES) {
    return null;
  }

  const observedIntervalSeconds = median(intervals);
  return {
    source: "between_set_intervals",
    observedIntervalSeconds,
    sampleCount: intervals.length,
    label: `Observed rest ${formatRecoveryClock(observedIntervalSeconds)}`,
  };
}

/**
 * Session-level rest summary for History: the median of each exercise's own observed rest, so one
 * long break or one exercise with many sets cannot dominate. Needs two or more exercises with their
 * own observed rest; with one exercise the per-exercise label already says everything.
 */
export function buildSessionRecoverySummary(exerciseSets: RecoveryTimingSet[][]): SessionRecoverySummary | null {
  const insights = exerciseSets
    .map((sets) => buildRecoveryTimingInsight(sets))
    .filter((insight): insight is RecoveryTimingInsight => insight !== null);
  if (insights.length < RECOVERY_MIN_SUMMARY_EXERCISES) {
    return null;
  }

  const observedIntervalSeconds = median(insights.map((insight) => insight.observedIntervalSeconds));
  return {
    source: "between_set_intervals",
    observedIntervalSeconds,
    exerciseCount: insights.length,
    sampleCount: insights.reduce((sum, insight) => sum + insight.sampleCount, 0),
    label: formatRecoveryClock(observedIntervalSeconds),
    detail: `Median of ${insights.length} exercises`,
  };
}
