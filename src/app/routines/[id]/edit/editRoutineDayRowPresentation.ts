import { REST_DAY_CARD_COPY } from "@/features/day-state/restDayCardCopy";

export type EditRoutineDayRowPresentationInput = {
  isRest: boolean;
  summary: string;
  notes: string | null;
  needsSetup?: boolean;
};

export type EditRoutineDayRowPresentation = {
  subtitle: string;
  badgeText: string | undefined;
  state: "empty" | "default";
};

/**
 * Resolves how a single Edit Routine day-list row should present itself.
 *
 * Rest days and "not configured yet" days both previously collapsed onto the
 * same ExerciseCard state="empty" look with no other distinguishing copy or
 * badge, which made a deliberate rest day visually indistinguishable from a
 * broken/incomplete workout plan slot. This keeps the shared "empty" tone
 * (still used for anything that isn't a fully configured training day) but
 * gives rest days their own badge and body copy, reusing the same
 * REST_DAY_CARD_COPY string as the Routine Overview rest-day card.
 *
 * Pure and side-effect free: it only derives display strings from the
 * `isRest`/`needsSetup` flags already persisted on the day, so calling it
 * never creates or mutates a workout plan.
 */
export function resolveEditRoutineDayRowPresentation(day: EditRoutineDayRowPresentationInput): EditRoutineDayRowPresentation {
  if (day.isRest) {
    return {
      subtitle: REST_DAY_CARD_COPY,
      badgeText: "Rest",
      state: "empty",
    };
  }

  if (day.needsSetup) {
    return {
      subtitle: "Not configured yet • Tap to set up this workout plan",
      badgeText: "Needs Setup",
      state: "empty",
    };
  }

  return {
    subtitle: [day.summary, day.notes?.trim() || null].filter(Boolean).join(" • "),
    badgeText: undefined,
    state: "default",
  };
}
