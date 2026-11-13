import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildRoutineCardActions } from "./routineCardActions.ts";

const inactive = { id: "routine-7", name: "Atlas Hypertrophy", isActive: false };
const active = { id: "routine-1", name: "Atlas Routine", isActive: true };

function build(routine: typeof inactive, overrides: Partial<Parameters<typeof buildRoutineCardActions>[0]> = {}) {
  const calls: Array<[string, string]> = [];
  const actions = buildRoutineCardActions({
    routine,
    isPending: false,
    canDelete: true,
    canSetActive: true,
    onRequestDelete: (r) => calls.push(["delete-requested", r.id]),
    onSetActive: (id) => calls.push(["set-active", id]),
    ...overrides,
  });
  return { actions, calls };
}

test("Delete is first and only asks for confirmation with the routine; Set Active hands over the routine id", () => {
  const { actions, calls } = build(inactive);

  assert.deepEqual(actions.map((action) => action.key), ["delete", "set-active"]);
  assert.equal(actions[0].intent, "danger");
  actions[0].onPress();
  actions[1].onPress();
  assert.deepEqual(calls, [["delete-requested", "routine-7"], ["set-active", "routine-7"]]);
});

test("an active routine has no Set Active action", () => {
  assert.deepEqual(build(active).actions.map((action) => action.key), ["delete"]);
});

test("accessible names contain the visible label text (WCAG 2.5.3)", () => {
  const { actions } = build(inactive);
  for (const action of actions) {
    assert.ok(typeof action.label === "string");
    assert.ok(action.ariaLabel?.startsWith(action.label as string), `${action.key}: "${action.ariaLabel}" must start with "${action.label}"`);
    assert.ok(action.ariaLabel?.includes("Atlas Hypertrophy"));
  }
  assert.equal(actions[1].ariaLabel, "Set Active: Atlas Hypertrophy");

  const pending = build(inactive, { isPending: true }).actions[1];
  assert.equal(pending.label, "Saving...");
  assert.ok(pending.ariaLabel?.startsWith("Saving"), "the visible 'Saving' text stays in the name while pending");
});

test("actions are disabled while saving or when the server action is not provided", () => {
  assert.deepEqual(build(inactive, { isPending: true }).actions.map((a) => a.disabled), [true, true]);
  assert.deepEqual(build(inactive, { canDelete: false, canSetActive: false }).actions.map((a) => a.disabled), [true, true]);
  assert.deepEqual(build(inactive).actions.map((a) => a.disabled), [false, false]);
});

test("RoutinesPageClient wires the builder to the server actions: confirm deletes by routine id, Set Active posts routineId", () => {
  const page = readFileSync(new URL("../../app/routines/RoutinesPageClient.tsx", import.meta.url), "utf8");

  assert.match(page, /buildRoutineCardActions\(\{/);
  assert.match(page, /onRequestDelete: \(\) => setRoutinePendingDelete\(routine\)/);
  assert.match(page, /formData\.set\("routineId", routineId\);\s*const result = await setActiveRoutineAction\(formData\)/);
  assert.match(page, /onConfirm=\{\(\) => \{[\s\S]*?await deleteRoutineAction\(\{ routineId \}\)/);
});

test("routine home wires day Delete to a confirm, then deleteRoutineDayAction with routineId and routineDayId", () => {
  const home = readFileSync(new URL("../../app/routines/RoutineHomeClient.tsx", import.meta.url), "utf8");

  assert.match(home, /onClick=\{\(\) => setDayPendingDelete\(sourceDay\)\}/);
  assert.match(home, /formData\.set\("routineId", routineId\);\s*formData\.set\("routineDayId", day\.id\);\s*const result = await deleteRoutineDayAction\(formData\)/);
});
