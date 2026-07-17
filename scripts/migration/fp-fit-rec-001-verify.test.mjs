import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  FROZEN_PARITY_EVIDENCE,
  NORMALIZED_UNIT_MANIFEST_SHA256,
  RECOVERED_SOURCES,
  REPO_ROOT,
  validateEvidenceContract,
  verifyRecovery,
} from "./fp-fit-rec-001-verify.mjs";

function cloneEvidence() {
  return JSON.parse(JSON.stringify(FROZEN_PARITY_EVIDENCE));
}

function runGit(repoRoot, args, options = {}) {
  return execFileSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    ...options,
  });
}

function withMigrationFixture(run) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "fp-fit-rec-001-"));
  const fixtureMigrationDirectory = path.join(fixtureRoot, "supabase", "migrations");
  mkdirSync(path.dirname(fixtureMigrationDirectory), { recursive: true });
  cpSync(path.join(REPO_ROOT, "supabase", "migrations"), fixtureMigrationDirectory, { recursive: true });
  runGit(fixtureRoot, ["init", "--quiet"]);
  runGit(fixtureRoot, ["config", "core.autocrlf", "input"]);
  runGit(fixtureRoot, ["config", "user.name", "FP-FIT-REC-001 Test"]);
  runGit(fixtureRoot, ["config", "user.email", "fp-fit-rec-001@example.invalid"]);
  runGit(fixtureRoot, ["add", "--", "supabase/migrations"]);
  runGit(fixtureRoot, ["commit", "--quiet", "-m", "fixture migration tree"]);
  runGit(fixtureRoot, ["config", "core.autocrlf", "false"]);
  try {
    run(fixtureRoot, fixtureMigrationDirectory);
  } finally {
    const resolved = path.resolve(fixtureRoot);
    assert.ok(resolved.startsWith(path.resolve(tmpdir())), "fixture cleanup must remain inside the OS temp directory");
    rmSync(resolved, { recursive: true, force: true });
  }
}

test("accepts the exact 101-source recovery tree and frozen measured evidence", () => {
  const report = verifyRecovery();
  assert.equal(report.ok, true, report.issues.join("\n"));
  assert.equal(report.sourceTree.migrationCount, 101);
  assert.equal(report.sourceTree.versionCount, 101);
  assert.equal(report.sourceTree.manifestSha256, "d0671af0c557969ce3d24c2a9b41975adeacc0d4073103fd1513426242c1557e");
  assert.equal(report.recoveredSources.length, 3);
  assert.equal(report.normalizedStatementUnits.count, 6);
  assert.equal(report.normalizedStatementUnits.manifestSha256, NORMALIZED_UNIT_MANIFEST_SHA256);
  assert.equal(report.normalizedStatementUnits.rawFormatUnknownCount, 1);
  assert.equal(report.liveEvidence.overallContentParity, "FAIL");
  assert.equal(report.liveEvidence.parityGate, "BLOCKED");
  assert.equal(report.liveEvidence.rawByteParity, "UNKNOWN");
});

test("freezes the three exact raw source and Git blob digests", () => {
  assert.deepEqual(
    RECOVERED_SOURCES.map(({ path: sourcePath, gitBlob, rawSha256 }) => ({ sourcePath, gitBlob, rawSha256 })),
    [
      {
        sourcePath: "supabase/migrations/20260713013116_exercise_timer_truth.sql",
        gitBlob: "e9acdd4b24c17dfc254503254b570a52a79548bf",
        rawSha256: "388c4aa3bec9e7dd91d42bfe34fa0e8da2a4cc27652a7e9b9fca5c2bc8dedeb3",
      },
      {
        sourcePath: "supabase/migrations/20260713020801_set_timing_truth.sql",
        gitBlob: "5e34f762a255dcf40087e605f8f009e3215f1dff",
        rawSha256: "82ce3b62e60c0c729405ae1af487b382de44d8c618c6dd07232223acd0348bd2",
      },
      {
        sourcePath: "supabase/migrations/20260716033653_routine_day_optional.sql",
        gitBlob: "f3fa17151024a57f9e62575f6dc4e8f5898fa5af",
        rawSha256: "2b8d8b73e03f77b6034030a934a31b299529d852e406d4f74322d80866c45172",
      },
    ],
  );
});

