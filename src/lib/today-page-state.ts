export function getTodayGlobalErrorMessage(args: {
  searchParamError?: string | null;
  hasInProgressSession: boolean;
  fetchFailed: boolean;
}) {
  const error = args.searchParamError?.trim();
  if (!error) return null;
  if (args.fetchFailed) return null;
  if (!args.hasInProgressSession) return null;
  return error;
}

type SessionDaySnapshot = {
  routine_day_index: number | null;
  routine_day_name: string | null;
};

type RoutineDayIdentity = {
  id: string;
  day_index: number;
  name: string | null;
  is_rest: boolean;
};

export function resolveTodayDisplayDay(args: {
  calendarDayIndex: number | null;
  todayRoutineDay: RoutineDayIdentity | null;
  routineDays: RoutineDayIdentity[];
  inProgressSession: SessionDaySnapshot | null;
}) {
  const sessionDayIndex = args.inProgressSession?.routine_day_index ?? null;

  if (sessionDayIndex !== null) {
    const matchedRoutineDay = args.routineDays.find((day) => day.day_index === sessionDayIndex) ?? null;
    const sessionDayName = args.inProgressSession?.routine_day_name?.trim() || null;

    return {
      dayIndex: sessionDayIndex,
      routineDay: matchedRoutineDay,
      dayName: sessionDayName ?? matchedRoutineDay?.name ?? `Day ${sessionDayIndex}`,
      source: "session" as const,
    };
  }

  const fallbackDay = args.todayRoutineDay
    ?? (args.calendarDayIndex === null ? null : args.routineDays.find((day) => day.day_index === args.calendarDayIndex) ?? null);
  const fallbackDayIndex = fallbackDay?.day_index ?? args.calendarDayIndex;

  return {
    dayIndex: fallbackDayIndex,
    routineDay: fallbackDay,
    dayName: fallbackDay ? fallbackDay.name ?? `Day ${fallbackDay.day_index}` : null,
    source: "calendar" as const,
  };
}
