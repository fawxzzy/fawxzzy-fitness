import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

test("custom exercise rename / delete uses only the existing owner-scoped actions (DESIGN #9)", () => {
  const menu = read("./CustomExerciseManageMenu.tsx");
  assert.match(menu, /import \{ deleteCustomExerciseAction, renameCustomExerciseAction \} from "@\/app\/actions\/exercises";/);
  assert.match(menu, /onSubmit=\{submitTo\(renameCustomExerciseAction\)\}/);
  assert.match(menu, /onSubmit=\{submitTo\(deleteCustomExerciseAction\)\}/);
  assert.match(menu, /useTransition\(\)/, "pending clears when the same-path redirect lands");
  assert.match(menu, /<ConfirmDestructiveModal[\s\S]*?confirmActionLabel="Delete"/);
  // Results come back as ?success= / ?error= toasts, never inline red text.
  assert.equal((menu.match(/name="returnTo" value=\{pathname\}/g) ?? []).length, 2);
  assert.doesNotMatch(menu, /text-red|text-rose|role="alert"/);
  // Both forms live in portaled sheets, so their submit must not bubble to the add-exercise form.
  assert.match(menu, /event\.preventDefault\(\);\s+event\.stopPropagation\(\);/);
});

test("the menu shows only for your own custom exercise and never on the workout screen", () => {
  const menu = read("./CustomExerciseManageMenu.tsx");
  assert.match(menu, /exercise\.user_id === null \|\| exercise\.is_global\) return false;/);
  assert.match(menu, /!pathname!\.startsWith\("\/session"\)/);
  const picker = read("../ExercisePicker.tsx");
  assert.match(picker, /shouldOfferCustomExerciseManagement\(selectedExercise, pathname\)/);
  assert.match(picker, /canManageSelectedCustomExercise && selectedExercise \? \(\s*<CustomExerciseManageMenu/);
});
