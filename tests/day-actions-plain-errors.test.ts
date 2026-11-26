import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

// The edit-day and exercise server actions answer the in-flow notice. A migration number or a database message there
// is developer text, so the files must never return one (the original is logged, the screen gets plain copy).
const files = ["src/app/routines/[id]/edit/day/actions.ts", "src/app/actions/exercises.ts"];

test("day and exercise actions never return a migration number or a raw schema message", () => {
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /Apply migration/iu, `${file} returns developer copy about a migration`);
    assert.doesNotMatch(source, /error:\s*getSchemaMismatchMessage\(/u, `${file} returns the schema mismatch message to the screen`);
    assert.doesNotMatch(source, /progressionMigration\s*:/u, `${file} passes a migration number into a user-facing message`);
  }
});

test("a schema mismatch in the day editor is logged and mapped to the plain save error", () => {
  const source = fs.readFileSync(path.join(root, "src/app/routines/[id]/edit/day/actions.ts"), "utf8");
  assert.match(source, /function plainSchemaMismatchError\(/u);
  assert.match(source, /return DAY_ACTION_FALLBACK_ERROR;/u);
  assert.equal((source.match(/plainSchemaMismatchError\(/gu) ?? []).length >= 5, true);
});
