import {
  formatRoutineDayExerciseCountLabel,
  resolveRoutineDayExerciseDescriptor,
  type RoutineDayCardCounts,
} from "@/lib/routine-day-card-summary";

export type HeaderInfoRailTone = "default" | "muted" | "accent" | "success" | "warning";

export type HeaderInfoRailItem = {
  id: string;
  label: string;
  value?: string | number | null;
  tone?: HeaderInfoRailTone;
  title?: string;
  valuePosition?: "before" | "after";
};

export const ROUTINE_HEADER_SIGNAL_PRIORITY = [
  "live-session",
  "today-state",
  "cycle-progress",
  "cycle-status",
  "structure",
  "exercise-count",
] as const;

type RoutineHeaderSignalId = (typeof ROUTINE_HEADER_SIGNAL_PRIORITY)[number];
const TODAY_HEADER_SIGNAL_PRIORITY = [
  "live-session",
  "day-state",
  "cycle-position",
  "day-status",
  "day-load",
  "day-focus",
  "routine-structure",
] as const;

type TodayHeaderSignalId = (typeof TODAY_HEADER_SIGNAL_PRIORITY)[number];
const SESSION_HEADER_SIGNAL_PRIORITY = [
  "live-session",
  "cycle-position",
  "session-status",
  "day-load",
  "day-focus",
  "routine-structure",
] as const;

type SessionHeaderSignalId = (typeof SESSION_HEADER_SIGNAL_PRIORITY)[number];

type CurrentRoutineHeaderDay = {
  dayIndex: number;
  isRest: boolean;
  isToday: boolean;
  isCompleted: boolean;
  isSkipped?: boolean;
  isInSession: boolean;
  splitSummary?: {
    total: number;
  } | null;
};

type CurrentTodayHeaderDay = {
  dayIndex: number;
  isRest: boolean;
  isToday: boolean;
  isInSession: boolean;
  state: "rest" | "empty" | "partial" | "runnable";
  invalidExerciseCount: number;
  splitSummary?: RoutineDayCardCounts | null;
};

type CurrentSessionHeaderContext = {
  sessionDayIndex?: number | null;
  cycleLengthDays?: number | null;
  isRestDay?: boolean;
  trainingDays?: number | null | undefined;
  restDays?: number | null | undefined;
  sessionExerciseCount?: number | null | undefined;
  loggedExerciseCount?: number | null | undefined;
  skippedExerciseCount?: number | null | undefined;
  splitSummary?: RoutineDayCardCounts | null;
};

function normalizeCount(value: number | null | undefined) {
  if (!Number.isFinite(value ?? null)) {
    return 0;
  }

  return Math.max(0, Math.floor(value as number));
}

export function buildRoutineTrainingRestInfoRailItems(args: {
  trainingDays: number | null | undefined;
  restDays: number | null | undefined;
}): HeaderInfoRailItem[] {
  return [
    {
      id: "training-days",
      label: "training",
      value: normalizeCount(args.trainingDays),
      tone: "accent",
      title: "Training days in this routine cycle",
    },
    {
      id: "rest-days",
      label: "rest",
      value: normalizeCount(args.restDays),
      tone: "muted",
      title: "Rest days in this routine cycle",
    },
  ];
}

export function buildRoutineBrowseInfoRailItems(args: {
  activeRoutineName?: string | null;
  routineCount: number | null | undefined;
}): HeaderInfoRailItem[] {
  const items: HeaderInfoRailItem[] = [];

  if (args.activeRoutineName?.trim()) {
    items.push({
      id: "active-routine",
      label: "Active",
      value: args.activeRoutineName.trim(),
      tone: "accent",
      title: "Current active routine",
      valuePosition: "after",
    });
  }

  const routineCount = normalizeCount(args.routineCount);
  items.push({
    id: "routine-count",
    label: routineCount === 1 ? "routine total" : "routines total",
    value: routineCount,
    tone: "default",
    title: "Total available routines",
  });

  return items;
}

