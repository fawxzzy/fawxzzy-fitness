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

export type TodayPickerDayState = "rest" | "empty" | "partial" | "runnable";

export type TodayPickerExercise = {
  id: string;
  name: string;
};

export type TodayPickerDay<TExercise = TodayPickerExercise> = {
  id: string;
  dayIndex: number;
  name: string;
  isRest: boolean;
  state: TodayPickerDayState;
  invalidExerciseCount: number;
  exercises: TExercise[];
};

export type TodaySummaryTone = "blocking" | "warning" | null;

export function getTodayDaySummary(day: TodayPickerDay): string | null {
  if (day.state === "rest") {
    return "Rest and recover.";
  }

  if (day.state === "empty" && day.invalidExerciseCount > 0) {
    return "This day has invalid exercises. Edit the day before starting a workout.";
  }

  if (day.state === "empty") {
    return "No exercises yet.";
  }

  if (day.state === "partial") {
    return "Some exercises could not be loaded and will be skipped when you start this workout.";
  }

  return null;
}

export function getTodayDaySummaryTone(day: TodayPickerDay): TodaySummaryTone {
  if (day.state === "empty" && day.invalidExerciseCount > 0) {
    return "blocking";
  }

  if (day.state === "partial") {
    return "warning";
  }

  return null;
}

export type TodayScreenMode<TDay extends TodayPickerDay = TodayPickerDay> = {
  selectedDay: TDay | null;
  selectedDayIndex: number | null;
  dayPickerOpen: boolean;
  restDay: boolean;
  emptyState: boolean;
  noRoutine: boolean;
  runnableSelection: boolean;
  hasInProgressSession: boolean;
  dayListVisible: boolean;
  dayRowsVisible: boolean;
  summaryVisible: boolean;
  cta: {
    showPrimary: boolean;
    primaryLabel: "Resume Session" | "Start Workout" | null;
    showSecondarySelectDay: boolean;
    secondaryLabel: "Select Day" | "Hide Days";
  };
};

export function deriveTodayScreenMode<TDay extends TodayPickerDay>(args: {
  days: TDay[];
  selectedDayIndex: number;
  currentDayIndex: number;
  dayPickerOpen: boolean;
  inProgressSessionId?: string | null;
}): TodayScreenMode<TDay> {
  const selectedDay = args.days.find((day) => day.dayIndex === args.selectedDayIndex)
    ?? args.days.find((day) => day.dayIndex === args.currentDayIndex)
    ?? null;
  const hasInProgressSession = Boolean(args.inProgressSessionId);
  const runnableSelection = selectedDay?.state === "runnable" || selectedDay?.state === "partial";
  const restDay = selectedDay?.state === "rest";
  const noRoutine = args.days.length === 0 || selectedDay === null;
  const emptyState = Boolean(selectedDay && selectedDay.exercises.length === 0);

  return {
    selectedDay,
    selectedDayIndex: selectedDay?.dayIndex ?? null,
    dayPickerOpen: args.dayPickerOpen,
    restDay: Boolean(restDay),
    emptyState,
    noRoutine,
    runnableSelection: Boolean(runnableSelection),
    hasInProgressSession,
    dayListVisible: args.dayPickerOpen,
    dayRowsVisible: !args.dayPickerOpen && !restDay && !noRoutine,
    summaryVisible: !args.dayPickerOpen && !restDay && !noRoutine && Boolean(getTodayDaySummary(selectedDay)),
    cta: {
      showPrimary: hasInProgressSession || Boolean(runnableSelection),
      primaryLabel: hasInProgressSession ? "Resume Session" : runnableSelection ? "Start Workout" : null,
      showSecondarySelectDay: true,
      secondaryLabel: args.dayPickerOpen ? "Hide Days" : "Select Day",
    },
  };
}
