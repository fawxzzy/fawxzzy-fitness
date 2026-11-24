import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { RepeatWorkoutCard } from "../../src/components/history/RepeatWorkoutCard.tsx";
import { readActiveSessionHint } from "../../src/lib/session-state-sync.ts";
import {
  REPEAT_WORKOUT_FAILED_MESSAGE,
  REPEAT_WORKOUT_IN_PROGRESS_MESSAGE,
  REPEAT_WORKOUT_NO_DAY_MESSAGE,
  REPEAT_WORKOUT_OFFLINE_MESSAGE,
  REPEAT_WORKOUT_ROUTINE_INACTIVE_MESSAGE,
  getRepeatWorkoutAvailability,
} from "../../src/lib/repeat-workout.ts";

// History session detail "Repeat workout": posts the finished session's id, opens the NEW session, routes to a live
// one with a notice instead of starting a second, and keeps every failure in the notice system (no red card text).

type FetchCall = { url: string; body: unknown };

const realFetch = globalThis.fetch;
let fetchCalls: FetchCall[] = [];

function stubFetch(respond: () => { status: number; json: unknown }) {
  fetchCalls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
    const { status, json } = respond();
    return new Response(JSON.stringify(json), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  fetchCalls = [];
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
  Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
});

function renderCard(props: Partial<Parameters<typeof RepeatWorkoutCard>[0]> = {}) {
  const { router, calls } = createRouterSpy();
  render(
    <AppProviders router={router} pathname="/history/s-old">
      <RepeatWorkoutCard sessionId="s-old" dayLabel="Push" available {...props} />
    </AppProviders>,
  );
  return calls;
}

test("Repeat workout: the card explains what happens and offers one 44px-high button", () => {
  renderCard();
  assert.ok(screen.getByRole("heading", { name: "Repeat workout" }));
  assert.ok(screen.getByText("Start a new workout for Push with your current goals. This workout stays as logged."));
  const button = screen.getByRole("button", { name: "Repeat workout" });
  assert.equal((button as HTMLButtonElement).disabled, false);
  assert.match(button.className, /min-h-\[2\.75rem\]/, "at least 44px tall");
  assert.doesNotMatch(document.body.textContent ?? "", /target/i);
});

test("Repeat workout: posts the finished session id, remembers and opens the new session", async () => {
  stubFetch(() => ({ status: 200, json: { ok: true, data: { sessionId: "s-new", resumed: false } } }));
  const calls = renderCard();

  fireEvent.click(screen.getByRole("button", { name: "Repeat workout" }));

  await waitFor(() => assert.deepEqual(calls.push, ["/session/s-new?returnTo=%2Ftoday"]));
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, "/api/sessions/repeat");
  assert.deepEqual(fetchCalls[0].body, { sessionId: "s-old" });
  assert.equal(readActiveSessionHint()?.sessionId, "s-new");
});

test("Repeat workout: a double tap starts one workout", async () => {
  stubFetch(() => ({ status: 200, json: { ok: true, data: { sessionId: "s-new", resumed: false } } }));
  const calls = renderCard();
  const button = screen.getByRole("button", { name: "Repeat workout" });

  fireEvent.click(button);
  fireEvent.click(button);

  await waitFor(() => assert.equal(calls.push.length, 1));
  assert.equal(fetchCalls.length, 1);
});

test("Repeat workout: a workout already in progress is opened with a plain notice, not a second one", async () => {
  stubFetch(() => ({ status: 200, json: { ok: true, data: { sessionId: "s-live", resumed: true } } }));
  const calls = renderCard();

  fireEvent.click(screen.getByRole("button", { name: "Repeat workout" }));

  assert.ok(await screen.findByText(REPEAT_WORKOUT_IN_PROGRESS_MESSAGE));
  await waitFor(() => assert.deepEqual(calls.push, ["/session/s-live?returnTo=%2Ftoday"]));
  assert.equal(readActiveSessionHint()?.sessionId, "s-live");
});

