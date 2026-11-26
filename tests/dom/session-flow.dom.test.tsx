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
  initialIsSessionCompleted?: boolean;
  initialDurationSeconds?: number;
  sessionId?: string;
  updateSessionExerciseTimerAction?: (payload: { sessionId: string; sessionExerciseId: string; command: string }) => Promise<unknown>;
}) {
  const { router } = createRouterSpy();
  const noop = async () => ({ ok: true as const });
  return render(
    <AppProviders router={router} pathname="/session/s1">
        <SessionPageClient
          userId="u1"
          sessionId={options.sessionId ?? "s1"}
          initialDurationSeconds={options.initialDurationSeconds ?? 0}
          initialIsSessionCompleted={options.initialIsSessionCompleted ?? false}
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
          updateSessionExerciseTimerAction={options.updateSessionExerciseTimerAction as never}
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

// DESIGN #2 (2026-11-26): logging a set starts a local 90s rest countdown above Finish; +15 adds time, Skip hides it.
test("Session: logging a set starts the rest timer; +15 adds time and Skip hides it; the header shows the workout clock", async () => {
  window.sessionStorage.clear();
  const calls: AddSetPayload[] = [];
  renderSession({ exercises: [exercise({ id: "a", name: "Zed Press" })], addSetAction: acceptingAddSet(calls) as never });
  assert.ok(document.querySelector('[data-session-clock="true"]'), "workout clock in the header");
  assert.equal(document.querySelector("[data-rest-timer]"), null, "no rest before the first set");

  fireEvent.click(screen.getByRole("button", { name: /^Log set\s*5 reps/ }));
  const timer = await screen.findByRole("timer", { name: /^Rest, 1 minute 30 seconds left$|^Rest, 1 minute 29 seconds left$/ });
  assert.ok(timer);
  fireEvent.click(screen.getByRole("button", { name: "15 seconds more rest" }));
  await screen.findByRole("timer", { name: /^Rest, 1 minute 4[45] seconds left$/ });
  assert.ok(window.sessionStorage.getItem("fitness:session-rest-timer:s1"), "the countdown survives a reload");

  fireEvent.click(screen.getByRole("button", { name: "Skip" }));
  await waitFor(() => assert.equal(document.querySelector("[data-rest-timer]"), null));
  assert.equal(window.sessionStorage.getItem("fitness:session-rest-timer:s1"), null);
});

test("Session: opening a workout that already has logged sets does not start a rest", async () => {
  window.sessionStorage.clear();
  const set = { session_exercise_id: "a", user_id: "u1", is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: null, weight_unit: "lbs" as const };
  renderSession({
    exercises: [exercise({ id: "a", name: "Zed Press", loggedSetCount: 2, initialSets: [{ ...set, id: "s-0", set_index: 0, weight: 225, reps: 5 }, { ...set, id: "s-1", set_index: 1, weight: 225, reps: 4 }] })],
  });
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(document.querySelector("[data-rest-timer]"), null);
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

// Coordinator review of 4e21b9a04 (P3): a double tap on Finish used to be able to call saveSessionAction twice, and the
// second (failing) answer put an error toast over the summary. One call, a busy button, then the summary and no error.
test("Session: a double tap on Finish saves once, shows a busy button, then the summary with no error toast", async () => {
  Object.defineProperty(globalThis, "FormData", { value: window.FormData, configurable: true, writable: true });
  let calls = 0;
  let release: (value: { ok: true }) => void = () => {};
  const { container } = renderSession({
    exercises: [exercise({ id: "a", name: "Zed Press", targetSetsMin: 1, targetSetsMax: 1, loggedSetCount: 1, initialSets: [{ id: "set-0", session_exercise_id: "a", user_id: "u1", set_index: 0, weight: 225, reps: 5, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: null, weight_unit: "lbs" }] })],
    saveSessionAction: () => {
      calls += 1;
      return new Promise<{ ok: true }>((resolve) => { release = resolve; });
    },
  });
  const form = container.querySelector("form") as HTMLFormElement;
  assert.ok(form, "the Finish form exists");
  fireEvent.click(screen.getByRole("button", { name: "Finish" }));
  await waitFor(() => assert.equal(calls, 1));
  form.requestSubmit();
  form.requestSubmit();
  assert.equal(calls, 1, "a second submit while the first is saving is ignored");
  await waitFor(() => assert.equal(screen.getByRole("button", { name: /Finish/ }).getAttribute("aria-busy"), "true"));
  release({ ok: true });
  await waitFor(() => assert.ok(screen.queryByRole("button", { name: "Done" })));
  assert.equal(calls, 1);
  assert.equal(screen.queryByText("Could not save workout."), null);
});

// DESIGN #1 (2026-11-26): a saved workout stays on a summary with Done (back to Today) and View in History.
test("Session: a saved workout shows the summary with volume, top set, Done and View in History", () => {
  const set = { session_exercise_id: "a", user_id: "u1", is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: null, weight_unit: "lbs" as const };
  renderSession({
    initialIsSessionCompleted: true,
    initialDurationSeconds: 2700,
    exercises: [
      exercise({ id: "a", name: "Zed Press", loggedSetCount: 2, initialSets: [{ ...set, id: "s-0", set_index: 0, weight: 225, reps: 5 }, { ...set, id: "s-1", set_index: 1, weight: 225, reps: 4 }] }),
      exercise({ id: "b", name: "Dips", isSkipped: true }),
    ],
  });
  const card = screen.getByRole("status");
  assert.ok(within(card).getByText("Workout saved"));
  assert.ok(within(card).getByText("45m"));
  assert.ok(within(card).getByText("2,025 lbs lifted"));
  assert.ok(within(card).getByText("225 lbs x 5 · Zed Press"));
  assert.ok(within(card).getByText("Skipped"));
  assert.ok(screen.getByRole("button", { name: "Done" }));
  assert.equal(screen.getByRole("link", { name: "View in History" }).getAttribute("href"), "/history/s1?returnTab=sessions");
  assert.equal(screen.queryByRole("button", { name: "Finish" }), null);
});

// Zac 2026-11-24: open / close must be discoverable. The header and the bottom-edge grab handle toggle the same card
// (wave 2, 2026-11-26, dropped the logger's separate Close control); only one card is open at a time.
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

test("Session: header and grab handle toggle the card; no Close control; aria-expanded follows; one card open at a time", async () => {
  renderSession({ exercises: [exercise({ id: "a", name: "Zed Press" }), exercise({ id: "b", name: "Yew Row" })] });
  const header = screen.getByTestId("session-exercise-toggle-a");
  assert.equal(panelOf("a"), null);
  assert.equal(handleOf("a").getAttribute("aria-expanded"), "false");
  assert.equal(handleOf("a").getAttribute("aria-label"), "Open Zed Press logger");

  // Header opens; the handle flips. The open logger has no Close control (wave 2).
  fireEvent.click(header);
  await waitFor(() => assert.ok(panelOf("a")));
  assert.equal(header.getAttribute("aria-expanded"), "true");
  assert.equal(handleOf("a").getAttribute("aria-expanded"), "true");
  assert.equal(handleOf("a").querySelector("svg")?.getAttribute("data-session-expand-handle-direction"), "up");
  assert.equal(handleOf("a").getAttribute("aria-label"), "Collapse Zed Press logger");
  assert.equal(cardOf("a").querySelector('[data-session-logger-close="true"]'), null, "no Close control");
  assert.equal(within(cardOf("a")).queryByRole("button", { name: /^Close/ }), null);

  // The header closes it again.
  fireEvent.click(header);
  await waitFor(() => assert.equal(panelOf("a"), null));
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

test("Session: no idle chip caption; the caption says what the pressed chip does and the Log set button names the set", async () => {
  renderSession({ sessionId: "s-chips", exercises: [exercise({ id: "a", name: "Zed Press" })] });
  fireEvent.click(screen.getByTestId("session-exercise-toggle-a"));
  await waitFor(() => assert.ok(panelOf("a")));
  const caption = () => panelOf("a")?.querySelector('[data-logger-chip-caption="true"]')?.textContent ?? null;
  const logButton = () => panelOf("a")?.querySelector('[data-logger-primary="true"]')?.textContent ?? "";

  assert.equal(caption(), null, "nothing until a chip is pressed");
  assert.match(logButton(), /^Log set/);
  const panel = panelOf("a") as HTMLElement;
  assert.equal(within(panel).queryByRole("button", { name: "Exercise timer" }), null, "the timer moved to the More menu");
  assert.equal(within(panel).queryByRole("button", { name: /Log all|Use last|Resync|Clear last/ }), null, "one primary action in the open logger");

  fireEvent.click(within(panel).getByRole("button", { name: "Warm-up set" }));
  await waitFor(() => assert.equal(caption(), "Warm-up: not counted for progression"));
  assert.match(logButton(), /^Log warm-up set/);

  fireEvent.click(within(panelOf("a") as HTMLElement).getByRole("button", { name: "Warm-up set" }));
  fireEvent.click(within(panelOf("a") as HTMLElement).getByRole("button", { name: "Failure" }));
  await waitFor(() => assert.equal(caption(), "Failure: a tag only. Enter reps reached"));
  assert.match(logButton(), /^Log failure set/);
  assert.doesNotMatch(panelOf("a")?.textContent ?? "", /Target/, "plain words, never Target");

  fireEvent.click(within(panelOf("a") as HTMLElement).getByRole("button", { name: "Failure" }));
  await waitFor(() => assert.equal(caption(), null));
});

function lastHint(): NonNullable<SessionExerciseFocusItem["targetHint"]> {
  const values = { measurementType: "reps" as const, weight: 205, reps: 6, durationSeconds: null, distance: null, distanceUnit: null, calories: null, weightUnit: "lbs" as const };
  return {
    shortLabel: "Next: 6 reps",
    reason: "Last time",
    source: "fallback_last_successful_set",
    confidence: "medium",
    suggestedValues: values,
    lastSummary: "205 lbs x 6",
    lastSuggestedValues: values,
    lastPerformedAt: "2026-11-19T12:00:00.000Z",
    lastPerformedAtLabel: "Nov 19",
    recentBestSummary: null,
    recentBestSuggestedValues: null,
    recentBestPerformedAt: null,
    recentBestPerformedAtLabel: null,
  };
}

test("Session: the Last time line reads reps x weight and the date; tapping it fills the fields", async () => {
  const calls: AddSetPayload[] = [];
  renderSession({
    sessionId: "s-last",
    exercises: [exercise({ id: "a", name: "Zed Press", targetHint: lastHint() })],
    addSetAction: acceptingAddSet(calls) as never,
  });
  fireEvent.click(screen.getByTestId("session-exercise-toggle-a"));
  await waitFor(() => assert.ok(panelOf("a")));
  const line = panelOf("a")?.querySelector<HTMLButtonElement>('[data-logger-last-time="true"]');
  assert.ok(line, "one Last time line in the open logger");
  assert.match(line.textContent ?? "", /^Last time: 6 × 205 lbs · Nov 19/);
  assert.match(line.getAttribute("aria-label") ?? "", /Tap to fill reps and weight/);

  fireEvent.click(line);
  const logButton = () => panelOf("a")?.querySelector<HTMLButtonElement>('[data-logger-primary="true"]');
  await waitFor(() => assert.match(logButton()?.textContent ?? "", /6 reps/));
  assert.match(logButton()?.textContent ?? "", /205 lbs/);
  fireEvent.click(logButton() as HTMLButtonElement);
  await waitFor(() => assert.equal(calls.length, 1));
  assert.equal(calls[0].reps, 6);
  assert.equal(calls[0].weight, 205);
});

test("Session: logging the last planned set in the open logger closes the card and opens the next unfinished one", async () => {
  const calls: AddSetPayload[] = [];
  renderSession({
    sessionId: "s-advance",
    exercises: [
      exercise({ id: "a", name: "Zed Press", targetSetsMin: 2, targetSetsMax: 2 }),
      exercise({ id: "b", name: "Yew Row", isSkipped: true }),
      exercise({ id: "c", name: "Xen Curl" }),
    ],
    addSetAction: acceptingAddSet(calls) as never,
  });
  fireEvent.click(screen.getByTestId("session-exercise-toggle-a"));
  await waitFor(() => assert.ok(panelOf("a")));
  const logInPanel = () => fireEvent.click(panelOf("a")?.querySelector('[data-logger-primary="true"]') as HTMLButtonElement);

  // Set 1 of 2: the card stays open.
  logInPanel();
  await waitFor(() => assert.equal(calls.length, 1));
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.ok(panelOf("a"), "not the last planned set: stay on the card");

  // Set 2 of 2: this card closes, the skipped one is passed over, the next unfinished one opens.
  logInPanel();
  await waitFor(() => assert.equal(calls.length, 2));
  await waitFor(() => assert.ok(panelOf("c"), "the next unfinished exercise opens"));
  assert.equal(panelOf("a"), null, "the finished card closes");
  assert.equal(panelOf("b"), null, "a skipped exercise is passed over");
  assert.equal(document.querySelectorAll('[data-testid^="session-exercise-panel-"]').length, 1, "one open card at a time");
});

test("Session: a failed save never auto-advances", async () => {
  let calls = 0;
  renderSession({
    sessionId: "s-fail",
    exercises: [exercise({ id: "a", name: "Zed Press", targetSetsMin: 1, targetSetsMax: 1 }), exercise({ id: "b", name: "Yew Row" })],
    addSetAction: (async () => {
      calls += 1;
      return { ok: false as const, error: "Could not log set." };
    }) as never,
  });
  fireEvent.click(screen.getByTestId("session-exercise-toggle-a"));
  await waitFor(() => assert.ok(panelOf("a")));
  fireEvent.click(panelOf("a")?.querySelector('[data-logger-primary="true"]') as HTMLButtonElement);
  await waitFor(() => assert.equal(calls, 1));
  await screen.findByText("Could not log set.");
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.ok(panelOf("a"), "the card stays open after a failed save");
  assert.equal(panelOf("b"), null, "the next card did not open");
});

test("Session: the last planned set of the last unfinished exercise just closes the card (no next)", async () => {
  const calls: AddSetPayload[] = [];
  renderSession({
    sessionId: "s-last-card",
    exercises: [
      exercise({ id: "a", name: "Zed Press", isSkipped: true }),
      exercise({ id: "b", name: "Yew Row", targetSetsMin: 1, targetSetsMax: 1 }),
    ],
    addSetAction: acceptingAddSet(calls) as never,
  });
  fireEvent.click(screen.getByTestId("session-exercise-toggle-b"));
  await waitFor(() => assert.ok(panelOf("b")));
  fireEvent.click(panelOf("b")?.querySelector('[data-logger-primary="true"]') as HTMLButtonElement);
  await waitFor(() => assert.equal(calls.length, 1));
  await waitFor(() => assert.equal(panelOf("b"), null, "the finished card closes"));
  assert.equal(document.querySelectorAll('[data-testid^="session-exercise-panel-"]').length, 0, "nothing else opens");
});

test("Session: a save that lands after the user opened another card never yanks the selection", async () => {
  const calls: AddSetPayload[] = [];
  const accept = acceptingAddSet(calls);
  let release: (() => void) | null = null;
  renderSession({
    sessionId: "s-late",
    exercises: [
      exercise({ id: "a", name: "Zed Press", targetSetsMin: 1, targetSetsMax: 1 }),
      exercise({ id: "b", name: "Yew Row" }),
      exercise({ id: "c", name: "Xen Curl" }),
    ],
    addSetAction: (async (payload: AddSetPayload) => {
      await new Promise<void>((resolve) => { release = resolve; });
      return accept(payload);
    }) as never,
  });
  fireEvent.click(screen.getByTestId("session-exercise-toggle-a"));
  await waitFor(() => assert.ok(panelOf("a")));
  fireEvent.click(panelOf("a")?.querySelector('[data-logger-primary="true"]') as HTMLButtonElement);
  await waitFor(() => assert.ok(release, "the save is in flight"));

  // The user moves to Xen Curl by hand while Zed Press's last set is still saving.
  fireEvent.click(screen.getByTestId("session-exercise-toggle-c"));
  await waitFor(() => assert.ok(panelOf("c")));
  (release as unknown as () => void)();
  await waitFor(() => assert.equal(calls.length, 1));
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok(panelOf("c"), "the card the user chose stays open");
  assert.equal(panelOf("b"), null, "the late save did not advance to the next card");
  assert.equal(panelOf("a"), null);
});

test("Session: the timer is shown and hidden from the open card's More menu", async () => {
  const commands: string[] = [];
  renderSession({
    sessionId: "s-timer",
    exercises: [exercise({ id: "a", name: "Zed Press" })],
    updateSessionExerciseTimerAction: async (payload) => {
      commands.push(payload.command);
      return {
        ok: true as const,
        data: { timer: { enabled: payload.command === "enable", mode: "count_up", targetSeconds: null, elapsedSeconds: 0, status: "idle", startedAt: null, completedAt: null } },
      };
    },
  });
  fireEvent.click(screen.getByTestId("session-exercise-toggle-a"));
  await waitFor(() => assert.ok(panelOf("a")));
  const panel = panelOf("a") as HTMLElement;
  const more = panel.querySelector<HTMLButtonElement>('[data-logger-actions="true"] button[aria-haspopup]');
  assert.ok(more, "the More menu sits next to Log set");

  fireEvent.click(more);
  fireEvent.click(await screen.findByRole("menuitem", { name: "Show timer" }));
  await waitFor(() => assert.deepEqual(commands, ["enable"]));

  fireEvent.click(more);
  fireEvent.click(await screen.findByRole("menuitem", { name: "Hide timer" }));
  await waitFor(() => assert.deepEqual(commands, ["enable", "disable"]));
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