test("fails closed when a migration source is missing", () => {
  withMigrationFixture((fixtureRoot) => {
    runGit(fixtureRoot, ["rm", "--quiet", "--", "supabase/migrations/20260716033653_routine_day_optional.sql"]);
    runGit(fixtureRoot, ["commit", "--quiet", "-m", "remove recovered source"]);
    const report = verifyRecovery({ repoRoot: fixtureRoot });
    assert.equal(report.ok, false);
    assert.match(report.issues.join("\n"), /migration source count|migration source manifest|missing committed recovered source/u);
  });
});

test("fails closed when an extra migration source appears", () => {
  withMigrationFixture((fixtureRoot, migrationDirectory) => {
    writeFileSync(path.join(migrationDirectory, "99999999999999_unadmitted.sql"), "select 1;\n", "utf8");
    runGit(fixtureRoot, ["add", "--", "supabase/migrations/99999999999999_unadmitted.sql"]);
    runGit(fixtureRoot, ["commit", "--quiet", "-m", "add unadmitted source"]);
    const report = verifyRecovery({ repoRoot: fixtureRoot });
    assert.equal(report.ok, false);
    assert.match(report.issues.join("\n"), /migration source count|migration source manifest/u);
  });
});

test("fails closed when a migration source is renamed", () => {
  withMigrationFixture((fixtureRoot) => {
    runGit(fixtureRoot, [
      "mv",
      "supabase/migrations/20260713020801_set_timing_truth.sql",
      "supabase/migrations/20260713020801_set_timing_truth_renamed.sql",
    ]);
    runGit(fixtureRoot, ["commit", "--quiet", "-m", "rename recovered source"]);
    const report = verifyRecovery({ repoRoot: fixtureRoot });
    assert.equal(report.ok, false);
    assert.match(report.issues.join("\n"), /migration source manifest|missing committed recovered source/u);
  });
});

test("fails closed when source bytes change", () => {
  withMigrationFixture((fixtureRoot, migrationDirectory) => {
    writeFileSync(path.join(migrationDirectory, "20260713020801_set_timing_truth.sql"), "changed\n", "utf8");
    runGit(fixtureRoot, ["add", "--", "supabase/migrations/20260713020801_set_timing_truth.sql"]);
    runGit(fixtureRoot, ["commit", "--quiet", "-m", "change recovered source"]);
    const report = verifyRecovery({ repoRoot: fixtureRoot });
    assert.equal(report.ok, false);
    assert.match(report.issues.join("\n"), /migration source manifest|raw sha256|git blob|normalized unit/u);
  });
});

test("accepts a clean Windows CRLF checkout while freezing committed-tree blob bytes", () => {
  withMigrationFixture((fixtureRoot, migrationDirectory) => {
    for (const source of RECOVERED_SOURCES) {
      const absolutePath = path.join(migrationDirectory, path.basename(source.path));
      const lfText = readFileSync(absolutePath, "utf8").replace(/\r\n/gu, "\n");
      writeFileSync(absolutePath, lfText.replace(/\n/gu, "\r\n"), "utf8");
    }
    const report = verifyRecovery({ repoRoot: fixtureRoot });
    assert.equal(report.ok, true, report.issues.join("\n"));
    assert.deepEqual(
      report.recoveredSources.map(({ rawDigestInputClass }) => rawDigestInputClass),
      [
        "GIT_COMMIT_TREE_BLOB_BYTES",
        "GIT_COMMIT_TREE_BLOB_BYTES",
        "GIT_COMMIT_TREE_BLOB_BYTES",
      ],
    );
  });
});

