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
  assert.doesNotMatch(shell, /AuthShell|AuthCard|curatedCard|curatedActionRow/);
});
test("curated user UI does not expose raw intake state or implementation-oriented snapshot chrome", () => {
  const handoff = readComponent("GenerationHandoffStep.tsx");

  assert.doesNotMatch(handoff, /JSON\.stringify|<pre|Saved intake snapshot|Intake status|Generation status/);
  assert.match(handoff, /CuratedInfoCard/);
  assert.match(handoff, /SignatureMiniPipe/);
});

test("curated steps reuse canonical controls instead of auth-form or route-local token families", () => {
  const stepSources = [
    "ConstraintsStep.tsx",
    "CuratedIntroStep.tsx",
    "EquipmentStep.tsx",
    "ExperienceStep.tsx",
    "GoalsStep.tsx",
    "PreferencesStep.tsx",
    "ReviewStep.tsx",
    "ScheduleStep.tsx",
  ].map(readComponent).join("\n");

  assert.match(stepSources, /LabeledEditorField/);
  assert.match(stepSources, /SegmentedControl/);
  assert.match(stepSources, /PillButton/);
  assert.doesNotMatch(stepSources, /AuthField|appTokens\.curated/);
});
