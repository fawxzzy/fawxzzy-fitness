import type { MetricDatum } from "@/components/ui/MetricItem";
import type { WorkoutCardChip, WorkoutCardDensity } from "@/lib/workout-card-view-models";

export type WorkoutCardSurface =
  | "today"
  | "current-session"
  | "view-day"
  | "edit-day"
  | "reorder"
  | "history-browser"
  | "history-detail"
  | "exercise-picker";

export type WorkoutCardSurfacePolicy = {
  showMedia: boolean;
  showIdentityChips: boolean;
  showDetailedMetrics: boolean;
};

export function resolveWorkoutCardSurfacePolicy(
  surface: WorkoutCardSurface,
  density: WorkoutCardDensity,
): WorkoutCardSurfacePolicy {
  switch (surface) {
    case "today":
      return {
        showMedia: false,
        showIdentityChips: false,
        showDetailedMetrics: density === "detailed",
      };
    case "current-session":
      return {
        showMedia: true,
        showIdentityChips: false,
        showDetailedMetrics: false,
      };
    case "view-day":
      return {
        showMedia: false,
        showIdentityChips: false,
        showDetailedMetrics: false,
      };
    case "edit-day":
      return {
        showMedia: true,
        showIdentityChips: false,
        showDetailedMetrics: false,
      };
    case "reorder":
      return {
        showMedia: false,
        showIdentityChips: false,
        showDetailedMetrics: false,
      };
    case "history-browser":
      return {
        showMedia: density === "compact",
        showIdentityChips: true,
        showDetailedMetrics: density === "detailed",
      };
    case "history-detail":
      return {
        showMedia: false,
        showIdentityChips: false,
        showDetailedMetrics: false,
      };
    case "exercise-picker":
      return {
        showMedia: true,
        showIdentityChips: false,
        showDetailedMetrics: false,
      };
    default:
      return {
        showMedia: false,
        showIdentityChips: false,
        showDetailedMetrics: false,
      };
  }
}

export function applyWorkoutCardSurfacePolicy(args: {
  surface: WorkoutCardSurface;
  density: WorkoutCardDensity;
  chips?: WorkoutCardChip[];
  detailedMetrics?: MetricDatum[];
}) {
  const policy = resolveWorkoutCardSurfacePolicy(args.surface, args.density);

  return {
    policy,
    chips: policy.showIdentityChips ? (args.chips ?? []) : [],
    detailedMetrics: policy.showDetailedMetrics ? (args.detailedMetrics ?? []) : [],
  };
}
