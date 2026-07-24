import type { SessionSummary } from "@/app/history/session-summary";
import { getWeeklyProgressDayKey, shiftWeeklyProgressDay } from "@/lib/history-weekly-progress";

export type HistoryPlannedRoutine = {
  id: string;
  startDate: string | null;
  cycleLengthDays: number | null;
  timeZone: string;
  isActive: boolean;
};

export type HistoryPlannedRoutineDay = {
  routineId: string;
  dayIndex: number;
  isRest: boolean;
};

export type HistorySkippedWorkoutDay = {
  dayKey: string;
  routineId: string;
};

function dayDifference(left: string, right: string) {
  const leftTime = Date.parse(`${left}T12:00:00.000Z`);
  const rightTime = Date.parse(`${right}T12:00:00.000Z`);
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
    return null;
  }

  return Math.round((leftTime - rightTime) / 86_400_000);
}

export function buildHistorySkippedWorkoutDays({
  routines,
  routineDays,
  sessions,
  now = new Date().toISOString(),
}: {
  routines: HistoryPlannedRoutine[];
  routineDays: HistoryPlannedRoutineDay[];
  sessions: SessionSummary[];
  now?: string;
}): HistorySkippedWorkoutDay[] {
  const sessionsByRoutineId = new Map<string, SessionSummary[]>();
  for (const session of sessions) {
    const routineId = session.routineId?.trim();
    if (!routineId) continue;
    const current = sessionsByRoutineId.get(routineId) ?? [];
    current.push(session);
    sessionsByRoutineId.set(routineId, current);
  }

  const daysByRoutineId = new Map<string, HistoryPlannedRoutineDay[]>();
  for (const day of routineDays) {
    if (day.isRest || day.dayIndex < 1) continue;
    const current = daysByRoutineId.get(day.routineId) ?? [];
    current.push(day);
    daysByRoutineId.set(day.routineId, current);
  }

  const skipped: HistorySkippedWorkoutDay[] = [];
  const seen = new Set<string>();

  for (const routine of routines) {
    const cycleLength = routine.cycleLengthDays && routine.cycleLengthDays > 0
      ? Math.floor(routine.cycleLengthDays)
      : 0;
    const plannedDays = daysByRoutineId.get(routine.id) ?? [];
    const routineSessions = sessionsByRoutineId.get(routine.id) ?? [];
    if (!routine.startDate || cycleLength < 1 || plannedDays.length === 0 || routineSessions.length === 0) {
      continue;
    }

    const loggedDayKeys = new Set(
      routineSessions
        .map((session) => getWeeklyProgressDayKey(session.startedAt, routine.timeZone))
        .filter((dayKey): dayKey is string => Boolean(dayKey)),
    );
    const observedDayKeys = [...loggedDayKeys].sort((left, right) => left.localeCompare(right));
    const todayKey = getWeeklyProgressDayKey(now, routine.timeZone);
    if (!todayKey || observedDayKeys.length === 0) continue;

    const rangeStart = routine.startDate > observedDayKeys[0] ? routine.startDate : observedDayKeys[0];
    const lastPastDay = shiftWeeklyProgressDay(todayKey, -1);
    const rangeEnd = routine.isActive
      ? lastPastDay
      : observedDayKeys[observedDayKeys.length - 1];
    if (rangeStart > rangeEnd) continue;

    for (const plannedDay of plannedDays) {
      const firstOccurrence = shiftWeeklyProgressDay(routine.startDate, plannedDay.dayIndex - 1);
      const offsetToRange = dayDifference(rangeStart, firstOccurrence);
      if (offsetToRange === null) continue;
      const firstCycleOffset = offsetToRange <= 0 ? 0 : Math.ceil(offsetToRange / cycleLength) * cycleLength;

      for (
        let dayKey = shiftWeeklyProgressDay(firstOccurrence, firstCycleOffset);
        dayKey <= rangeEnd;
        dayKey = shiftWeeklyProgressDay(dayKey, cycleLength)
      ) {
        if (dayKey < rangeStart || loggedDayKeys.has(dayKey)) continue;
        const identity = `${routine.id}:${dayKey}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        skipped.push({ dayKey, routineId: routine.id });
      }
    }
  }

  return skipped.sort((left, right) => {
    const dayOrder = left.dayKey.localeCompare(right.dayKey);
    return dayOrder !== 0 ? dayOrder : left.routineId.localeCompare(right.routineId);
  });
}
