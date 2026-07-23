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
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { ContentRail } from "@/components/layout/ContentRail";
import { MobileScreenScaffold } from "@/components/layout/MobileScreenScaffold";
import { ROUTINE_CARD_DELETE_TEXT_CLASS_NAME } from "@/components/routines/routineCardChrome";
import { RouteLoading } from "@/components/RouteLoading";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import {
  trackCuratedAbandoned,
  trackCuratedCompleted,
  trackCuratedResumed,
  trackCuratedStarted,
} from "../analytics.ts";
import { CURATED_FORM_STEP_ORDER } from "../constants.ts";
import { createCuratedOnboardingState } from "../fixtures.ts";
import {
  deriveCuratedEngineData,
  getCuratedIntakeSection,
  getMissingRequiredQuestionIds,
  removeHiddenCuratedResponses,
} from "../questionnaire.ts";
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
  CuratedIntakeResponse,
  CuratedIntakeResponses,
  CuratedOnboardingData,
  CuratedOnboardingState,
  CuratedStepId,
} from "../types.ts";
import { CuratedInfoCard } from "./CuratedOnboardingPrimitives";
import { CuratedOnboardingProgress } from "./CuratedOnboardingProgress";
import { QuestionnaireStep } from "./QuestionnaireStep";
import { ReviewStep } from "./ReviewStep";
import { GenerationHandoffStep } from "./GenerationHandoffStep";
import { writeRoutineDraftSession } from "@/lib/routine-draft-session";

type CuratedOnboardingShellProps = {
  userId: string;
  userEmail: string;
  userName: string;
  requestedDraftId?: string | null;
  previewOnly?: boolean;
};

type SaveState = "idle" | "saving" | "saved" | "error";
type CompletionSource = "fresh" | "resumed";

function nowIso() {
  return new Date().toISOString();
}

function withCuratedIdentity(state: CuratedOnboardingState, userEmail: string, userName: string) {
  const intakeResponses: CuratedIntakeResponses = removeHiddenCuratedResponses({
    ...state.draft.data.intakeResponses,
    ...(userEmail.trim() ? { email: userEmail.trim() } : {}),
    ...(!state.draft.data.intakeResponses.name && userName.trim() ? { name: userName.trim() } : {}),
  });
  const derived = deriveCuratedEngineData(intakeResponses, state.draft.data);

  return {
    ...state,
    draft: {
      ...state.draft,
      data: {
        ...state.draft.data,
        ...derived,
        intakeResponses,
      },
    },
  };
}