test("rejects CRLF when CRLF bytes are actually committed", () => {
  withMigrationFixture((fixtureRoot, migrationDirectory) => {
    const source = RECOVERED_SOURCES[0];
    const relativePath = source.path;
    const absolutePath = path.join(migrationDirectory, path.basename(relativePath));
    const lfText = readFileSync(absolutePath, "utf8").replace(/\r\n/gu, "\n");
    writeFileSync(absolutePath, lfText.replace(/\n/gu, "\r\n"), "utf8");
    runGit(fixtureRoot, ["add", "--", relativePath]);
    runGit(fixtureRoot, ["commit", "--quiet", "-m", "commit CRLF representation"]);

    const report = verifyRecovery({ repoRoot: fixtureRoot });
    assert.equal(report.ok, false);
    assert.match(report.issues.join("\n"), /migration source manifest|raw sha256|git blob/u);
  });
});

test("rejects a staged expected blob over a wrong committed HEAD", () => {
  withMigrationFixture((fixtureRoot) => {
    const source = RECOVERED_SOURCES[0];
    runGit(fixtureRoot, ["rm", "--quiet", "--", source.path]);
    runGit(fixtureRoot, ["commit", "--quiet", "-m", "commit wrong migration tree"]);
    runGit(fixtureRoot, ["restore", "--source=HEAD^", "--staged", "--worktree", "--", source.path]);
    const stagedEntry = runGit(fixtureRoot, ["ls-files", "--stage", "--", source.path]);
    assert.match(stagedEntry, new RegExp(source.gitBlob, "u"));

    const report = verifyRecovery({ repoRoot: fixtureRoot });
    assert.equal(report.ok, false);
    assert.match(report.issues.join("\n"), /migration source count|migration source manifest|missing committed recovered source/u);
  });
});

test("rejects a missing authoritative commitish deterministically", () => {
  withMigrationFixture((fixtureRoot) => {
    const report = verifyRecovery({
      repoRoot: fixtureRoot,
      commitish: "0000000000000000000000000000000000000000",
    });
    assert.equal(report.ok, false);
    assert.equal(report.sourceTree.commit, null);
    assert.match(report.issues.join("\n"), /cannot read authoritative Git commit tree/u);
  });
});

test("rejects an explicit commitish whose checkpoint tree is wrong", () => {
  withMigrationFixture((fixtureRoot, migrationDirectory) => {
    const source = RECOVERED_SOURCES[0];
    writeFileSync(path.join(migrationDirectory, path.basename(source.path)), "wrong checkpoint tree\n", "utf8");
    runGit(fixtureRoot, ["add", "--", source.path]);
    runGit(fixtureRoot, ["commit", "--quiet", "-m", "commit wrong checkpoint tree"]);
    const wrongCommit = runGit(fixtureRoot, ["rev-parse", "HEAD"]).trim();

    const report = verifyRecovery({ repoRoot: fixtureRoot, commitish: wrongCommit });
    assert.equal(report.ok, false);
    assert.equal(report.sourceTree.commit, wrongCommit);
    assert.match(report.issues.join("\n"), /migration source manifest|raw sha256|git blob/u);
  });
});

