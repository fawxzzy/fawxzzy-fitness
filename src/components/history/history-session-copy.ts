// Plain words for History session titles and set counts (pure, no React). FUNCTIONAL.md F-021 and DESIGN #7:
// a bare day number ("1") never stands alone as a title, the detail title names the day and the routine, and a
// set count that beats the plan says so instead of reading "3 of 2 sets".

const UNKNOWN_ROUTINE_TITLE = "Unknown routine";

/** "1" becomes "Day 1"; a named day stays as it is; blank is null. */
export function formatHistoryDayTitle(dayTitle: string | null | undefined): string | null {
  const trimmed = dayTitle?.trim() ?? "";
  if (!trimmed) return null;
  return /^\d+$/u.test(trimmed) ? `Day ${Number(trimmed)}` : trimmed;
}

/** Session detail title "Push A · Atlas Strength" (day first, then routine); "Workout" when neither is known. */
export function buildHistorySessionDetailTitle(args: {
  dayTitle?: string | null;
  routineTitle?: string | null;
}): string {
  const day = formatHistoryDayTitle(args.dayTitle);
  const routine = args.routineTitle?.trim() ?? "";
  const routinePart = routine && routine !== UNKNOWN_ROUTINE_TITLE ? routine : null;
  return [day, routinePart].filter(Boolean).join(" · ") || "Workout";
}

/**
 * Logged sets against the plan: "2 of 4 sets", "3 sets (2 planned)" when more were logged than planned, or just
 * "3 sets" / "1 set". `verb` adds a word after the count ("2 of 4 sets logged", "3 sets logged (2 planned)").
 */
export function formatSetCountAgainstPlan(loggedSetCount: number, plannedSetCount: number, verb?: string): string {
  const logged = Math.max(0, Math.floor(loggedSetCount));
  const planned = Math.max(0, Math.floor(plannedSetCount));
  const suffix = verb ? ` ${verb}` : "";
  if (planned > 0 && logged < planned) {
    return `${logged} of ${planned} sets${suffix}`;
  }
  const noun = logged === 1 ? "set" : "sets";
  const extra = planned > 0 && logged > planned ? ` (${planned} planned)` : "";
  return `${logged} ${noun}${suffix}${extra}`;
}
