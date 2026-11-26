import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { BottomActionsProvider } from "../../src/components/layout/bottom-actions.tsx";
import { TodayDayPicker } from "../../src/app/today/TodayDayPicker.tsx";
import type { ActionResult } from "../../src/lib/action-result.ts";
import type { ProgressionTargetPlan } from "../../src/lib/progression-playbooks.ts";
import type { ProgressionReviewApplyResult, ProgressionReviewDisplayItem } from "../../src/lib/progression-review-display.ts";
import { getProgressionAppliedPinsStorageKey } from "../../src/lib/progression-applied-pins.ts";
import { MANUAL_PROMOTION_REFUSAL_MESSAGES } from "../../src/lib/progression-manual-promotion.ts";
import { PROGRESSION_PROMOTE_MESSAGES } from "../../src/lib/progression-revert-messages.ts";

// Manual Promote on Today (2026-11-20): a full bar shows Promote on the card; a tap opens the Promote box (confirm),
// Promote there calls the action once; success shows "Progression up", pins the quick-undo Revert and refreshes Today;
// a refusal or a thrown request closes the box with one error toast and refreshes.

// "Zed" names resolve to no bundled thumbnail: next/image cannot render under node:test (its CJS default export does not load there).
const ROUTINE_ID = "routine-1";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

const current: ProgressionTargetPlan = { measurementType: "reps", setsMin: 4, setsMax: 4, repsTarget: 5, weightMin: 225, weightMax: 225, weightUnit: "lbs" };
const proposed: ProgressionTargetPlan = { ...current, weightMin: 230, weightMax: 230 };

const day = {
  id: "day-a",
  dayIndex: 1,
  name: "Lower",
  isRest: false,
  state: "runnable" as const,
  invalidExerciseCount: 0,
  exercises: [{
    id: "rde-1",
    exerciseId: "ex-1",
    name: "Zed Squat",
    targets: "4 sets • 5 reps • 225 lbs",
    targetSetsMin: 4,
    targetSetsMax: 4,
    primary_muscle: "Quads",
    equipment: null,
    movement_pattern: "Squat",
    image_howto_path: null,
    image_icon_path: null,
    slug: null,
    how_to_short: null,
  }],
};

function reviewItem(percent: number): ProgressionReviewDisplayItem {
  return {
    id: "rde-1",
    exerciseName: "Zed Squat",
    dayName: "Lower",
    dayGroupId: "day-a",
    type: "promote",
    badgeLabel: "Promote",
    summary: "Zed Squat: 5 reps • 225 lbs → 5 reps • 230 lbs",
    summaryParts: { exerciseName: "Zed Squat", currentTarget: "5 reps • 225 lbs", proposedTarget: "5 reps • 230 lbs", fallback: null },
    reason: "Ready",
    actionLabel: "Promote",
    currentTarget: current,
    proposedTarget: proposed,
    progress: { percent, state: percent === 100 ? "ready" : "partial", label: percent === 100 ? "Ready" : `${percent}%` },
  };
}

type PromoteAction = (payload: {
  routineId: string;
  routineDayExerciseId: string;
  expectedFromTarget: ProgressionTargetPlan | null;
  linkedIds?: string[];
}) => Promise<ActionResult<ProgressionReviewApplyResult>>;

function renderToday({ promote, percent = 100 }: { promote?: PromoteAction; percent?: number }) {
  const { router, calls } = createRouterSpy();
  const view = render(
    <AppProviders router={router}>
      <BottomActionsProvider>
        <TodayDayPicker
          days={[day]}
          currentDayIndex={1}
          routineName="Atlas"
          startDate="2026-11-01"
          progressionRoutineId={ROUTINE_ID}
          progressionReviewItems={[reviewItem(percent)]}
          applyProgressionReviewCandidateAction={async () => ({ ok: false, error: "footer apply must not run" })}
          revertProgressionReviewCandidateAction={async () => ({ ok: true })}
          promoteExerciseAction={promote}
        />
      </BottomActionsProvider>
    </AppProviders>,
  );
  return { ...view, calls };
}

function readPins() {
  return JSON.parse(window.sessionStorage.getItem(getProgressionAppliedPinsStorageKey(ROUTINE_ID)) ?? "[]") as Array<{ routineDayExerciseId: string }>;
}

