import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { Component, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { TodayStartButton } from "../../src/app/today/TodayStartButton.tsx";
import { ACTIVE_SESSION_HINT_KEY, readActiveSessionHint } from "../../src/lib/session-state-sync.ts";
import { getProgressionAppliedPinsStorageKey } from "../../src/lib/progression-applied-pins.ts";
import { SESSION_RESUME_FAILED_MESSAGE, SESSION_START_FAILED_MESSAGE } from "../../src/lib/session-action-response.ts";

type FetchCall = { url: string; body: unknown };

const realFetch = globalThis.fetch;
let fetchCalls: FetchCall[] = [];

function stubFetch(respond: (url: string) => { status: number; json: unknown }) {
  fetchCalls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    fetchCalls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
    const { status, json } = respond(url);
    return new Response(JSON.stringify(json), { status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
});

function renderButton(props: Parameters<typeof TodayStartButton>[0]) {
  const { router, calls } = createRouterSpy();
  render(
    <AppProviders router={router} pathname="/today">
      <TodayStartButton {...props} />
    </AppProviders>,
  );
  return calls;
}

test("Today: Start Workout posts the chosen day, then opens the new session", async () => {
  stubFetch(() => ({ status: 200, json: { ok: true, data: { sessionId: "s-new" } } }));
  const calls = renderButton({ routineId: "r1", dayId: "d1", selectedDayIndex: 2, returnTo: "/today" });

  fireEvent.click(screen.getByRole("button", { name: "Start Workout" }));

  await waitFor(() => assert.deepEqual(calls.push, ["/session/s-new?returnTo=%2Ftoday"]));
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, "/api/sessions/start");
  assert.deepEqual(fetchCalls[0].body, { selectedDayIndex: 2, routineId: "r1", dayId: "d1" });
  assert.equal(readActiveSessionHint()?.sessionId, "s-new", "the new session is remembered as the active one");
});

test("Today: with a live session the button resumes it instead of starting a second one", async () => {
  stubFetch(() => ({ status: 200, json: { ok: true, data: { href: "/session/s-live?returnTo=%2Ftoday" } } }));
  const calls = renderButton({ sessionId: "s-live", returnTo: "/today", label: "Resume Workout" });

  fireEvent.click(screen.getByRole("button", { name: "Resume Workout" }));

  await waitFor(() => assert.deepEqual(calls.push, ["/session/s-live?returnTo=%2Ftoday"]));
  assert.deepEqual(fetchCalls.map((call) => call.url), ["/api/sessions/resume"]);
  assert.deepEqual(fetchCalls[0].body, { sessionId: "s-live", returnTo: "/today" });
});

test("Today: a failed start shows the error and does not navigate", async () => {
  stubFetch(() => ({ status: 200, json: { ok: false, error: "No routine day is active." } }));
  const calls = renderButton({ routineId: "r1", dayId: "d1" });

  fireEvent.click(screen.getByRole("button", { name: "Start Workout" }));

  assert.ok(await screen.findByText("No routine day is active."));
  assert.deepEqual(calls.push, []);
  assert.ok(screen.getByRole("button", { name: "Start Workout" }), "the button is usable again");
});

test("Today: a failed resume clears the stale hint, shows the error and refreshes the page", async () => {
  window.localStorage.setItem(ACTIVE_SESSION_HINT_KEY, JSON.stringify({ sessionId: "s-gone", updatedAt: 1 }));
  stubFetch(() => ({ status: 200, json: { ok: false, error: "That workout is no longer open." } }));
  const calls = renderButton({ sessionId: "s-gone", label: "Resume Workout" });

  fireEvent.click(screen.getByRole("button", { name: "Resume Workout" }));

  assert.ok(await screen.findByText("That workout is no longer open."));
  assert.deepEqual(calls.push, []);
  assert.equal(calls.refresh, 1);
  assert.equal(readActiveSessionHint(), null, "the stale active-session hint is cleared");
});

test("Today: an expired session (401) shows the sign-in message and never opens a session", async () => {
  stubFetch(() => ({ status: 401, json: { ok: false, error: "Unauthorized" } }));
  const calls = renderButton({ routineId: "r1", dayId: "d1" });

  fireEvent.click(screen.getByRole("button", { name: "Start Workout" }));

  assert.ok(await screen.findByText("Your session has expired. Sign in again."));
  assert.deepEqual(calls.push, []);
});

function writePendingPin(routineId: string, dayId: string) {
  const now = Date.now();
  window.sessionStorage.setItem(
    getProgressionAppliedPinsStorageKey(routineId),
    JSON.stringify([
      {
        routineDayExerciseId: "rde-1",
        item: { dayGroupId: dayId },
        previousTarget: {},
        appliedTarget: {},
        lifecycleState: "pending_revert",
        appliedAt: now,
        expiresAt: now + 60_000,
      },
    ]),
  );
}

test("Today: applied progression updates ask for a lock-in; Keep Revert starts nothing and keeps the pin", async () => {
  writePendingPin("r1", "d1");
  stubFetch(() => ({ status: 200, json: { ok: true, data: { sessionId: "s-new" } } }));
  const calls = renderButton({ routineId: "r1", dayId: "d1" });

  fireEvent.click(screen.getByRole("button", { name: "Start Workout" }));
  const sheet = await screen.findByRole("dialog");
  assert.ok(within(sheet).getByText("Lock in applied progression updates?"));
  fireEvent.click(within(sheet).getByRole("button", { name: /Keep Revert/ }));

  await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
  assert.equal(fetchCalls.length, 0);
  assert.deepEqual(calls.push, []);
  assert.ok(window.sessionStorage.getItem(getProgressionAppliedPinsStorageKey("r1")), "the quick-undo pin is still there");
});

test("Today: Lock In clears the pin for that day, then starts the workout", async () => {
  writePendingPin("r1", "d1");
  stubFetch(() => ({ status: 200, json: { ok: true, data: { sessionId: "s-new" } } }));
  const calls = renderButton({ routineId: "r1", dayId: "d1" });

  fireEvent.click(screen.getByRole("button", { name: "Start Workout" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: /Lock In/ }));

  await waitFor(() => assert.deepEqual(calls.push, ["/session/s-new"]));
  assert.equal(window.sessionStorage.getItem(getProgressionAppliedPinsStorageKey("r1")), null);
  assert.equal(fetchCalls.length, 1);
});

// --- Transport failures (Today review 2026-11-19, HIGH): an HTML 500 or a dropped connection must not reach the app
// error boundary (which replaced the whole app, tab bar included, with "Could not load"). The shell stays and one
// error notice explains what happened.

class ShellBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch() {}
  render() {
    return this.state.crashed ? <p>Could not load</p> : this.props.children;
  }
}

