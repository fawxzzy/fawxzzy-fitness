/**
 * Whether the Today screen's exercise list (or the closed-picker single-day
 * view) should present a deliberate rest-day card rather than either a
 * plain "no exercises" text row or nothing at all.
 *
 * Kept as a pure function, free of any React/Next.js imports, so the
 * rest-day-vs-generic-empty distinction is unit testable without rendering.
 */
export function shouldRenderTodayRestDayCard(args: { exerciseCount: number; isRestDay?: boolean }): boolean {
  return args.exerciseCount === 0 && args.isRestDay === true;
}