for (const source of RECOVERED_SOURCES) {
  test(`rejects a wrong committed blob mapping for ${source.path}`, () => {
    withMigrationFixture((fixtureRoot, migrationDirectory) => {
      writeFileSync(path.join(migrationDirectory, path.basename(source.path)), "wrong recovered blob\n", "utf8");
      runGit(fixtureRoot, ["add", "--", source.path]);
      runGit(fixtureRoot, ["commit", "--quiet", "-m", `map wrong blob for ${path.basename(source.path)}`]);

      const report = verifyRecovery({ repoRoot: fixtureRoot });
      assert.equal(report.ok, false);
      assert.match(report.issues.join("\n"), new RegExp(source.path.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
      assert.match(report.issues.join("\n"), /raw sha256|git blob/u);
    });
  });
}

test("accepts committed source identities when historical provenance object is unavailable", () => {
  withMigrationFixture((fixtureRoot) => {
    assert.throws(() => runGit(fixtureRoot, [
      "cat-file",
      "-e",
      `${FROZEN_PARITY_EVIDENCE.sourceTree.historicalRecoveryProvenance.commit}^{commit}`,
    ]));

    const report = verifyRecovery({ repoRoot: fixtureRoot });
    assert.equal(report.ok, true, report.issues.join("\n"));
    assert.deepEqual(report.historicalRecoveryProvenance, {
      classification: "HISTORICAL_ADVISORY",
      commit: "60e2c1b182b87e5a719d9c32227c1d2ccf7ebeb5",
      publicImmutableRef: null,
      availability: "UNKNOWN",
      requiredForAcceptance: false,
      resolutionAttempted: false,
    });
  });
});

test("rejects a false raw-exact claim", () => {
  const evidence = cloneEvidence();
  evidence.liveCatalog.rawByteParity = "PASS";
  const issues = validateEvidenceContract(evidence);
  assert.ok(issues.some((issue) => issue.includes("raw byte parity")));
});

test("rejects a false full-parity claim", () => {
  const evidence = cloneEvidence();
  evidence.liveCatalog.overallContentParity = "PASS";
  evidence.liveCatalog.parityGate = "PASS";
  const issues = validateEvidenceContract(evidence);
  assert.ok(issues.some((issue) => issue.includes("overall content parity")));
  assert.ok(issues.some((issue) => issue.includes("liveCatalog.parityGate")));
});

test("accepts the frozen live catalog digest class", () => {
  const evidence = cloneEvidence();
  assert.equal(
    evidence.liveCatalog.catalogDigestClass,
    "VERSION_NAME_STATEMENT_COUNT_PROVIDER_BUNDLE_CANONICAL_SHA256",
  );
  assert.deepEqual(validateEvidenceContract(evidence), []);
  assert.equal(verifyRecovery({ evidence }).liveEvidence.catalogDigestClass, evidence.liveCatalog.catalogDigestClass);
});

test("rejects a missing live catalog digest class", () => {
  const evidence = cloneEvidence();
  delete evidence.liveCatalog.catalogDigestClass;
  const report = verifyRecovery({ evidence });
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((issue) => issue.includes("liveCatalog.catalogDigestClass")));
});

test("rejects an altered live catalog digest class", () => {
  const evidence = cloneEvidence();
  evidence.liveCatalog.catalogDigestClass = "CATALOG_SHA256_WITHOUT_CANONICALIZATION_CONTRACT";
  const report = verifyRecovery({ evidence });
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((issue) => issue.includes("liveCatalog.catalogDigestClass")));
});

test("freezes the two name aliases and the measured parity denominators", () => {
  assert.equal(FROZEN_PARITY_EVIDENCE.historicalNameDrifts.length, 2);
  assert.deepEqual(
    FROZEN_PARITY_EVIDENCE.historicalNameDrifts.map(({ version }) => version),
    ["20260515090309", "20260515090322"],
  );
  assert.deepEqual(
    {
      versions: FROZEN_PARITY_EVIDENCE.liveCatalog.versionCount,
      exactNames: FROZEN_PARITY_EVIDENCE.liveCatalog.exactNameCount,
      providerRecords: FROZEN_PARITY_EVIDENCE.liveCatalog.providerStatementRecordCount,
      statementCountExact: FROZEN_PARITY_EVIDENCE.liveCatalog.statementCountExactMigrations,
      providerCanonical: FROZEN_PARITY_EVIDENCE.liveCatalog.providerCanonicalParityMigrations,
      whitespace: FROZEN_PARITY_EVIDENCE.liveCatalog.whitespaceParityMigrations,
      commentWhitespace: FROZEN_PARITY_EVIDENCE.liveCatalog.commentWhitespaceParityMigrations,
    },
    {
      versions: 101,
      exactNames: 99,
      providerRecords: 795,
      statementCountExact: 77,
      providerCanonical: 97,
      whitespace: 98,
      commentWhitespace: 99,
    },
  );
});

