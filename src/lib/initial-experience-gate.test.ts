import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveInitialExperienceStage,
  destinationToHref,
  getNextInitialExperienceRecoveryStep,
  hasCommittedToTargetRoute,
  INITIAL_EXPERIENCE_RECOVERY_DELAY_MS,
  resolveGateDecision,
} from "./initial-experience-gate.ts";

test("valid entry decisions continue authenticated members to today", () => {
  const decision = resolveGateDecision({
    hasCompletedCuratedIntake: true,
    hasSeenInitialExperience: true,
    savedCuratedDraftId: null,
    intakeStatus: "completed",
    generationStatus: "not-implemented",
  }, {
    curatedEngineEnabled: true,
    hasExistingProgram: true,
  });

  assert.equal(decision.destination.kind, "home");
  assert.equal(destinationToHref(decision.destination), "/today");
});

test("redirect timeout escalates to recovery after automatic attempts are exhausted", () => {
  assert.equal(getNextInitialExperienceRecoveryStep({
    attemptedCacheBustedReload: true,
    attemptedLocationReplace: true,
    attemptedRouterRetry: true,
    canUseCacheBustedReload: false,
    currentBuildId: "build-123",
    elapsedMs: INITIAL_EXPERIENCE_RECOVERY_DELAY_MS + 100,
    remoteBuildId: null,
    routeCommitted: false,
    updatePhase: "idle",
  }), "show-recovery");
});

test("retry reset returns the gate to its loading stages instead of staying in recovery", () => {
  assert.equal(deriveInitialExperienceStage({
    decision: {
      destination: { kind: "home" },
      hasSavedDraft: false,
      isFirstLogin: false,
    },
    gateState: {
      hasCompletedCuratedIntake: true,
      hasSeenInitialExperience: true,
      savedCuratedDraftId: null,
      intakeStatus: "completed",
      generationStatus: "not-implemented",
    },
    hasRecoveryState: true,
    loadFailed: false,
  }), "recovery");

  assert.equal(deriveInitialExperienceStage({
    decision: null,
    gateState: null,
    hasRecoveryState: false,
    loadFailed: false,
  }), "checking-session");
});

test("recovery stays suppressed while a service-worker update is already applying", () => {
  assert.equal(getNextInitialExperienceRecoveryStep({
    attemptedCacheBustedReload: true,
    attemptedLocationReplace: true,
    attemptedRouterRetry: true,
    canUseCacheBustedReload: false,
    currentBuildId: "build-123",
    elapsedMs: INITIAL_EXPERIENCE_RECOVERY_DELAY_MS + 100,
    remoteBuildId: "build-456",
    routeCommitted: false,
    updatePhase: "applying-update",
  }), null);
});

test("target route matching treats identical relative routes as committed", () => {
  assert.equal(hasCommittedToTargetRoute("/today?tab=plan", "/today?tab=plan"), true);
  assert.equal(hasCommittedToTargetRoute("/today?tab=plan", "/today?tab=history"), false);
});
