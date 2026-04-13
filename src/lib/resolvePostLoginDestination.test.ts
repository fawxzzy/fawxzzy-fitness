import test from "node:test";
import assert from "node:assert/strict";

import { resolvePostLoginDestination } from "./resolvePostLoginDestination.ts";

test("resolvePostLoginDestination keeps install first when the device still needs the install flow", () => {
  const destination = resolvePostLoginDestination({
    isFirstLogin: true,
    needsInstallFlow: true,
    curatedEngineEnabled: true,
    hasCompletedCuratedIntake: false,
    hasExistingProgram: false,
    savedCuratedDraftId: "draft-1",
  });

  assert.deepEqual(destination, { kind: "install" });
});

test("resolvePostLoginDestination keeps current users in the normal app when the curated flag is off", () => {
  const destination = resolvePostLoginDestination({
    isFirstLogin: true,
    needsInstallFlow: false,
    curatedEngineEnabled: false,
    hasCompletedCuratedIntake: false,
    hasExistingProgram: false,
    savedCuratedDraftId: null,
  });

  assert.deepEqual(destination, { kind: "home" });
});

test("resolvePostLoginDestination resumes a saved curated draft before sending a first-run user back to intro", () => {
  const destination = resolvePostLoginDestination({
    isFirstLogin: true,
    needsInstallFlow: false,
    curatedEngineEnabled: true,
    hasCompletedCuratedIntake: false,
    hasExistingProgram: false,
    savedCuratedDraftId: "draft-2",
  });

  assert.deepEqual(destination, { kind: "curated-resume", draftId: "draft-2" });
});

test("resolvePostLoginDestination sends an eligible first-run user into curated intro", () => {
  const destination = resolvePostLoginDestination({
    isFirstLogin: true,
    needsInstallFlow: false,
    curatedEngineEnabled: true,
    hasCompletedCuratedIntake: false,
    hasExistingProgram: false,
    savedCuratedDraftId: null,
  });

  assert.deepEqual(destination, { kind: "curated-intro" });
});

test("resolvePostLoginDestination keeps users with an existing routine in home even if curated is enabled", () => {
  const destination = resolvePostLoginDestination({
    isFirstLogin: true,
    needsInstallFlow: false,
    curatedEngineEnabled: true,
    hasCompletedCuratedIntake: false,
    hasExistingProgram: true,
    savedCuratedDraftId: null,
  });

  assert.deepEqual(destination, { kind: "home" });
});
