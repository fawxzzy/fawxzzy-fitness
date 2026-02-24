import { revalidatePath } from "next/cache";

const HISTORY_PATH = "/history";
const ROUTINES_PATH = "/routines";
const TODAY_PATH = "/today";
const SESSION_PATH = "/session";

export function getHistoryDetailPath(sessionId: string) {
  return `${HISTORY_PATH}/${sessionId}`;
}

export function getRoutineEditPath(routineId: string) {
  return `${ROUTINES_PATH}/${routineId}/edit`;
}

export function getTodayPath() {
  return TODAY_PATH;
}

export function getRoutineEditDayPath(routineId: string, dayId: string) {
  return `${ROUTINES_PATH}/${routineId}/edit/day/${dayId}`;
}

export function revalidateSessionViews(sessionId: string) {
  revalidatePath(`${SESSION_PATH}/${sessionId}`);
}

export function revalidateHistoryViews() {
  revalidatePath(HISTORY_PATH);
}

export function revalidateRoutinesViews() {
  revalidatePath(ROUTINES_PATH);
  revalidatePath(TODAY_PATH);
}
