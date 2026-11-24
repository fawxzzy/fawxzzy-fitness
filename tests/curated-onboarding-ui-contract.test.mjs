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
  assert.match(shell, /<ScreenHeader\s+kind="detail"/);
  assert.match(shell, /<ScreenHeaderBackButton href="\/today" historyBehavior="fallback-only" label="Back to Today" \/>/);
  assert.doesNotMatch(shell, /SharedScreenHeader|TopRightBackButton|<h1/);
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

  // Start over lives in the header Menu (44px trigger) and asks for confirmation before it clears the answers.
  assert.match(shell, /<Menu\s+label="Setup options"/);
  assert.match(shell, /id: "start-over", label: "Start over", tone: "danger"/);
  assert.match(shell, /<ConfirmDestructiveModal/);
  assert.match(shell, /onConfirm=\{handleReset\}/);
  assert.doesNotMatch(shell, /onClick=\{handleReset\}/);
  assert.match(shell, /canAccessCuratedStep/);
  assert.match(shell, /type: "go-to-step"/);
  assert.match(shell, /CURATED_FORM_STEP_ORDER/);
  assert.match(review, /<details/);
  assert.match(review, /onEdit/);
  assert.match(progress, /aria-label="Edit setup pages"/);
  assert.match(progress, /aria-current/);
  assert.match(progress, /steps\.map/);
  assert.doesNotMatch(progress, /<h1/);
  // One 44px "Steps" button opens the sheet; the old ten 28px number dots are gone.
  assert.match(progress, /<Sheet/);
  assert.match(progress, /data-curated-steps-trigger/);
  assert.doesNotMatch(progress, /min-h-7|h-7 min-w-7/);
  assert.match(progress, /pages still need answers/);
  assert.match(review, /data-section-status/);
  assert.match(review, /data-answer-status/);
  assert.match(review, /"Completed" : "Needs answers"/);
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
  assert.match(shell, /if \(previewOnly \|\| createInFlightRef\.current\) \{\s+return;\s+\}/);
  assert.match(shell, /disabled=\{\(previewOnly && !previewHandoff\) \|\| !generatedPlan/);
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

test("curated handoff never dead-ends: failures offer edit-setup or retry plus manual routine creation", () => {
  const shell = readComponent("CuratedOnboardingShell.tsx");
  const handoff = readComponent("GenerationHandoffStep.tsx");
  const handoffModel = readFileSync(new URL("../src/features/curated-onboarding/handoff.ts", import.meta.url), "utf8");

  assert.match(shell, /type: "reopen-intake"/);
  assert.match(shell, /type: "generation-requested"/);
  assert.match(shell, /CURATED_MANUAL_ROUTINE_HREF/);
  assert.match(shell, /BottomDockLink/);
  assert.match(shell, /Edit setup/);
  assert.match(shell, /Try again/);
  assert.match(shell, /Build manually/);
  assert.match(handoffModel, /\/routines\/new\?mode=blank/);
  // The reviewed plan id travels with the create request so the saved routine always matches the reviewed one.
  assert.match(shell, /generatedPlan\?\.planId \?\? null/);
  assert.match(shell, /result\.code === "plan-changed"/);
  // A routine is never rendered while generation is failed or blocked.
  assert.match(handoff, /const visiblePlan = failure \? null : plan/);
  assert.doesNotMatch(shell, /Plan unavailable|generationError/);
});

test("the retired six-step onboarding components stay deleted", () => {
  for (const name of ["GoalsStep", "ExperienceStep", "EquipmentStep", "ScheduleStep", "PreferencesStep", "ConstraintsStep", "CuratedIntroStep"]) {
    assert.throws(() => readComponent(`${name}.tsx`), { code: "ENOENT" }, name);
  }
});

test("curated handoff shows every recommendation reason to the member", () => {
  const handoff = readComponent("GenerationHandoffStep.tsx");

  assert.match(handoff, /visiblePlan\.adjustments/);
  assert.match(handoff, /Why this routine changed/);
  assert.match(handoff, /adjustment\.reason/);
  assert.match(handoff, /data-curated-adjustments/);
});

test("curated handoff guards double submit, keeps blocked primary on Build manually, and never shows raw errors", () => {
  const shell = readComponent("CuratedOnboardingShell.tsx");

  assert.match(shell, /createInFlightRef = useRef\(false\)/);
  assert.match(shell, /createdRoutineRef = useRef/);
  assert.match(shell, /previewOnly \|\| createInFlightRef\.current/);
  assert.match(shell, /createInFlightRef\.current = false/);
  assert.match(shell, /getCuratedHandoffActions\(failure\)/);
  assert.match(shell, /handoffActions\.primary === "build-manually"/);
  assert.match(shell, /CURATED_LOST_RESPONSE_MESSAGE/);
  assert.doesNotMatch(shell, /error\.message|instanceof Error/);
});

test("curated onboarding shows no red text: problems use neutral copy, chips, the in-flow notice or a red rail", () => {
  const shell = readComponent("CuratedOnboardingShell.tsx");
  const redText = /text-\[rgb\(var\(--danger-rgb\)[^\]]*\]/;
  for (const name of ["CuratedOnboardingShell.tsx", "QuestionnaireStep.tsx", "ReviewStep.tsx", "GenerationHandoffStep.tsx", "CuratedOnboardingProgress.tsx"]) {
    assert.doesNotMatch(readComponent(name), redText, name);
    assert.doesNotMatch(readComponent(name), /border-\[rgb\(var\(--danger-rgb\)/, name);
  }
  // A failed autosave goes to the persistent in-flow notice, not a red paragraph.
  assert.match(shell, /useFieldNotice\("curated-onboarding:save", \{ persistent: true \}\)/);
  assert.match(shell, /Changes could not be saved\./);
  assert.doesNotMatch(shell, /<p role="alert"/);
  // The danger info card keeps neutral fill and text; only its rail is red.
  const primitives = readComponent("CuratedOnboardingPrimitives.tsx");
  assert.match(primitives, /danger: "border-\[rgb\(var\(--border-strong\)\/0\.2\)\][^"]*before:bg-\[rgb\(var\(--danger-rgb\)\)\]"/);
});

test("curated questionnaire fields are 16px (no iOS focus zoom) and at least 44px tall", () => {
  const questionnaire = readComponent("QuestionnaireStep.tsx");

  assert.doesNotMatch(questionnaire, /py-2\.5 text-sm text-\[rgb\(var\(--text-primary\)\)\] outline-none/);
  assert.equal((questionnaire.match(/min-h-11 w-full border-0 border-b/g) ?? []).length, 2);
  assert.equal((questionnaire.match(/text-base text-\[rgb\(var\(--text-primary\)\)\] outline-none/g) ?? []).length, 2);
  // "Required" is a neutral chip tied to the field by aria-describedby; no red "Required - incomplete" line.
  assert.match(questionnaire, /<Chip tone="attention" id=\{errorId\}/);
  assert.doesNotMatch(questionnaire, /Required - incomplete|Required acknowledgment - incomplete/);
});
