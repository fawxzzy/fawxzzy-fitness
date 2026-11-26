import type { CuratedOnboardingGateState } from "@/features/curated-onboarding/types.ts";
import { resolvePostLoginDestination, type PostLoginDestination } from "@/lib/resolvePostLoginDestination";

export const INITIAL_EXPERIENCE_ROUTER_RETRY_DELAY_MS = 1_200;
export const INITIAL_EXPERIENCE_LOCATION_REPLACE_DELAY_MS = 2_200;
export const INITIAL_EXPERIENCE_CACHE_BUST_RELOAD_DELAY_MS = 3_400;
export const INITIAL_EXPERIENCE_RECOVERY_DELAY_MS = 4_800;

export type InitialExperienceGateStage =
  | "checking-session"
  | "preparing-experience"
  | "redirecting"
  | "recovery"
  | "error";

export type InitialExperienceAutoRecoveryStep =
  | "retry-router"
  | "location-replace"
  | "cache-busted-reload"
  | "show-recovery";

export type ResolvedGateDecision = {
  destination: PostLoginDestination;
  isFirstLogin: boolean;
  hasSavedDraft: boolean;
};

function normalizeRelativeHref(href: string) {
  const url = new URL(href, "https://fawxzzy-fitness.local");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function destinationToHref(destination: PostLoginDestination) {
  if (destination.kind === "home") {
    return "/today";
  }

  if (destination.kind === "curated-intro") {
    return "/curated-onboarding";
  }

  return `/curated-onboarding?draft=${encodeURIComponent(destination.draftId)}`;
}

/**
 * The words for each stage of the sign-in handoff. Only `detail` is shown today (as the loading label); the rest is
 * kept in the same plain words so any screen that uses it later says something a person understands.
 */
export function getInitialExperienceStageCopy(stage: InitialExperienceGateStage) {
  if (stage === "checking-session") {
    return {
      eyebrow: "Fitness",
      title: "Checking your session",
      subtitle: "Making sure you are signed in.",
      detail: "Checking your session.",
    };
  }

  if (stage === "preparing-experience") {
    return {
      eyebrow: "Fitness",
      title: "Getting Fitness ready",
      subtitle: "Looking at your saved setup.",
      detail: "Getting your workouts ready.",
    };
  }

  if (stage === "redirecting") {
    return {
      eyebrow: "Fitness",
      title: "Opening Fitness",
      subtitle: "Taking you to the next screen.",
      detail: "Opening Fitness.",
    };
  }

  if (stage === "recovery") {
    return {
      eyebrow: "Fitness",
      title: "This is taking longer than usual",
      subtitle: "You can try again without refreshing the page.",
      detail: "Fitness is taking longer than usual to open.",
    };
  }

  return {
    eyebrow: "Fitness",
    title: "Could not open Fitness",
    subtitle: "Try again, or go straight to Today.",
    detail: "Fitness could not open.",
  };
}

export function resolveGateDecision(
  gateState: CuratedOnboardingGateState,
  context: {
    curatedEngineEnabled: boolean;
    hasExistingProgram: boolean;
  },
) {
  const isFirstLogin = !gateState.hasSeenInitialExperience;
  const baseContext = {
    isFirstLogin,
    curatedEngineEnabled: context.curatedEngineEnabled,
    hasCompletedCuratedIntake: gateState.hasCompletedCuratedIntake,
    hasExistingProgram: context.hasExistingProgram,
    savedCuratedDraftId: gateState.savedCuratedDraftId,
  } as const;
  const destination = resolvePostLoginDestination(baseContext);

  return {
    destination,
    isFirstLogin,
    hasSavedDraft: Boolean(gateState.savedCuratedDraftId),
  } satisfies ResolvedGateDecision;
}

export function deriveInitialExperienceStage(args: {
  decision: ResolvedGateDecision | null;
  gateState: CuratedOnboardingGateState | null;
  hasRecoveryState: boolean;
  loadFailed: boolean;
}) {
  if (args.loadFailed) {
    return "error" as const;
  }

  if (args.hasRecoveryState) {
    return "recovery" as const;
  }

  if (!args.gateState) {
    return "checking-session" as const;
  }

  if (!args.decision) {
    return "preparing-experience" as const;
  }

  return "redirecting" as const;
}

export function hasCommittedToTargetRoute(currentHref: string, targetHref: string) {
  return normalizeRelativeHref(currentHref) === normalizeRelativeHref(targetHref);
}

export function getNextInitialExperienceRecoveryStep(args: {
  attemptedCacheBustedReload: boolean;
  attemptedLocationReplace: boolean;
  attemptedRouterRetry: boolean;
  canUseCacheBustedReload: boolean;
  currentBuildId: string;
  elapsedMs: number;
  remoteBuildId: string | null;
  routeCommitted: boolean;
  updatePhase: "idle" | "checking" | "update-queued" | "applying-update" | "error";
}) {
  if (args.routeCommitted || args.updatePhase === "applying-update") {
    return null;
  }

  if (!args.attemptedRouterRetry && args.elapsedMs >= INITIAL_EXPERIENCE_ROUTER_RETRY_DELAY_MS) {
    return "retry-router" as const;
  }

  if (!args.attemptedLocationReplace && args.elapsedMs >= INITIAL_EXPERIENCE_LOCATION_REPLACE_DELAY_MS) {
    return "location-replace" as const;
  }

  const remoteBuildMismatch = Boolean(
    args.remoteBuildId
    && args.remoteBuildId !== args.currentBuildId,
  );

  if (
    !args.attemptedCacheBustedReload
    && args.canUseCacheBustedReload
    && (remoteBuildMismatch || args.elapsedMs >= INITIAL_EXPERIENCE_CACHE_BUST_RELOAD_DELAY_MS)
  ) {
    return "cache-busted-reload" as const;
  }

  if (args.elapsedMs >= INITIAL_EXPERIENCE_RECOVERY_DELAY_MS) {
    return "show-recovery" as const;
  }

  return null;
}
