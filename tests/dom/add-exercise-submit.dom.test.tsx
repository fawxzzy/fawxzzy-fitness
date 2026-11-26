import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { BottomActionsProvider, BottomActionsSlot } from "../../src/components/layout/bottom-actions.tsx";
import { SessionQuickAddExerciseForm } from "../../src/app/session/[id]/SessionQuickAddExerciseForm.tsx";
import { detailScreenFixtureExercises, detailScreenFixtureStats } from "../../src/app/dev/detail-screens/fixtureData.ts";
import type { ActionResult } from "../../src/lib/action-result.ts";

afterEach(() => cleanup());

// Node's global FormData rejects jsdom's form element (`new FormData(form)` throws cross-realm), so this file, which runs
// in its own process, uses jsdom's FormData the way a browser would.
Object.defineProperty(globalThis, "FormData", { value: window.FormData, configurable: true, writable: true });

// "Zed" names resolve to no bundled thumbnail: next/image cannot render under node:test (its CJS default export does not load there).
const EXERCISES = [{ ...detailScreenFixtureExercises[0]!, id: "zed-1", name: "Zed Lift" }];
const STATS = detailScreenFixtureStats().map((row) => ({ ...row, exerciseId: "zed-1", statsExerciseId: "zed-1" }));

function renderForm(addExerciseAction: (formData: FormData) => Promise<ActionResult>) {
  const { router, calls } = createRouterSpy();
  render(
    <AppProviders router={router} pathname="/session/s1/add-exercise">
      <BottomActionsProvider>
        <SessionQuickAddExerciseForm
          sessionId="s1"
          exercises={EXERCISES}
          weightUnit="lbs"
          exerciseStats={STATS}
          backHref="/session/s1"
          addExerciseAction={addExerciseAction}
        />
        <BottomActionsSlot />
      </BottomActionsProvider>
    </AppProviders>,
  );
  return calls;
}

// Nothing is preselected (DESIGN #3): pick the exercise first, the way a person does.
function selectExercise() {
  fireEvent.click(screen.getByText("Zed Lift"));
}

function addButton() {
  return screen.getByRole("button", { name: /Add Exercise|Adding exercise/u });
}

test("Add exercise: a slow add shows the pending state at once and a second tap does not call the action twice", async () => {
  const received: FormData[] = [];
  let release: (value: ActionResult) => void = () => {};
  const calls = renderForm((formData) => {
    received.push(formData);
    return new Promise<ActionResult>((resolve) => {
      release = resolve;
    });
  });

  // "Use Last" fills a complete goal so the Add button is allowed to submit.
  selectExercise();
  fireEvent.click(screen.getByRole("button", { name: "Use Last" }));
  assert.equal((addButton() as HTMLButtonElement).disabled, false);

  fireEvent.click(addButton());
  await waitFor(() => assert.equal(received.length, 1));
  // Pending is visible while the action is still unresolved: the button is busy, disabled and says so to a screen reader.
  await waitFor(() => assert.equal(addButton().getAttribute("aria-busy"), "true"));
  assert.equal((addButton() as HTMLButtonElement).disabled, true);
  assert.ok(screen.getByText("Adding exercise"));

  // A second tap, and a second submit event straight on the form, must both be ignored while the first is in flight.
  fireEvent.click(addButton());
  fireEvent.submit(document.getElementById("session-quick-add-exercise-form") as HTMLFormElement);
  fireEvent.submit(document.getElementById("session-quick-add-exercise-form") as HTMLFormElement);
  assert.equal(received.length, 1, "the action ran once");
  assert.equal(received[0]?.get("sessionId"), "s1", "hidden fields still reach the action");

  await act(async () => {
    release({ ok: true });
  });
  await waitFor(() => assert.deepEqual(calls.push, ["/session/s1"]));
  assert.equal(addButton().getAttribute("aria-busy"), "false");
  assert.equal(received.length, 1);
});

test("Add exercise: after a failed add the button comes back and another tap can try again", async () => {
  let attempts = 0;
  renderForm(async () => {
    attempts += 1;
    return { ok: false, error: "Could not add exercise." } as ActionResult;
  });
  selectExercise();
  fireEvent.click(screen.getByRole("button", { name: "Use Last" }));
  fireEvent.click(addButton());
  await waitFor(() => assert.equal(attempts, 1));
  await waitFor(() => assert.equal(addButton().getAttribute("aria-busy"), "false"));
  assert.equal((addButton() as HTMLButtonElement).disabled, false);
  fireEvent.click(addButton());
  await waitFor(() => assert.equal(attempts, 2));
});
