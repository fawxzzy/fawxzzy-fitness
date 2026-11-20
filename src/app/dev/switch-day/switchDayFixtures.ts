import type { ComponentProps } from "react";
import type { TodayDayPicker } from "@/app/today/TodayDayPicker";

/**
 * Static Switch Day fixtures for /dev/switch-day and /dev/mobile-regression/switch-day. No Supabase, no session:
 * plain objects in the exact shape TodayDayPicker takes. Each variant is one routine plus the Today state around it.
 */
type PickerDays = ComponentProps<typeof TodayDayPicker>["days"];
type PickerDay = PickerDays[number];
type PickerExercise = PickerDay["exercises"][number];

export type SwitchDayVariant = {
  id: string;
  label: string;
  note: string;
  routineName: string;
  startDate: string | null;
  days: PickerDays;
  currentDayIndex: number | null;
  selectedDayIndex: number;
  completedDayIndexes: number[];
  inSessionDayIndex: number | null;
};

const EXERCISE_NAMES = [
  "Back Squat",
  "Bench Press",
  "Romanian Deadlift",
  "Pull-Up",
  "Overhead Press",
  "Walking Lunge",
  "Seated Cable Row",
  "Incline Dumbbell Press",
  "Leg Press",
  "Lateral Raise",
  "Hamstring Curl",
  "Face Pull",
  "Calf Raise",
  "Hanging Knee Raise",
  "Treadmill Run",
];

const LONG_EXERCISE_NAMES = [
  "Single-Arm Half-Kneeling Landmine Press With Pause",
  "Rear-Foot-Elevated Bulgarian Split Squat (Dumbbells)",
  "Chest-Supported Incline Dumbbell Row With Isometric Hold",
  "Barbell Hip Thrust",
];

function exercise(dayIndex: number, index: number, name: string, withImage = true): PickerExercise {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return {
    id: `sd-${dayIndex}-${index}`,
    exerciseId: `sd-ex-${slug}`,
    name,
    targets: "3 sets • 8-12 reps",
    targetSetsMin: 3,
    targetSetsMax: 3,
    primary_muscle: null,
    equipment: null,
    movement_pattern: null,
    measurement_type: "reps",
    image_howto_path: null,
    image_icon_path: withImage ? `/missing/icon-${slug}.png` : null,
    slug,
    how_to_short: null,
  };
}

function trainingDay(dayIndex: number, name: string, exerciseCount: number, options: { names?: string[]; withImages?: boolean } = {}): PickerDay {
  const names = options.names ?? EXERCISE_NAMES;
  const exercises = Array.from({ length: exerciseCount }, (_, index) => exercise(dayIndex, index, names[(index + dayIndex) % names.length], options.withImages ?? true));
  return {
    id: `sd-day-${dayIndex}`,
    dayIndex,
    name,
    isRest: false,
    state: exerciseCount > 0 ? "runnable" : "empty",
    invalidExerciseCount: 0,
    exercises,
  };
}

function restDay(dayIndex: number, name = ""): PickerDay {
  return { id: `sd-day-${dayIndex}`, dayIndex, name, isRest: true, state: "rest", invalidExerciseCount: 0, exercises: [] };
}

const START = "2025-03-10"; // a Monday, so Day 1 reads "Mon"

function variant(input: Omit<SwitchDayVariant, "routineName" | "startDate" | "completedDayIndexes" | "inSessionDayIndex"> & Partial<SwitchDayVariant>): SwitchDayVariant {
  return { routineName: "Strength Base", startDate: START, completedDayIndexes: [], inSessionDayIndex: null, ...input };
}

