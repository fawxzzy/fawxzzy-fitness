import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { ToastProvider } from "../../src/components/ui/ToastProvider.tsx";
import { DragHandle } from "../../src/components/ui/card-system/index.ts";
import { RoutineBrowseCard, type RoutineBrowseCardItem } from "../../src/components/routines/RoutineBrowseCard.tsx";
import { SessionExerciseRowCard, SessionQuickLogRow } from "../../src/components/session/SessionRowCards.tsx";
import { TodayExerciseRows, type TodayExerciseRow } from "../../src/app/today/TodayExerciseRows.tsx";
import { ExerciseRowCard } from "../../src/components/workout/ExerciseRowCard.tsx";

afterEach(() => cleanup());

const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "test" };

const routine: RoutineBrowseCardItem = {
  id: "r1",
  name: "Atlas Routine",
  summaryParts: ["16 exercises", "4 days"],
  createdAt: "2026-11-05T12:00:00Z",
  isActive: true,
  previewDays: [],
};

const rowContract = {
  label: "Log: 5 reps | 225 lbs",
  skipLabel: "Skip",
  skipActionIntent: "toggleInactive" as const,
  isQuickLogDisabled: false,
  isSkipDisabled: false,
  quickLogDisabledMessage: "Unskip to log",
  isSkipPending: false,
  isQuickLogPending: false,
};

test("Today: exercise rows are a list of cards, each with an info button named after the exercise", () => {
  const exercises: TodayExerciseRow[] = [
    { id: "a", exerciseId: "ex-a", name: "Zed Press", targets: "4 sets • 5 reps • 225 lbs", primary_muscle: "Quads", movement_pattern: "Squat", equipment: "Barbell", targetSetsMin: 4, targetSetsMax: 4, progressionStateLabel: null },
    { id: "b", exerciseId: "ex-b", name: "Zed Pull", targets: "3 sets", primary_muscle: "Back", movement_pattern: "Pull", equipment: "Cable", targetSetsMin: 3, targetSetsMax: 3, progressionStateLabel: null },
  ];
  render(
    <AppRouterContext.Provider value={router}>
      <ToastProvider>
        <TodayExerciseRows exercises={exercises} emptyMessage="No exercises today." />
      </ToastProvider>
    </AppRouterContext.Provider>,
  );

  assert.equal(screen.getAllByRole("listitem").length, 2);
  assert.ok(screen.getByRole("heading", { name: "Zed Press" }));
  assert.equal(screen.getAllByRole("button", { name: /Zed (Press|Pull)/ }).length, 2, "one info control per exercise");
});

test("Routines: header press opens the routine; the actions control reveals actions and Escape closes them with focus returned", () => {
  const opened: string[] = [];
  const pressed: string[] = [];
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <RoutineBrowseCard
        routine={routine}
        onPress={() => opened.push("open")}
        actions={[{ key: "delete", label: "Delete", intent: "danger", onPress: () => pressed.push("delete") }]}
        actionsOpen={open}
        onActionsToggle={() => setOpen((value) => !value)}
      />
    );
  }
  render(<Harness />);

  fireEvent.click(screen.getByRole("button", { name: /^Atlas Routine/ }));
  assert.deepEqual(opened, ["open"]);

  const more = screen.getByRole("button", { name: /actions/i });
  assert.equal(more.getAttribute("aria-expanded"), "false");
  fireEvent.click(more);
  assert.equal(more.getAttribute("aria-expanded"), "true");

  fireEvent.click(screen.getByRole("button", { name: /Delete/ }));
  assert.deepEqual(pressed, ["delete"]);

  fireEvent.keyDown(more, { key: "Escape" });
  assert.equal(more.getAttribute("aria-expanded"), "false", "Escape closes the action row");
  assert.equal(document.activeElement, more, "focus returns to the control that opened it");
});

