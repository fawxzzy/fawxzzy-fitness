"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthCard, AuthIntro, AuthShell } from "@/components/auth/AuthShell";
import { RouteLoading } from "@/components/RouteLoading";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { appTokens } from "@/components/ui/app/tokens";
import {
  trackEntryResolved,
} from "@/features/curated-onboarding/analytics.ts";
import type { CuratedOnboardingGateState } from "@/features/curated-onboarding/types.ts";
import { loadCuratedOnboardingGateState, markInitialExperienceSeen } from "@/features/curated-onboarding/storage.ts";
import { resolvePostLoginDestination, type PostLoginDestination } from "@/lib/resolvePostLoginDestination";

type InitialExperienceGateProps = {
  curatedEngineEnabled: boolean;
  hasExistingProgram: boolean;
  userId: string;
};

type GateStage = "checking-session" | "preparing-experience" | "redirecting" | "error";
type ResolvedGateDecision = {
  destination: PostLoginDestination;
  isFirstLogin: boolean;
  hasSavedDraft: boolean;
};

function destinationToHref(destination: PostLoginDestination) {
  if (destination.kind === "home") {
    return "/today";
  }

  if (destination.kind === "curated-intro") {
    return "/curated-onboarding";
  }

  return `/curated-onboarding?draft=${encodeURIComponent(destination.draftId)}`;
}

function getStageCopy(stage: GateStage) {
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

  return {
    eyebrow: "Warm-Up Handoff",
    title: "We could not finish the handoff",
    subtitle: "The fallback is safe: open the app directly or retry the post-auth check.",
    detail: "The redirect did not commit cleanly.",
  };
}

function resolveGateDecision(
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

export function InitialExperienceGate({
  curatedEngineEnabled,
  hasExistingProgram,
  userId,
}: InitialExperienceGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const committedHrefRef = useRef<string | null>(null);
  const initialExperienceMarkedRef = useRef(false);
  const [gateState, setGateState] = useState<CuratedOnboardingGateState | null>(null);
  const [decision, setDecision] = useState<ResolvedGateDecision | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retrySeed, setRetrySeed] = useState(0);

  useEffect(() => {
    try {
      setLoadFailed(false);
      setGateState(loadCuratedOnboardingGateState(userId));
    } catch {
      setLoadFailed(true);
    }
  }, [curatedEngineEnabled, retrySeed, userId]);

  useEffect(() => {
    if (!gateState || decision || loadFailed) {
      return;
    }

    const nextDecision = resolveGateDecision(gateState, {
      curatedEngineEnabled,
      hasExistingProgram,
    });

    trackEntryResolved(
      {
        destination: nextDecision.destination.kind,
        isFirstLogin: nextDecision.isFirstLogin,
        curatedEnabled: curatedEngineEnabled,
        hasExistingProgram,
        hasSavedDraft: nextDecision.hasSavedDraft,
      },
      userId,
    );
    setDecision(nextDecision);
  }, [curatedEngineEnabled, decision, gateState, hasExistingProgram, loadFailed, userId]);

  useEffect(() => {
    if (!decision) {
      return;
    }

    const href = destinationToHref(decision.destination);

    if (committedHrefRef.current === href) {
      return;
    }

    committedHrefRef.current = href;

    if (href === pathname) {
      return;
    }

    if (decision.destination.kind === "home" && !initialExperienceMarkedRef.current) {
      initialExperienceMarkedRef.current = true;
      markInitialExperienceSeen(userId, new Date().toISOString());
    }

    startTransition(() => {
      router.replace(href);
    });
  }, [decision, pathname, router, userId]);

  const stage: GateStage = loadFailed
    ? "error"
    : !gateState
      ? "checking-session"
      : !decision
        ? "preparing-experience"
        : "redirecting";
  const stageCopy = getStageCopy(stage);

  if (stage !== "error") {
    return <RouteLoading label={stageCopy.detail} variant="route" />;
  }

  return (
    <AuthShell>
      <AuthCard className={appTokens.authInteractiveCard} data-testid="initial-experience-gate">
        <AuthIntro eyebrow="" title="" subtitle="" />
        <p className="pt-2 text-center text-sm leading-6 text-[rgb(var(--text-muted)/0.96)]">
          Could not open app.
        </p>
      </AuthCard>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
        <BottomActionSplit
          secondary={(
            <BottomDockButton
              type="button"
              intent="info"
              onClick={() => {
                committedHrefRef.current = null;
                initialExperienceMarkedRef.current = false;
                setDecision(null);
                setGateState(null);
                setRetrySeed((value) => value + 1);
              }}
            >
              Retry
            </BottomDockButton>
          )}
          primary={<BottomDockLink href="/today" intent="positive">Start Offline</BottomDockLink>}
        />
      </div>
    </AuthShell>
  );
}
