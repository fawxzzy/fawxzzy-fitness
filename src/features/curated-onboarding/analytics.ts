import { trackClientEvent } from "@/lib/client-analytics";
import type { CuratedStepId } from "./types.ts";

export const CURATED_ONBOARDING_ANALYTICS = {
  entryResolved: "entry_resolved",
  curatedStarted: "curated_started",
  curatedResumed: "curated_resumed",
  curatedAbandoned: "curated_abandoned",
  curatedCompleted: "curated_completed",
} as const;

type CompletionSource = "fresh" | "resumed";

type EntryResolvedPayload = {
  destination: "home" | "install" | "curated-intro" | "curated-resume";
  isFirstLogin: boolean;
  curatedEnabled: boolean;
  hasExistingProgram: boolean;
  hasSavedDraft: boolean;
};

type CuratedLifecyclePayload = {
  draftId: string;
  stepId: CuratedStepId;
  completionSource: CompletionSource;
};

export function trackEntryResolved(payload: EntryResolvedPayload, dedupeScope: string) {
  return trackClientEvent(CURATED_ONBOARDING_ANALYTICS.entryResolved, payload, {
    dedupeKey: `entry:${dedupeScope}:${payload.destination}:${payload.isFirstLogin}:${payload.curatedEnabled}:${payload.hasExistingProgram}:${payload.hasSavedDraft}`,
  });
}

export function trackCuratedStarted(payload: Omit<CuratedLifecyclePayload, "completionSource">, dedupeScope: string) {
  return trackClientEvent(
    CURATED_ONBOARDING_ANALYTICS.curatedStarted,
    {
      ...payload,
      completionSource: "fresh",
    },
    {
      dedupeKey: `curated-started:${dedupeScope}:${payload.draftId}:${payload.stepId}`,
    },
  );
}

export function trackCuratedResumed(payload: Omit<CuratedLifecyclePayload, "completionSource">, dedupeScope: string) {
  return trackClientEvent(
    CURATED_ONBOARDING_ANALYTICS.curatedResumed,
    {
      ...payload,
      completionSource: "resumed",
    },
    {
      dedupeKey: `curated-resumed:${dedupeScope}:${payload.draftId}:${payload.stepId}`,
    },
  );
}

export function trackCuratedAbandoned(payload: CuratedLifecyclePayload, dedupeScope: string) {
  return trackClientEvent(CURATED_ONBOARDING_ANALYTICS.curatedAbandoned, payload, {
    dedupeKey: `curated-abandoned:${dedupeScope}:${payload.draftId}:${payload.stepId}:${payload.completionSource}`,
  });
}

export function trackCuratedCompleted(payload: CuratedLifecyclePayload, dedupeScope: string) {
  return trackClientEvent(CURATED_ONBOARDING_ANALYTICS.curatedCompleted, payload, {
    dedupeKey: `curated-completed:${dedupeScope}:${payload.draftId}:${payload.completionSource}`,
  });
}
