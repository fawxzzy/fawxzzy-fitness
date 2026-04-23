"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthCard, AuthIntro, AuthMessage, AuthShell } from "@/components/auth/AuthShell";
import { GhostButton } from "@/components/ui/AppButton";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
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

  return (
    <AuthShell>
      <div className="space-y-5" data-testid="initial-experience-gate">
        <AuthIntro eyebrow={stageCopy.eyebrow} title={stageCopy.title} subtitle={stageCopy.subtitle} />

        <AuthCard className="space-y-5 rounded-[1.85rem] border-emerald-400/10 shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-accent">
                <span
                  className={`h-4 w-4 rounded-full border-[1.5px] border-current border-r-transparent ${
                    stage === "error" ? "animate-none" : "animate-spin motion-reduce:animate-none"
                  }`}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">{stageCopy.detail}</p>
                <p className="text-sm leading-6 text-slate-300">
                  {stage === "redirecting"
                    ? "Destination resolved once for this mount. The next screen is already committed."
                    : "This handoff stays client-safe and avoids replaying the same redirect decision."}
                </p>
              </div>
            </div>

            <div className="grid gap-2 rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-4 text-sm text-slate-300">
              <p className={stage === "checking-session" ? "text-white" : undefined}>Checking session context</p>
              <p className={stage === "preparing-experience" ? "text-white" : undefined}>Preparing saved-state context</p>
              <p className={stage === "redirecting" ? "text-white" : undefined}>Redirecting into the resolved destination</p>
            </div>
          </div>

          {stage === "error" ? (
            <>
              <AuthMessage tone="error">
                The post-auth destination check failed. Open the app directly or retry the handoff from here.
              </AuthMessage>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/today"
                  className={getAppButtonClassName({ variant: "primary", fullWidth: true, className: "min-h-[3.15rem] flex-1" })}
                >
                  Open Today
                </Link>
                <GhostButton
                  type="button"
                  onClick={() => {
                    committedHrefRef.current = null;
                    initialExperienceMarkedRef.current = false;
                    setDecision(null);
                    setGateState(null);
                    setRetrySeed((value) => value + 1);
                  }}
                  className="min-h-[3.15rem] flex-1"
                >
                  Retry handoff
                </GhostButton>
              </div>
            </>
          ) : null}
        </AuthCard>
      </div>
    </AuthShell>
  );
}
