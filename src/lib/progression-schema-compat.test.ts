import test from "node:test";
import assert from "node:assert/strict";
import {
  getMissingSchemaColumnDiagnostic,
  getSchemaMismatchMessage,
  isMissingProgressionPlaybookColumnError,
  isMissingRoutineDefaultProgressionColumnError,
} from "@/lib/progression-schema-compat";

test("routine day progression columns report migration 045 only", () => {
  const error = {
    message: "Could not find the 'progression_playbook_id' column of 'routine_day_exercises' in the schema cache",
  };

  assert.equal(isMissingProgressionPlaybookColumnError(error), true);
  assert.equal(isMissingRoutineDefaultProgressionColumnError(error), false);
  assert.equal(
    getSchemaMismatchMessage(error, { progressionMigration: "045" }),
    "Progression schema is missing. Apply migration 045. Missing routine_day_exercises.progression_playbook_id.",
  );
});

test("routine default progression columns report migration 046 only", () => {
  const error = {
    message: "column routines.default_progression_playbook_config does not exist",
  };

  assert.equal(isMissingProgressionPlaybookColumnError(error), false);
  assert.equal(isMissingRoutineDefaultProgressionColumnError(error), true);
  assert.equal(
    getSchemaMismatchMessage(error, { progressionMigration: "046" }),
    "Progression schema is missing. Apply migration 046. Missing routines.default_progression_playbook_config.",
  );
});

test("profile user numbering columns do not report progression migrations", () => {
  const error = {
    message: "column profiles.user_number does not exist",
  };

  assert.equal(isMissingProgressionPlaybookColumnError(error), false);
  assert.equal(isMissingRoutineDefaultProgressionColumnError(error), false);
  assert.deepEqual(getMissingSchemaColumnDiagnostic(error), {
    table: "profiles",
    column: "user_number",
    operation: null,
    activeSupabaseHost: process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : null,
  });
  assert.equal(
    getSchemaMismatchMessage(error),
    "Database schema is out of sync. Missing profiles.user_number. Apply pending migrations before editing progression.",
  );
});

test("exercise metadata columns do not report progression migrations", () => {
  const error = {
    message: "Could not find the 'image_icon_path' column of 'exercises' in the schema cache",
  };

  assert.equal(isMissingProgressionPlaybookColumnError(error), false);
  assert.equal(isMissingRoutineDefaultProgressionColumnError(error), false);
  assert.equal(
    getSchemaMismatchMessage(error),
    "Database schema is out of sync. Missing exercises.image_icon_path. Apply pending migrations before editing progression.",
  );
});
