import type { ActionResult } from "@/lib/action-result";
import { removeProgressionAppliedPin, type ProgressionAppliedPin } from "@/lib/progression-applied-pins";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";
import type { ProgressionReviewRevertTargetSnapshot } from "@/lib/progression-review-display";
import { isProgressionRevertNoLongerAvailable, shouldDropProgressionPinAfterRevert } from "@/lib/progression-revert-messages";

export type TodayProgressionRevertAction = (payload: {
  routineId: string;
  routineDayExerciseId: string;
  previousTarget: ProgressionTargetPlan;
  appliedTarget: ProgressionTargetPlan;
  linkedPreviousTargets?: ProgressionReviewRevertTargetSnapshot[];
}) => Promise<ActionResult>;

/**
 * Revert from a Today exercise card. Revert takes priority over the card's Promote/Deload, so a pin
 * whose revert can never work again (the target changed after this update, or the slot is gone) is
 * dropped: otherwise the card would offer a Revert that always fails and hide the real action. A
 * retryable failure keeps the pin. Revert runs from the card, not the confirm modal, so every
 * failure is a toast.
 */
export async function runTodayProgressionRevert(args: {
  pin: ProgressionAppliedPin;
  routineId: string;
  revertAction: TodayProgressionRevertAction;
  readPins: () => ProgressionAppliedPin[];
  persistPins: (pins: ProgressionAppliedPin[]) => void;
  refresh: () => void;
  notify: { warning: (message: string) => void; error: (message: string) => void };
}): Promise<ActionResult> {
  const { pin } = args;
  const result = await args.revertAction({
    routineId: args.routineId,
    routineDayExerciseId: pin.routineDayExerciseId,
    previousTarget: pin.previousTarget,
    appliedTarget: pin.appliedTarget,
    linkedPreviousTargets: pin.linkedTargets?.map((target) => ({
      routineDayExerciseId: target.routineDayExerciseId,
      previousTarget: target.previousTarget,
      appliedTarget: target.appliedTarget,
    })),
  });

  if (shouldDropProgressionPinAfterRevert(result)) {
    args.persistPins(removeProgressionAppliedPin(args.readPins(), pin.routineDayExerciseId));
    args.refresh();
  }
  if (!result.ok) {
    if (isProgressionRevertNoLongerAvailable(result.error)) {
      args.notify.warning(result.error);
    } else {
      args.notify.error(result.error);
    }
  }
  return result;
}