export const SWITCH_DAY_VARIANTS: SwitchDayVariant[] = [
  variant({
    id: "standard",
    label: "4-day plan, today selected",
    note: "Day 1 done, Day 2 is today and selected, Day 3 rest (named), Day 4 has no exercises.",
    days: [trainingDay(1, "Push", 4), trainingDay(2, "Lower", 3), restDay(3, "Recovery"), trainingDay(4, "Travel Reset", 0)],
    currentDayIndex: 2,
    selectedDayIndex: 2,
    completedDayIndexes: [1],
  }),
  variant({
    id: "today-vs-selected",
    label: "Today vs selected",
    note: "Today is Day 2; Day 4 is selected. Only the selected card is green with a check.",
    days: [trainingDay(1, "Push", 4), trainingDay(2, "Lower", 5), restDay(3), trainingDay(4, "Pull", 6)],
    currentDayIndex: 2,
    selectedDayIndex: 4,
    completedDayIndexes: [1],
  }),
  variant({
    id: "single-day",
    label: "Single-day routine",
    note: "One day, unnamed, today and selected.",
    routineName: "Full Body",
    days: [trainingDay(1, "", 5)],
    currentDayIndex: 1,
    selectedDayIndex: 1,
  }),
  variant({
    id: "seven-day",
    label: "7-day routine",
    note: "Mixed plan: rest on Day 4 and Day 7, Day 3 in progress.",
    routineName: "Weekly Split",
    days: [
      trainingDay(1, "Push", 5),
      trainingDay(2, "Pull", 5),
      trainingDay(3, "Legs", 6),
      restDay(4),
      trainingDay(5, "Upper", 4),
      trainingDay(6, "Conditioning", 2),
      restDay(7),
    ],
    currentDayIndex: 3,
    selectedDayIndex: 3,
    completedDayIndexes: [1, 2],
    inSessionDayIndex: 3,
  }),
  variant({
    id: "rest-start",
    label: "Rest day at the start",
    note: "Day 1 is rest and today; Day 2 is selected.",
    days: [restDay(1), trainingDay(2, "Upper", 4), trainingDay(3, "Lower", 4)],
    currentDayIndex: 1,
    selectedDayIndex: 2,
  }),
  variant({
    id: "rest-middle-consecutive",
    label: "Consecutive rest days in the middle",
    note: "Days 3 and 4 are rest back to back; Day 3 is today and selected.",
    days: [trainingDay(1, "Push", 4), trainingDay(2, "Pull", 4), restDay(3), restDay(4), trainingDay(5, "Legs", 5)],
    currentDayIndex: 3,
    selectedDayIndex: 3,
  }),
  variant({
    id: "rest-end",
    label: "Rest day at the end",
    note: "The last day is rest.",
    days: [trainingDay(1, "Upper", 5), trainingDay(2, "Lower", 5), restDay(3)],
    currentDayIndex: 1,
    selectedDayIndex: 1,
  }),
  variant({
    id: "all-rest",
    label: "All-rest week",
    note: "Every day is a rest day (deload week).",
    routineName: "Deload Week",
    days: [1, 2, 3, 4, 5, 6, 7].map((index) => restDay(index)),
    currentDayIndex: 2,
    selectedDayIndex: 2,
  }),
  variant({
    id: "empty-day",
    label: "Empty day",
    note: "Day 2 has no exercises yet and is selected.",
    days: [trainingDay(1, "Push", 4), trainingDay(2, "New Day", 0), trainingDay(3, "Legs", 4)],
    currentDayIndex: 1,
    selectedDayIndex: 2,
  }),
  variant({
    id: "long-names",
    label: "Long day and exercise names",
    note: "Names wrap; nothing is cut off mid-word.",
    routineName: "Hypertrophy Block With A Very Long Routine Name",
    days: [
      trainingDay(1, "Upper Body Hypertrophy Emphasis With Extra Arm Volume", 4, { names: LONG_EXERCISE_NAMES }),
      restDay(2, "Active Recovery Walk And Mobility Flow"),
      trainingDay(3, "Posterior Chain", 3, { names: LONG_EXERCISE_NAMES }),
    ],
    currentDayIndex: 1,
    selectedDayIndex: 1,
  }),
  variant({
    id: "many-exercises",
    label: "Many exercises",
    note: "15 and 12 exercises: the snapshot shows three names, then 'and N more'.",
    days: [trainingDay(1, "Full Body A", 15), trainingDay(2, "Full Body B", 12), trainingDay(3, "Finisher", 1)],
    currentDayIndex: 1,
    selectedDayIndex: 1,
  }),
  variant({
    id: "no-image",
    label: "Exercises without images",
    note: "No exercise has an image; Switch Day never showed images, the day view falls back to its placeholder.",
    days: [trainingDay(1, "Push", 4, { withImages: false }), trainingDay(2, "Pull", 4, { withImages: false })],
    currentDayIndex: 1,
    selectedDayIndex: 1,
  }),
];

export function findSwitchDayVariant(id: string | null | undefined) {
  return SWITCH_DAY_VARIANTS.find((entry) => entry.id === id) ?? null;
}
