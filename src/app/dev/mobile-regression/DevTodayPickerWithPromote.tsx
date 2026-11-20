"use client";

import type { ComponentProps } from "react";
import { TodayDayPicker } from "@/app/today/TodayDayPicker";
import { MANUAL_PROMOTION_REFUSAL_MESSAGES } from "@/lib/progression-manual-promotion";

type TodayDayPickerProps = ComponentProps<typeof TodayDayPicker>;

const STUB_DELAY_MS = 700;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dev fixture only (`/dev/mobile-regression` Today scenarios): the real Today picker with LOCAL stubs for Promote and
 * Revert, so the full flow (bar at 100% -> Promote box -> "Progression up" -> Revert) can be driven and screenshotted
 * without a session or a database. The stub promote answers with the fixture's own current -> proposed goal; with
 * `promoteOutcome="refused"` it answers with the real lost-race refusal copy. Production Today passes the server action
 * (`src/app/today/page.tsx`); this file must never import from `src/app/progression-review/actions.ts`.
 */
export function DevTodayPickerWithPromote({
  promoteOutcome = "ok",
  ...props
}: Omit<TodayDayPickerProps, "promoteExerciseAction" | "revertProgressionReviewCandidateAction"> & {
  promoteOutcome?: "ok" | "refused";
}) {
  const promoteExerciseAction: NonNullable<TodayDayPickerProps["promoteExerciseAction"]> = async ({ routineDayExerciseId }) => {
    await wait(STUB_DELAY_MS);
    const item = (props.progressionReviewItems ?? []).find((candidate) => candidate.id === routineDayExerciseId);
    if (promoteOutcome === "refused" || !item?.currentTarget || !item.proposedTarget) {
      return { ok: false, error: MANUAL_PROMOTION_REFUSAL_MESSAGES.lost_race };
    }
    return { ok: true, data: { previousTarget: item.currentTarget, appliedTarget: item.proposedTarget } };
  };

  const revertProgressionReviewCandidateAction: NonNullable<TodayDayPickerProps["revertProgressionReviewCandidateAction"]> = async () => {
    await wait(STUB_DELAY_MS);
    return { ok: true };
  };

  return (
    <TodayDayPicker
      {...props}
      promoteExerciseAction={promoteExerciseAction}
      revertProgressionReviewCandidateAction={revertProgressionReviewCandidateAction}
    />
  );
}