function renderInShell(props: Parameters<typeof TodayStartButton>[0]) {
  const { router, calls } = createRouterSpy();
  render(
    <AppProviders router={router} pathname="/today">
      <ShellBoundary>
        <nav aria-label="Tabs">Today Routines History Settings</nav>
        <TodayStartButton {...props} />
      </ShellBoundary>
    </AppProviders>,
  );
  return calls;
}

function stubRawFetch(respond: () => Promise<Response>) {
  fetchCalls = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    fetchCalls.push({ url: String(input), body: null });
    return respond();
  }) as typeof fetch;
}

const htmlServerError = async () =>
  new Response("<html><body>Internal Server Error</body></html>", { status: 500, headers: { "Content-Type": "text/html" } });
const droppedConnection = async (): Promise<Response> => {
  throw new TypeError("Failed to fetch");
};

for (const [name, respond] of [["an HTML 500 page", htmlServerError], ["a dropped connection", droppedConnection]] as const) {
  test(`Today: Start with ${name} keeps the app shell and shows one error notice`, async () => {
    stubRawFetch(respond);
    const calls = renderInShell({ routineId: "r1", dayId: "d1" });

    fireEvent.click(screen.getByRole("button", { name: "Start Workout" }));

    const notice = await screen.findByRole("alert");
    assert.equal(notice.textContent?.includes(SESSION_START_FAILED_MESSAGE), true);
    assert.equal(screen.queryByText("Could not load"), null, "the error boundary did not replace the app");
    assert.ok(screen.getByRole("navigation", { name: "Tabs" }), "the tab bar is still there");
    assert.deepEqual(calls.push, []);
    await waitFor(() => assert.ok(screen.getByRole("button", { name: "Start Workout" }), "the button is usable again"));
  });

  test(`Today: Resume with ${name} keeps the shell, keeps the workout hint and does not refresh`, async () => {
    window.localStorage.setItem(ACTIVE_SESSION_HINT_KEY, JSON.stringify({ sessionId: "s-live", updatedAt: 1 }));
    stubRawFetch(respond);
    const calls = renderInShell({ sessionId: "s-live", label: "Resume Workout" });

    fireEvent.click(screen.getByRole("button", { name: "Resume Workout" }));

    const notice = await screen.findByRole("alert");
    assert.equal(notice.textContent?.includes(SESSION_RESUME_FAILED_MESSAGE), true);
    assert.equal(screen.queryByText("Could not load"), null);
    assert.ok(screen.getByRole("navigation", { name: "Tabs" }));
    assert.deepEqual(calls.push, []);
    assert.equal(calls.refresh, 0, "an unanswered request does not refresh the page");
    assert.equal(readActiveSessionHint()?.sessionId, "s-live", "the workout may still be open, so its hint stays");
  });
}
