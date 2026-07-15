import type { SessionSummary } from "@/app/history/session-summary";
import { getWeeklyProgressDayKey } from "@/lib/history-weekly-progress";

export type HistoryWorkoutStreakSummary = {
  currentSessionCount: number;
  bestSessionCount: number;
  trackedPlannedSessionCount: number;
  completedPlannedSessionCount: number;
  missedPlannedSessionCount: number;
  currentStartDayKey: string | null;
  currentEndDayKey: string | null;
  lastCompletedDayKey: string | null;
  statusLabel: string;
  ruleDescription: string;
};

const DEFAULT_TIMEZONE = "America/New_York";

function countBestCompletedRun(trackedDayKeys: string[], completedDayKeys: Set<string>) {
  let best = 0;
  let current = 0;

  for (const dayKey of trackedDayKeys) {
    current = completedDayKeys.has(dayKey) ? current + 1 : 0;
    best = Math.max(best, current);
  }

  return best;
}

export function buildHistoryWorkoutStreak({
  sessions,
  timezone = DEFAULT_TIMEZONE,
  skippedDayKeys = [],
}: {
  sessions: SessionSummary[];
  timezone?: string | null;
  skippedDayKeys?: string[];
}): HistoryWorkoutStreakSummary {
  const safeTimezone = typeof timezone === "string" && timezone.trim() ? timezone : DEFAULT_TIMEZONE;
  const completedDayKeys = new Set(
    sessions
      .map((session) => getWeeklyProgressDayKey(session.startedAt, safeTimezone))
      .filter((dayKey): dayKey is string => Boolean(dayKey)),
  );
  const trackedDayKeys = [...new Set([...completedDayKeys, ...skippedDayKeys])]
    .sort((left, right) => left.localeCompare(right));
  let currentSessionCount = 0;

  for (let index = trackedDayKeys.length - 1; index >= 0; index -= 1) {
    const dayKey = trackedDayKeys[index];
    if (!completedDayKeys.has(dayKey)) {
      break;
    }
    currentSessionCount += 1;
  }

  const currentEndIndex = trackedDayKeys.length - 1;
  const currentStartIndex = currentSessionCount > 0 ? trackedDayKeys.length - currentSessionCount : -1;
  const completedPlannedSessionCount = trackedDayKeys.filter((dayKey) => completedDayKeys.has(dayKey)).length;
  const missedPlannedSessionCount = trackedDayKeys.length - completedPlannedSessionCount;
  let statusLabel = "No active session streak";
  if (currentSessionCount === 1) {
    statusLabel = "1 planned session logged";
  } else if (currentSessionCount > 1) {
    statusLabel = `${currentSessionCount} planned sessions logged`;
  } else if (trackedDayKeys.length > 0) {
    statusLabel = "Ready for the next planned session";
  }

  return {
    currentSessionCount,
    bestSessionCount: countBestCompletedRun(trackedDayKeys, completedDayKeys),
    trackedPlannedSessionCount: trackedDayKeys.length,
    completedPlannedSessionCount,
    missedPlannedSessionCount,
    currentStartDayKey: currentStartIndex >= 0 ? (trackedDayKeys[currentStartIndex] ?? null) : null,
    currentEndDayKey: currentSessionCount > 0 ? (trackedDayKeys[currentEndIndex] ?? null) : null,
    lastCompletedDayKey: [...completedDayKeys].sort((left, right) => left.localeCompare(right)).at(-1) ?? null,
    statusLabel,
    ruleDescription: "A session streak counts consecutive required planned workout days that were logged. Rest days are ignored and a skipped required workout resets the streak.",
  };
}
