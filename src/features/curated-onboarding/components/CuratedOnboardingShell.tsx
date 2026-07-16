"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState, useTransition } from "react";
import { createCuratedRoutineDraftAction, generateCuratedWorkoutPlanAction } from "@/app/curated-onboarding/actions";
import {
  BOTTOM_ACTION_SHELL_CLASSNAME,
  BOTTOM_ACTION_SURFACE_OUTER_CLASSNAME,
  BottomActionSingle,
  BottomActionSplit,
} from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { ContentRail } from "@/components/layout/ContentRail";
import { MobileScreenScaffold } from "@/components/layout/MobileScreenScaffold";
import { ROUTINE_CARD_DELETE_TEXT_CLASS_NAME } from "@/components/routines/routineCardChrome";
import { RouteLoading } from "@/components/RouteLoading";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { SignatureInlineList } from "@/components/ui/app/SignatureSeparator";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
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
  canAccessCuratedStep,
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
import type { CuratedWorkoutPlan } from "../engine.ts";
import type {
  CardioPreference,
  CuratedOnboardingData,
  ExperienceLevel,
  EquipmentAccess,
  PreferredStyle,
  TrainingGoal,
  CuratedStepId,
} from "../types.ts";
import { ConstraintsStep } from "./ConstraintsStep";
import { CuratedIntroStep } from "./CuratedIntroStep";
import { CuratedInfoCard } from "./CuratedOnboardingPrimitives";
import { CuratedOnboardingProgress } from "./CuratedOnboardingProgress";
import { EquipmentStep } from "./EquipmentStep";
import { ExperienceStep } from "./ExperienceStep";
import { GoalsStep } from "./GoalsStep";
import { PreferencesStep } from "./PreferencesStep";
import { ReviewStep } from "./ReviewStep";
import { ScheduleStep } from "./ScheduleStep";
import { GenerationHandoffStep } from "./GenerationHandoffStep";
import { writeRoutineDraftSession } from "@/lib/routine-draft-session";

