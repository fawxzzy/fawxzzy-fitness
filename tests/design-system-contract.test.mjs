import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(process.cwd());

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("fitness design system token pack keeps the frozen base token groups", () => {
  const tokens = loadJson("truth-pack/fitness/design-system/tokens.v1.json");

  assert.equal(tokens.packId, "fitness.design-system.tokens");
  assert.equal(tokens.packVersion, "v1");
  assert.equal(tokens.ownerRepoId, "fawxzzy-fitness");
  assert.equal(tokens.status, "frozen");
  assert.ok(tokens.tokenGroups.spacing["2"]);
  assert.ok(tokens.tokenGroups.typography.title.includes("clamp"));
  assert.ok(tokens.tokenGroups.colors.background.panel.includes("--bg-panel"));
});

test("fitness design system primitive pack keeps stable primitive ids and semantic variants", () => {
  const primitives = loadJson("truth-pack/fitness/design-system/primitives.v1.json");

  assert.equal(primitives.packId, "fitness.design-system.primitives");
  assert.equal(primitives.packVersion, "v1");
  assert.equal(primitives.ownerRepoId, "fawxzzy-fitness");
  assert.equal(primitives.status, "frozen");
  assert.equal(primitives.tokensPackRef, "truth-pack/fitness/design-system/tokens.v1.json");

  const ids = primitives.primitiveContracts.map((contract) => contract.id);
  assert.deepEqual(ids, ["header", "card", "badge", "section-layout"]);

  for (const contract of primitives.primitiveContracts) {
    assert.ok(contract.variants.length > 0, `${contract.id} has variants`);
    assert.ok(contract.invariants.length > 0, `${contract.id} has invariants`);
    assert.ok(contract.sourceSurfaces.length > 0, `${contract.id} has sources`);
    for (const variant of contract.variants) {
      assert.ok(variant.semanticRefs && typeof variant.semanticRefs === "object", `${contract.id}:${variant.id} exposes semantic refs`);
    }
  }
});

test("fitness design system schemas freeze the expected top-level contract shape", () => {
  const tokensSchema = loadJson("truth-pack/fitness/design-system/schemas/tokens.v1.schema.json");
  const primitivesSchema = loadJson("truth-pack/fitness/design-system/schemas/primitives.v1.schema.json");

  assert.deepEqual(tokensSchema.required, ["packId", "packVersion", "status", "ownerRepoId", "tokenGroups"]);
  assert.deepEqual(primitivesSchema.required, ["packId", "packVersion", "status", "ownerRepoId", "tokensPackRef", "primitiveContracts"]);
});

test("live app primitives bridge the frozen design-system pack", () => {
  const designSystemBridge = readText("src/components/ui/app/designSystem.ts");
  const appTokens = readText("src/components/ui/app/tokens.ts");
  const headerTokens = readText("src/components/ui/app/headerTokens.ts");
  const standaloneHeaderFamily = readText("src/components/ui/app/standaloneHeaderFamily.ts");
  const workoutEntrySection = readText("src/components/ui/workout-entry/EntrySection.tsx");
  const compactLogRow = readText("src/components/ui/workout-entry/CompactLogRow.tsx");
  const measurementPanel = readText("src/components/ui/measurements/MeasurementPanelV2.tsx");
  const measurementSummary = readText("src/components/ui/measurements/MeasurementSummary.tsx");
  const exerciseGoalForm = readText("src/components/ui/measurements/ExerciseGoalForm.tsx");
  const sessionTimers = readText("src/components/SessionTimers.tsx");
  const dayDetailStateCard = readText("src/components/routines/day-detail/DayDetailStateCard.tsx");

  assert.ok(designSystemBridge.includes("truth-pack/fitness/design-system/tokens.v1.json"));
  assert.ok(designSystemBridge.includes("truth-pack/fitness/design-system/primitives.v1.json"));
  assert.ok(appTokens.includes("fitnessDesignPrimitiveClassNames.card"));
  assert.ok(headerTokens.includes("fitnessDesignPrimitiveClassNames.header"));
  assert.ok(standaloneHeaderFamily.includes("fitnessDesignPrimitiveClassNames.headerFamily"));
  assert.ok(workoutEntrySection.includes("appTokens.exerciseLogSectionHeaderCopy"));
  assert.ok(workoutEntrySection.includes("appTokens.exerciseLogMetricValueWarning"));
  assert.ok(compactLogRow.includes("appTokens.exerciseLogRowAction"));
  assert.ok(appTokens.includes("measurementInlineSideLabel"));
  assert.ok(appTokens.includes("measurementInlineValueLabel"));
  assert.ok(appTokens.includes("measurementInlineValueLabelLower"));
  assert.ok(appTokens.includes("measurementPanelStack"));
  assert.ok(appTokens.includes("measurementPanelGrid"));
  assert.ok(measurementPanel.includes("appTokens.measurementInlineSideLabel"));
  assert.ok(measurementPanel.includes("appTokens.measurementInlineValueLabel"));
  assert.ok(measurementPanel.includes("appTokens.measurementInlineValueLabelLower"));
  assert.ok(measurementPanel.includes("appTokens.measurementPanelStack"));
  assert.ok(measurementPanel.includes("appTokens.measurementPanelGrid"));
  assert.ok(measurementSummary.includes("appTokens.exerciseLogSummaryBadgeRow"));
  assert.ok(exerciseGoalForm.includes("appTokens.measurementInput"));
  assert.ok(exerciseGoalForm.includes("appTokens.measurementValidation"));
  assert.ok(sessionTimers.includes("appTokens.currentSessionLoggerSummaryCard"));
  assert.ok(sessionTimers.includes("appTokens.currentSessionLoggerPanel"));
  assert.ok(appTokens.includes("detailStateRest"));
  assert.ok(appTokens.includes("detailStateWarning"));
  assert.ok(appTokens.includes("detailStateBlocking"));
  assert.ok(appTokens.includes("detailStateNeutral"));
  assert.ok(dayDetailStateCard.includes("appTokens.detailStateRest"));
  assert.ok(dayDetailStateCard.includes("appTokens.detailStateWarning"));
  assert.ok(dayDetailStateCard.includes("appTokens.detailStateBlocking"));
  assert.ok(dayDetailStateCard.includes("appTokens.detailStateNeutral"));
});

test("repo-local documentation points at the owner truth pack", () => {
  const packReadme = readText("truth-pack/fitness/design-system/README.md");
  const docsReadme = readText("docs/design-system/FITNESS-DESIGN-SYSTEM.md");
  const fitnessReadme = readText("truth-pack/fitness/README.md");

  assert.ok(packReadme.includes("Fitness design system"));
  assert.ok(docsReadme.includes("truth-pack/fitness/design-system/"));
  assert.ok(fitnessReadme.includes("design-system/"));
});
