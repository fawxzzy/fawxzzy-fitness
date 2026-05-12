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

export function getInitialExperienceStageCopy(stage: InitialExperienceGateStage) {
  if (stage === "checking-session") {
    return {
      eyebrow: "Warm-Up Handoff",
      title: "Checking your session",
      subtitle: "Preparing your training space before the app decides the safest next stop.",
      detail: "Checking where to drop you in.",
    };
  }

  if (stage === "preparing-experience") {
    return {
      eyebrow: "Warm-Up Handoff",
      title: "Preparing your training space",
      subtitle: "Looking at saved setup and whether this session should continue through first-time setup.",
      detail: "Lining up the right post-login experience.",
    };
  }

  if (stage === "redirecting") {
    return {
      eyebrow: "Warm-Up Handoff",
      title: "Redirecting cleanly",
      subtitle: "The destination is locked. Handing off without leaving extra history noise behind.",
      detail: "Taking you straight to the next screen.",
    };
  }

  if (stage === "recovery") {
    return {
      eyebrow: "Warm-Up Handoff",
      title: "The launch handoff stalled",
      subtitle: "The app can recover safely without requiring a browser refresh first.",
      detail: "Offering direct recovery actions.",
    };
  }

  return {
    eyebrow: "Warm-Up Handoff",
    title: "We could not finish the handoff",
    subtitle: "The fallback is safe: open the app directly or retry the post-auth check.",
    detail: "The redirect did not commit cleanly.",
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
