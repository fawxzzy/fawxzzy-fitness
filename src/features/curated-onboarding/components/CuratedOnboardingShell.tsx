"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import { AuthCard, AuthMessage, AuthShell, AuthStatusCard } from "@/components/auth/AuthShell";
import { appTokens } from "@/components/ui/app/tokens";
import { GhostButton, PrimaryButton, SecondaryButton } from "@/components/ui/AppButton";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { curatedWorkoutEngineClient } from "../api-contract.ts";
import {
  trackCuratedAbandoned,
  trackCuratedCompleted,
  trackCuratedResumed,
  trackCuratedStarted,
} from "../analytics.ts";
import { CURATED_STEP_ORDER } from "../constants.ts";
import { createCuratedOnboardingState } from "../fixtures.ts";
import { curatedOnboardingReducer } from "../reducer.ts";
import {
  canAdvanceCuratedStep,
  canGoBackCuratedStep,
  getCuratedProgressValue,
  getCuratedStepBlockingMessage,
  getCuratedStepIndex,
  hasCuratedOnboardingProgress,
} from "../selectors.ts";
import {
  loadCuratedOnboardingState,
  markInitialExperienceSeen,
  resetCuratedOnboardingProgress,
  saveCuratedOnboardingState,
} from "../storage.ts";
import { getCuratedStepDefinition } from "../step-registry.ts";
import type {
  CardioPreference,
  CuratedGenerationStatus,
  CuratedOnboardingData,
  ExperienceLevel,
  EquipmentAccess,
  PreferredStyle,
  TrainingGoal,
} from "../types.ts";
import { ConstraintsStep } from "./ConstraintsStep";
import { CuratedIntroStep } from "./CuratedIntroStep";
import { CuratedOnboardingProgress } from "./CuratedOnboardingProgress";
import { EquipmentStep } from "./EquipmentStep";
import { ExperienceStep } from "./ExperienceStep";
import { GenerationHandoffStep } from "./GenerationHandoffStep";
import { GoalsStep } from "./GoalsStep";
import { PreferencesStep } from "./PreferencesStep";
import { ReviewStep } from "./ReviewStep";
import { ScheduleStep } from "./ScheduleStep";

