import { isRoutineDayDefaultName } from "@/lib/routines";

export type RoutineDayCreationMode = "blank" | "duplicate";

export function shouldApplyRoutineDayCreationOverrides(args: {
  creationMode: RoutineDayCreationMode;
  requestedName: string;
  blankModeIsRest: boolean;
}) {
  const safeName = args.requestedName.trim().slice(0, 15);
  return (args.creationMode === "blank" && (safeName.length > 0 || args.blankModeIsRest))
    || (args.creationMode === "duplicate" && safeName.length > 0);
}

export function resolveDuplicatedRoutineDayName(args: {
  sourceDayName: string | null | undefined;
  sourceDayIndex: number;
  sourceRoutineStartDate: string | null | undefined;
  destinationDayIndex: number;
}) {
  return isRoutineDayDefaultName({
    name: args.sourceDayName,
    dayIndex: args.sourceDayIndex,
    startDate: args.sourceRoutineStartDate,
  })
    ? String(args.destinationDayIndex)
    : (args.sourceDayName?.trim() || String(args.destinationDayIndex));
}

export function resolveRoutineDayCreationOverrides(args: {
  creationMode: RoutineDayCreationMode;
  requestedName: string;
  blankModeIsRest: boolean;
  createdDay: {
    day_index: number;
    is_rest: boolean | null;
    name: string | null;
  };
}) {
  const safeName = args.requestedName.trim().slice(0, 15);
  if (!shouldApplyRoutineDayCreationOverrides(args)) {
    return {
      shouldUpdate: false,
      nextName: args.createdDay.name?.trim() || String(args.createdDay.day_index),
      nextIsRest: Boolean(args.createdDay.is_rest),
    };
  }

  return {
    shouldUpdate: true,
    nextName: safeName.length > 0
      ? safeName
      : (args.createdDay.name?.trim() || String(args.createdDay.day_index)),
    nextIsRest: args.creationMode === "blank"
      ? args.blankModeIsRest
      : Boolean(args.createdDay.is_rest),
  };
}
