import { formatDateShort } from "@/lib/formatting";
import type { ExerciseAnalyticsFamily } from "@/lib/exercise-analytics-family";
import { formatCalories, formatDistance, formatDurationShort, formatPace, positive } from "@/lib/exercise-stats-formatting";
import { getDisplayPace } from "@/lib/cardio-best";

export function buildCardioPrReviewItems(args: {
  family: ExerciseAnalyticsFamily;
  sessionAggregates: Array<{
    performedAt: string | null;
    durationSeconds: number;
    distance: number;
    distanceUnit: "mi" | "km" | "m" | "steps" | null;
    calories: number;
  }>;
}) {
  const orderedRows = [...args.sessionAggregates]
    .filter((row) => Boolean(row.performedAt))
    .sort((a, b) => (a.performedAt ?? "").localeCompare(b.performedAt ?? ""));

  const items: string[] = [];
  let bestPaceSeconds = Number.POSITIVE_INFINITY;
  let bestDurationSeconds = 0;
  let bestDistance = 0;
  let bestCalories = 0;
  let bestSteps = 0;

  for (const row of orderedRows) {
    const performedAt = row.performedAt;
    if (!performedAt) {
      continue;
    }

    const duration = positive(row.durationSeconds);
    const distance = positive(row.distance);
    const calories = positive(row.calories);
    const pace = getDisplayPace(duration, distance, row.distanceUnit);
    const paceLabel = formatPace(pace?.paceSecondsPerUnit, pace?.distanceUnit);
    const durationLabel = formatDurationShort(duration);
    const distanceLabel = formatDistance(distance, row.distanceUnit);
    const caloriesLabel = formatCalories(calories) ?? (calories > 0 ? `${Math.round(calories)} cal` : null);
    const stepsLabel = row.distanceUnit === "steps" ? formatDistance(distance, "steps") : null;
    const formattedDate = formatDateShort(performedAt);

    if ((args.family === "cardio-distance" || args.family === "cardio-endurance") && pace?.paceSecondsPerUnit && paceLabel && pace.paceSecondsPerUnit < bestPaceSeconds) {
      bestPaceSeconds = pace.paceSecondsPerUnit;
      items.push(`Pace PR | ${paceLabel} | ${formattedDate}`);
    }

    if ((args.family === "timed-hold" || args.family === "cardio-endurance") && duration > bestDurationSeconds && durationLabel) {
      bestDurationSeconds = duration;
      items.push(`Time PR | ${durationLabel} | ${formattedDate}`);
    }

    if ((args.family === "cardio-distance" || args.family === "cardio-endurance") && distance > bestDistance && distanceLabel) {
      bestDistance = distance;
      items.push(`Distance PR | ${distanceLabel} | ${formattedDate}`);
    }

    if (args.family === "cardio-calories" && calories > bestCalories && caloriesLabel) {
      bestCalories = calories;
      items.push(`Calories PR | ${caloriesLabel} | ${formattedDate}`);
    }

    if (args.family === "cardio-steps" && row.distanceUnit === "steps" && distance > bestSteps && stepsLabel) {
      bestSteps = distance;
      items.push(`Steps PR | ${stepsLabel} | ${formattedDate}`);
    }
  }

  return items.reverse().slice(0, 6);
}
