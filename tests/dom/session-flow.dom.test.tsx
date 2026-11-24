import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { SessionPageClient } from "../../src/components/SessionPageClient.tsx";
import type { SessionExerciseFocusItem } from "../../src/components/SessionExerciseFocus.tsx";

afterEach(() => cleanup());

function exercise(overrides: Partial<SessionExerciseFocusItem> & { id: string; name: string }): SessionExerciseFocusItem {
  return {
    exerciseId: `ex-${overrides.id}`,
    isSkipped: false,
    defaultUnit: null,
    isCardio: false,
    measurementType: "reps",
    primary_muscle: "Quads",
    equipment: "Barbell",
    movement_pattern: "Squat",
    useIntervalLanguage: false,
    initialEnabledMetrics: { reps: true, weight: true, time: false, distance: false, calories: false },
    routineDayExerciseId: `rde-${overrides.id}`,
    planTargetsHash: "11000",
    goalLabel: "4 sets • 5 reps • 225 lbs",
    prefill: { weight: 225, reps: 5, weightUnit: "lbs" },
    quickLogTarget: { measurementType: "reps", repsMin: 5, repsMax: 5, weightMin: 225, weightMax: 225, weightUnit: "lbs" },
    initialSets: [],
    loggedSetCount: 0,
    targetSetsMin: 4,
    targetSetsMax: 4,
    slug: null,
    ...overrides,
  };
}

function renderSession(options: {
  exercises: SessionExerciseFocusItem[];
  saveSessionAction?: (formData: FormData) => Promise<{ ok: true }>;
  addSetAction?: (payload: { reps: number; weight: number }) => Promise<unknown>;
}) {
  const { router } = createRouterSpy();
  const noop = async () => ({ ok: true as const });
  return render(
    <AppProviders router={router} pathname="/session/s1">
        <SessionPageClient
          userId="u1"
          sessionId="s1"
          initialDurationSeconds={0}
          initialIsSessionCompleted={false}
          performedAt={new Date().toISOString()}
          routineName="Atlas Routine"
          sessionDayName="Lower A"
          unitLabel="lbs"
          exercises={options.exercises}
          saveSessionAction={options.saveSessionAction ?? noop}
          requestedReturnTo="/today"
          quickAddAction={<button type="button">Add</button>}
          addSetAction={(options.addSetAction ?? noop) as never}
          syncQueuedSetLogsAction={(async () => ({ ok: true as const, data: { results: [] } })) as never}
          toggleSkipAction={noop}
          removeExerciseAction={noop}
          deleteSetAction={noop}
          updateSessionExerciseProgressionAction={noop as never}
          disableDraftPersistence
        />
    </AppProviders>,
  );
}

