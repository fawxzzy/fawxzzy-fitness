import { CURATED_STEP_ORDER } from "./constants.ts";
import type {
  CuratedGenerationStatus,
  CuratedOnboardingData,
  CuratedOnboardingState,
  CuratedStepId,
} from "./types.ts";

type ResolvedGenerationStatus = Exclude<CuratedGenerationStatus, "idle">;

export type CuratedOnboardingAction =
  | { type: "hydrate"; state: CuratedOnboardingState }
  | { type: "patch-data"; patch: Partial<CuratedOnboardingData>; at: string }
  | { type: "go-next"; at: string }
  | { type: "go-back"; at: string }
  | { type: "go-to-step"; stepId: CuratedStepId; at: string }
  | { type: "complete-intake"; at: string }
  | { type: "generation-requested" }
  | { type: "generation-resolved"; status: ResolvedGenerationStatus; planId?: string | null; message?: string | null }
  | { type: "reset"; nextState: CuratedOnboardingState };

function stepIndex(stepId: CuratedStepId) {
  return Math.max(CURATED_STEP_ORDER.indexOf(stepId), 0);
}

export function curatedOnboardingReducer(state: CuratedOnboardingState, action: CuratedOnboardingAction): CuratedOnboardingState {
  if (action.type === "hydrate") {
    return action.state;
  }

  if (action.type === "patch-data") {
    return {
      ...state,
      draft: {
        ...state.draft,
        updatedAt: action.at,
        data: {
          ...state.draft.data,
          ...action.patch,
        },
      },
    };
  }

  if (action.type === "go-next") {
    const nextIndex = Math.min(stepIndex(state.draft.stepId) + 1, CURATED_STEP_ORDER.length - 1);

    return {
      ...state,
      draft: {
        ...state.draft,
        stepId: CURATED_STEP_ORDER[nextIndex],
        updatedAt: action.at,
      },
    };
  }

  if (action.type === "go-back") {
    const nextIndex = Math.max(stepIndex(state.draft.stepId) - 1, 0);

    return {
      ...state,
      draft: {
        ...state.draft,
        stepId: CURATED_STEP_ORDER[nextIndex],
        updatedAt: action.at,
      },
    };
  }

  if (action.type === "go-to-step") {
    return {
      ...state,
      draft: {
        ...state.draft,
        stepId: action.stepId,
        updatedAt: action.at,
      },
    };
  }

  if (action.type === "complete-intake") {
    return {
      ...state,
      draft: {
        ...state.draft,
        stepId: "generation-handoff",
        updatedAt: action.at,
      },
      lifecycle: {
        ...state.lifecycle,
        intakeStatus: "completed",
        generationStatus: "idle",
        planId: null,
        completedAt: action.at,
      },
      message: null,
    };
  }

  if (action.type === "generation-requested") {
    return {
      ...state,
      lifecycle: {
        ...state.lifecycle,
        generationStatus: "queued",
      },
      message: null,
    };
  }

  if (action.type === "generation-resolved") {
    return {
      ...state,
      lifecycle: {
        ...state.lifecycle,
        generationStatus: action.status,
        planId: action.planId ?? null,
      },
      message: action.message ?? null,
    };
  }

  return action.nextState;
}
