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

const SESSION_HEADER_SIGNAL_PRIORITY = [
  "live-session",
  "cycle-position",
  "session-status",
  "day-load",
  "day-focus",
  "routine-structure",
] as const;

type SessionHeaderSignalId = (typeof SESSION_HEADER_SIGNAL_PRIORITY)[number];

type CurrentSessionHeaderContext = {
  isCompleted?: boolean;
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
    value: args.isCompleted ? "Completed" : "In Progress",
    tone: args.isCompleted ? "success" : "accent",
    title: args.isCompleted ? "Workout session is complete" : "Current workout session is active",
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
      value: `${loggedExerciseCount} logged${skippedExerciseCount > 0 ? ` \u00B7 ${skippedExerciseCount} skipped` : ""}`,
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
      value: `${trainingDays} training \u00B7 ${restDays} rest`,
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