function buildRoutineHeaderSignalMap(args: {
  trainingDays: number | null | undefined;
  restDays: number | null | undefined;
  days: CurrentRoutineHeaderDay[];
}): Partial<Record<RoutineHeaderSignalId, HeaderInfoRailItem>> {
  const trainingDays = normalizeCount(args.trainingDays);
  const restDays = normalizeCount(args.restDays);
  const routineLength = Math.max(args.days.length, trainingDays + restDays, 0);
  const totalExercises = args.days.reduce((sum, day) => sum + normalizeCount(day.splitSummary?.total), 0);
  const inSessionDay = args.days.find((day) => day.isInSession) ?? null;
  const todayDay = args.days.find((day) => day.isToday) ?? null;
  const completedCount = args.days.filter((day) => day.isCompleted).length;
  const skippedCount = args.days.filter((day) => Boolean(day.isSkipped)).length;
  const signalMap: Partial<Record<RoutineHeaderSignalId, HeaderInfoRailItem>> = {};

  if (inSessionDay) {
    signalMap["live-session"] = {
      id: "live-session",
      label: "In Session",
      value: `Day ${normalizeCount(inSessionDay.dayIndex)}`,
      tone: "accent",
      title: "Current active session day",
      valuePosition: "after",
    };
  } else if (todayDay) {
    signalMap["today-state"] = {
      id: "today-state",
      label: "Today",
      value: todayDay.isRest ? "Rest Day" : "Workout Day",
      tone: todayDay.isRest ? "muted" : "accent",
      title: todayDay.isRest ? "Today resolves to a routine rest day" : "Today resolves to a routine workout day",
      valuePosition: "after",
    };
  }

  if (todayDay && routineLength > 0) {
    signalMap["cycle-progress"] = {
      id: "cycle-progress",
      label: "Cycle Progress",
      value: `Day ${normalizeCount(todayDay.dayIndex)} of ${routineLength}`,
      tone: "default",
      title: "Current day position inside this routine cycle",
      valuePosition: "after",
    };
  }

  if (completedCount > 0 || skippedCount > 0) {
    signalMap["cycle-status"] = {
      id: "cycle-status",
      label: "Cycle Status",
      value: `${completedCount} done${skippedCount > 0 ? ` · ${skippedCount} skipped` : ""}`,
      tone: skippedCount > 0 ? "warning" : "success",
      title: "Completion and skip status across the current routine cycle",
      valuePosition: "after",
    };
  }

  if (trainingDays > 0 || restDays > 0) {
    signalMap.structure = {
      id: "structure",
      label: "Structure",
      value: `${trainingDays} training · ${restDays} rest`,
      tone: "default",
      title: "Training and rest day split in this routine cycle",
      valuePosition: "after",
    };
  }

  if (totalExercises > 0) {
    signalMap["exercise-count"] = {
      id: "exercise-count",
      label: "Exercises",
      value: totalExercises,
      tone: "default",
      title: "Total exercises currently configured in this routine",
      valuePosition: "after",
    };
  }

  return signalMap;
}

export function buildCurrentRoutineInfoRailItems(args: {
  trainingDays: number | null | undefined;
  restDays: number | null | undefined;
  days: CurrentRoutineHeaderDay[];
  maxItems?: number;
}): HeaderInfoRailItem[] {
  const signalMap = buildRoutineHeaderSignalMap(args);
  const maxItems = Math.max(1, Math.floor(args.maxItems ?? 4));

  return ROUTINE_HEADER_SIGNAL_PRIORITY
    .map((signalId) => signalMap[signalId])
    .filter((item): item is HeaderInfoRailItem => Boolean(item))
    .slice(0, maxItems);
}

