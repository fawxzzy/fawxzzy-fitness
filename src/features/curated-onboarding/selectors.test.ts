import assert from "node:assert/strict";
import test from "node:test";

import { EMPTY_CURATED_ONBOARDING_DATA } from "./constants.ts";
import {
  createCuratedParityFixture,
  deriveCuratedEngineData,
  getCuratedIntakeSection,
} from "./questionnaire.ts";
import { canAccessCuratedStep, resolveCuratedRoutineMenuOption } from "./selectors.ts";

test("curated routine menu stays hidden while its feature is disabled", () => {
  assert.equal(resolveCuratedRoutineMenuOption({
    enabled: false,
    savedDraftId: "curated-primary",
  }), null);
});

test("curated routine menu starts or resumes the canonical flow", () => {
  assert.deepEqual(resolveCuratedRoutineMenuOption({
    enabled: true,
    savedDraftId: null,
  }), {
    href: "/curated-onboarding",
    label: "Build for me",
  });

  assert.deepEqual(resolveCuratedRoutineMenuOption({
    enabled: true,
    savedDraftId: " curated-primary ",
  }), {
    href: "/curated-onboarding?draft=curated-primary",
    label: "Resume build",
  });
});

test("curated step access opens only pages whose prerequisites are complete", () => {
  const fixture = createCuratedParityFixture("standard");
  const introQuestionIds = getCuratedIntakeSection("intro")?.questions.map((question) => question.id) ?? [];
  const introResponses = Object.fromEntries(
    Object.entries(fixture).filter(([questionId]) => introQuestionIds.includes(questionId)),
  );

  assert.equal(canAccessCuratedStep("intro", EMPTY_CURATED_ONBOARDING_DATA), true);
  assert.equal(canAccessCuratedStep("goals", EMPTY_CURATED_ONBOARDING_DATA), false);
  assert.equal(canAccessCuratedStep("experience", EMPTY_CURATED_ONBOARDING_DATA), false);

  assert.equal(
    canAccessCuratedStep("goals", {
      ...EMPTY_CURATED_ONBOARDING_DATA,
      intakeResponses: introResponses,
    }),
    true,
  );
});

test("curated step access permits completed intake edits but never jumps directly to generation", () => {
  const intakeResponses = createCuratedParityFixture("standard");
  const completedIntake = {
    ...EMPTY_CURATED_ONBOARDING_DATA,
    ...deriveCuratedEngineData(intakeResponses),
    intakeResponses,
  };

  assert.equal(canAccessCuratedStep("review", completedIntake), true);
  assert.equal(canAccessCuratedStep("generation-handoff", completedIntake), false);
});
