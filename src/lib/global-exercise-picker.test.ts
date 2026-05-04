import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  filterSuppressedGlobalExercises,
  shouldSuppressGlobalExerciseFromPicker,
  SUPPRESSED_GLOBAL_EXERCISE_SLUGS,
} from "@/lib/global-exercise-picker";

test("global picker suppression hides only the standalone stretch catalog rows", () => {
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
      id: "custom-hamstring",
      user_id: "user-123",
      is_global: false,
      slug: "hamstring-stretch",
      name: "Hamstring Stretch",
    },
  ];

  assert.equal(shouldSuppressGlobalExerciseFromPicker(exercises[0]), true);
  assert.equal(shouldSuppressGlobalExerciseFromPicker(exercises[1]), true);
  assert.equal(shouldSuppressGlobalExerciseFromPicker(exercises[2]), false);
  assert.equal(shouldSuppressGlobalExerciseFromPicker(exercises[3]), false);
  assert.deepEqual(
    filterSuppressedGlobalExercises(exercises).map((exercise) => exercise.id),
    ["global-stretch", "custom-hamstring"],
  );
});

test("generated global catalog keeps Stretch and drops the standalone hamstring and hip-flexor cards", () => {
  const indexPath = path.join(process.cwd(), "supabase", "data", "global_exercises_catalog_index.json");
  const payload = JSON.parse(fs.readFileSync(indexPath, "utf8")) as {
    exercises?: Array<{ name?: string; slug?: string }>;
  };
  const rows = payload.exercises ?? [];
  const slugs = new Set(rows.map((row) => row.slug));

  assert.equal(slugs.has("stretch"), true);
  assert.equal(slugs.has("hamstring-stretch"), false);
  assert.equal(slugs.has("hip-flexor-stretch"), false);
  assert.deepEqual([...SUPPRESSED_GLOBAL_EXERCISE_SLUGS].sort(), ["hamstring-stretch", "hip-flexor-stretch"]);
});
