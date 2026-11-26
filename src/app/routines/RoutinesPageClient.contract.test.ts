import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("RoutinesPageClient keeps /routines as the browse list screen", () => {
  const source = readFileSync(new URL("./RoutinesPageClient.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /RoutineHomeClient/);
  assert.doesNotMatch(source, /\bactiveRoutineId\b/);
  assert.doesNotMatch(source, /RoutinesRouteHeaderCard/);
  assert.doesNotMatch(source, /createPortal/);
  assert.match(source, /New Routine/);
  assert.match(source, /curatedOnboardingEnabled/);
  assert.match(source, /curatedOnboardingUserId/);
});

test("RoutinesPageClient renders routine cards on the card system: actions in the kebab Menu, no corner Delete", () => {
  const source = readFileSync(new URL("./RoutinesPageClient.tsx", import.meta.url), "utf8");

  assert.match(source, /<RoutineBrowseCard/);
  assert.doesNotMatch(source, /onActionsToggle|actionsOpen|expandedActionsRoutineId/);
  assert.match(source, /buildRoutineCardActions\(\{/);
  const builder = readFileSync(new URL("../../components/routines/routineCardActions.ts", import.meta.url), "utf8");
  assert.match(builder, /key: "delete"/);
  assert.match(builder, /key: "set-active"/);
  assert.match(source, /<CardEmptyState/);
  assert.doesNotMatch(source, /routine-card-delete|ROUTINE_CARD_DELETE|AttachedCardActionStripFrame|INACTIVE_ROUTINE_CARD_CLASS_NAME/);
});

test("RoutinesPageClient delete confirm names the routine and what deleting it removes", () => {
  const source = readFileSync(new URL("./RoutinesPageClient.tsx", import.meta.url), "utf8");

  assert.match(source, /objectName=\{routinePendingDelete\?\.name\}/);
  assert.match(source, /consequenceText=/);
  assert.doesNotMatch(source, /title="Confirm Delete"/);
  // One create action: the dock's New Routine; the empty state only explains what a routine is.
  assert.doesNotMatch(source, /Create your first routine/);
  assert.match(source, /A routine is your weekly plan/);
  assert.doesNotMatch(source, /<button/, "no raw buttons: AppButton, Menu and dock buttons only");
});

test("routine delete confirm names the routine and what it removes; the day delete does the same", () => {
  const list = readFileSync(new URL("./RoutinesPageClient.tsx", import.meta.url), "utf8");
  assert.match(list, /objectName=\{routinePendingDelete\?\.name\}/);
  assert.match(list, /consequenceText=\{routinePendingDelete \? describeRoutineDeleteConsequence/);
  assert.match(list, /permanently deletes the routine, its days and exercises, and the workouts you logged/);
  assert.match(list, /Another routine becomes your active one/);
  const home = readFileSync(new URL("./RoutineHomeClient.tsx", import.meta.url), "utf8");
  assert.match(home, /title="Delete day\?"/);
  assert.match(home, /objectName=/);
  assert.match(home, /cycle gets one day shorter/);
});

test("routines screens show no inline red text and never say Target on screen", () => {
  const files = [
    "./RoutinesPageClient.tsx",
    "./RoutineHomeClient.tsx",
    "./[id]/edit/day/[dayId]/EditDaySettingsAutosaveForm.tsx",
    "./[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx",
    "../../components/routines/RoutineEditorForm.tsx",
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /text-\[rgb\(var\(--danger-rgb\)[^\]]*\]/, `${file}: no red text class`);
    assert.doesNotMatch(source, /text-red-/, `${file}: no red text class`);
  }
  const editor = readFileSync(new URL("../../components/routines/ProgressionPlaybookEditor.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(editor, />\s*Target changes\s*</);
});

test("the routines dev lab asserts the dev guard before reading searchParams and calls no server action", () => {
  const page = readFileSync(new URL("../dev/routines-lab/page.tsx", import.meta.url), "utf8");
  assert.ok(page.indexOf("await assertDevPageAvailable()") !== -1);
  assert.ok(page.indexOf("await assertDevPageAvailable()") < page.indexOf("await props.searchParams"));
  const lab = readFileSync(new URL("../dev/routines-lab/RoutinesLab.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(lab, /@\/app\/routines\/actions|supabase/i);
});

test("active-routine delete copy only promises a replacement when another routine exists", () => {
  const list = readFileSync(new URL("./RoutinesPageClient.tsx", import.meta.url), "utf8");
  // routine-delete.ts sets active_routine_id to the next routine, or NULL when it was the only one.
  assert.match(list, /describeRoutineDeleteConsequence\(routine: \{ name: string; isActive\?: boolean \}, otherRoutineCount = 1\)/);
  assert.match(list, /otherRoutineCount > 0\s*\?\s*`\$\{base\} Another routine becomes your active one\.`\s*:\s*`\$\{base\} You will have no active routine until you create one\.`/);
  assert.match(list, /if \(!routine\.isActive\) return base;/);
  assert.match(list, /routines\.filter\(\(item\) => item\.id !== routinePendingDelete\.id\)\.length/);
  const dal = readFileSync(new URL("../../lib/dal/routine-delete.ts", import.meta.url), "utf8");
  assert.match(dal, /active_routine_id: replacementRoutineId/);
});

function listSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listSources(path);
    return /\.(tsx?|css)$/.test(name) && !/\.(test|contract\.test)\./.test(name) ? [path] : [];
  });
}

test("routines sources use the danger colour only for destructive intents, never for text, arrows, inline styles or focus rings", () => {
  const roots = [new URL("./", import.meta.url), new URL("../../components/routines/", import.meta.url)];
  const files = roots.flatMap((root) => listSources(root.pathname.replace(/^\/([A-Za-z]:)/, "$1")));
  assert.ok(files.length > 10);
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /--danger-rgb/, `${file}: danger colour token outside a destructive intent`);
    assert.doesNotMatch(source, /(?:text|ring|border|bg)-\[rgb\(var\(--danger/, `${file}: danger utility class`);
    assert.doesNotMatch(source, /(?:text|ring|border|bg)-red-/, `${file}: red utility class`);
  }
  const day = readFileSync(new URL("./[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx", import.meta.url), "utf8");
  assert.match(day, /: "rgb\(var\(--warning-rgb\)\)"/);
});

test("ProgressionPlaybookEditor shows goal wording, not target, in the strings this lane reworded", () => {
  const editor = readFileSync(new URL("../../components/routines/ProgressionPlaybookEditor.tsx", import.meta.url), "utf8");
  for (const phrase of ["Custom rep goal", "Rep goal for promotion"]) assert.match(editor, new RegExp(phrase));
  assert.doesNotMatch(editor, /Custom rep target|Rep target for promotion/);
});