test("full bar: Promote opens the box; Promote there calls the action once, shows the new goal, pins Revert, refreshes", async () => {
  const payloads: Parameters<PromoteAction>[0][] = [];
  let resolve: (value: ActionResult<ProgressionReviewApplyResult>) => void = () => {};
  const promote: PromoteAction = (payload) => {
    payloads.push(payload);
    return new Promise((done) => {
      resolve = done;
    });
  };
  const { calls } = renderToday({ promote });

  // The bar button replaces the footer Promote row; nothing runs on the tap itself.
  assert.equal(screen.queryByRole("group", { name: "Progression update for Zed Squat" }), null);
  fireEvent.click(screen.getByRole("button", { name: "Promote Zed Squat" }));
  assert.equal(payloads.length, 0, "the card tap only opens the box");

  const dialog = screen.getByRole("dialog", { name: "Zed Squat" });
  assert.match(dialog.textContent ?? "", /Ready to promote/);
  assert.match(dialog.textContent ?? "", /Weight225 lbs→to230 lbs\+5 lbs/);
  assert.doesNotMatch(dialog.textContent ?? "", /target/i);

  fireEvent.click(within(dialog).getByRole("button", { name: "Promote" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Promoting..." }));
  assert.equal(payloads.length, 1, "a pending promote ignores more taps");
  assert.deepEqual(payloads[0], { routineId: ROUTINE_ID, routineDayExerciseId: "rde-1", expectedFromTarget: current, linkedIds: undefined });

  resolve({ ok: true, data: { previousTarget: current, appliedTarget: proposed } });
  await waitFor(() => assert.match(screen.getByRole("dialog", { name: "Zed Squat" }).textContent ?? "", /Progression up/));
  assert.equal(calls.refresh, 1);
  assert.deepEqual(readPins().map((pin) => pin.routineDayExerciseId), ["rde-1"], "the quick-undo pin is saved");
  // The pin swaps the bar Promote for the footer Revert.
  await waitFor(() => assert.ok(screen.getByRole("button", { name: "Revert" })));
  assert.equal(screen.queryByRole("button", { name: "Promote Zed Squat" }), null);

  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  assert.equal(screen.queryByRole("dialog"), null);
});

test("a refusal (lost race) closes the box with one error toast, keeps no pin and refreshes", async () => {
  const promote: PromoteAction = async () => ({ ok: false, error: MANUAL_PROMOTION_REFUSAL_MESSAGES.lost_race });
  const { calls } = renderToday({ promote });

  fireEvent.click(screen.getByRole("button", { name: "Promote Zed Squat" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Promote" }));

  await waitFor(() => assert.ok(screen.getByText(MANUAL_PROMOTION_REFUSAL_MESSAGES.lost_race)));
  assert.equal(screen.queryByRole("dialog", { name: "Zed Squat" }), null);
  assert.equal(calls.refresh, 1);
  assert.deepEqual(readPins(), []);
});

test("a request that never comes back says the outcome is unverified", async () => {
  const promote: PromoteAction = async () => {
    throw new Error("network");
  };
  renderToday({ promote });

  fireEvent.click(screen.getByRole("button", { name: "Promote Zed Squat" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Promote" }));

  await waitFor(() => assert.ok(screen.getByText(PROGRESSION_PROMOTE_MESSAGES.unverified)));
  assert.deepEqual(readPins(), []);
});

test("Not now closes the box without calling the action; below 100% there is no Promote at all", () => {
  let called = 0;
  const promote: PromoteAction = async () => {
    called += 1;
    return { ok: false, error: "unused" };
  };
  renderToday({ promote });
  fireEvent.click(screen.getByRole("button", { name: "Promote Zed Squat" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Not now" }));
  assert.equal(screen.queryByRole("dialog"), null);
  assert.equal(called, 0);
  cleanup();

  renderToday({ promote, percent: 80 });
  assert.equal(screen.queryByRole("button", { name: /Promote/ }), null);
});

test("without the promote action the card keeps the footer Promote row (same server gate)", () => {
  renderToday({});
  assert.equal(screen.queryByRole("button", { name: "Promote Zed Squat" }), null);
  assert.ok(screen.getByRole("group", { name: "Progression update for Zed Squat" }));
});
