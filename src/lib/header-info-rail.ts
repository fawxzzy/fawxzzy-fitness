export type HeaderInfoRailTone = "default" | "muted" | "accent" | "success" | "warning";

export type HeaderInfoRailItem = {
  id: string;
  label: string;
  value?: string | number | null;
  tone?: HeaderInfoRailTone;
  title?: string;
  valuePosition?: "before" | "after";
};

const ROUTINE_EDITOR_HEADER_SIGNAL_PRIORITY = [
  "live-session",
  "today-state",
  "cycle-progress",
  "workout-plan-count",
  "rest-count",
  "exercise-count",
  "totals",
] as const;

type RoutineEditorHeaderSignalId = (typeof ROUTINE_EDITOR_HEADER_SIGNAL_PRIORITY)[number];

type CurrentRoutineHeaderDay = {
  dayIndex: number;
  isRest: boolean;
  isToday: boolean;
  isCompleted: boolean;
  isSkipped?: boolean;
  isInSession: boolean;
  autoProgressionExerciseCount?: number | null;
  splitSummary?: {
    total: number;
  } | null;
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

function buildRoutineWorkoutPlanEditorSignalMap(args: {
  trainingDays: number | null | undefined;
  restDays: number | null | undefined;
  days: CurrentRoutineHeaderDay[];
}): Partial<Record<RoutineEditorHeaderSignalId, HeaderInfoRailItem>> {
  const workoutPlanCount = normalizeCount(args.trainingDays);
  const restCount = normalizeCount(args.restDays);
  const routineLength = Math.max(args.days.length, workoutPlanCount + restCount, 0);
  const totalExercises = args.days.reduce((sum, day) => sum + normalizeCount(day.splitSummary?.total), 0);
  const autoProgressionExerciseCount = args.days.reduce((sum, day) => sum + normalizeCount(day.autoProgressionExerciseCount), 0);
  const inSessionDay = args.days.find((day) => day.isInSession) ?? null;
  const todayDay = args.days.find((day) => day.isToday) ?? null;
  const signalMap: Partial<Record<RoutineEditorHeaderSignalId, HeaderInfoRailItem>> = {};

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
      label: "Cycle Slot",
      value: `Day ${normalizeCount(todayDay.dayIndex)} of ${routineLength}`,
      tone: "default",
      title: "Current day position inside this routine cycle",
      valuePosition: "after",
    };
  }

  if (workoutPlanCount > 0) {
    signalMap["workout-plan-count"] = {
      id: "workout-plan-count",
      label: workoutPlanCount === 1 ? "day" : "days",
      value: workoutPlanCount,
      tone: "accent",
      title: "Configured days in this routine",
    };
  }

  if (restCount > 0) {
    signalMap["rest-count"] = {
      id: "rest-count",
      label: restCount === 1 ? "rest day" : "rest days",
      value: restCount,
      tone: "muted",
      title: "Configured rest days in this routine",
    };
  }

  if (totalExercises > 0) {
    signalMap["exercise-count"] = {
      id: "exercise-count",
      label: "exercises",
      value: totalExercises,
      tone: "default",
      title: "Total exercises currently configured in this routine",
    };
  }

  if (workoutPlanCount > 0 || totalExercises > 0 || autoProgressionExerciseCount > 0) {
    signalMap.totals = {
      id: "totals",
      label: "Totals",
      value: `${workoutPlanCount} days • ${totalExercises} exercises${autoProgressionExerciseCount > 0 ? ` • ${autoProgressionExerciseCount} auto` : ""}`,
      tone: autoProgressionExerciseCount > 0 ? "accent" : "default",
      title: "Routine totals across days, exercises, and auto progression coverage",
      valuePosition: "after",
    };
  }

  return signalMap;
}

export function buildRoutineWorkoutPlanEditorInfoRailItems(args: {
  trainingDays: number | null | undefined;
  restDays: number | null | undefined;
  days: CurrentRoutineHeaderDay[];
  maxItems?: number;
}): HeaderInfoRailItem[] {
  const signalMap = buildRoutineWorkoutPlanEditorSignalMap(args);
  const maxItems = Math.max(1, Math.floor(args.maxItems ?? 4));

  return ROUTINE_EDITOR_HEADER_SIGNAL_PRIORITY
    .map((signalId) => signalMap[signalId])
    .filter((item): item is HeaderInfoRailItem => Boolean(item))
    .slice(0, maxItems);
}
