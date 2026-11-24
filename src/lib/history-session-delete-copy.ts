/**
 * Copy for the History session-delete confirm (History review item 3, 2026-11-23): the title names the session and
 * the consequence line says what goes with it. Pure so the DOM test asserts the exact words the screen shows.
 */
export type HistorySessionDeleteCopy = {
  name: string;
  triggerAriaLabel: string;
  title: string;
  consequence: string;
};

export function buildHistorySessionDeleteCopy(input: {
  dayTitle?: string | null;
  dayName?: string | null;
  /** Already formatted short date ("Nov 21"), or empty when unknown. */
  dateLabel?: string | null;
  exerciseCount: number;
}): HistorySessionDeleteCopy {
  const name = input.dayTitle?.trim() || input.dayName?.trim() || "this session";
  const dateLabel = input.dateLabel?.trim() ?? "";
  const count = Math.max(0, Math.floor(input.exerciseCount));
  const consequence = [
    dateLabel ? `Removes the ${dateLabel} session` : "Removes this session",
    count > 0 ? ` and its ${count === 1 ? "1 exercise" : `${count} exercises`}` : "",
    ". This cannot be undone.",
  ].join("");
  return { name, triggerAriaLabel: `Delete ${name}`, title: `Delete ${name}?`, consequence };
}
