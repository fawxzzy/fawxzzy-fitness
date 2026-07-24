import type { CuratedOnboardingDraft } from "./types.ts";
import { generateCuratedWorkoutPlan, type CuratedWorkoutPlan } from "./engine.ts";

export interface CuratedWorkoutGenerationRequest {
  userId: string;
  onboarding: CuratedOnboardingDraft["data"];
}

export interface CuratedWorkoutGenerationResponse {
  status: "ready" | "failed";
  planId?: string;
  plan?: CuratedWorkoutPlan;
}

export interface CuratedWorkoutEngineClient {
  generate(request: CuratedWorkoutGenerationRequest): Promise<CuratedWorkoutGenerationResponse>;
}

export const curatedWorkoutEngineClient: CuratedWorkoutEngineClient = {
  async generate(request) {
    const plan = generateCuratedWorkoutPlan(request.onboarding);
    return { status: "ready", planId: plan.planId, plan };
  },
};
