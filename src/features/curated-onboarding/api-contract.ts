import type { CuratedOnboardingDraft } from "./types.ts";

export interface CuratedWorkoutGenerationRequest {
  userId: string;
  onboarding: CuratedOnboardingDraft["data"];
}

export interface CuratedWorkoutGenerationResponse {
  status: "not-implemented" | "queued" | "ready" | "failed";
  planId?: string;
}

export interface CuratedWorkoutEngineClient {
  generate(request: CuratedWorkoutGenerationRequest): Promise<CuratedWorkoutGenerationResponse>;
}

export const curatedWorkoutEngineClient: CuratedWorkoutEngineClient = {
  async generate(_request) {
    return { status: "not-implemented" };
  },
};
