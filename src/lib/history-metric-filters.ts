import type { SessionSummary } from "@/app/history/session-summary";
import type { ExerciseBrowserRow } from "@/lib/exercises-browser";
import type { ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import type { ExerciseAnalyticsFamily } from "@/lib/exercise-analytics-family";

const EXERCISE_METRIC_LABELS: Record<string, string> = {
  "metric:calories": "Calories",
  "metric:distance": "Distance",
  "metric:duration": "Duration",
  "metric:load": "Load",
  "metric:pace": "Pace",
  "metric:progression": "Progression",
  "metric:prs": "PRs",
  "metric:reps": "Reps",
  "metric:steps": "Steps",
};

const SESSION_METRIC_LABELS: Record<string, string> = {
  "metric:completion": "Completion",
  "metric:duration": "Duration",
  "metric:progression": "Progression",
  "metric:prs": "PRs",
  "metric:reps": "Reps",
  "metric:volume": "Volume",
};

function positive(value: number | null | undefined) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : 0;
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function buildMetricGroup(values: Iterable<string>, labels: Record<string, string>): ExerciseTagGroup | null {
  const tags = Array.from(new Set(values))
    .filter((value) => Boolean(labels[value]))
    .map((value) => ({ value, label: labels[value] ?? value }))
    .sort((left, right) => left.label.localeCompare(right.label));

  return tags.length > 0 ? { key: "metric", label: "Metrics", tags } : null;
}

function resolveExerciseMetricFamily(row: Pick<
  ExerciseBrowserRow,
  "analyticsFamily" | "kind" | "measurement_type" | "default_unit" | "last_weight" | "actual_pr_weight" | "last_reps" | "actual_pr_reps"
>): ExerciseAnalyticsFamily {
  if (row.analyticsFamily) {
    return row.analyticsFamily;
  }

  const measurementType = normalizeText(row.measurement_type);
  const defaultUnit = normalizeText(row.default_unit);
  const hasLoadSignal = positive(row.last_weight) > 0 || positive(row.actual_pr_weight) > 0;
  const hasRepSignal = positive(row.last_reps) > 0 || positive(row.actual_pr_reps) > 0;

  if (measurementType === "time" || measurementType === "duration") {
    return "timed-hold";
  }

  if (row.kind === "cardio") {
    if (measurementType === "calories") {
      return "cardio-calories";
    }
    if (defaultUnit === "steps") {
      return "cardio-steps";
    }
    if (measurementType === "distance") {
      return "cardio-distance";
    }
    return "cardio-endurance";
  }

  if (!hasLoadSignal && hasRepSignal) {
    return "strength-bodyweight";
  }

  return "strength-loaded";
}

export function buildExerciseMetricTagValues(row: ExerciseBrowserRow) {
  const tags = new Set<string>();
  const family = resolveExerciseMetricFamily(row);

  switch (family) {
    case "strength-loaded":
      tags.add("metric:load");
      tags.add("metric:reps");
      break;
    case "strength-bodyweight":
      tags.add("metric:reps");
      break;
    case "timed-hold":
      tags.add("metric:duration");
      break;
    case "cardio-distance":
      tags.add("metric:distance");
      tags.add("metric:pace");
      tags.add("metric:duration");
      break;
    case "cardio-steps":
      tags.add("metric:steps");
      tags.add("metric:duration");
      break;
    case "cardio-calories":
      tags.add("metric:calories");
      tags.add("metric:duration");
      break;
    case "cardio-endurance":
    default:
      tags.add("metric:distance");
      tags.add("metric:pace");
      tags.add("metric:duration");
      break;
  }

  if (row.prCount > 0) {
    tags.add("metric:prs");
  }

  if (row.progressionSummary?.eventCount) {
    tags.add("metric:progression");
  }

  return Array.from(tags);
}

export function buildExerciseMetricTagGroup(rows: ExerciseBrowserRow[]) {
  return buildMetricGroup(rows.flatMap((row) => buildExerciseMetricTagValues(row)), EXERCISE_METRIC_LABELS);
}

export function buildSessionMetricTagValues(session: SessionSummary) {
  const tags = new Set<string>();

  if (positive(session.totalVolume) > 0) {
    tags.add("metric:volume");
  }
  if (positive(session.repCount) > 0) {
    tags.add("metric:reps");
  }
  if (positive(session.durationSec) > 0) {
    tags.add("metric:duration");
  }
  if (typeof session.completionRate === "number") {
    tags.add("metric:completion");
  }
  if (session.prCounts.total > 0) {
    tags.add("metric:prs");
  }
  if (session.progressionSummary?.eventCount) {
    tags.add("metric:progression");
  }

  return Array.from(tags);
}

export function buildSessionMetricTagGroup(sessions: SessionSummary[]) {
  return buildMetricGroup(sessions.flatMap((session) => buildSessionMetricTagValues(session)), SESSION_METRIC_LABELS);
}
