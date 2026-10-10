import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildFitnessReleaseReadinessReport,
  formatFitnessReleaseReadinessReport,
  getReleaseReadinessArtifactPaths,
  RELEASE_READINESS_DOC_PATH,
  RELEASE_READINESS_JSON_PATH,
  RELEASE_READINESS_MARKDOWN_PATH,
  writeFitnessReleaseReadinessArtifacts,
} from "./fitness-release-readiness.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function createBaseDraft(overrides = {}) {
  return {
    version: "fitness-2026.05.10-1",
    summary: "Progression V2 release candidate.",
    lanes: ["FIT-03", "FIT-04", "FIT-05"],
    userFacingChanges: ["Adds progression history filters and dashboard cards."],
    verification: ["npm run verify", "npm run qa:llel:progression"],
    ...overrides,
  };
}

function createBaseReport(overrides = {}) {
  return {
    routesChecked: [
      { key: "today-progression-status", status: "captured", failureReason: null },
      { key: "progression-history", status: "captured", failureReason: null },
      { key: "progression-history-filtered", status: "captured", failureReason: null },
    ],
    exportCoverage: { status: "passed" },
    migrationValidation: {
      missingRemoteVersions: [
        "20260508090000_remove_zone_2_cardio_catalog_exercise.sql",
        "20260509103000_profile_qa_visibility.sql",
        "20260509113000_051_progression_events.sql",
      ],
    },
    ...overrides,
  };
}

function createCleanGitState(overrides = {}) {
  return {
    branch: "main",
    branchOk: true,
    branchError: null,
    dirtyFiles: [],
    dirty: false,
    ...overrides,
  };
}

function createVerifyResult(overrides = {}) {
  return {
    ok: true,
    exitCode: 0,
    stdout: "",
    stderr: "",
    ...overrides,
  };
}

function createCleanMigrationState(overrides = {}) {
  return {
    ok: true,
    command: "npx supabase migration list --linked",
    classification: "clean",
    missingRemoteVersions: [],
    mismatches: [],
    result: { combined: "" },
    productionDeployBlocked: false,
    ...overrides,
  };
}

test("the real default migration collector reports retirement without remote access", async () => {
  const report = await buildFitnessReleaseReadinessReport({
    repoRoot,
    gitState: createCleanGitState(),
    verifyResult: createVerifyResult(),
    draft: createBaseDraft(),
    llelReport: createBaseReport({ migrationValidation: { missingRemoteVersions: [] } }),
    ledgerRaw: "",
  });
  assert.equal(report.productionDeployReady, false);
  assert.deepEqual(report.checks.migration.details, ["LEGACY_REMOTE_VALIDATION_RETIRED"]);
  assert.equal(report.checks.llel.status, "warn");
  assert.match(report.checks.llel.summary, /master migration freshness is not evaluated/);
  assert.doesNotMatch(report.checks.llel.summary, /current and complete/);
  assert.match(report.nextActions.join("\n"), /source-bound schema and security review/);
  assert.doesNotMatch(report.nextActions.join("\n"), /Fix linked Supabase access|Apply the pending migrations remotely/);
});

test("a caller cannot promote historical evidence by changing its scope label", async () => {
  const report = await buildFitnessReleaseReadinessReport({
    repoRoot,
    gitState: createCleanGitState(),
    verifyResult: createVerifyResult(),
    migrationState: createCleanMigrationState({ validationScope: "master" }),
    draft: createBaseDraft(),
    llelReport: createBaseReport({ migrationValidation: { missingRemoteVersions: [] } }),
    ledgerRaw: "",
  });
  assert.equal(report.productionDeployReady, false);
  assert.equal(report.checks.migration.status, "fail");
});

test("a clean historical ledger cannot certify master release readiness", async () => {
  const report = await buildFitnessReleaseReadinessReport({
    repoRoot,
    gitState: createCleanGitState(),
    verifyResult: createVerifyResult(),
    migrationState: createCleanMigrationState(),
    draft: createBaseDraft(),
    llelReport: createBaseReport({
      migrationValidation: { missingRemoteVersions: [] },
    }),
    ledgerRaw: `${JSON.stringify({ version: "fitness-2026.05.09-1", commit: "abc123", deployedAt: "2026-05-09T12:00:00Z" })}\n`,
  });

  assert.equal(report.status, "fail");
  assert.equal(report.productionDeployReady, false);
  assert.equal(report.checks.releaseDraft.status, "pass");
  assert.equal(report.checks.llel.status, "warn");
  assert.equal(report.checks.migration.status, "fail");
  assert.match(report.checks.migration.summary, /Master migration acceptance has not been evaluated/);
});

test("fails when the current release draft is missing", async () => {
  const report = await buildFitnessReleaseReadinessReport({
    repoRoot,
    gitState: createCleanGitState(),
    verifyResult: createVerifyResult(),
    migrationState: createCleanMigrationState(),
    draft: null,
    llelReport: createBaseReport({
      migrationValidation: { missingRemoteVersions: [] },
    }),
    ledgerRaw: "",
  });

  assert.equal(report.status, "fail");
  assert.equal(report.checks.releaseDraft.status, "fail");
  assert.match(report.checks.releaseDraft.summary, /missing/i);
});

