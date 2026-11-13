import type { CuratedGenerationFailureCode } from "./api-contract.ts";
import type { CuratedGenerationStatus } from "./types.ts";

/** Same destination as the "Build manually" option on the Routines screen. */
export const CURATED_MANUAL_ROUTINE_HREF = "/routines/new?mode=blank";

export type CuratedHandoffFailure = {
  code: CuratedGenerationFailureCode;
  message: string;
};

export type CuratedHandoffTone = "default" | "accent" | "warning" | "danger";

export type CuratedHandoffPresentation = {
  title: string;
  body: string;
  tone: CuratedHandoffTone;
  badge: "Working" | "Ready" | "Failed" | "Blocked";
};

/**
 * Only a transient server error is worth retrying unchanged. Every other failure is a property of the saved
 * setup (safety answer, no safe lifts, unreadable intake), so the member must edit the setup or build manually.
 */
export function isCuratedHandoffRetryable(failure: CuratedHandoffFailure | null) {
  return failure?.code === "unavailable";
}

/**
 * A blocked outcome means the member should not get an automatic routine at all (a symptom needs a professional,
 * or a guardian must be involved). The primary action there is to build a routine themselves; editing the setup
 * is secondary because changing an answer is not the way past a safety or permission stop.
 */
export function isCuratedHandoffBlocked(failure: CuratedHandoffFailure | null) {
  return failure?.code === "safety-clearance-required" || failure?.code === "guardian-permission-required" || failure?.code === "feature-disabled";
}

export type CuratedHandoffActions = {
  primary: "build-manually" | "edit-setup" | "try-again";
  secondary: "build-manually" | "edit-setup";
};

export function getCuratedHandoffActions(failure: CuratedHandoffFailure | null): CuratedHandoffActions {
  if (isCuratedHandoffBlocked(failure)) return { primary: "build-manually", secondary: "edit-setup" };
  if (isCuratedHandoffRetryable(failure)) return { primary: "try-again", secondary: "build-manually" };
  return { primary: "edit-setup", secondary: "build-manually" };
}

export function getCuratedHandoffPresentation(args: {
  status: CuratedGenerationStatus;
  failure: CuratedHandoffFailure | null;
}): CuratedHandoffPresentation {
  const { status, failure } = args;

  if (failure?.code === "safety-clearance-required") {
    return {
      title: "Check with a professional first",
      body: "You reported symptoms during exercise, so a routine cannot be built for you automatically. Check with a qualified professional before starting or changing exercise. You can still build your own routine.",
      tone: "warning",
      badge: "Blocked",
    };
  }

  if (failure?.code === "guardian-permission-required") {
    return {
      title: "A parent or guardian needs to help first",
      body: "A routine can only be built for someone under 18 with a parent or guardian's permission. Ask a parent or guardian to help with your setup, or build your own routine.",
      tone: "warning",
      badge: "Blocked",
    };
  }

  if (failure?.code === "feature-disabled") {
    return {
      title: "Guided setup is not available",
      body: "Guided routine setup is not available right now. You can build a routine manually.",
      tone: "warning",
      badge: "Blocked",
    };
  }

  if (failure || status === "failed") {
    return {
      title: "Routine generation failed",
      body: isCuratedHandoffRetryable(failure)
        ? "Your setup is saved. Try again, or build a routine manually."
        : "Your setup is saved. Edit your setup, or build a routine manually.",
      tone: "danger",
      badge: "Failed",
    };
  }

  if (status === "queued") {
    return { title: "Building your routine", body: "Building from your saved setup.", tone: "warning", badge: "Working" };
  }

  if (status === "ready") {
    return {
      title: "Your routine is ready to review",
      body: "Review the days below, then open the editable draft.",
      tone: "accent",
      badge: "Ready",
    };
  }

  if (status === "not-implemented") {
    return {
      title: "Generation is not available yet",
      body: "Your setup is saved. You can build a routine manually in the meantime.",
      tone: "accent",
      badge: "Working",
    };
  }

  return { title: "Setup saved on this device", body: "Preparing the editable draft.", tone: "default", badge: "Working" };
}
