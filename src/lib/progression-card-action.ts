// Which progression action a card may offer (client-safe, no server imports).
// Promote is manual-only since 2026-11-19 and shows only when the card's bar is full (100%);
// the server re-checks the same rule in promoteExerciseAction. Deload keeps its existing action.
export const MANUAL_PROMOTE_BAR_PERCENT = 100;

export function canShowProgressionCardAction(args: {
  candidateType: string | null | undefined;
  progressPercent: number | null | undefined;
}) {
  if (args.candidateType === "deload") {
    return true;
  }

  return args.candidateType === "promote" && args.progressPercent === MANUAL_PROMOTE_BAR_PERCENT;
}