test("reports the pending migration order and blocks production readiness", async () => {
  const pendingMigrations = [
    "20260508090000_remove_zone_2_cardio_catalog_exercise.sql",
    "20260509103000_profile_qa_visibility.sql",
    "20260509113000_051_progression_events.sql",
  ];
  const report = await buildFitnessReleaseReadinessReport({
    repoRoot,
    gitState: createCleanGitState(),
    verifyResult: createVerifyResult(),
    migrationState: createCleanMigrationState({
      classification: "expected-red",
      missingRemoteVersions: pendingMigrations,
      productionDeployBlocked: true,
    }),
    draft: createBaseDraft(),
    llelReport: createBaseReport(),
    ledgerRaw: "",
  });

  assert.equal(report.productionDeployReady, false);
  assert.equal(report.checks.migration.status, "fail");
  assert.deepEqual(report.expectedRedMigrations, pendingMigrations);
  assert.deepEqual(report.checks.migration.details.slice(1), pendingMigrations.map((version, index) => `Historical ledger only: ${index + 1}. ${version}`));
  assert.doesNotMatch(report.nextActions.join("\n"), /Apply the pending migrations remotely/);
});

test("fails when the LLEL receipt still carries a stale four-item migration snapshot", async () => {
  const report = await buildFitnessReleaseReadinessReport({
    repoRoot,
    gitState: createCleanGitState(),
    verifyResult: createVerifyResult(),
    migrationState: createCleanMigrationState({
      classification: "expected-red",
      missingRemoteVersions: [
        "20260508090000_remove_zone_2_cardio_catalog_exercise.sql",
        "20260509103000_profile_qa_visibility.sql",
        "20260509113000_051_progression_events.sql",
      ],
      productionDeployBlocked: true,
    }),
    draft: createBaseDraft(),
    llelReport: createBaseReport({
      migrationValidation: {
        missingRemoteVersions: [
          "20260508090000_remove_zone_2_cardio_catalog_exercise.sql",
          "20260509103000_profile_qa_visibility.sql",
          "20260509113000_051_progression_events.sql",
          "20260510090000_052_routine_core_rls_initplan.sql",
        ],
      },
    }),
    ledgerRaw: "",
  });

  assert.equal(report.checks.llel.status, "fail");
  assert.match(report.checks.llel.details.join("\n"), /stale/i);
});

test("fails when verify fails even if the other readiness artifacts exist", async () => {
  const report = await buildFitnessReleaseReadinessReport({
    repoRoot,
    gitState: createCleanGitState(),
    verifyResult: createVerifyResult({
      ok: false,
      exitCode: 1,
      stderr: "Verification failed.",
    }),
    migrationState: createCleanMigrationState(),
    draft: createBaseDraft(),
    llelReport: createBaseReport({
      migrationValidation: { missingRemoteVersions: [] },
    }),
    ledgerRaw: "",
  });

  assert.equal(report.checks.verify.status, "fail");
  assert.equal(report.productionDeployReady, false);
});

test("json output remains stable when requested", async () => {
  const report = await buildFitnessReleaseReadinessReport({
    repoRoot,
    gitState: createCleanGitState(),
    verifyResult: createVerifyResult(),
    migrationState: createCleanMigrationState(),
    draft: createBaseDraft(),
    llelReport: createBaseReport({
      migrationValidation: { missingRemoteVersions: [] },
    }),
    ledgerRaw: "",
  });

  const output = formatFitnessReleaseReadinessReport(report, { json: true });
  const parsed = JSON.parse(output);

  assert.equal(parsed.command, "npm run release:fitness:ready");
  assert.equal(parsed.status, "fail");
  assert.equal(parsed.productionDeployReady, false);
});

test("release readiness artifact paths stay under runtime fitness", () => {
  const paths = getReleaseReadinessArtifactPaths(repoRoot);
  assert.equal(paths.markdown, path.join(repoRoot, RELEASE_READINESS_MARKDOWN_PATH));
  assert.equal(paths.json, path.join(repoRoot, RELEASE_READINESS_JSON_PATH));
});

test("release readiness lane has a durable local-only operator contract", async () => {
  const doc = (await fs.readFile(RELEASE_READINESS_DOC_PATH, "utf8")).replace(/\s+/g, " ");
  assert.match(doc, /review-only snapshots for human inspection/i);
  assert.match(doc, /must not mutate production, deploy state, release ledger entries, or ATLAS receipts/i);
  assert.match(doc, /failing readiness result is still a valid report outcome/i);
});

test("release readiness artifacts are written for failing reports too", async () => {
  const tempRoot = path.join(repoRoot, "tmp", "fitness-release-readiness-test");
  const report = await buildFitnessReleaseReadinessReport({
    repoRoot,
    gitState: createCleanGitState({ dirty: true, dirtyFiles: [" M src/example.ts"] }),
    verifyResult: createVerifyResult(),
    migrationState: createCleanMigrationState(),
    draft: createBaseDraft(),
    llelReport: createBaseReport({
      migrationValidation: { missingRemoteVersions: [] },
    }),
    ledgerRaw: "",
  });

  const artifactPaths = await writeFitnessReleaseReadinessArtifacts(report, { repoRoot: tempRoot });
  const markdown = await fs.readFile(artifactPaths.markdown, "utf8");
  const json = JSON.parse(await fs.readFile(artifactPaths.json, "utf8"));

  assert.match(markdown, /Fitness release readiness: FAIL/);
  assert.equal(json.status, "fail");
  assert.equal(json.productionDeployReady, false);

  await fs.rm(tempRoot, { recursive: true, force: true });
});
