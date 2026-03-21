import { resolveReturnHref } from "@/lib/navigation-return";

function decodeReturnTo(rawReturnTo: string | null | undefined) {
  if (!rawReturnTo) {
    return null;
  }

  try {
    return decodeURIComponent(rawReturnTo);
  } catch {
    return rawReturnTo;
  }
}

export function getRoutineOverviewHref() {
  return "/routines";
}

export function getRoutineEditHref(routineId: string) {
  return `/routines/${routineId}/edit`;
}

export function getRoutineDayViewHref(routineId: string, dayId: string) {
  return `/routines/${routineId}/days/${dayId}`;
}

export function getRoutineDayEditHref(routineId: string, dayId: string, returnTo?: string | null) {
  const href = `/routines/${routineId}/edit/day/${dayId}`;
  const safeReturnTo = returnTo ? resolveReturnHref(returnTo, href) : null;

  if (!safeReturnTo || safeReturnTo === href) {
    return href;
  }

  return `${href}?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function resolveRoutineDayViewBackHref(rawReturnTo: string | null | undefined) {
  return resolveReturnHref(decodeReturnTo(rawReturnTo), getRoutineOverviewHref());
}

export function resolveRoutineDayEditBackHref(routineId: string, rawReturnTo: string | null | undefined) {
  return resolveReturnHref(decodeReturnTo(rawReturnTo), getRoutineEditHref(routineId));
}
