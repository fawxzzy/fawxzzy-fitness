// Routines detail family on the ONE ScreenHeader (DESIGN-CONTRACT.md section 15, lane H1a).
// Source-level checks: every routines detail screen renders ScreenHeader kind="detail" with the shared
// Back button on the left, no legacy header pieces, routine name fields use the C14 FormField recipe,
// and user-visible copy says "day", never "workout plan" (C18). Routes stay as they are.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");
const code = (path) => read(path).replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

const detailScreens = [
  "src/app/routines/[id]/page.tsx",
  "src/app/routines/[id]/new-workout-plan/CreateDayScreen.tsx",
  "src/app/routines/workout-plans/DaysLibraryScreen.tsx",
  "src/app/routines/[id]/edit/day/[dayId]/EditDaySettingsAutosaveForm.tsx",
  "src/components/exercises/AddExerciseScaffold.tsx",
  "src/components/routines/RoutineDetailsExitGuard.tsx",
];

const legacyHeaderPieces = /\b(SharedScreenHeader|AppHeader|HeaderInfoRail|TopRightBackButton|RoutinesRouteHeaderCard|RoutineEditorPageHeader|RoutineDayHeaderTitle|ExerciseChooserRouteScaffold)\b/;

function listSourceFiles(dir) {
  const out = [];
  for (const name of readdirSync(join(root, dir))) {
    const path = join(dir, name);
    if (statSync(join(root, path)).isDirectory()) {
      out.push(...listSourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

test("every routines detail screen uses ScreenHeader kind=detail with the shared Back button", () => {
  for (const file of detailScreens) {
    const source = code(file);
    assert.match(source, /<ScreenHeader\s[^>]*kind="detail"|<ScreenHeader\s*\n\s*kind="detail"/, `${file} renders ScreenHeader kind="detail"`);
    assert.match(source, /<ScreenHeaderBackButton\b/, `${file} uses ScreenHeaderBackButton`);
    assert.doesNotMatch(source, legacyHeaderPieces, `${file} has no legacy header piece`);
  }
});

test("routines screens import no legacy header component", () => {
  const files = [...listSourceFiles("src/app/routines"), "src/components/routines/RoutineDetailsExitGuard.tsx"];
  for (const file of files) {
    const source = code(file);
    assert.doesNotMatch(source, /import[^;]*\b(SharedScreenHeader|HeaderInfoRail|TopRightBackButton|RoutinesRouteHeaderCard|RoutineEditorPageHeader)\b[^;]*;/, `${file} imports a legacy header piece`);
  }
});

test("the Days library keeps its route and is a detail screen: Days title, Back to /routines, no tab bar", () => {
  assert.match(code("src/app/routines/workout-plans/page.tsx"), /<DaysLibraryScreen>/);
  const source = code("src/app/routines/workout-plans/DaysLibraryScreen.tsx");
  assert.match(source, /<ScreenHeader\s+kind="detail"\s+title="Days"/);
  assert.match(source, /<ScreenHeaderBackButton href="\/routines"/);
  assert.doesNotMatch(source, /topChrome|AppNav|kind="tab"/);
  assert.doesNotMatch(source, /HeaderInfoRail|RoutinesRouteHeaderCard/);
});

test("routine titles are plain nouns and the routine name is a body field, not the header", () => {
  assert.match(code("src/app/routines/new/page.tsx"), /title="New routine"/);
  assert.match(code("src/app/routines/[id]/edit/page.tsx"), /title="Edit routine"/);
  assert.doesNotMatch(code("src/components/routines/RoutineDetailsExitGuard.tsx"), /setHeaderTitle|useRoutineDetailsHeaderTitle|align/);
  for (const file of [
    "src/app/routines/new/NewRoutineDraftForm.tsx",
    "src/app/routines/[id]/edit/EditRoutineAutosaveForm.tsx",
    "src/app/routines/RoutineHomeEditorClient.tsx",
  ]) {
    assert.match(code(file), /label="Routine name"/, `${file} labels the name field`);
  }
  assert.match(code("src/app/routines/[id]/edit/day/[dayId]/EditDaySettingsAutosaveForm.tsx"), /label="Day name"/);
});

test("routine settings sum up the schedule in plain words from the resolver's repeat tier (SIMPLIFY #8)", () => {
  const form = code("src/app/routines/[id]/edit/EditRoutineAutosaveForm.tsx");
  const settings = code("src/app/routines/[id]/edit/routine-settings.ts");
  // Wording comes from resolveRoutineSchedule's tier (weekly / every 2 weeks / every 31 days), not the raw cycle length:
  // a weekday_anchored 5-day routine repeats weekly, so it must never read "Repeats every 5 days" (review P1 #1).
  // routine-settings.test.ts covers the 5, 7, 10-day and rolling cases.
  assert.match(form, /describeRoutineSchedule\(draft, props\.restDayIndexes\)/);
  assert.match(settings, /resolveRoutineSchedule\(/);
  assert.match(settings, /draft\.scheduleMode === "rolling_n_day"/);
  assert.doesNotMatch(form, /Repeats every/);
  assert.match(code("src/app/routines/[id]/edit/page.tsx"), /restDayIndexes=\{restDayIndexes\}/);
  // The dock reads Saved when nothing is waiting instead of a dimmed Save.
  assert.match(form, /isSaving \? "Saving\.\.\." : isDirty \? "Save" : "Saved"/);
});

test("the Auto-progress switch never overwrites per-exercise progress rules (review P1 #2)", () => {
  const form = code("src/app/routines/[id]/edit/EditRoutineAutosaveForm.tsx");
  // Apply-to-all is opt-in, confirmed, and the only thing that sets the cascade flag (via buildRoutineSettingsFormData).
  assert.match(form, /useState\(false\);\s*const \[isConfirmingApplyToAll/);
  assert.doesNotMatch(form, /applyRoutineDefaultToExercises/);
  assert.doesNotMatch(form, /autoApplyUpdatesToExercises/);
  assert.match(form, /label="Apply to all exercises"/);
  assert.match(form, /role="alertdialog"/);
  assert.match(form, /Replace all/);
});

test("routine forms use the C14 FormField recipe: no legend-on-border, no accent-underlined labels", () => {
  const editorShared = code("src/components/routines/RoutineEditorShared.tsx");
  assert.match(editorShared, /<FormField\b/);
  const editorForm = code("src/components/routines/RoutineEditorForm.tsx");
  assert.match(editorForm, /<FormField label="Routine length">/);
  // The start date is an anchor that wraps both ways; a future date does not delay the routine. Say so.
  assert.match(editorForm, /<FormField label="Start date" helper="Day 1 falls on this date; the cycle repeats from it.">/);
  assert.doesNotMatch(editorForm, /Weekday Anchor/);
  assert.doesNotMatch(editorForm, /labeledEditorFieldFloatingLabelClassName/);
  // Create day: the Day name field is the C14 recipe, not a hand-made label + input (lane H3).
  assert.match(code("src/app/routines/CreateRoutineDayClient.tsx"), /<FormField label="Day name" helper="Optional\. Leave blank to use the day number\.">/);
  for (const file of ["src/app/routines/CreateRoutineClient.tsx", "src/components/ExercisePicker.tsx", "src/components/exercise-picker/custom.tsx"]) {
    assert.doesNotMatch(code(file), /<LabeledEditorField\b/, `${file} still uses the legend-on-border field`);
  }
});

test("ExercisePicker selected row wraps the companion instead of collapsing the title at 320px", () => {
  const picker = code("src/components/exercise-picker/list.tsx");
  assert.match(picker, /data-exercise-title-companion-row="true" className="[^"]*flex-wrap/);
  assert.match(picker, /min-w-\[7rem\] max-w-\[10\.9rem\] flex-1 basis-\[7rem\]/);
});

test("routines user-visible copy says day, never workout plan (C18)", () => {
  const files = [...listSourceFiles("src/app/routines"), ...listSourceFiles("src/components/routines")];
  for (const file of files) {
    const source = code(file);
    const strings = source.match(/"[^"\n]*"|`[^`]*`|>[^<>{}\n]+</g) ?? [];
    for (const value of strings) {
      if (/\/workout-plans|new-workout-plan|workout-plan-/.test(value)) continue;
      assert.doesNotMatch(value, /workout plans?\b/i, `${file}: ${value}`);
    }
  }
});
