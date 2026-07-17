import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const componentRoot = new URL("../src/features/curated-onboarding/components/", import.meta.url);

function readComponent(name) {
  return readFileSync(new URL(name, componentRoot), "utf8");
}

test("curated onboarding uses the signed-in Fitness screen and bottom-action contracts", () => {
  const shell = readComponent("CuratedOnboardingShell.tsx");

  assert.match(shell, /AppShell/);
  assert.match(shell, /MobileScreenScaffold/);
  assert.match(shell, /SharedScreenHeader/);
  assert.match(shell, /SignatureInlineList/);
  assert.match(shell, /BottomActionSingle/);
  assert.match(shell, /BottomActionSplit/);
  assert.match(shell, /BottomDockButton/);
  assert.match(shell, /pointer-events-auto/);
  assert.doesNotMatch(shell, /AuthShell|AuthCard|curatedCard|curatedActionRow/);
});

test("curated onboarding keeps operator review actions on canonical app patterns", () => {
  const shell = readComponent("CuratedOnboardingShell.tsx");
  const progress = readComponent("CuratedOnboardingProgress.tsx");
  const review = readComponent("ReviewStep.tsx");

  assert.match(shell, /ROUTINE_CARD_DELETE_TEXT_CLASS_NAME/);
  assert.match(shell, /canAccessCuratedStep/);
  assert.match(shell, /type: "go-to-step"/);
  assert.match(shell, /CURATED_FORM_STEP_ORDER/);
  assert.match(review, /<details/);
  assert.match(review, /onEdit/);
  assert.match(progress, /aria-label="Edit setup pages"/);
  assert.match(progress, /aria-current/);
  assert.match(progress, /steps\.length/);
});
test("curated user UI does not expose raw intake state or implementation-oriented snapshot chrome", () => {
  const handoff = readComponent("GenerationHandoffStep.tsx");

  assert.doesNotMatch(handoff, /JSON\.stringify|<pre|Saved intake snapshot|Intake status|Generation status/);
  assert.match(handoff, /CuratedInfoCard/);
  assert.match(handoff, /SignatureMiniPipe/);
});

test("curated questionnaire reuses app cards and accessible selectable controls", () => {
  const stepSources = [
    "QuestionnaireStep.tsx",
    "ReviewStep.tsx",
  ].map(readComponent).join("\n");

  assert.match(stepSources, /CuratedInfoCard/);
  assert.match(stepSources, /aria-checked/);
  assert.match(stepSources, /role=\{multiple \? "checkbox" : "radio"\}/);
  assert.match(stepSources, /data-curated-question/);
  assert.doesNotMatch(stepSources, /AuthField|appTokens\.curated/);
});

test("the live shell renders the parity questionnaire rather than the legacy six-step components", () => {
  const shell = readComponent("CuratedOnboardingShell.tsx");

  assert.match(shell, /QuestionnaireStep/);
  assert.match(shell, /getCuratedIntakeSection/);
  assert.doesNotMatch(shell, /<GoalsStep|<ExperienceStep|<ScheduleStep|<EquipmentStep|<ConstraintsStep|<PreferencesStep/);
});
