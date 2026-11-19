import "./dom-env.ts";
import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppProviders, createRouterSpy } from "./providers.tsx";
import { CreateRoutineClient } from "../../src/app/routines/CreateRoutineClient.tsx";
import { ROUTINE_COPY_NAME_MAX_LENGTH } from "../../src/lib/routine-copy-name.ts";
import type { RoutineBrowseCardItem } from "../../src/components/routines/RoutineBrowseCard.tsx";

afterEach(() => cleanup());

const routines: RoutineBrowseCardItem[] = [
  { id: "r1", name: "Atlas Routine", summaryParts: ["16 exercises", "4 days"], createdAt: "2026-11-05T12:00:00Z", isActive: true, previewDays: [] },
  { id: "r2", name: "Hypertrophy", summaryParts: ["14 exercises", "4 days"], createdAt: "2026-11-06T12:00:00Z", isActive: false, previewDays: [] },
];

type DuplicateResult = { ok: true; routineId?: string } | { ok: false; error: string };

function renderChooser(duplicate: (formData: FormData) => Promise<DuplicateResult>, extra: { onRequestClose?: () => void } = {}) {
  const { router, calls } = createRouterSpy();
  render(
    <AppProviders router={router} pathname="/routines">
      <CreateRoutineClient
        backHref="/routines"
        routines={routines}
        duplicateRoutineAction={duplicate as never}
        initialDuplicateExpanded
        {...extra}
      />
    </AppProviders>,
  );
  return calls;
}

async function nameField() {
  return (await screen.findByLabelText("New routine name")) as HTMLInputElement;
}

test("Routine form: the duplicate name starts as a unique copy of the active routine and Confirm sends it", async () => {
  const sent: Array<{ source: string; name: string }> = [];
  const calls = renderChooser(async (formData) => {
    sent.push({ source: String(formData.get("sourceRoutineId")), name: String(formData.get("name")) });
    return { ok: true, routineId: "r3" };
  });

  const input = await nameField();
  assert.notEqual(input.value.trim(), "");
  assert.notEqual(input.value.trim().toLowerCase(), "atlas routine", "the suggested name must not collide with the source");
  fireEvent.change(input, { target: { value: "  Push Day  " } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

  await waitFor(() => assert.deepEqual(calls.push, ["/routines"]));
  assert.deepEqual(sent, [{ source: "r1", name: "Push Day" }], "the name is trimmed and the active routine is the source");
});

test("Routine form: an empty name disables Confirm and sends nothing", async () => {
  let calledAction = 0;
  renderChooser(async () => {
    calledAction += 1;
    return { ok: true, routineId: "r3" };
  });

  const input = await nameField();
  fireEvent.change(input, { target: { value: "   " } });
  const confirm = screen.getByRole("button", { name: "Confirm" });
  assert.ok(confirm.hasAttribute("disabled") || confirm.getAttribute("aria-disabled") === "true");
  fireEvent.click(confirm);
  assert.equal(calledAction, 0);
});

test("Routine form: a name that already exists (any case) shows the error, sends nothing, and clears on the next edit", async () => {
  let calledAction = 0;
  const calls = renderChooser(async () => {
    calledAction += 1;
    return { ok: true, routineId: "r3" };
  });

  const input = await nameField();
  fireEvent.change(input, { target: { value: "HYPERTROPHY" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

  assert.ok((await screen.findAllByText("Routine name already exists.")).length >= 1);
  assert.equal(calledAction, 0);
  assert.deepEqual(calls.push, []);

  fireEvent.change(input, { target: { value: "Hypertrophy B" } });
  await waitFor(() => assert.equal(screen.queryByText("Routine name already exists."), null));
});

test("Routine form: a server error is shown and the chooser stays open", async () => {
  const calls = renderChooser(async () => ({ ok: false, error: "Could not duplicate that routine." }));

  fireEvent.change(await nameField(), { target: { value: "Fresh Name" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

  assert.ok(await screen.findByText("Could not duplicate that routine."));
  assert.deepEqual(calls.push, []);
  assert.ok(screen.getByLabelText("New routine name"));
});

test("Routine form: choosing a different source routine rewrites the suggested name; Escape closes the chooser", async () => {
  let closed = 0;
  renderChooser(async () => ({ ok: true, routineId: "r3" }), { onRequestClose: () => { closed += 1; } });

  const input = await nameField();
  const first = input.value;
  fireEvent.click(screen.getByRole("button", { name: /^Hypertrophy/ }));
  await waitFor(() => assert.notEqual(input.value, first));
  assert.match(input.value, /Hypertrophy/);

  fireEvent.keyDown(document, { key: "Escape" });
  assert.equal(closed, 1);
});

test("Routine form: the name field stops at the routine name length limit", async () => {
  renderChooser(async () => ({ ok: true, routineId: "r3" }));

  const input = await nameField();
  fireEvent.change(input, { target: { value: "x".repeat(ROUTINE_COPY_NAME_MAX_LENGTH + 10) } });
  assert.equal(input.value.length, ROUTINE_COPY_NAME_MAX_LENGTH);
});
