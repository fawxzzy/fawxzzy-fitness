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

test("history fixtures preserve selected-session identity and fixture-relative calendar framing", async () => {
  const source = await readFile(new URL("./DevMobileRegressionRoute.tsx", import.meta.url), "utf8");
  const historyClientSource = await readFile(new URL("../../history/HistorySessionsClient.tsx", import.meta.url), "utf8");

  assert.match(source, /const historySession = scenario\.fixture === "progression-expanded"[\s\S]*?mockHistorySessions\[0\]/);
  assert.match(source, /logId=\{historySession\.id\}/);
  assert.match(source, /sessionSummary=\{historySession\}/);
  assert.match(source, /calendarNow="2026-04-10T12:00:00\.000Z"/);
  assert.match(historyClientSource, /calendarNow\?: string/);
  assert.match(historyClientSource, /now: calendarNow/);
});

test("session completion never promotes: no promotions receipt, straight back to Today (manual progression, 2026-11-19)", async () => {
  const source = await readFile(new URL("../../../components/SessionPageClient.tsx", import.meta.url), "utf8");
  const routeSource = await readFile(new URL("./DevMobileRegressionRoute.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /Progression Promotions/);
  assert.doesNotMatch(source, /No promotions this session/);
  assert.doesNotMatch(source, /progressionUpdates/);
  // Lane L2 (2026-11-26): Finish now shows the post-workout summary in place; Done (not Finish) returns to Today.
  assert.match(source, /setIsSessionCompleted\(true\);\s*window\.scrollTo\(\{ top: 0 \}\);/);
  assert.match(source, /onClick=\{navigateReturn\}\s+data-session-summary-done="true"/);
  assert.doesNotMatch(routeSource, /session-auto-progression-confirmation/);
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
    /isSessionCompleted \? \([\s\S]{0,200}<BottomActionSplit[\s\S]{0,300}View in History[\s\S]{0,300}<BottomDockButton\s+type="button"\s+intent="positive"\s+className="!min-h-\[44px\]"\s+onClick=\{navigateReturn\}\s+data-session-summary-done="true"\s*>\s*Done\s*<\/BottomDockButton>/,
  );
  assert.match(source, /Workout saved/);
  assert.match(source, /isSessionCompleted \? null : emptyState/);
  assert.match(sessionPageSource, /initialIsSessionCompleted=\{sessionRow\.status === "completed"\}/);
});

test("active session keeps elapsed duration persisted without rendering it in the bottom dock", async () => {
  const source = await readFile(new URL("../../../components/SessionPageClient.tsx", import.meta.url), "utf8");

  assert.match(source, /<input type="hidden" name="durationSeconds" value=\{String\(durationSeconds\)\} \/>/);
  assert.match(source, /<BottomActionSplit\s+secondary=\{quickAddAction\}\s+primary=\{\(/);
  assert.match(source, /<BottomDockButton\s+type="submit"\s+intent="positive"[\s\S]*?>\s*Finish\s*<\/BottomDockButton>/);
  // Finish stays a plain submit (one tap); the confirm sheet only intercepts it while planned sets are unfinished.
  assert.match(source, /buildSessionFinishCheck\(/);
  assert.match(source, /event\.preventDefault\(\);\s*setFinishConfirm\(check\)/);
  assert.doesNotMatch(source, /currentSessionDurationPill/);
  assert.doesNotMatch(source, /formatDurationClock/);
});
