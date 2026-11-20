/**
 * Revert outcomes the client needs to act on. Kept free of server imports so Today and the review
 * card can use them.
 *
 * `lost_race` and `not_available` are terminal: the target changed after this update (a manual
 * edit or a later promotion) or the slot is gone, so the quick-undo pin can never succeed again.
 * The client drops the pin instead of offering a Revert that fails forever. The copy never says
 * "promoted" because the pin may be undoing a deload. The audit failures are retryable and keep
 * the pin; they only happen when a promotion is being reverted.
 */
export const PROGRESSION_REVERT_MESSAGES = {
  not_available: "Linked progression update is no longer available.",
  lost_race: "This target changed after this update, so Revert is no longer available.",
  audit_failed: "Could not save this revert, so the promoted target was kept. Try again.",
  audit_failed_unrestored: "This revert could not be saved and the promoted target could not be put back. Refresh and check this exercise's target before changing it.",
  /** A read or write threw (e.g. a transient database error): retryable, the pin stays. */
  failed: "Could not revert this progression update. Refresh and try again.",
} as const;

/**
 * Manual Promote copy shared by the server action and Today. `unverified` is the answer when the promote threw
 * (server) or never came back (client network failure): the outcome is unknown, Today refreshes and the user retries;
 * the server's own gate refuses a repeat, so a retry never promotes twice.
 */
export const PROGRESSION_PROMOTE_MESSAGES = {
  unverified: "Could not verify this promotion. Try again.",
} as const;

const TERMINAL_REVERT_ERRORS: ReadonlySet<string> = new Set([
  PROGRESSION_REVERT_MESSAGES.lost_race,
  PROGRESSION_REVERT_MESSAGES.not_available,
]);

export function isProgressionRevertNoLongerAvailable(error: string) {
  return TERMINAL_REVERT_ERRORS.has(error);
}

/** True when the quick-undo pin must go: the revert worked, or it can never work again. */
export function shouldDropProgressionPinAfterRevert(result: { ok: true } | { ok: false; error: string }) {
  return result.ok || isProgressionRevertNoLongerAvailable(result.error);
}