type CuratedOnboardingShellProps = {
  userId: string;
  requestedDraftId?: string | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";
type CompletionSource = "fresh" | "resumed";

function nowIso() {
  return new Date().toISOString();
}

export function CuratedOnboardingShell({ userId, requestedDraftId }: CuratedOnboardingShellProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(curatedOnboardingReducer, undefined, () => createCuratedOnboardingState());
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [completionSource, setCompletionSource] = useState<CompletionSource>("fresh");
  const [didResumeDraft, setDidResumeDraft] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<CuratedWorkoutPlan | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isCreatingDraft, startCreatingDraft] = useTransition();
  const journeyTrackedRef = useRef(false);
  const completionTrackedRef = useRef(false);
  const abandonmentTrackedRef = useRef(false);
  const generationRequestedRef = useRef(false);
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
    if (!hasHydrated || state.draft.stepId !== "generation-handoff" || state.lifecycle.intakeStatus !== "completed" || generationRequestedRef.current) {
      return;
    }

    generationRequestedRef.current = true;
    setGenerationError(null);
    void generateCuratedWorkoutPlanAction(state.draft.data)
      .then((result) => {
        if (!result.ok) {
          throw new Error(result.error);
        }
        setGeneratedPlan(result.plan);
        dispatch({ type: "generation-resolved", status: "ready", planId: result.plan.planId });
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "The curated plan could not be generated.";
        setGenerationError(message);
        dispatch({ type: "generation-resolved", status: "failed", message });
      });
  }, [hasHydrated, state.draft.data, state.draft.stepId, state.lifecycle.intakeStatus, userId]);

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
  const isIntroStep = state.draft.stepId === "intro";
  const missingRequestedDraft = Boolean(requestedDraftId && hasHydrated && !didResumeDraft);
  const saveLabel =
    saveState === "error"
      ? "Save failed"
      : saveState === "saving"
        ? "Saving"
        : saveState === "saved" && state.lifecycle.intakeStatus === "completed"
          ? "Setup saved"
          : saveState === "saved"
            ? "Draft saved"
            : didResumeDraft
              ? "Draft restored"
              : "Autosave on";

  function patchData(patch: Partial<CuratedOnboardingData>) {
    dispatch({
      type: "patch-data",
      patch,
      at: nowIso(),
    });
  }

  function handleReset() {
    resetCuratedOnboardingProgress(userId);
    journeyTrackedRef.current = false;
    completionTrackedRef.current = false;
    abandonmentTrackedRef.current = false;
    generationRequestedRef.current = false;
    setGeneratedPlan(null);
    setGenerationError(null);
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

  function handleCreateDraft() {
    startCreatingDraft(async () => {
      setGenerationError(null);
      try {
        const result = await createCuratedRoutineDraftAction(state.draft.data);
        if (!result.ok) {
          setGenerationError(result.error);
          return;
        }
        writeRoutineDraftSession(result.routineId, result.routineName);
        router.push("/routines/new");
      } catch (error) {
        setGenerationError(
          error instanceof Error ? error.message : "Could not create the editable routine draft.",
        );
      }
    });
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

    if (state.draft.stepId === "generation-handoff") {
      return (
        <GenerationHandoffStep
          generationStatus={state.lifecycle.generationStatus}
          plan={generatedPlan}
          error={generationError}
        />
      );
    }

    return null;
  }

  if (!hasHydrated) {
    return <RouteLoading label="Restoring your training setup" variant="route" />;
  }

  const isGenerationStep = state.draft.stepId === "generation-handoff";
  const generationIsLoading = isGenerationStep
    && !generationError
    && (!generatedPlan || isCreatingDraft);
  const bottomActions = isGenerationStep ? (
    <BottomActionSingle>
      <BottomDockButton
        type="button"
        intent="positive"
        disabled={!generatedPlan || state.lifecycle.generationStatus !== "ready"}
        loading={generationIsLoading}
        loadingLabel={isCreatingDraft ? "Creating editable draft" : "Building routine"}
        onClick={handleCreateDraft}
      >
        {generationError ? "Plan unavailable" : "Create editable draft"}
      </BottomDockButton>
    </BottomActionSingle>
  ) : isIntroStep ? (
    <BottomActionSplit
      className="grid-cols-[minmax(88px,0.68fr)_minmax(0,2fr)]"
      secondary={(
        <BottomDockLink
          href="/routines/new"
          intent="toggleInactive"
          className="px-2 text-[0.7rem]"
        >
          Build manually
        </BottomDockLink>
      )}
      primary={(
        <BottomDockButton
          type="button"
          intent="positive"
          disabled={!canAdvance}
          onClick={handlePrimaryAction}
        >
          {stepDefinition.nextLabel}
        </BottomDockButton>
      )}
    />
  ) : showBack ? (
    <BottomActionSplit
      secondary={(
        <BottomDockButton
          type="button"
          intent="toggleInactive"
          onClick={() => dispatch({ type: "go-back", at: nowIso() })}
        >
          Back
        </BottomDockButton>
      )}
      primary={(
        <BottomDockButton
          type="button"
          intent="positive"
          disabled={!canAdvance}
          onClick={handlePrimaryAction}
        >
          {stepDefinition.nextLabel}
        </BottomDockButton>
      )}
    />
  ) : (
    <BottomActionSingle>
      <BottomDockButton
        type="button"
        intent="positive"
        disabled={!canAdvance}
        onClick={handlePrimaryAction}
      >
        {stepDefinition.nextLabel}
      </BottomDockButton>
    </BottomActionSingle>
  );

  return (
    <AppShell topNavMode="none" className="h-[100dvh]" ambientPreset="editDay">
      <MobileScreenScaffold
        floatingHeader={(
          <ContentRail className="py-1 pt-3">
            <ScreenScaffold recipe="editDay" className="w-full">
              <SharedScreenHeader
                recipe="editDay"
                title="Curated Routine"
                subtitle={(
                  <SignatureInlineList
                    separator="pipe"
                    items={[stepDefinition.eyebrow, `${currentStep} of ${CURATED_STEP_ORDER.length}`]}
                    className="justify-center"
                  />
                )}
                align="center"
                withPanel={false}
                action={<TopRightBackButton href="/today" historyBehavior="fallback-only" ariaLabel="Resume setup later" />}
              />
            </ScreenScaffold>
          </ContentRail>
        )}
        bottomDock={(
          <div className={`${BOTTOM_ACTION_SURFACE_OUTER_CLASSNAME} pointer-events-auto`}>
            <div className={BOTTOM_ACTION_SHELL_CLASSNAME}>{bottomActions}</div>
          </div>
        )}
      >
        <ContentRail className="pb-6 pt-2">
          <ScreenScaffold recipe="editDay" className="mx-auto w-full max-w-[720px] space-y-3">
            <CuratedOnboardingProgress
              currentStep={currentStep}
              totalSteps={CURATED_STEP_ORDER.length}
              progress={progressValue}
              steps={CURATED_STEP_ORDER.map((stepId) => ({
                id: stepId,
                label: getCuratedStepDefinition(stepId).eyebrow,
                available: stepId === "generation-handoff"
                  ? isGenerationStep
                  : canAccessCuratedStep(stepId, state.draft.data),
              }))}
              onStepSelect={(stepId: CuratedStepId) => dispatch({ type: "go-to-step", stepId, at: nowIso() })}
            />

            <header className="space-y-2 px-1 text-center">
              <h1 className="text-[1.32rem] font-semibold leading-tight tracking-[-0.025em] text-[rgb(var(--text-primary))] sm:text-[1.5rem]">
                {stepDefinition.title}
              </h1>
              <div className="flex items-center justify-between gap-3 text-[9px] font-semibold uppercase tracking-[0.13em]">
                <span
                  data-save-state={saveState}
                  className={saveState === "error" ? "text-[rgb(var(--danger-rgb))]" : "text-[rgb(var(--accent)/0.9)]"}
                >
                  {saveLabel}
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className={ROUTINE_CARD_DELETE_TEXT_CLASS_NAME}
                >
                  Start over
                </button>
              </div>
            </header>

            {missingRequestedDraft ? (
              <CuratedInfoCard compact tone="warning">
                <p className="text-xs text-[rgb(var(--text-secondary)/0.94)]">Saved draft not found. A new setup was opened.</p>
              </CuratedInfoCard>
            ) : null}

            <section className="space-y-3" aria-label={stepDefinition.title}>
              {renderStepBody()}
            </section>

            {blockingMessage && !canAdvance ? (
              <p className="px-2 text-center text-[11px] leading-5 text-[rgb(var(--text-muted)/0.9)]">{blockingMessage}</p>
            ) : null}

            {state.message ? (
              <CuratedInfoCard compact tone={state.lifecycle.generationStatus === "failed" ? "danger" : "default"}>
                <p className="text-xs text-[rgb(var(--text-secondary)/0.94)]">{state.message}</p>
              </CuratedInfoCard>
            ) : null}
          </ScreenScaffold>
        </ContentRail>
      </MobileScreenScaffold>
    </AppShell>
  );
}
