import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveInitialExperienceStage,
  destinationToHref,
  getInitialExperienceStageCopy,
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

test("stage copy is plain words a member understands, never developer wording", () => {
  const stages = ["checking-session", "preparing-experience", "redirecting", "recovery", "error"] as const;
  for (const stage of stages) {
    const copy = getInitialExperienceStageCopy(stage);
    for (const text of Object.values(copy)) {
      assert.ok(text.trim().length > 0);
      assert.doesNotMatch(text, /handoff|hand off|handing|history noise|post-login|post-auth|committ?ed? cleanly|destination is locked|launch/i, `${stage}: ${text}`);
    }
  }
});
