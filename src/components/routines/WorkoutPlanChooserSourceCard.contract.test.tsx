import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkoutPlanChooserSourceCard } from "./WorkoutPlanChooserSourceCard";

const recapExercises = ["Back Squat", "Romanian Deadlift", "Walking Lunge", "Calf Raise", "Plank"].map((name, index) => ({
  id: `e${index}`,
  name,
  targetLabel: "3 sets · 8 reps",
  signatureLabel: "Quads | Squat",
}));
const source = {
  dayIndex: 2,
  title: "Push",
  occurrenceWeekday: "Tue",
  isRest: false,
  splitSummary: { total: 5, strength: 4, cardio: 1, bodyweight: 0, unknown: 0 },
  recapExercises,
};

test("chooser card: selection is a pressed toggle with a visible SELECTED chip (not colour alone)", () => {
  const selected = renderToStaticMarkup(<WorkoutPlanChooserSourceCard source={source} selected onPress={() => {}} />);
  const idle = renderToStaticMarkup(<WorkoutPlanChooserSourceCard source={source} onPress={() => {}} />);

  assert.match(selected, /aria-pressed="true"/);
  assert.match(selected, /Selected/);
  assert.match(idle, /aria-pressed="false"/);
  assert.doesNotMatch(idle, /Selected/);
});

test("chooser card: same anatomy as every day card (heading, weekday and split in the meta line)", () => {
  const html = renderToStaticMarkup(<WorkoutPlanChooserSourceCard source={source} onPress={() => {}} />);

  assert.match(html, /<h3[^>]*data-card-title="true"[^>]*>Push<\/h3>/);
  assert.match(html, /Tue[\s\S]*4 strength[\s\S]*1 cardio/);
});

test("chooser card: recap is a short vertical list with a +N more line, no sideways rail", () => {
  const html = renderToStaticMarkup(<WorkoutPlanChooserSourceCard source={source} onPress={() => {}} />);
  const file = readFileSync(new URL("./WorkoutPlanChooserSourceCard.tsx", import.meta.url), "utf8");

  assert.match(html, /data-routine-day-recap="true"/);
  assert.match(html, /Calf Raise/);
  assert.doesNotMatch(html, /Plank/);
  assert.match(html, /\+1 more exercise</);
  assert.doesNotMatch(file, /HorizontalScrollHint|overflow-x-(auto|scroll)|MetricAccentBar/);
});

test("chooser card: rest days show no recap and read as rest in the meta line", () => {
  const html = renderToStaticMarkup(
    <WorkoutPlanChooserSourceCard source={{ ...source, title: "Rest", isRest: true, recapExercises: [], exerciseSummary: "" }} onPress={() => {}} />,
  );

  assert.doesNotMatch(html, /data-routine-day-recap/);
  assert.match(html, /Rest day/);
  assert.match(html, /data-card-tone="attention"/);
});