export function CuratedOnboardingShell({
  userId,
  userEmail,
  userName,
  requestedDraftId,
  previewOnly = false,
}: CuratedOnboardingShellProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(curatedOnboardingReducer, undefined, () => createCuratedOnboardingState());
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [completionSource, setCompletionSource] = useState<CompletionSource>("fresh");
  const [didResumeDraft, setDidResumeDraft] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<CuratedWorkoutPlan | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [validationStepId, setValidationStepId] = useState<CuratedStepId | null>(null);
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
      dispatch({ type: "hydrate", state: withCuratedIdentity(savedState, userEmail, userName) });
      const shouldResume = savedState.lifecycle.intakeStatus === "draft";

      setDidResumeDraft(shouldResume);
      setCompletionSource(shouldResume ? "resumed" : "fresh");
    } else {
      dispatch({
        type: "hydrate",
        state: withCuratedIdentity(createCuratedOnboardingState(), userEmail, userName),
      });
      setDidResumeDraft(false);
      setCompletionSource("fresh");
    }

    setHasHydrated(true);
  }, [userEmail, userId, userName]);

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
    if (previewOnly || !hasHydrated || state.draft.stepId !== "generation-handoff" || state.lifecycle.intakeStatus !== "completed" || generationRequestedRef.current) {
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
  }, [hasHydrated, previewOnly, state.draft.data, state.draft.stepId, state.lifecycle.intakeStatus, userId]);

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
  const currentStep = state.draft.stepId === "generation-handoff"
    ? CURATED_FORM_STEP_ORDER.length
    : getCuratedStepIndex(state.draft.stepId) + 1;
  const canAdvance = canAdvanceCuratedStep(state.draft.stepId, state.draft.data);
  const blockingMessage = getCuratedStepBlockingMessage(state.draft.stepId);
  const showBack = canGoBackCuratedStep(state.draft.stepId);
  const activeSection = getCuratedIntakeSection(state.draft.stepId);
  const invalidQuestionIds = validationStepId === state.draft.stepId
    ? getMissingRequiredQuestionIds(state.draft.stepId, state.draft.data.intakeResponses)
    : [];
  const missingRequestedDraft = Boolean(requestedDraftId && hasHydrated && !didResumeDraft);
  function patchData(patch: Partial<CuratedOnboardingData>) {
    dispatch({
      type: "patch-data",
      patch,
      at: nowIso(),
    });
  }

  function patchResponse(questionId: string, value: CuratedIntakeResponse) {
    const intakeResponses = removeHiddenCuratedResponses({
      ...state.draft.data.intakeResponses,
      [questionId]: value,
    });
    const derived = deriveCuratedEngineData(intakeResponses, state.draft.data);

    patchData({
      ...derived,
      intakeResponses,
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
    setValidationStepId(null);
    dispatch({
      type: "reset",
      nextState: withCuratedIdentity(createCuratedOnboardingState(), userEmail, userName),
    });
  }

  function handlePrimaryAction() {
    const at = nowIso();

    if (state.draft.stepId === "review") {
      if (previewOnly) {
        return;
      }
      dispatch({ type: "complete-intake", at });
      return;
    }

    const missingQuestionIds = getMissingRequiredQuestionIds(
      state.draft.stepId,
      state.draft.data.intakeResponses,
    );
    if (missingQuestionIds.length > 0) {
      setValidationStepId(state.draft.stepId);
      window.requestAnimationFrame(() => {
        document
          .querySelector(`[data-curated-question="${missingQuestionIds[0]}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    setValidationStepId(null);
    dispatch({ type: "go-next", at });
  }

  function handleCreateDraft() {
    if (previewOnly) {
      return;
    }

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
    if (activeSection) {
      return (
        <QuestionnaireStep
          section={activeSection}
          responses={state.draft.data.intakeResponses}
          invalidQuestionIds={invalidQuestionIds}
          onResponseChange={patchResponse}
        />
      );
    }

    if (state.draft.stepId === "review") {
      return (
        <ReviewStep
          data={state.draft.data}
          onEdit={(stepId) => {
            setValidationStepId(null);
            dispatch({ type: "go-to-step", stepId, at: nowIso() });
          }}
        />
      );
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
    && !previewOnly
    && !generationError
    && (!generatedPlan || isCreatingDraft);
  const bottomActions = isGenerationStep ? (
    <BottomActionSingle>
      <BottomDockButton
        type="button"
        intent="positive"
        disabled={previewOnly || !generatedPlan || state.lifecycle.generationStatus !== "ready"}
        loading={generationIsLoading}
        loadingLabel={isCreatingDraft ? "Creating editable draft" : "Building routine"}
        onClick={handleCreateDraft}
      >
        {generationError ? "Plan unavailable" : "Create editable draft"}
      </BottomDockButton>
    </BottomActionSingle>
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
          disabled={state.draft.stepId === "review" && (previewOnly || !canAdvance)}
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
                align="center"
                withPanel={false}
                action={(
                  <div className="flex w-full items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={handleReset}
                      className={ROUTINE_CARD_DELETE_TEXT_CLASS_NAME}
                    >
                      Start over
                    </button>
                    <TopRightBackButton href="/today" historyBehavior="fallback-only" ariaLabel="Resume setup later" />
                  </div>
                )}
                actionClassName="!left-0 !right-0 [&>div]:w-full"
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
            {!isGenerationStep ? (
              <CuratedOnboardingProgress
                currentStep={currentStep}
                totalSteps={CURATED_FORM_STEP_ORDER.length}
                progress={progressValue}
                title={stepDefinition.title}
                steps={CURATED_FORM_STEP_ORDER.map((stepId) => ({
                  id: stepId,
                  label: getCuratedStepDefinition(stepId).eyebrow,
                  available: canAccessCuratedStep(stepId, state.draft.data),
                }))}
                onStepSelect={(stepId: CuratedStepId) => {
                  setValidationStepId(null);
                  dispatch({ type: "go-to-step", stepId, at: nowIso() });
                }}
              />
            ) : null}

            {isGenerationStep ? (
              <h1 className="px-1 text-center text-[1.32rem] font-semibold leading-tight tracking-[-0.025em] text-[rgb(var(--text-primary))] sm:text-[1.5rem]">
                {stepDefinition.title}
              </h1>
            ) : null}

            {saveState === "error" ? (
              <p role="alert" className="px-2 text-center text-[11px] font-medium text-[rgb(var(--danger-rgb))]">
                Changes could not be saved. Try again before leaving this page.
              </p>
            ) : null}

            {missingRequestedDraft ? (
              <CuratedInfoCard compact tone="warning">
                <p className="text-xs text-[rgb(var(--text-secondary)/0.94)]">Saved draft not found. A new setup was opened.</p>
              </CuratedInfoCard>
            ) : null}

            <section className="space-y-3" aria-label={stepDefinition.title}>
              {renderStepBody()}
            </section>

            {blockingMessage && validationStepId === state.draft.stepId && !canAdvance ? (
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
