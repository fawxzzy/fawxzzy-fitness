import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { ROUTINE_COPY_NAME_MAX_LENGTH } from "./routine-copy-name";
import {
  STARTER_TEMPLATES,
  doesRoutineMatchStarterTemplate,
  getStarterTemplate,
  getStarterTemplateExerciseNames,
  getStarterTemplatePreviewDays,
  type StoredStarterDay,
  type StoredStarterExercise,
} from "./starter-templates";

function readCatalog() {
  const raw = fs.readFileSync(path.join(process.cwd(), "supabase", "data", "global_exercises_catalog_index.csv"), "utf8");
  const [header, ...rows] = raw.split(/\r?\n/u).filter(Boolean);
  const columns = header.split(",");
  const nameAt = columns.indexOf("name");
  const measurementAt = columns.indexOf("measurement_type");
  // Name and measurement come before any quoted field, so a plain split is safe for these two columns.
  return new Map(rows.map((row) => {
    const cells = row.split(",");
    return [cells[nameAt], cells[measurementAt]] as const;
  }));
}

test("there are exactly the three first-run plans, in card order", () => {
  assert.deepEqual(STARTER_TEMPLATES.map((template) => template.id), ["full-body-3", "upper-lower-4", "push-pull-legs-3"]);
  assert.deepEqual(STARTER_TEMPLATES.map((template) => template.daysPerWeek), [3, 4, 3]);
});

test("every template uses catalog exercises measured in reps only", () => {
  const catalog = readCatalog();
  for (const template of STARTER_TEMPLATES) {
    for (const name of getStarterTemplateExerciseNames(template)) {
      assert.ok(catalog.has(name), `${template.id}: "${name}" is not in the global catalog`);
      assert.equal(catalog.get(name), "reps", `${template.id}: "${name}" must be a reps exercise (no cardio fields)`);
    }
  }
});

test("every exercise is 3 sets with a rep range and nothing else", () => {
  for (const template of STARTER_TEMPLATES) {
    for (const day of template.week) {
      for (const exercise of day?.exercises ?? []) {
        assert.deepEqual(Object.keys(exercise).sort(), ["name", "repsMax", "repsMin", "sets"], `${exercise.name} has extra target fields`);
        assert.equal(exercise.sets, 3);
        assert.ok(exercise.repsMin >= 5 && exercise.repsMin < exercise.repsMax && exercise.repsMax <= 15, `${exercise.name} rep range`);
      }
    }
  }
});

test("week shape: 7 days, Day 1 trains, training-day count matches the card", () => {
  for (const template of STARTER_TEMPLATES) {
    assert.equal(template.week.length, 7, template.id);
    assert.ok(template.week[0], `${template.id} Day 1 must be a training day so Today shows Start`);
    assert.equal(template.week.filter(Boolean).length, template.daysPerWeek, template.id);
    assert.equal(getStarterTemplatePreviewDays(template).filter((day) => !day.isRest).length, template.daysPerWeek);
  }
});

test("routine names fit the routine name limit and day names are unique per plan", () => {
  for (const template of STARTER_TEMPLATES) {
    assert.ok(template.name.length <= ROUTINE_COPY_NAME_MAX_LENGTH, `${template.name} is too long`);
    const dayNames = template.week.filter(Boolean).map((day) => day!.name);
    assert.ok(dayNames.length > 0);
    for (const day of template.week) {
      if (day) assert.ok(day.exercises.length >= 4 && day.exercises.length <= 6, `${day.name} exercise count`);
    }
  }
});

test("getStarterTemplate only resolves known ids", () => {
  assert.equal(getStarterTemplate("full-body-3")?.name, "Full body");
  assert.equal(getStarterTemplate("nope"), null);
  assert.equal(getStarterTemplate(undefined), null);
});

function storedRoutineFor(templateId: string) {
  const template = getStarterTemplate(templateId)!;
  const days: StoredStarterDay[] = template.week.map((day, offset) => ({
    id: `day-${offset + 1}`,
    day_index: offset + 1,
    name: day ? day.name : "Rest Day",
    is_rest: day === null,
  }));
  const exercises: StoredStarterExercise[] = template.week.flatMap((day, offset) => (day?.exercises ?? []).map((exercise, position) => ({
    routine_day_id: `day-${offset + 1}`,
    position,
    exercise_name: exercise.name,
  })));
  return { template, days, exercises };
}

test("replay matcher adopts only an exact copy of the template", () => {
  const exact = storedRoutineFor("upper-lower-4");
  assert.equal(doesRoutineMatchStarterTemplate(exact), true);

  const reordered = storedRoutineFor("upper-lower-4");
  const day1 = reordered.exercises.filter((exercise) => exercise.routine_day_id === "day-1");
  [day1[0].position, day1[1].position] = [day1[1].position, day1[0].position];
  assert.equal(doesRoutineMatchStarterTemplate(reordered), false);

  const halfMade = storedRoutineFor("push-pull-legs-3");
  assert.equal(doesRoutineMatchStarterTemplate({ ...halfMade, exercises: halfMade.exercises.filter((exercise) => exercise.routine_day_id !== "day-5") }), false);

  const otherPlan = storedRoutineFor("full-body-3");
  assert.equal(doesRoutineMatchStarterTemplate({ ...otherPlan, template: getStarterTemplate("push-pull-legs-3")! }), false);
});