test("freezes the provider digest class, bundle digests, and all six normalized units", () => {
  assert.deepEqual(
    RECOVERED_SOURCES.map(({ providerDigestClass }) => providerDigestClass),
    [
      "PROVIDER_RETURNED_STATEMENT_BUNDLE_MD5",
      "PROVIDER_RETURNED_STATEMENT_BUNDLE_MD5",
      "PROVIDER_RETURNED_STATEMENT_BUNDLE_MD5",
    ],
  );
  assert.deepEqual(
    RECOVERED_SOURCES.map(({ providerBundleMd5 }) => providerBundleMd5),
    [
      "d2701d47ce960e1058d4e3d73537e01b",
      "4ceecc520442c0c798fa1b21781cef8e",
      "1988bf82878e3a26b4e065af2f7f6920",
    ],
  );
  assert.equal(RECOVERED_SOURCES.flatMap(({ normalizedUnitSha256 }) => normalizedUnitSha256).length, 6);
  assert.deepEqual(
    RECOVERED_SOURCES.flatMap(({ rawFormatStatus }) => rawFormatStatus).filter((status) => status === "UNKNOWN"),
    ["UNKNOWN"],
  );
});

test("freezes all sanitized scout manifests and mismatch classifications", () => {
  assert.deepEqual(
    {
      provider: FROZEN_PARITY_EVIDENCE.liveCatalog.providerStatementManifestSha256,
      local: FROZEN_PARITY_EVIDENCE.liveCatalog.localStatementManifestSha256,
      classification: FROZEN_PARITY_EVIDENCE.liveCatalog.classificationManifestSha256,
      combined: FROZEN_PARITY_EVIDENCE.liveCatalog.combinedEvidenceSha256,
    },
    {
      provider: "cd50d4975a5652175ba56112d82ccf12ec59da0ebd9c283bf8a868d2cd98afd6",
      local: "3be3957e8314f539784ee20b393c885a7d448f75107070d2c549f83959856b15",
      classification: "86d7597a35d4b5eb84f173f83514ab91c850fa5cd0a6de47049df918714ddb57",
      combined: "9144d6f2dad3ab191f92ff078a2e03fe189db7bc94a1b101e1c339c15309fa02",
    },
  );
  assert.deepEqual(
    FROZEN_PARITY_EVIDENCE.substantiveMismatches,
    [
      {
        version: "043",
        localCanonicalSha256: "f032075540bc114053f5d1e7453a87abda7672f0787013990b3a807c6981a902",
        providerCanonicalSha256: "a451fd20688ec48b33b0d05f380c139382029447c4ecbb0d2bc30f419e965242",
      },
      {
        version: "20260709073000",
        localCanonicalSha256: "d9531d9fab4e1c9964df35c420003ea9b7f4758b8c232a849fa7cddbc553f240",
        providerCanonicalSha256: "db9a19423ab36cf41be8d9011038f19798cd7598be9a1ae85beb79c3a49625f2",
      },
    ],
  );
});

test("freezes the two substantive mismatches and successor ordering", () => {
  assert.deepEqual(
    FROZEN_PARITY_EVIDENCE.substantiveMismatches.map(({ version }) => version),
    ["043", "20260709073000"],
  );
  assert.deepEqual(
    FROZEN_PARITY_EVIDENCE.nextPackets,
    ["FP-FIT-CONTENT-REC-002", "FP-PARITY-RATCHET-001"],
  );
});
