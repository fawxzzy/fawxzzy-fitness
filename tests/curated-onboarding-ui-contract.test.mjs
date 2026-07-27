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
  assert.match(shell, /CuratedOnboardingProgress/);
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
  assert.match(shell, /actionClassName="!left-0 !right-0/);
  assert.match(shell, /canAccessCuratedStep/);
  assert.match(shell, /type: "go-to-step"/);
  assert.match(shell, /CURATED_FORM_STEP_ORDER/);
  assert.match(review, /<details/);
  assert.match(review, /onEdit/);
  assert.match(progress, /aria-label="Edit setup pages"/);
  assert.match(progress, /aria-current/);
  assert.match(progress, /steps\.length/);
  assert.match(progress, /<h1/);
  assert.match(progress, /!bg-\[rgb\(var\(--accent\)\)\]/);
  assert.match(review, /data-section-status/);
  assert.match(review, /data-answer-status/);
  assert.match(review, /"Completed" : "Incomplete"/);
  assert.match(review, /danger-rgb/);
  assert.doesNotMatch(review, /\{section\.answers\.length\} answers/);
});
test("curated user UI does not expose raw intake state or implementation-oriented snapshot chrome", () => {
  const handoff = readComponent("GenerationHandoffStep.tsx");

  assert.doesNotMatch(handoff, /JSON\.stringify|<pre|Saved intake snapshot|Intake status|Generation status/);
  assert.match(handoff, /CuratedInfoCard/);
  assert.match(handoff, /SignatureMiniPipe/);
});

test("curated questionnaire reuses app cards and accessible selectable controls", () => {
  const questionnaire = readComponent("QuestionnaireStep.tsx");
  const stepSources = [questionnaire, readComponent("ReviewStep.tsx")].join("\n");

  assert.match(stepSources, /CuratedInfoCard/);
  assert.match(stepSources, /aria-checked/);
  assert.match(stepSources, /role=\{multiple \? "checkbox" : "radio"\}/);
  assert.match(stepSources, /data-curated-question/);
  assert.match(questionnaire, /data-curated-section=/);
  assert.match(questionnaire, /data-curated-question-card/);
  assert.match(questionnaire, /data-question-status/);
  assert.match(questionnaire, /!bg-\[rgb\(var\(--accent\)\/0\.18\)\]/);
  assert.match(questionnaire, /!border-\[rgb\(var\(--accent\)\/0\.72\)\]/);
  assert.match(questionnaire, /aria-labelledby=\{promptId\}/);
  assert.match(questionnaire, /aria-describedby=\{incomplete \? errorId : undefined\}/);
  assert.match(questionnaire, /aria-required=\{question\.required \|\| undefined\}/);
  assert.match(questionnaire, /isCuratedQuestionVisible/);
  assert.match(questionnaire, /aria-label=\{`\$\{question\.label\} other response`\}/);
  assert.match(questionnaire, /id=\{errorId\}/);
  assert.doesNotMatch(questionnaire, /questions\.length\} questions|requiredCount/);
  assert.doesNotMatch(questionnaire, /divide-y/);
  assert.doesNotMatch(stepSources, /AuthField|appTokens\.curated/);
});

test("curated onboarding has an auth-free non-production route for actual-shell mobile proof", () => {
  const route = readFileSync(new URL("../src/app/dev/curated-onboarding/page.tsx", import.meta.url), "utf8");

  assert.match(route, /HISTORY_QA_PREVIEW_ENABLED/);
  assert.match(route, /NODE_ENV === "production"/);
  assert.match(route, /notFound\(\)/);
  assert.match(route, /CuratedOnboardingShell/);
  assert.match(route, /previewOnly/);
  assert.doesNotMatch(route, /requireUser|SUPABASE|SERVICE_ROLE/);

  const shell = readComponent("CuratedOnboardingShell.tsx");
  assert.match(shell, /previewOnly \|\| !hasHydrated/);
  assert.match(shell, /if \(previewOnly\) \{\s+return;\s+\}/);
  assert.match(shell, /disabled=\{previewOnly \|\| !generatedPlan/);
});

test("Tailwind compiles feature-owned onboarding styles", () => {
  const tailwindConfig = readFileSync(new URL("../tailwind.config.ts", import.meta.url), "utf8");

  assert.match(tailwindConfig, /\.\/src\/features\/\*\*\/\*\.\{js,ts,jsx,tsx,mdx\}/);
});

test("the live shell renders the parity questionnaire rather than the legacy six-step components", () => {
  const shell = readComponent("CuratedOnboardingShell.tsx");

  assert.match(shell, /QuestionnaireStep/);
  assert.match(shell, /getCuratedIntakeSection/);
  assert.doesNotMatch(shell, /<GoalsStep|<ExperienceStep|<ScheduleStep|<EquipmentStep|<ConstraintsStep|<PreferencesStep/);
});