type CuratedOnboardingShellProps = {
  userId: string;
  requestedDraftId?: string | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";
type CompletionSource = "fresh" | "resumed";

function nowIso() {
  return new Date().toISOString();
}

function getGenerationMessage(status: CuratedGenerationStatus) {
  if (status === "not-implemented") {
    return "Generation is not implemented yet. Your intake is saved and you can return later.";
  }

  if (status === "queued") {
    return "The placeholder engine request is queued. Real routine generation is still intentionally out of scope.";
  }

  if (status === "ready") {
    return "The contract returned a ready placeholder response. Plan preview work is still intentionally deferred.";
  }

  if (status === "failed") {
    return "The placeholder engine request failed. Your intake is still saved on this device.";
  }

  return null;
}

export function CuratedOnboardingShell({ userId, requestedDraftId }: CuratedOnboardingShellProps) {
  const [state, dispatch] = useReducer(curatedOnboardingReducer, undefined, () => createCuratedOnboardingState());
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [completionSource, setCompletionSource] = useState<CompletionSource>("fresh");
  const [didResumeDraft, setDidResumeDraft] = useState(false);
  const generationRequestedRef = useRef(false);
  const journeyTrackedRef = useRef(false);
  const completionTrackedRef = useRef(false);
  const abandonmentTrackedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef(state);
  const latestCompletionSourceRef = useRef<CompletionSource>(completionSource);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  useEffect(() => {
    latestCompletionSourceRef.current = completionSource;
  }, [completionSource]);

  useEffect(() => {
    const savedState = loadCuratedOnboardingState(userId);

    if (savedState) {
      dispatch({ type: "hydrate", state: savedState });
      const shouldResume = savedState.lifecycle.intakeStatus === "draft";

      setDidResumeDraft(shouldResume);
      setCompletionSource(shouldResume ? "resumed" : "fresh");
    } else {
      setDidResumeDraft(false);
      setCompletionSource("fresh");
    }

    setHasHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!hasHydrated || journeyTrackedRef.current || state.lifecycle.intakeStatus !== "draft") {
      return;
    }

    const tracked =
      completionSource === "resumed"
        ? trackCuratedResumed(
            {
              draftId: state.draft.draftId,
              stepId: state.draft.stepId,
            },
            userId,
          )
        : trackCuratedStarted(
            {
              draftId: state.draft.draftId,
              stepId: state.draft.stepId,
            },
            userId,
          );

    if (tracked) {
      journeyTrackedRef.current = true;
    }
  }, [completionSource, hasHydrated, state.draft.draftId, state.draft.stepId, state.lifecycle.intakeStatus, userId]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSaveState("saving");
    saveTimerRef.current = setTimeout(() => {
      const saved = saveCuratedOnboardingState(userId, state);
      setSaveState(saved ? "saved" : "error");
    }, 280);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [hasHydrated, state, userId]);

  useEffect(() => {
    if (!hasHydrated || state.lifecycle.intakeStatus !== "completed" || completionTrackedRef.current) {
      return;
    }

    completionTrackedRef.current = true;
    markInitialExperienceSeen(userId, state.lifecycle.completedAt ?? nowIso());
    trackCuratedCompleted(
      {
        draftId: state.draft.draftId,
        stepId: "review",
        completionSource,
      },
      userId,
    );
  }, [completionSource, hasHydrated, state.draft.draftId, state.lifecycle.completedAt, state.lifecycle.intakeStatus, userId]);

  useEffect(() => {
    if (
      !hasHydrated
      || state.draft.stepId !== "generation-handoff"
      || state.lifecycle.intakeStatus !== "completed"
      || state.lifecycle.generationStatus !== "idle"
      || generationRequestedRef.current
    ) {
      return;
    }

    generationRequestedRef.current = true;
    dispatch({ type: "generation-requested" });

    let cancelled = false;

    void curatedWorkoutEngineClient
      .generate({
        userId,
        onboarding: state.draft.data,
      })
      .then((response) => {
        if (cancelled) {
          return;
        }

        dispatch({
          type: "generation-resolved",
          status: response.status,
          planId: response.planId ?? null,
          message: getGenerationMessage(response.status),
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        dispatch({
          type: "generation-resolved",
          status: "failed",
          message: getGenerationMessage("failed"),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    hasHydrated,
    state.draft.data,
    state.draft.stepId,
    state.lifecycle.generationStatus,
    state.lifecycle.intakeStatus,
    userId,
  ]);

  useEffect(() => {
    if (!hasHydrated || typeof window === "undefined") {
      return;
    }

    const handleExit = () => {
      const latestState = latestStateRef.current;

      if (
        abandonmentTrackedRef.current
        || latestState.lifecycle.intakeStatus !== "draft"
        || !hasCuratedOnboardingProgress(latestState.draft)
      ) {
        return;
      }

      const tracked = trackCuratedAbandoned(
        {
          draftId: latestState.draft.draftId,
          stepId: latestState.draft.stepId,
          completionSource: latestCompletionSourceRef.current,
        },
        userId,
      );

      if (tracked) {
        abandonmentTrackedRef.current = true;
      }
    };

    window.addEventListener("pagehide", handleExit);

    return () => {
      handleExit();
      window.removeEventListener("pagehide", handleExit);
    };
  }, [hasHydrated, userId]);

  const stepDefinition = getCuratedStepDefinition(state.draft.stepId);
  const progressValue = getCuratedProgressValue(state.draft.stepId);
  const currentStep = getCuratedStepIndex(state.draft.stepId) + 1;
  const canAdvance = canAdvanceCuratedStep(state.draft.stepId, state.draft.data);
  const blockingMessage = getCuratedStepBlockingMessage(state.draft.stepId);
  const showBack = canGoBackCuratedStep(state.draft.stepId);
  const missingRequestedDraft = Boolean(requestedDraftId && hasHydrated && !didResumeDraft);
  const saveLabel =
    saveState === "error"
      ? "We could not save this intake locally."
      : saveState === "saving"
        ? "Saving this intake on this device..."
        : saveState === "saved" && state.lifecycle.intakeStatus === "completed"
          ? "Intake saved on this device."
          : saveState === "saved"
            ? "Draft saved on this device."
            : didResumeDraft
              ? "Draft resumed on this device."
              : "Your setup auto-saves on this device.";

  function patchData(patch: Partial<CuratedOnboardingData>) {
    dispatch({
      type: "patch-data",
      patch,
      at: nowIso(),
    });
  }

  function handleReset() {
    resetCuratedOnboardingProgress(userId);
    generationRequestedRef.current = false;
    journeyTrackedRef.current = false;
    completionTrackedRef.current = false;
    abandonmentTrackedRef.current = false;
    setCompletionSource("fresh");
    setDidResumeDraft(false);
    setSaveState("idle");
    dispatch({
      type: "reset",
      nextState: createCuratedOnboardingState(),
    });
  }

  function handlePrimaryAction() {
    const at = nowIso();

    if (state.draft.stepId === "review") {
      dispatch({ type: "complete-intake", at });
      return;
    }

    dispatch({ type: "go-next", at });
  }

  function renderStepBody() {
    if (state.draft.stepId === "intro") {
      return <CuratedIntroStep />;
    }

    if (state.draft.stepId === "goals") {
      return (
        <GoalsStep
          data={state.draft.data}
          onChange={(value: TrainingGoal) => patchData({ trainingGoal: value })}
        />
      );
    }

    if (state.draft.stepId === "experience") {
      return (
        <ExperienceStep
          data={state.draft.data}
          onChange={(value: ExperienceLevel) => patchData({ experience: value })}
        />
      );
    }

    if (state.draft.stepId === "equipment") {
      return (
        <EquipmentStep
          data={state.draft.data}
          onToggle={(value: EquipmentAccess) => {
            const equipment = state.draft.data.equipment.includes(value)
              ? state.draft.data.equipment.filter((entry) => entry !== value)
              : [...state.draft.data.equipment, value];

            patchData({ equipment });
          }}
        />
      );
    }

    if (state.draft.stepId === "schedule") {
      return (
        <ScheduleStep
          data={state.draft.data}
          onDaysChange={(value) => patchData({ daysPerWeek: value })}
          onSessionLengthChange={(value) => patchData({ sessionLengthMinutes: value })}
        />
      );
    }

    if (state.draft.stepId === "preferences") {
      return (
        <PreferencesStep
          data={state.draft.data}
          onStyleChange={(value: PreferredStyle) => patchData({ preferredStyle: value })}
          onCardioChange={(value: CardioPreference) => patchData({ cardioPreference: value })}
          onLikesChange={(value) => patchData({ exerciseLikes: value })}
        />
      );
    }

    if (state.draft.stepId === "constraints") {
      return (
        <ConstraintsStep
          data={state.draft.data}
          onLimitationsChange={(value) => patchData({ limitations: value })}
          onDislikesChange={(value) => patchData({ exerciseDislikes: value })}
          onTargetAreasChange={(value) => patchData({ targetAreas: value })}
        />
      );
    }

    if (state.draft.stepId === "review") {
      return <ReviewStep data={state.draft.data} />;
    }

    return <GenerationHandoffStep data={state.draft.data} generationStatus={state.lifecycle.generationStatus} />;
  }

  if (!hasHydrated) {
    return (
      <AuthShell className="justify-center">
        <AuthStatusCard
          title="Restoring your training setup"
          description="Checking for a saved intake before the curated flow decides whether to resume or start fresh."
          testId="curated-onboarding-loading"
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthCard className={appTokens.curatedCard}>
        <div className={appTokens.curatedHeaderStack}>
          <CuratedOnboardingProgress
            currentStep={currentStep}
            totalSteps={CURATED_STEP_ORDER.length}
            progress={progressValue}
          />

          <div className={appTokens.curatedHeaderTitleStack}>
            <p className={appTokens.curatedHeaderEyebrow}>{stepDefinition.eyebrow}</p>
            <h1 className={appTokens.curatedHeaderTitle}>{stepDefinition.title}</h1>
            <p className={appTokens.curatedHeaderBody}>{stepDefinition.body}</p>
          </div>

          <div className={appTokens.curatedAutosavePanel}>
            <div className={appTokens.curatedInlineStack}>
              <p className={appTokens.curatedStatusText}>{saveLabel}</p>
              <p className={appTokens.curatedMetaText}>Leave anytime. Resume later will pick up on this device if the intake is still in draft.</p>
            </div>
            <div className={appTokens.curatedUtilityRow}>
              <Link href="/today" className={appTokens.curatedInlineLink}>
                Resume later
              </Link>
              <GhostButton type="button" size="sm" onClick={handleReset} className={appTokens.curatedUtilityButton}>
                Start over
              </GhostButton>
            </div>
          </div>
        </div>

        {missingRequestedDraft ? (
          <AuthMessage>
            That saved draft was not found on this device, so this setup is starting fresh instead of resuming.
          </AuthMessage>
        ) : null}

        <section className={appTokens.curatedStepPanel}>
          {renderStepBody()}
        </section>

        {blockingMessage && !canAdvance && state.draft.stepId !== "generation-handoff" ? (
          <AuthMessage>{blockingMessage}</AuthMessage>
        ) : null}

        {state.message ? <AuthMessage tone={state.lifecycle.generationStatus === "failed" ? "error" : "default"}>{state.message}</AuthMessage> : null}

        <div className={showBack ? appTokens.curatedActionRow : appTokens.curatedActionRowSolo}>
          {showBack ? (
            <SecondaryButton
              type="button"
              onClick={() => dispatch({ type: "go-back", at: nowIso() })}
              className={appTokens.curatedActionButton}
            >
              Back
            </SecondaryButton>
          ) : null}

          {state.draft.stepId === "generation-handoff" ? (
            <Link
              href="/today"
              className={getAppButtonClassName({ variant: "primary", fullWidth: true, className: appTokens.curatedActionButton })}
            >
              Open Today
            </Link>
          ) : (
            <PrimaryButton
              type="button"
              disabled={!canAdvance}
              onClick={handlePrimaryAction}
              className={appTokens.curatedActionButton}
            >
              {stepDefinition.nextLabel}
            </PrimaryButton>
          )}
        </div>
      </AuthCard>
    </AuthShell>
  );
}