function buildTodayHeaderSignalMap(args: {
  trainingDays: number | null | undefined;
  restDays: number | null | undefined;
  daysLength: number;
  selectedDay: CurrentTodayHeaderDay;
}): Partial<Record<TodayHeaderSignalId, HeaderInfoRailItem>> {
  const trainingDays = normalizeCount(args.trainingDays);
  const restDays = normalizeCount(args.restDays);
  const routineLength = Math.max(args.daysLength, trainingDays + restDays, 0);
  const totalExercises = normalizeCount(args.selectedDay.splitSummary?.total);
  const descriptor = args.selectedDay.splitSummary
    ? resolveRoutineDayExerciseDescriptor(args.selectedDay.splitSummary)
    : null;
  const signalMap: Partial<Record<TodayHeaderSignalId, HeaderInfoRailItem>> = {};

  if (args.selectedDay.isInSession) {
    signalMap["live-session"] = {
      id: "live-session",
      label: "In Session",
      value: `Day ${normalizeCount(args.selectedDay.dayIndex)}`,
      tone: "accent",
      title: "Current active routine day session",
      valuePosition: "after",
    };
  } else {
    signalMap["day-state"] = {
      id: "day-state",
      label: args.selectedDay.isToday ? "Today" : "Viewing",
      value: args.selectedDay.isRest ? "Rest Day" : "Workout Day",
      tone: args.selectedDay.isRest ? "muted" : "accent",
      title: args.selectedDay.isToday
        ? "Current routine day state"
        : "Currently viewed routine day state",
      valuePosition: "after",
    };
  }

  if (routineLength > 0) {
    signalMap["cycle-position"] = {
      id: "cycle-position",
      label: "Cycle",
      value: `Day ${normalizeCount(args.selectedDay.dayIndex)} of ${routineLength}`,
      tone: "default",
      title: "Selected day position inside the current routine cycle",
      valuePosition: "after",
    };
  }

  if (args.selectedDay.state === "partial") {
    signalMap["day-status"] = {
      id: "day-status",
      label: "Status",
      value: "Some exercises skipped",
      tone: "warning",
      title: "Some exercises on this day are unavailable and will be skipped",
      valuePosition: "after",
    };
  } else if (args.selectedDay.state === "empty" && args.selectedDay.invalidExerciseCount > 0) {
    signalMap["day-status"] = {
      id: "day-status",
      label: "Status",
      value: "Invalid setup",
      tone: "warning",
      title: "This day has invalid exercise entries that should be repaired",
      valuePosition: "after",
    };
  } else if (args.selectedDay.state === "empty" && !args.selectedDay.isRest) {
    signalMap["day-status"] = {
      id: "day-status",
      label: "Status",
      value: "No exercises planned",
      tone: "muted",
      title: "No exercises are currently configured for this day",
      valuePosition: "after",
    };
  }

  if (!args.selectedDay.isRest && totalExercises > 0) {
    signalMap["day-load"] = {
      id: "day-load",
      label: "Day Load",
      value: formatRoutineDayExerciseCountLabel(totalExercises),
      tone: "default",
      title: "Configured exercise count for this day",
      valuePosition: "after",
    };
  }

  if (!args.selectedDay.isRest && descriptor) {
    signalMap["day-focus"] = {
      id: "day-focus",
      label: "Focus",
      value: descriptor,
      tone: "default",
      title: "Overall exercise mix for this day",
      valuePosition: "after",
    };
  }

  if (trainingDays > 0 || restDays > 0) {
    signalMap["routine-structure"] = {
      id: "routine-structure",
      label: "Structure",
      value: `${trainingDays} training · ${restDays} rest`,
      tone: "default",
      title: "Training and rest day split across this routine",
      valuePosition: "after",
    };
  }

  return signalMap;
}

