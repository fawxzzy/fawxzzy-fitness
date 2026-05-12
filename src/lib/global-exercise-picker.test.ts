import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  filterSuppressedGlobalExercises,
  shouldSuppressGlobalExerciseFromPicker,
  REMOVED_GLOBAL_EXERCISE_SLUGS,
  SUPPRESSED_GLOBAL_EXERCISE_SLUGS,
} from "@/lib/global-exercise-picker";

test("global picker suppression hides standalone stretch rows and removed catalog rows", () => {
  const exercises = [
    {
      id: "global-hamstring",
      user_id: null,
      is_global: true,
      slug: "hamstring-stretch",
      name: "Hamstring Stretch",
    },
    {
      id: "global-hip-flexor",
      user_id: null,
      is_global: true,
      slug: "hip-flexor-stretch",
      name: "Hip Flexor Stretch",
    },
    {
      id: "global-stretch",
      user_id: null,
      is_global: true,
      slug: "stretch",
      name: "Stretch",
    },
    {
      id: "global-zone-2",
      user_id: null,
      is_global: true,
      slug: "zone-2-cardio",
      name: "Zone 2 Cardio",
    },
    {
      id: "custom-hamstring",
      user_id: "user-123",
      is_global: false,
      slug: "hamstring-stretch",
      name: "Hamstring Stretch",
    },
    {
      id: "custom-zone-2",
      user_id: "user-123",
      is_global: false,
      slug: null,
      name: "Zone 2 Cardio",
    },
  ];

  assert.equal(shouldSuppressGlobalExerciseFromPicker(exercises[0]), true);
  assert.equal(shouldSuppressGlobalExerciseFromPicker(exercises[1]), true);
  assert.equal(shouldSuppressGlobalExerciseFromPicker(exercises[2]), false);
  assert.equal(shouldSuppressGlobalExerciseFromPicker(exercises[3]), true);
  assert.equal(shouldSuppressGlobalExerciseFromPicker(exercises[4]), false);
  assert.equal(shouldSuppressGlobalExerciseFromPicker(exercises[5]), true);
  assert.deepEqual(
    filterSuppressedGlobalExercises(exercises).map((exercise) => exercise.id),
    ["global-stretch", "custom-hamstring"],
  );
});

test("generated global catalog keeps Stretch and drops suppressed standalone catalog cards", () => {
  const indexPath = path.join(process.cwd(), "supabase", "data", "global_exercises_catalog_index.json");
  const payload = JSON.parse(fs.readFileSync(indexPath, "utf8")) as {
    exercises?: Array<{ name?: string; slug?: string }>;
  };
  const rows = payload.exercises ?? [];
  const slugs = new Set(rows.map((row) => row.slug));

  assert.equal(slugs.has("stretch"), true);
  assert.equal(slugs.has("hamstring-stretch"), false);
  assert.equal(slugs.has("hip-flexor-stretch"), false);
  assert.equal(slugs.has("zone-2-cardio"), false);
  assert.deepEqual([...SUPPRESSED_GLOBAL_EXERCISE_SLUGS].sort(), ["hamstring-stretch", "hip-flexor-stretch"]);
  assert.deepEqual([...REMOVED_GLOBAL_EXERCISE_SLUGS].sort(), ["zone-2-cardio"]);
});
