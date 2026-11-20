import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { Component, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { ConfirmedServerFormButton } from "../../src/components/destructive/ConfirmedServerFormButton.tsx";
import { runBestEffortSteps } from "../../src/lib/best-effort-steps.ts";
import { TodayNoticeHost } from "../../src/app/today/TodayNoticeHost.tsx";
import { useToast } from "../../src/components/ui/ToastProvider.tsx";

// Today review 2026-11-19: a failed "Discard workout" used to redirect to /today?error=..., and that notice never
// rendered, so the dialog just closed and the workout was still there with no explanation. The discard action now
// returns { ok: false } and the confirm button turns that (or a thrown action) into one error notice.

const FAILURE = "Could not discard the workout. Try again.";

// React builds `new FormData(form)` for form actions; Node's own FormData rejects a jsdom form, so use jsdom's here.
Object.defineProperty(globalThis, "FormData", { value: window.FormData, configurable: true, writable: true });

afterEach(() => {
  cleanup();
});

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

let lastRouterCalls: ReturnType<typeof createRouterSpy>["calls"] | null = null;

function renderDiscard(action: (formData: FormData) => unknown, failureMessage: string | null = FAILURE) {
  const { router, calls } = createRouterSpy();
  const submitted: FormData[] = [];
  lastRouterCalls = calls;
  render(
    <AppProviders router={router} pathname="/today">
      <ShellBoundary>
        <nav aria-label="Tabs">Today Routines History Settings</nav>
        <ConfirmedServerFormButton
          action={async (formData: FormData) => {
            submitted.push(formData);
            return action(formData);
          }}
          hiddenFields={{ sessionId: "s-live" }}
          triggerLabel="Discard"
          modalTitle="Discard workout?"
          modalConsequenceText="Current workout will be removed."
          confirmLabel="Discard Workout"
          failureMessage={failureMessage ?? undefined}
        />
      </ShellBoundary>
    </AppProviders>,
  );
  return submitted;
}

async function confirmDiscard() {
  fireEvent.click(screen.getByRole("button", { name: "Discard" }));
  const dialog = await screen.findByRole("dialog");
  assert.ok(within(dialog).getByText("Confirm discard workout"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));
}

test("Today discard: an { ok: false } result closes the dialog and shows the server's error notice", async () => {
  const submitted = renderDiscard(() => ({ ok: false, error: "That workout is already finished." }));

  await confirmDiscard();

  const notice = await screen.findByRole("alert");
  assert.equal(notice.textContent?.includes("That workout is already finished."), true);
  await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
  assert.equal(submitted.length, 1);
  assert.equal(submitted[0].get("sessionId"), "s-live");
  assert.ok(screen.getByRole("navigation", { name: "Tabs" }));
  assert.equal(lastRouterCalls?.refresh, 1, "a failure re-reads Today so a stale Discard button does not stay");
});

test("Today discard: a thrown action (offline / 500) shows the failure notice and keeps the app shell", async () => {
  renderDiscard(() => {
    throw new TypeError("Failed to fetch");
  });

  await confirmDiscard();

  const notice = await screen.findByRole("alert");
  assert.equal(notice.textContent?.includes(FAILURE), true);
  await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
  assert.equal(screen.queryByText("Could not load"), null, "the error boundary did not replace the app");
  assert.ok(screen.getByRole("navigation", { name: "Tabs" }));
  assert.equal(lastRouterCalls?.refresh, 1);
});

test("Today discard: an { ok: false } with no text falls back to the failure message", async () => {
  renderDiscard(() => ({ ok: false, error: "  " }));

  await confirmDiscard();

  const notice = await screen.findByRole("alert");
  assert.equal(notice.textContent?.includes(FAILURE), true);
});

test("Today discard: a successful redirect() is still rethrown, never shown as a failure", async () => {
  renderDiscard(() => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/today;307;" });
  });

  await confirmDiscard();

  assert.ok(await screen.findByText("Could not load"), "the redirect error reaches the framework, not a notice");
  assert.equal(screen.queryByRole("alert"), null);
});

test("callers without failureMessage keep the old behaviour (a throw still reaches the boundary)", async () => {
  renderDiscard(() => {
    throw new Error("boom");
  }, null);

  await confirmDiscard();

  assert.ok(await screen.findByText("Could not load"));
  assert.equal(screen.queryByRole("alert"), null);
});

test("Today discard: telemetry that throws after a successful delete still ends in success, not a failure notice", async () => {
  // Mirrors discardInProgressSessionAction's tail: rows deleted, best-effort telemetry, then redirect("/today").
  const attempted: string[] = [];
  const logged: string[] = [];
  renderDiscard(async () => {
    await runBestEffortSteps(
      "today.discardInProgressSession",
      [
        ["recordFitnessSignal", () => {
          attempted.push("recordFitnessSignal");
          throw new Error("signal store down");
        }],
        ["publishFitnessIntegrationState", async () => {
          attempted.push("publishFitnessIntegrationState");
          throw new Error("publish timeout");
        }],
      ],
      (_message, details) => logged.push(String(details.step)),
    );
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/today;307;" });
  });

  await confirmDiscard();

  assert.ok(await screen.findByText("Could not load"), "the success redirect reaches the framework");
  assert.equal(screen.queryByRole("alert"), null, "no 'Could not discard the workout' for a workout that is gone");
  assert.deepEqual(attempted, ["recordFitnessSignal", "publishFitnessIntegrationState"]);
  assert.deepEqual(logged, ["recordFitnessSignal", "publishFitnessIntegrationState"]);
});

function OtherScreenToast({ message }: { message: string }) {
  const toast = useToast();
  return <button type="button" onClick={() => toast.error(message, { persistent: true })}>Show other</button>;
}

test("Today's persistent notice does not follow the person onto another tab", async () => {
  const { router } = createRouterSpy();
  const notFound = "That workout could not be found.";
  const view = render(
    <AppProviders router={router} pathname="/today">
      <TodayNoticeHost message={notFound} />
      <OtherScreenToast message="Unrelated persistent error" />
    </AppProviders>,
  );

  const notice = await screen.findByRole("alert");
  assert.equal(notice.textContent?.includes(notFound), true);
  fireEvent.click(screen.getByRole("button", { name: "Show other" }));
  await waitFor(() => assert.equal(screen.getAllByRole("alert").length, 2));

  view.rerender(
    <AppProviders router={router} pathname="/routines">
      <OtherScreenToast message="Unrelated persistent error" />
    </AppProviders>,
  );

  await waitFor(() => assert.equal(screen.queryByText(notFound) === null, true, "Today notice dismissed"), { timeout: 2000 });
  assert.ok(screen.getByText("Unrelated persistent error"), "notices that are not screen-owned keep their own lifetime");
});
