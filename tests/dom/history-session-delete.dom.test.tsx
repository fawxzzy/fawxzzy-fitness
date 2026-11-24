import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { ConfirmedServerFormButton } from "../../src/components/destructive/ConfirmedServerFormButton.tsx";
import { buildHistorySessionDeleteCopy } from "../../src/lib/history-session-delete-copy.ts";

// History review item 3 (2026-11-23): the session-delete confirm names the day ("Delete Day 5?"), says what goes with
// it, and a double tap on the confirm button submits exactly once. Same props as LogAuditClient's delete button.

// React builds `new FormData(form)` for form actions; Node's own FormData rejects a jsdom form, so use jsdom's here.
Object.defineProperty(globalThis, "FormData", { value: window.FormData, configurable: true, writable: true });

afterEach(() => {
  cleanup();
});

const FAILURE = "Could not delete this session. Try again.";

function renderSessionDelete(action: (formData: FormData) => Promise<unknown>) {
  const { router, calls } = createRouterSpy();
  const submitted: FormData[] = [];
  const copy = buildHistorySessionDeleteCopy({ dayTitle: "Day 5", dayName: "Legs", dateLabel: "Nov 21", exerciseCount: 4 });
  render(
    <AppProviders router={router} pathname="/history/log-5">
      <ConfirmedServerFormButton
        action={async (formData: FormData) => {
          submitted.push(formData);
          return action(formData);
        }}
        hiddenFields={{ sessionId: "log-5" }}
        size="md"
        triggerLabel="Delete"
        triggerAriaLabel={copy.triggerAriaLabel}
        triggerIntent="danger"
        modalTitle={copy.title}
        modalTitleVariant="raw"
        showDetailsInDeleteLayout
        modalConsequenceText={copy.consequence}
        confirmLabel="Delete"
        failureMessage={FAILURE}
      />
    </AppProviders>,
  );
  return { submitted, calls };
}

test("delete copy names the session and counts what goes with it", () => {
  assert.deepEqual(buildHistorySessionDeleteCopy({ dayTitle: "Day 5", dateLabel: "Nov 21", exerciseCount: 4 }), {
    name: "Day 5",
    triggerAriaLabel: "Delete Day 5",
    title: "Delete Day 5?",
    consequence: "Removes the Nov 21 session and its 4 exercises. This cannot be undone.",
  });
  assert.equal(buildHistorySessionDeleteCopy({ dayTitle: " ", dayName: "Legs", exerciseCount: 1 }).consequence, "Removes this session and its 1 exercise. This cannot be undone.");
  assert.equal(buildHistorySessionDeleteCopy({ exerciseCount: 0 }).title, "Delete this session?");
});

test("History session delete: the confirm names the day, states the consequence, and a double tap submits once", async () => {
  let resolveAction: (value: unknown) => void = () => {};
  const { submitted } = renderSessionDelete(() => new Promise((resolve) => {
    resolveAction = resolve;
  }));

  fireEvent.click(screen.getByRole("button", { name: "Delete Day 5" }));
  const dialog = await screen.findByRole("dialog");
  assert.ok(within(dialog).getByText("Delete Day 5?"), "the title names the day");
  assert.ok(within(dialog).getByText("Removes the Nov 21 session and its 4 exercises. This cannot be undone."));

  const confirm = within(dialog).getByRole("button", { name: /^(Delete|Confirm)$/ });
  await act(async () => {
    fireEvent.click(confirm);
    fireEvent.click(confirm);
  });
  await act(async () => {
    fireEvent.click(confirm);
  });

  await waitFor(() => assert.equal(submitted.length, 1));
  assert.equal(submitted[0].get("sessionId"), "log-5");

  await act(async () => {
    resolveAction({ ok: true });
  });
  await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
  assert.equal(submitted.length, 1, "exactly one delete request");
});

test("History session delete: a not_found code says the item is gone and the screen refreshed (it really refreshes)", async () => {
  const { calls } = renderSessionDelete(async () => ({ ok: false, error: "not_found" }));

  fireEvent.click(screen.getByRole("button", { name: "Delete Day 5" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: /^(Delete|Confirm)$/ }));

  const notice = await screen.findByRole("alert");
  assert.equal(notice.textContent?.includes("That item is no longer there. The screen has been refreshed."), true);
  assert.equal(calls.refresh, 1);
});
