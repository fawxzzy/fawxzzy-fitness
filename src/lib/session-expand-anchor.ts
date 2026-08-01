// Decides whether the Current Session view should re-anchor the viewport to
// a newly-expanded exercise row. This is intentionally a pure, stateless
// predicate so the trigger condition (genuine user-initiated expand or
// exercise switch) can be unit tested independent of the React effect that
// consumes it (see SessionExerciseFocus.tsx).
//
// Semantics:
// - expand (previous null -> next id): anchor.
// - switch (previous id -> different id): anchor.
// - collapse (previous id -> null): do not anchor.
// - no-op / unrelated rerender (previous id -> same id): do not anchor.
export function shouldAnchorExpandedSessionExercise(
  previousSelectedExerciseId: string | null,
  nextSelectedExerciseId: string | null,
): boolean {
  return nextSelectedExerciseId !== null && nextSelectedExerciseId !== previousSelectedExerciseId;
}
