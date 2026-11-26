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
    canArchive: true,
    canSetActive: true,
    onRequestArchive: (r) => calls.push(["archive-requested", r.id]),
    onSetActive: (id) => calls.push(["set-active", id]),
    ...overrides,
  });
  return { actions, calls };
}

test("menu order is Set active, Edit, Duplicate, Rename, Archive last; Archive is neutral and only asks for confirmation", () => {
  const { actions, calls } = build(inactive, {
    onEdit: (id) => calls.push(["edit", id]),
    onDuplicate: (id) => calls.push(["duplicate", id]),
    onRename: (id) => calls.push(["rename", id]),
  });

  assert.deepEqual(actions.map((action) => action.key), ["set-active", "edit", "duplicate", "rename", "archive"]);
  assert.equal(actions.at(-1)?.intent, "neutral");
  assert.equal(actions.at(-1)?.label, "Archive");
  assert.ok(actions.every((action) => action.intent !== "danger"), "no routine menu item is destructive");
  for (const action of actions) action.onPress();
  assert.deepEqual(calls, [
    ["set-active", "routine-7"],
    ["edit", "routine-7"],
    ["duplicate", "routine-7"],
    ["rename", "routine-7"],
    ["archive-requested", "routine-7"],
  ]);
});

test("an active routine has no Set active action; unwired navigation items are left out", () => {
  assert.deepEqual(build(active).actions.map((action) => action.key), ["archive"]);
  assert.deepEqual(build(active, { onEdit: () => undefined }).actions.map((action) => action.key), ["edit", "archive"]);
});

test("Archive is left out when the caller does not wire it (archive column not migrated yet); no Delete exists", () => {
  assert.deepEqual(build(inactive, { onRequestArchive: undefined }).actions.map((action) => action.key), ["set-active"]);
  assert.deepEqual(build(active, { onRequestArchive: undefined }).actions.map((action) => action.key), []);
  assert.ok(!build(inactive).actions.some((action) => action.key === "delete" || action.label === "Delete"));
});

test("accessible names contain the visible label text (WCAG 2.5.3)", () => {
  const { actions } = build(inactive);
  for (const action of actions) {
    assert.ok(typeof action.label === "string");
    assert.ok(action.ariaLabel?.startsWith(action.label as string), `${action.key}: "${action.ariaLabel}" must start with "${action.label}"`);
    assert.ok(action.ariaLabel?.includes("Atlas Hypertrophy"));
  }
  assert.equal(actions[0].ariaLabel, "Set active: Atlas Hypertrophy");

  const pending = build(inactive, { isPending: true }).actions[0];
  assert.equal(pending.label, "Saving...");
  assert.ok(pending.ariaLabel?.startsWith("Saving"), "the visible 'Saving' text stays in the name while pending");
});

test("actions are disabled while saving or when the server action is not provided", () => {
  assert.deepEqual(build(inactive, { isPending: true }).actions.map((a) => a.disabled), [true, true]);
  assert.deepEqual(build(inactive, { canArchive: false, canSetActive: false }).actions.map((a) => a.disabled), [true, true]);
  assert.deepEqual(build(inactive).actions.map((a) => a.disabled), [false, false]);
});

test("RoutinesPageClient wires the builder to the server actions: confirm archives by routine id, Set Active posts routineId", () => {
  const page = readFileSync(new URL("../../app/routines/RoutinesPageClient.tsx", import.meta.url), "utf8");

  assert.match(page, /buildRoutineCardActions\(\{/);
  assert.match(page, /onRequestArchive: archiveRoutineAction \? \(\) => setRoutinePendingArchive\(routine\) : undefined/);
  assert.match(page, /onEdit: \(routineId\) => router\.push\(getRoutineEditHref\(routineId, "\/routines"\)\)/);
  assert.match(page, /onRename: \(routineId\) => router\.push\(getRoutineRenameHref\(routineId\)\)/);
  assert.match(page, /setDuplicateSourceRoutineId\(routineId\);\s*setIsCreateRoutineOpen\(true\)/);
  assert.match(page, /formData\.set\("routineId", routineId\);\s*const result = await setActiveRoutineAction\(formData\)/);
  assert.match(page, /onConfirm=\{\(\) => \{[\s\S]*?await archiveRoutineAction\(\{ routineId \}\)/);
  assert.doesNotMatch(page, /deleteRoutineAction/);
});

test("routine home wires day Delete to a confirm, then deleteRoutineDayAction with routineId and routineDayId", () => {
  const home = readFileSync(new URL("../../app/routines/RoutineHomeClient.tsx", import.meta.url), "utf8");

  assert.match(home, /onClick=\{\(\) => setDayPendingDelete\(sourceDay\)\}/);
  assert.match(home, /formData\.set\("routineId", routineId\);\s*formData\.set\("routineDayId", day\.id\);\s*const result = await deleteRoutineDayAction\(formData\)/);
});
