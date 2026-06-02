export const FITNESS_OVERLAY_EXCLUSIVE_OPEN_EVENT = "fitness:overlay-exclusive-open";

export type FitnessOverlayExclusiveSource = "filter" | "info";

export function dispatchFitnessOverlayExclusiveOpen(source: FitnessOverlayExclusiveSource) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<FitnessOverlayExclusiveDetail>(FITNESS_OVERLAY_EXCLUSIVE_OPEN_EVENT, {
    detail: { source },
  }));
}

export type FitnessOverlayExclusiveDetail = {
  source: FitnessOverlayExclusiveSource;
};