test("Repeat workout: a refusal (day deleted) shows the reason as a notice and does not navigate", async () => {
  const reason = "That day is no longer in the routine. Start a workout from Today instead.";
  stubFetch(() => ({ status: 400, json: { ok: false, error: reason } }));
  const calls = renderCard();

  fireEvent.click(screen.getByRole("button", { name: "Repeat workout" }));

  assert.ok(await screen.findByText(reason));
  assert.deepEqual(calls.push, []);
  assert.equal(readActiveSessionHint(), null);
  await waitFor(() => assert.equal((screen.getByRole("button", { name: "Repeat workout" }) as HTMLButtonElement).disabled, false));
});

test("Repeat workout: a server that does not answer (HTML 500) shows the retry notice", async () => {
  globalThis.fetch = (async () => new Response("<html>boom</html>", { status: 500 })) as typeof fetch;
  const calls = renderCard();

  fireEvent.click(screen.getByRole("button", { name: "Repeat workout" }));

  assert.ok(await screen.findByText(REPEAT_WORKOUT_FAILED_MESSAGE));
  assert.deepEqual(calls.push, []);
});

test("Repeat workout: offline shows the offline notice and sends nothing", async () => {
  stubFetch(() => ({ status: 200, json: { ok: true, data: { sessionId: "s-new", resumed: false } } }));
  Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
  const calls = renderCard();

  fireEvent.click(screen.getByRole("button", { name: "Repeat workout" }));

  assert.ok(await screen.findByText(REPEAT_WORKOUT_OFFLINE_MESSAGE));
  assert.equal(fetchCalls.length, 0);
  assert.deepEqual(calls.push, []);
});

test("Repeat workout: an expired session (401) shows the sign-in message and opens nothing", async () => {
  stubFetch(() => ({ status: 401, json: { ok: false, error: "Unauthorized" } }));
  const calls = renderCard();

  fireEvent.click(screen.getByRole("button", { name: "Repeat workout" }));

  assert.ok(await screen.findByText("Your session has expired. Sign in again."));
  assert.deepEqual(calls.push, []);
});

test("Repeat workout: an ad-hoc workout shows a disabled button with the plain reason and never sends", () => {
  stubFetch(() => ({ status: 200, json: { ok: true, data: { sessionId: "s-new", resumed: false } } }));
  const calls = renderCard({ available: false, unavailableReason: REPEAT_WORKOUT_NO_DAY_MESSAGE });

  const button = screen.getByRole("button", { name: "Repeat workout" }) as HTMLButtonElement;
  assert.equal(button.disabled, true);
  assert.ok(screen.getByText(REPEAT_WORKOUT_NO_DAY_MESSAGE));
  assert.notEqual(button.getAttribute("aria-describedby"), null, "the reason is attached to the button");
  fireEvent.click(button);
  assert.equal(fetchCalls.length, 0);
  assert.deepEqual(calls.push, []);
});

test("Repeat workout: a workout from an inactive routine shows the switch-routine reason on a disabled button and never sends", () => {
  stubFetch(() => ({ status: 200, json: { ok: true, data: { sessionId: "s-new", resumed: false } } }));
  // The page derives the card props from the session row and the profile's active routine, exactly like this.
  const availability = getRepeatWorkoutAvailability({ routine_id: "r-old", routine_day_index: 1 }, "r-current");
  assert.equal(availability.available, false);
  const calls = renderCard(
    availability.available ? { available: true } : { available: false, unavailableReason: availability.reason },
  );

  const button = screen.getByRole("button", { name: "Repeat workout" }) as HTMLButtonElement;
  assert.equal(button.disabled, true);
  assert.ok(screen.getByText("This workout belongs to a routine that isn't active. Switch to it in Routines to repeat it."));
  assert.ok(screen.getByText(REPEAT_WORKOUT_ROUTINE_INACTIVE_MESSAGE));
  assert.notEqual(button.getAttribute("aria-describedby"), null, "the reason is attached to the button");
  fireEvent.click(button);
  assert.equal(fetchCalls.length, 0);
  assert.deepEqual(calls.push, []);
});