export function buildTodayHeaderInfoRailItems(args: {
  trainingDays: number | null | undefined;
  restDays: number | null | undefined;
  daysLength: number;
  selectedDay: CurrentTodayHeaderDay | null | undefined;
  maxItems?: number;
}): HeaderInfoRailItem[] {
  if (!args.selectedDay) {
    return [];
  }

  const signalMap = buildTodayHeaderSignalMap({
    trainingDays: args.trainingDays,
    restDays: args.restDays,
    daysLength: args.daysLength,
    selectedDay: args.selectedDay,
  });
  const maxItems = Math.max(1, Math.floor(args.maxItems ?? 4));

  return TODAY_HEADER_SIGNAL_PRIORITY
    .map((signalId) => signalMap[signalId])
    .filter((item): item is HeaderInfoRailItem => Boolean(item))
    .slice(0, maxItems);
}

function buildCurrentSessionHeaderSignalMap(args: CurrentSessionHeaderContext): Partial<Record<SessionHeaderSignalId, HeaderInfoRailItem>> {
  const trainingDays = normalizeCount(args.trainingDays);
  const restDays = normalizeCount(args.restDays);
  const cycleLengthDays = Math.max(
    normalizeCount(args.cycleLengthDays),
    trainingDays + restDays,
    0,
  );
  const sessionExerciseCount = normalizeCount(args.sessionExerciseCount ?? args.splitSummary?.total);
  const loggedExerciseCount = normalizeCount(args.loggedExerciseCount);
  const skippedExerciseCount = normalizeCount(args.skippedExerciseCount);
  const descriptor = args.splitSummary ? resolveRoutineDayExerciseDescriptor(args.splitSummary) : null;
  const signalMap: Partial<Record<SessionHeaderSignalId, HeaderInfoRailItem>> = {};

  signalMap["live-session"] = {
    id: "live-session",
    label: "Session",
    value: "In Progress",
    tone: "accent",
    title: "Current workout session is active",
    valuePosition: "after",
  };

  if (normalizeCount(args.sessionDayIndex) > 0 && cycleLengthDays > 0) {
    signalMap["cycle-position"] = {
      id: "cycle-position",
      label: "Cycle",
      value: `Day ${normalizeCount(args.sessionDayIndex)} of ${cycleLengthDays}`,
      tone: "default",
      title: "Current day position inside this routine cycle",
      valuePosition: "after",
    };
  }

  if (loggedExerciseCount > 0 || skippedExerciseCount > 0) {
    signalMap["session-status"] = {
      id: "session-status",
      label: "Progress",
      value: `${loggedExerciseCount} logged${skippedExerciseCount > 0 ? ` Â· ${skippedExerciseCount} skipped` : ""}`,
      tone: skippedExerciseCount > 0 ? "warning" : "success",
      title: "Logged and skipped exercise status in this session",
      valuePosition: "after",
    };
  }

  if (!args.isRestDay && sessionExerciseCount > 0) {
    signalMap["day-load"] = {
      id: "day-load",
      label: "Day Load",
      value: formatRoutineDayExerciseCountLabel(sessionExerciseCount),
      tone: "default",
      title: "Configured exercise count for this session day",
      valuePosition: "after",
    };
  }

  if (!args.isRestDay && descriptor) {
    signalMap["day-focus"] = {
      id: "day-focus",
      label: "Focus",
      value: descriptor,
      tone: "default",
      title: "Overall exercise mix for this session day",
      valuePosition: "after",
    };
  }

  if (trainingDays > 0 || restDays > 0) {
    signalMap["routine-structure"] = {
      id: "routine-structure",
      label: "Structure",
      value: `${trainingDays} training Â· ${restDays} rest`,
      tone: "default",
      title: "Training and rest day split across this routine",
      valuePosition: "after",
    };
  }

  return signalMap;
}

export function buildCurrentSessionHeaderInfoRailItems(args: CurrentSessionHeaderContext & {
  maxItems?: number;
}): HeaderInfoRailItem[] {
  const signalMap = buildCurrentSessionHeaderSignalMap(args);
  const maxItems = Math.max(1, Math.floor(args.maxItems ?? 4));

  return SESSION_HEADER_SIGNAL_PRIORITY
    .map((signalId) => signalMap[signalId])
    .filter((item): item is HeaderInfoRailItem => Boolean(item))
    .slice(0, maxItems);
}
