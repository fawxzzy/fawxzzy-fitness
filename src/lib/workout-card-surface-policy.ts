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
  mediaRailWidth: number;
};

const DEFAULT_MEDIA_RAIL_WIDTH = 72;

export function resolveWorkoutCardMediaRailWidth(surface: WorkoutCardSurface): number {
  switch (surface) {
    case "current-session":
      return 74;
    case "history-browser":
      return 74;
    case "history-detail":
      return 72;
    case "exercise-picker":
      return 60;
    case "today":
    case "view-day":
    case "edit-day":
    case "reorder":
    default:
      return 56;
  }
}

export function resolveWorkoutCardSurfacePolicy(
  surface: WorkoutCardSurface,
  density: WorkoutCardDensity,
): WorkoutCardSurfacePolicy {
  switch (surface) {
    case "today":
      return {
        showMedia: true,
        showIdentityChips: false,
        showDetailedMetrics: density === "detailed",
        mediaRailWidth: resolveWorkoutCardMediaRailWidth(surface),
      };
    case "current-session":
      return {
        showMedia: true,
        showIdentityChips: false,
        showDetailedMetrics: false,
        mediaRailWidth: resolveWorkoutCardMediaRailWidth(surface),
      };
    case "view-day":
      return {
        showMedia: true,
        showIdentityChips: false,
        showDetailedMetrics: false,
        mediaRailWidth: resolveWorkoutCardMediaRailWidth(surface),
      };
    case "edit-day":
      return {
        showMedia: true,
        showIdentityChips: false,
        showDetailedMetrics: false,
        mediaRailWidth: resolveWorkoutCardMediaRailWidth(surface),
      };
    case "reorder":
      return {
        showMedia: true,
        showIdentityChips: false,
        showDetailedMetrics: false,
        mediaRailWidth: resolveWorkoutCardMediaRailWidth(surface),
      };
    case "history-browser":
      return {
        showMedia: density === "compact",
        showIdentityChips: true,
        showDetailedMetrics: density === "detailed",
        mediaRailWidth: density === "compact" ? resolveWorkoutCardMediaRailWidth(surface) : 0,
      };
    case "history-detail":
      return {
        showMedia: true,
        showIdentityChips: false,
        showDetailedMetrics: false,
        mediaRailWidth: resolveWorkoutCardMediaRailWidth(surface),
      };
    case "exercise-picker":
      return {
        showMedia: true,
        showIdentityChips: false,
        showDetailedMetrics: false,
        mediaRailWidth: resolveWorkoutCardMediaRailWidth(surface),
      };
    default:
      return {
        showMedia: false,
        showIdentityChips: false,
        showDetailedMetrics: false,
        mediaRailWidth: DEFAULT_MEDIA_RAIL_WIDTH,
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
