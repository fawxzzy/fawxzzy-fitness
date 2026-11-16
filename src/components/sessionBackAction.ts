// Live workout Back (DESIGN-CONTRACT.md section 15.5). Opening an exercise only rewrites the URL in place
// (no history entry), so while one is open the first tap on Back closes it and the second leaves the workout,
// the same two-step Back as history detail.
export type SessionBackClickEvent = { preventDefault: () => void };

export function getSessionBackLabel(exerciseOpen: boolean) {
  return exerciseOpen ? "Back to workout" : "Back";
}

export function handleSessionBackClick(
  event: SessionBackClickEvent,
  exerciseOpen: boolean,
  onCloseExercise?: () => void,
) {
  if (!exerciseOpen || !onCloseExercise) {
    return;
  }
  event.preventDefault();
  onCloseExercise();
}
