/**
 * Shared rest-day card body copy. Single source of truth so every surface
 * that renders a deliberate rest-day card (Routine Overview, Edit Routine
 * day-list, Today) shows identical copy instead of drifting independently.
 *
 * Kept in its own dependency-free module (no component/JSX imports) so it
 * can be imported from pure logic modules without pulling in React/Next.js
 * component graphs.
 */
export const REST_DAY_CARD_COPY = "Recover, move lightly, and come back ready for the next workout.";
