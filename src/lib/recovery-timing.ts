export type RecoveryTimingSet = {
  logged_at?: string | null;
  is_warmup?: boolean | null;
};

export type RecoveryTimingInsight = {
  observedIntervalSeconds: number;
  sampleCount: number;
  label: string;
};

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
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
    if (seconds >= 15 && seconds <= 15 * 60) {
      intervals.push(seconds);
    }
  }
  if (intervals.length < 2) {
    return null;
  }

  const observedIntervalSeconds = median(intervals);
  return {
    observedIntervalSeconds,
    sampleCount: intervals.length,
    label: `Observed rest ${Math.floor(observedIntervalSeconds / 60)}:${String(observedIntervalSeconds % 60).padStart(2, "0")}`,
  };
}
