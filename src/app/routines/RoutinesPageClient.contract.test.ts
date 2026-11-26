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

test("RoutinesPageClient renders routine cards on the card system: actions in the kebab Menu, no corner Delete or Archive", () => {
  const source = readFileSync(new URL("./RoutinesPageClient.tsx", import.meta.url), "utf8");

  assert.match(source, /<RoutineBrowseCard/);
  assert.doesNotMatch(source, /onActionsToggle|actionsOpen|expandedActionsRoutineId/);
  assert.match(source, /buildRoutineCardActions\(\{/);
  const builder = readFileSync(new URL("../../components/routines/routineCardActions.ts", import.meta.url), "utf8");
  assert.match(builder, /key: "archive"/);
  assert.doesNotMatch(builder, /key: "delete"/);
  assert.match(builder, /key: "set-active"/);
  assert.match(source, /<CardEmptyState/);
  assert.doesNotMatch(source, /routine-card-delete|ROUTINE_CARD_DELETE|AttachedCardActionStripFrame|INACTIVE_ROUTINE_CARD_CLASS_NAME/);
});

test("RoutinesPageClient archive confirm names the routine and what archiving does", () => {
  const source = readFileSync(new URL("./RoutinesPageClient.tsx", import.meta.url), "utf8");

  assert.match(source, /objectName=\{routinePendingArchive\?\.name\}/);
  assert.match(source, /consequenceText=/);
  assert.doesNotMatch(source, /title="Confirm Delete"/);
  // One create action: the dock's New Routine; the empty state only explains what a routine is.
  assert.doesNotMatch(source, /Create your first routine/);
  assert.match(source, /A routine is your weekly plan/);
  assert.doesNotMatch(source, /<button/, "no raw buttons: AppButton, Menu and dock buttons only");
});

test("routine archive confirm says history is kept and uses a neutral Archive button; the day delete is unchanged", () => {
  const list = readFileSync(new URL("./RoutinesPageClient.tsx", import.meta.url), "utf8");
  assert.match(list, /objectName=\{routinePendingArchive\?\.name\}/);
  assert.match(list, /consequenceText=\{routinePendingArchive \? describeRoutineArchiveConsequence\(routinePendingArchive\)/);
  assert.match(list, /title=\{ROUTINE_ARCHIVE_COPY\.confirmTitle\}/);
  assert.match(list, /confirmLabel=\{CONFIRM_ACTION_LABELS\.archiveRoutine\}/);
  assert.match(list, /confirmVariant="primary"/);
  assert.doesNotMatch(list, /deleteRoutineAction|describeRoutineDeleteConsequence|permanently deletes the routine/);
  const copy = readFileSync(new URL("../../lib/routine-archive.ts", import.meta.url), "utf8");
  assert.match(copy, /Your workouts from it stay in History, and you can restore it any time from Archived\./);
  assert.match(copy, /confirmLabel: "Archive"/);
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

test("archiving the active routine clears the pointer so Today asks to choose; no permanent routine delete is wired", () => {
  const dal = readFileSync(new URL("../../lib/dal/routine-archive.ts", import.meta.url), "utf8");
  assert.match(dal, /active_routine_id: null/);
  assert.match(dal, /\.eq\("active_routine_id", args\.routineId\)/);
  assert.match(dal, /\.eq\("status", "in_progress"\)/);
  assert.doesNotMatch(dal, /\.delete\(\)/);
  const today = readFileSync(new URL("../today/page.tsx", import.meta.url), "utf8");
  assert.match(today, /routine && !isRoutineArchived\(routine\) \? routine : null/);
  const actions = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
  assert.doesNotMatch(actions, /deleteRoutineMutation|deleteRoutineAction|from "@\/lib\/dal\/routine-delete"/);
  assert.match(actions, /export async function archiveRoutineAction/);
  assert.match(actions, /export async function restoreRoutineAction/);
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
