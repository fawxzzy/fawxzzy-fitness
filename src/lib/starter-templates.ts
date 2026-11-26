/**
 * Starter plans for first run (SIMPLIFY #1, 2026-11-26): an empty Today offers three ready plans, and one tap
 * creates AND activates the routine. Pure data plus the helpers the server action and the tests share.
 *
 * Rules every template keeps (tests/starter-templates.test.ts):
 * - catalog exercises only (names match `supabase/data/global_exercises_catalog_index.csv`), all measured in reps;
 * - 3 working sets and a rep range, no weight (the first workout sets it), no time, distance or calorie fields;
 * - a 7-day week with Day 1 = the day it is picked, so Today shows Day 1 with Start straight away;
 * - routine names fit the 15-character routine name limit.
 */

export type StarterTemplateId = "full-body-3" | "upper-lower-4" | "push-pull-legs-3";

export type StarterExercise = {
  /** Exact global catalog name. */
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
};

export type StarterDay = {
  name: string;
  exercises: StarterExercise[];
};

export type StarterTemplate = {
  id: StarterTemplateId;
  /** Routine name (15 characters max). */
  name: string;
  /** Card title: "Full body · 3 days". */
  title: string;
  /** One plain line under the title. */
  summary: string;
  daysPerWeek: number;
  /** 7 entries, Day 1 first: a training day, or null for rest. */
  week: Array<StarterDay | null>;
};

const main = (name: string): StarterExercise => ({ name, sets: 3, repsMin: 6, repsMax: 10 });
const accessory = (name: string): StarterExercise => ({ name, sets: 3, repsMin: 8, repsMax: 12 });
const light = (name: string): StarterExercise => ({ name, sets: 3, repsMin: 10, repsMax: 15 });

const FULL_BODY_A: StarterDay = {
  name: "Full body A",
  exercises: [main("Back Squat"), main("Barbell Bench Press"), accessory("Barbell Row"), light("Lateral Raise"), accessory("Dumbbell Curl")],
};
const FULL_BODY_B: StarterDay = {
  name: "Full body B",
  exercises: [main("Romanian Deadlift"), main("Overhead Press"), accessory("Lat Pulldown"), accessory("Walking Lunge"), accessory("Triceps Pushdown")],
};
const FULL_BODY_C: StarterDay = {
  name: "Full body C",
  exercises: [accessory("Leg Press"), accessory("Incline Dumbbell Bench Press"), accessory("Seated Cable Row"), accessory("Lying Leg Curl"), light("Face Pull")],
};

const UPPER_A: StarterDay = {
  name: "Upper A",
  exercises: [main("Barbell Bench Press"), main("Barbell Row"), accessory("Overhead Press"), accessory("Lat Pulldown"), accessory("Dumbbell Curl"), accessory("Triceps Pushdown")],
};
const LOWER_A: StarterDay = {
  name: "Lower A",
  exercises: [main("Back Squat"), main("Romanian Deadlift"), accessory("Leg Press"), accessory("Lying Leg Curl"), light("Calf Raise (Standing)")],
};
const UPPER_B: StarterDay = {
  name: "Upper B",
  exercises: [accessory("Incline Dumbbell Bench Press"), accessory("Seated Cable Row"), accessory("Seated Dumbbell Shoulder Press"), accessory("Pull-Up"), accessory("Hammer Curl"), accessory("Overhead Triceps Extension")],
};
const LOWER_B: StarterDay = {
  name: "Lower B",
  exercises: [main("Deadlift"), accessory("Bulgarian Split Squat"), accessory("Hip Thrust"), accessory("Seated Leg Curl"), light("Calf Raise (Standing)")],
};

const PUSH: StarterDay = {
  name: "Push",
  exercises: [main("Barbell Bench Press"), main("Overhead Press"), accessory("Incline Dumbbell Bench Press"), light("Lateral Raise"), accessory("Triceps Pushdown")],
};
const PULL: StarterDay = {
  name: "Pull",
  exercises: [main("Barbell Row"), accessory("Lat Pulldown"), accessory("Seated Cable Row"), light("Face Pull"), accessory("Dumbbell Curl")],
};
const LEGS: StarterDay = {
  name: "Legs",
  exercises: [main("Back Squat"), main("Romanian Deadlift"), accessory("Leg Press"), accessory("Lying Leg Curl"), light("Calf Raise (Standing)")],
};

export const STARTER_TEMPLATES: readonly StarterTemplate[] = [
  {
    id: "full-body-3",
    name: "Full body",
    title: "Full body · 3 days",
    summary: "Whole body each time, a rest day between",
    daysPerWeek: 3,
    week: [FULL_BODY_A, null, FULL_BODY_B, null, FULL_BODY_C, null, null],
  },
  {
    id: "upper-lower-4",
    name: "Upper/Lower",
    title: "Upper/Lower · 4 days",
    summary: "Upper body, then lower body, twice a week",
    daysPerWeek: 4,
    week: [UPPER_A, LOWER_A, null, UPPER_B, LOWER_B, null, null],
  },
  {
    id: "push-pull-legs-3",
    name: "Push/Pull/Legs",
    title: "Push/Pull/Legs · 3 days",
    summary: "Pushing, pulling and legs on their own days",
    daysPerWeek: 3,
    week: [PUSH, null, PULL, null, LEGS, null, null],
  },
];

export function getStarterTemplate(id: unknown): StarterTemplate | null {
  return STARTER_TEMPLATES.find((template) => template.id === id) ?? null;
}

/** Every catalog name a template uses, once each. */
export function getStarterTemplateExerciseNames(template: StarterTemplate): string[] {
  return [...new Set(template.week.flatMap((day) => (day ? day.exercises.map((exercise) => exercise.name) : [])))];
}

/** `previewDays` for createRoutineAction: one `{ isRest }` per day, Day 1 first. */
export function getStarterTemplatePreviewDays(template: StarterTemplate): Array<{ isRest: boolean }> {
  return template.week.map((day) => ({ isRest: day === null }));
}

export type StoredStarterDay = { id: string; day_index: number; name: string | null; is_rest: boolean };
export type StoredStarterExercise = { routine_day_id: string; position: number; exercise_name: string | null };

/**
 * True only when a stored routine is exactly what the template creates (same week, rest days, day names and
 * exercises in order). A retry after a lost response, or a second tap that got past the button guard, adopts
 * that routine instead of making a duplicate.
 */
export function doesRoutineMatchStarterTemplate(args: {
  template: StarterTemplate;
  days: StoredStarterDay[];
  exercises: StoredStarterExercise[];
}): boolean {
  if (args.days.length !== args.template.week.length) return false;
  const dayByIndex = new Map(args.days.map((day) => [day.day_index, day]));

  return args.template.week.every((planDay, offset) => {
    const stored = dayByIndex.get(offset + 1);
    if (!stored) return false;
    const storedNames = args.exercises
      .filter((exercise) => exercise.routine_day_id === stored.id)
      .sort((left, right) => left.position - right.position)
      .map((exercise) => exercise.exercise_name);
    if (!planDay) {
      return stored.is_rest && storedNames.length === 0;
    }
    const expected = planDay.exercises.map((exercise) => exercise.name);
    return !stored.is_rest
      && stored.name === planDay.name
      && storedNames.length === expected.length
      && storedNames.every((name, index) => name === expected[index]);
  });
}