test("Session: Finish with unlogged planned sets opens the confirm sheet and Keep going leaves the session open", async () => {
  let saves = 0;
  renderSession({
    exercises: [exercise({ id: "a", name: "Zed Press" })],
    saveSessionAction: async () => {
      saves += 1;
      return { ok: true };
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Finish" }));
  const sheet = await screen.findByRole("dialog");
  assert.ok(within(sheet).getByText("Finish workout?"));
  assert.ok(within(sheet).getByText("0 of 4 sets logged."));
  fireEvent.click(within(sheet).getByRole("button", { name: /Keep going/ }));
  await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
  assert.equal(saves, 0);
});

type AddSetPayload = { sessionId: string; sessionExerciseId: string; weight: number; reps: number; weightUnit: string; clientLogId?: string };

function acceptingAddSet(calls: AddSetPayload[]) {
  return async (payload: AddSetPayload) => {
    calls.push(payload);
    return {
      ok: true as const,
      data: {
        set: {
          id: payload.clientLogId ?? `set-${calls.length}`,
          client_log_id: payload.clientLogId ?? null,
          session_exercise_id: payload.sessionExerciseId,
          user_id: "u1",
          set_index: calls.length - 1,
          weight: payload.weight,
          reps: payload.reps,
          is_warmup: false,
          notes: null,
          duration_seconds: null,
          distance: null,
          distance_unit: null,
          calories: null,
          rpe: null,
          weight_unit: "lbs" as const,
        },
      },
    };
  };
}

function countSubmits(container: HTMLElement) {
  const form = container.querySelector("form");
  assert.ok(form, "the Finish form exists");
  const submits = { count: 0 };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submits.count += 1;
  });
  return submits;
}

test("Session: tapping Log sends one set with the planned reps and weight, and Finish then reports the live count", async () => {
  const calls: AddSetPayload[] = [];
  renderSession({ exercises: [exercise({ id: "a", name: "Zed Press" })], addSetAction: acceptingAddSet(calls) as never });

  fireEvent.click(screen.getByRole("button", { name: /^Log set\s*5 reps/ }));
  await waitFor(() => assert.equal(calls.length, 1));
  assert.equal(calls[0].sessionId, "s1");
  assert.equal(calls[0].sessionExerciseId, "a");
  assert.equal(calls[0].reps, 5);
  assert.equal(calls[0].weight, 225);

  fireEvent.click(screen.getByRole("button", { name: "Finish" }));
  const sheet = await screen.findByRole("dialog");
  assert.ok(within(sheet).getByText("1 of 4 sets logged."), "the Finish sheet counts the set that was just logged");
});

test("Session: Finish with every planned set logged submits once and shows no confirm sheet", async () => {
  const { container } = renderSession({
    exercises: [exercise({ id: "a", name: "Zed Press", targetSetsMin: 1, targetSetsMax: 1, loggedSetCount: 1, initialSets: [{ id: "set-0", session_exercise_id: "a", user_id: "u1", set_index: 0, weight: 225, reps: 5, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: null, weight_unit: "lbs" }] })],
  });
  const submits = countSubmits(container);
  fireEvent.click(screen.getByRole("button", { name: "Finish" }));
  assert.equal(screen.queryByRole("dialog"), null);
  assert.equal(submits.count, 1);
});

test("Session: confirming the Finish sheet submits the workout once; Keep going submits nothing", async () => {
  const { container } = renderSession({ exercises: [exercise({ id: "a", name: "Zed Press" })] });
  const submits = countSubmits(container);

  fireEvent.click(screen.getByRole("button", { name: "Finish" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /Keep going/ }));
  await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
  assert.equal(submits.count, 0);

  fireEvent.click(screen.getByRole("button", { name: "Finish" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Finish" }));
  await waitFor(() => assert.equal(submits.count, 1));
  assert.equal(screen.queryByRole("dialog"), null, "the sheet closes once the workout is submitted");
});

// Zac 2026-11-24: open / close must be discoverable. The header, the bottom-edge grab handle and the logger's Close
// control all toggle the same card; only one card is open at a time.
// The open logger reads prefers-reduced-motion; jsdom has no matchMedia.
if (typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

function cardOf(id: string) {
  const card = screen.getByTestId(`session-exercise-toggle-${id}`).closest<HTMLElement>('[data-exercise-row-card="true"]');
  assert.ok(card, "the toggle sits in its card");
  return card;
}

function panelOf(id: string) {
  return document.querySelector(`[data-testid="session-exercise-panel-${id}"]`);
}

function handleOf(id: string) {
  const handle = cardOf(id).querySelector<HTMLButtonElement>('[data-session-expand-handle="true"]');
  assert.ok(handle, "every session card has a grab handle");
  return handle;
}

test("Session: header, grab handle and Close all toggle the card; aria-expanded follows; one card open at a time", async () => {
  renderSession({ exercises: [exercise({ id: "a", name: "Zed Press" }), exercise({ id: "b", name: "Yew Row" })] });
  const header = screen.getByTestId("session-exercise-toggle-a");
  assert.equal(panelOf("a"), null);
  assert.equal(handleOf("a").getAttribute("aria-expanded"), "false");
  assert.equal(handleOf("a").getAttribute("aria-label"), "Open Zed Press logger");

  // Header opens; the handle flips and Close appears at the top of the logger.
  fireEvent.click(header);
  await waitFor(() => assert.ok(panelOf("a")));
  assert.equal(header.getAttribute("aria-expanded"), "true");
  assert.equal(handleOf("a").getAttribute("aria-expanded"), "true");
  assert.equal(handleOf("a").querySelector("svg")?.getAttribute("data-session-expand-handle-direction"), "up");
  const close = panelOf("a")?.querySelector<HTMLButtonElement>('[data-session-logger-close="true"]');
  assert.ok(close, "Close sits inside the open logger");
  assert.equal(handleOf("a").getAttribute("aria-label"), "Collapse Zed Press logger");
  assert.notEqual(handleOf("a").getAttribute("aria-label"), close.getAttribute("aria-label"), "handle and Close have distinct names");
  assert.equal(close.textContent, "Close");
  assert.equal(panelOf("a")?.firstElementChild?.contains(close), true, "Close is at the top of the logger");

  // Close closes and hands focus to the header toggle.
  fireEvent.click(close);
  await waitFor(() => assert.equal(panelOf("a"), null));
  await waitFor(() => assert.equal(document.activeElement, header));
  assert.equal(header.getAttribute("aria-expanded"), "false");
  assert.equal(handleOf("a").querySelector("svg")?.getAttribute("data-session-expand-handle-direction"), "down");

  // The handle opens and closes it.
  fireEvent.click(handleOf("a"));
  await waitFor(() => assert.ok(panelOf("a")));
  fireEvent.click(handleOf("a"));
  await waitFor(() => assert.equal(panelOf("a"), null));

  // Only one open card: opening the second closes the first.
  fireEvent.click(header);
  await waitFor(() => assert.ok(panelOf("a")));
  fireEvent.click(handleOf("b"));
  await waitFor(() => assert.ok(panelOf("b")));
  assert.equal(panelOf("a"), null, "opening another card closes this one");
});

test("Session: the chip caption says what the pressed chip does and the Log set button names the set", async () => {
  renderSession({ exercises: [exercise({ id: "a", name: "Zed Press" })] });
  fireEvent.click(screen.getByTestId("session-exercise-toggle-a"));
  await waitFor(() => assert.ok(panelOf("a")));
  const caption = () => panelOf("a")?.querySelector('[data-logger-chip-caption="true"]')?.textContent ?? null;
  const logButton = () => panelOf("a")?.querySelector('[data-logger-primary="true"]')?.textContent ?? "";

  assert.equal(caption(), "Tap a chip to mark the next set");
  assert.match(logButton(), /^Log set/);

  fireEvent.click(within(panelOf("a") as HTMLElement).getByRole("button", { name: "Warm-up set" }));
  await waitFor(() => assert.equal(caption(), "Warm-up: not counted for progression"));
  assert.match(logButton(), /^Log warm-up set/);

  fireEvent.click(within(panelOf("a") as HTMLElement).getByRole("button", { name: "Failure" }));
  await waitFor(() => assert.equal(caption(), "Failure: a tag only. Enter reps reached"));
  assert.match(logButton(), /^Log failure set/);
  assert.doesNotMatch(panelOf("a")?.textContent ?? "", /Target/, "plain words, never Target");

  fireEvent.click(within(panelOf("a") as HTMLElement).getByRole("button", { name: "Failure" }));
  await waitFor(() => assert.equal(caption(), "Tap a chip to mark the next set"));
});

test("Session: a set notice shows in the overlay above the dock and leaves the card list untouched", async () => {
  const calls: AddSetPayload[] = [];
  renderSession({ exercises: [exercise({ id: "a", name: "Zed Press" }), exercise({ id: "b", name: "Yew Row" })], addSetAction: acceptingAddSet(calls) as never });
  const list = screen.getByTestId("session-exercise-toggle-b").closest("ul");
  assert.ok(list, "the cards are a list");
  const childCountBefore = list.children.length;
  const firstCard = list.children[0];

  // The session keeps an in-memory per-session cache, so an earlier test can leave a card open: take the first Log set.
  fireEvent.click(screen.getAllByRole("button", { name: /^Log set\s*5 reps/ })[0]);
  await waitFor(() => assert.equal(calls.length, 1));
  const notice = await screen.findByText(/^Set logged\./);
  const slot = document.querySelector('[data-app-notice-placement="above-dock"]');
  assert.ok(slot?.contains(notice), "the notice is in the above-dock overlay");
  assert.equal(slot?.classList.contains("absolute"), true, "out of flow");
  assert.equal(list.contains(notice), false);
  assert.equal(list.children.length, childCountBefore, "no row was added to the list");
  assert.equal(list.children[0], firstCard, "the first card did not move in the list");
  assert.equal(document.querySelector('[data-app-notice-flow-stack="true"]'), null, "nothing in flow under the header");
});
