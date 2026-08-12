import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("./page.tsx", import.meta.url);

test("mobile regression fixtures remain production-blocked and preview-reviewable", async () => {
  const source = await readFile(pageUrl, "utf8");

  assert.match(source, /process\.env\.HISTORY_QA_PREVIEW_ENABLED === "1"/);
  assert.match(source, /process\.env\.NODE_ENV === "production" && !isReviewPreviewEnabled/);
  assert.match(source, /allowProductionPreview=\{isReviewPreviewEnabled\}/);
  assert.match(source, /notFound\(\)/);
});

test("mobile regression surface preserves the production guard unless the server gate admits review", async () => {
  const source = await readFile(new URL("./DevMobileRegressionRoute.tsx", import.meta.url), "utf8");

  assert.match(source, /allowProductionPreview = false/);
  assert.match(source, /process\.env\.NODE_ENV === "production" && !allowProductionPreview/);
});

test("exercise-detail fixtures preserve the standard regression root marker contract", async () => {
  const source = await readFile(new URL("./DevMobileRegressionRoute.tsx", import.meta.url), "utf8");

  assert.match(source, /function renderExerciseDetailScenario\(scenario: MobileFixtureScenario\)[\s\S]*?<RegressionMarker scenario=\{scenario\} \/>/);
  assert.match(source, /<RegressionExerciseInfoSheet[\s\S]*?scenarioId=\{scenario\.id\}/);
});

test("automatic progression review fixture represents completed target work", async () => {
  const source = await readFile(new URL("./DevMobileRegressionRoute.tsx", import.meta.url), "utf8");

  assert.match(source, /scenario\.id !== "session-auto-progression-confirmation"/);
  assert.match(source, /targetSetCount = exercise\.targetSetsMax \?\? exercise\.targetSetsMin/);
  assert.match(source, /initialSets: Array\.from\(\{ length: targetSetCount \}/);
  assert.match(source, /loggedSetCount: targetSetCount/);
  assert.match(source, /linkedDayNames: \["Lower A", "Lower B"\]/);
});

test("session completion uses the progression promotion receipt contract", async () => {
  const source = await readFile(new URL("../../../components/SessionPageClient.tsx", import.meta.url), "utf8");

  assert.match(source, /title="Progression Promotions"/);
  assert.match(source, /No promotions this session\./);
  assert.match(source, /Plans: \{update\.linkedDayNames\.join\(", "\)\}/);
  assert.doesNotMatch(source, /Your routine has been updated for the next session\./);
  assert.doesNotMatch(source, /across \$\{update\.linkedTargetCount\} routine days/);
});

test("session completion immediately retires all live workout controls", async () => {
  const source = await readFile(new URL("../../../components/SessionPageClient.tsx", import.meta.url), "utf8");
  const sessionPageSource = await readFile(new URL("../../session/[id]/page.tsx", import.meta.url), "utf8");

  assert.match(source, /setIsSessionCompleted\(true\)/);
  assert.match(source, /useState\(initialIsSessionCompleted\)/);
  assert.match(source, /if \(isSessionCompleted\) \{\s*clearActiveSessionHint\(sessionId\)/);
  assert.match(source, /isSessionCompleted \? \(/);
  assert.match(
    source,
    /isSessionCompleted \? \(\s*<BottomDockButton\s+type="button"\s+intent="positive"\s+className="!min-h-\[44px\]"\s+onClick=\{navigateReturn\}\s*>\s*Continue\s*<\/BottomDockButton>/,
  );
  assert.match(source, /Workout saved/);
  assert.match(source, /isSessionCompleted \? null : emptyState/);
  assert.match(sessionPageSource, /initialIsSessionCompleted=\{sessionRow\.status === "completed"\}/);
});