test("Session logger: row header toggles, info does not, and quick-log Skip and Log each fire once", () => {
  const calls: string[] = [];
  render(
    <SessionExerciseRowCard
      itemId="se-1"
      exercise={{ name: "Zed Press", slug: "zed-press" }}
      expanded={false}
      onToggle={() => calls.push("toggle")}
      metaItems={["Quads"]}
      targetValues={["4 sets"]}
      progress={{ label: "1 / 4 sets", percent: 25 }}
      status={null}
      tone="logged"
      showMedia
      infoLabel="Open exercise info for Zed Press"
      onOpenInfo={() => calls.push("info")}
      panel={<div>logger</div>}
      footer={
        <SessionQuickLogRow
          exerciseName="Zed Press"
          logAllCount={2}
          rowContract={rowContract}
          onSkip={() => { calls.push("skip"); }}
          onPress={() => { calls.push("log"); }}
        />
      }
    />,
  );

  fireEvent.click(screen.getByTestId("session-exercise-toggle-se-1"));
  fireEvent.click(screen.getByRole("button", { name: "Open exercise info for Zed Press" }));
  fireEvent.click(screen.getByRole("button", { name: "Skip: Zed Press" }));
  fireEvent.click(screen.getAllByRole("button", { name: /^Log(?! all)/ })[0]);
  assert.deepEqual(calls, ["toggle", "info", "skip", "log"]);
});

test("Promote: only a full bar with a wired seam shows the button; one tap calls the seam once and never toggles the card", () => {
  const calls: string[] = [];
  const row = (percent: number, promote: { onPromote: () => void; pending?: boolean } | null) => (
    <ExerciseRowCard
      exercise={{ name: "Zed Press" }}
      metaItems={[]}
      targetValues={["4 sets", "5 reps", "225 lbs"]}
      progress={{ label: "Progression: Ready", percent, tone: percent === 100 ? "complete" : "default", promote }}
      interaction={{ kind: "toggle", expanded: false, onToggle: () => calls.push("toggle") }}
    />
  );

  const { rerender } = render(row(99, { onPromote: () => calls.push("promote") }));
  assert.equal(screen.queryByRole("button", { name: /Promote/ }), null, "99% hides Promote");
  rerender(row(100, null));
  assert.equal(screen.queryByRole("button", { name: /Promote/ }), null, "no seam hides Promote");
  rerender(row(100, { onPromote: () => calls.push("promote") }));
  const promote = screen.getByRole("button", { name: "Promote Zed Press" });
  fireEvent.click(promote);
  assert.deepEqual(calls, ["promote"]);

  rerender(row(100, { onPromote: () => calls.push("promote"), pending: true }));
  const pending = screen.getByRole("button", { name: "Promoting Zed Press" });
  pending.focus();
  fireEvent.click(pending);
  assert.equal(pending.getAttribute("aria-disabled"), "true");
  assert.equal(document.activeElement, pending);
  assert.deepEqual(calls, ["promote"], "a pending promote ignores taps");
});

test("Session logger: a pending quick-log is aria-disabled, keeps focus and never calls the handler", () => {
  let logged = 0;
  render(
    <SessionQuickLogRow
      exerciseName="Zed Press"
      logAllCount={0}
      rowContract={{ ...rowContract, isQuickLogPending: true }}
      onSkip={() => {}}
      onPress={() => {
        logged += 1;
      }}
    />,
  );
  const log = screen.getByRole("button", { name: /Adding/ });
  assert.equal(log.getAttribute("aria-disabled"), "true");
  assert.equal(log.hasAttribute("disabled"), false);
  log.focus();
  fireEvent.click(log);
  assert.equal(logged, 0);
  assert.equal(document.activeElement, log);
});

test("Reorder handle: Arrow keys request one-step moves; an aria-disabled handle ignores them", () => {
  const moves: number[] = [];
  const { rerender } = render(<DragHandle label="Reorder Push" onMove={(direction) => { moves.push(direction); }} />);
  const handle = screen.getByRole("button", { name: "Reorder Push" });
  fireEvent.keyDown(handle, { key: "ArrowDown" });
  fireEvent.keyDown(handle, { key: "ArrowUp" });
  fireEvent.keyDown(handle, { key: "a" });
  assert.deepEqual(moves, [1, -1]);

  rerender(<DragHandle label="Reorder Push" aria-disabled="true" onMove={(direction) => { moves.push(direction); }} />);
  fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Push" }), { key: "ArrowDown" });
  assert.deepEqual(moves, [1, -1]);
});
