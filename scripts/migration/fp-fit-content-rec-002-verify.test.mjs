import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import {
  EXPECTED_MANIFEST,
  MANIFEST_PATH,
  MANIFEST_RELATIVE_PATH,
  REPO_ROOT,
  validateManifestContract,
  verifyReconciliation,
} from "./fp-fit-content-rec-002-verify.mjs";

const VERIFIER_RELATIVE_PATH = "scripts/migration/fp-fit-content-rec-002-verify.mjs";

function cloneExpectedManifest() {
  return structuredClone(EXPECTED_MANIFEST);
}

function expectContractFailure(mutate, pathPattern) {
  const manifest = cloneExpectedManifest();
  mutate(manifest);
  const issues = validateManifestContract(manifest);
  assert.ok(issues.length > 0);
  assert.match(issues.join("\n"), pathPattern);
}

function runGit(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function withDetachedFixture(run) {
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "fp-fit-content-rec-002-"));
  try {
    const sourceHead = runGit(REPO_ROOT, ["rev-parse", "HEAD"]);
    runGit(REPO_ROOT, ["clone", "--no-hardlinks", "--quiet", ".", fixtureRoot]);
    runGit(fixtureRoot, ["checkout", "--detach", "--quiet", sourceHead]);
    return run(fixtureRoot);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
}

function writeDriftedFixtureManifest(fixtureRoot) {
  const manifestPath = path.join(fixtureRoot, ...MANIFEST_RELATIVE_PATH.split("/"));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.packetId = "DRIFTED-PACKET";
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function runVerifierCli(args, repoRoot = REPO_ROOT) {
  return spawnSync(
    process.execPath,
    [path.join(repoRoot, ...VERIFIER_RELATIVE_PATH.split("/")), ...args],
    {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    },
  );
}

function expectCliArgumentFailure(args, messagePattern) {
  const result = runVerifierCli(args);
  assert.equal(result.status, 2, result.stderr);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, messagePattern);
  assert.match(result.stderr, /Usage: node fp-fit-content-rec-002-verify\.mjs/u);
}

test("accepts the exact committed review-settled packet", () => {
  const report = verifyReconciliation();
  assert.equal(report.ok, true, report.issues.join("\n"));
  assert.equal(report.sourceTree.migrationCount, 101);
  assert.equal(report.historicalNameAliasCount, 2);
  assert.equal(report.version043.executableGitBlob, "42a8bd9aef05ad8aeb5efd8db644bc70a711a78f");
  assert.equal(
    report.version043.providerCanonicalHistoricalProvenancePath,
    "docs/registry/migrations/provenance/043_hide_standalone_stretch_catalog_rows.provider-canonical.sql.txt",
  );
  assert.equal(
    report.version043.providerCanonicalHistoricalGitBlob,
    "ceb74dae0443e4f5b4ef83ae56e989f9ae6d1395",
  );
  assert.equal(report.version043.preconditionHandling, "CREATES_SLUG_BEFORE_UPDATE");
  assert.equal(report.version20260709073000.rawByteProvenance, "UNKNOWN");
  assert.equal(report.version20260709073000.historicalExecutableReplacement, "PROHIBITED");
  assert.equal(report.terminalRepositoryProjection.overallContentParity, "BLOCKED");
  assert.equal(report.zeroToHeadLocalReplay, "BLOCKED");
  assert.equal(report.targetBootstrap.state, "REQUIRED_BEFORE_043_PROVIDER_CANONICAL_EXECUTABLE_ADOPTION");
});

test("manifest contains no SQL body field or provider representation body", () => {
  const manifestText = readFileSync(MANIFEST_PATH, "utf8");
  const manifest = JSON.parse(manifestText);
  assert.equal(validateManifestContract(manifest).length, 0);
  assert.doesNotMatch(manifestText, /"(?:sql|body|statement|sourceText)"\s*:/iu);
});

test("rejects a changed 043 executable identity", () => {
  expectContractFailure(
    (manifest) => {
      manifest.migrations[0].executable.gitBlob = manifest.migrations[0].providerCanonicalHistorical.gitBlob;
    },
    /manifest\.migrations\[0\]\.executable\.gitBlob/u,
  );
});

test("rejects weakened provider-canonical 043 governance state", () => {
  expectContractFailure(
    (manifest) => {
      manifest.migrations[0].providerCanonicalHistorical.executableStatus = "EXECUTABLE";
    },
    /manifest\.migrations\[0\]\.providerCanonicalHistorical\.executableStatus/u,
  );
});

test("rejects provider-canonical 043 provenance path drift", () => {
  expectContractFailure(
    (manifest) => {
      manifest.migrations[0].providerCanonicalHistorical.provenancePath =
        "supabase/migrations/043_hide_standalone_stretch_catalog_rows.sql";
    },
    /manifest\.migrations\[0\]\.providerCanonicalHistorical\.provenancePath/u,
  );
});

test("rejects provider-canonical 043 byte-contract drift", () => {
  expectContractFailure(
    (manifest) => {
      manifest.migrations[0].providerCanonicalHistorical.rawSha256 = "0".repeat(64);
    },
    /manifest\.migrations\[0\]\.providerCanonicalHistorical\.rawSha256/u,
  );
  expectContractFailure(
    (manifest) => {
      manifest.migrations[0].providerCanonicalHistorical.byteLength = 302;
    },
    /manifest\.migrations\[0\]\.providerCanonicalHistorical\.byteLength/u,
  );
});

test("rejects changed 20260709073000 executable identity", () => {
  expectContractFailure(
    (manifest) => {
      manifest.migrations[1].executable.rawSha256 = "0".repeat(64);
    },
    /manifest\.migrations\[1\]\.executable\.rawSha256/u,
  );
});

test("rejects a raw-byte recovery claim for provider-canonical representation", () => {
  expectContractFailure(
    (manifest) => {
      manifest.migrations[1].rawByteProvenance = "RECOVERED";
    },
    /manifest\.migrations\[1\]\.rawByteProvenance/u,
  );
});

test("rejects authorization to replace the 20260709073000 executable", () => {
  expectContractFailure(
    (manifest) => {
      manifest.migrations[1].historicalExecutableReplacement = "AUTHORIZED";
    },
    /manifest\.migrations\[1\]\.historicalExecutableReplacement/u,
  );
});

test("rejects denominator, alias, or prior source-manifest drift", () => {
  expectContractFailure(
    (manifest) => {
      manifest.sourceTree.migrationCount = 100;
    },
    /manifest\.sourceTree\.migrationCount/u,
  );
  expectContractFailure(
    (manifest) => {
      manifest.historicalNameAliases.pop();
    },
    /manifest\.historicalNameAliases/u,
  );
  expectContractFailure(
    (manifest) => {
      manifest.sourceTree.priorManifestSha256 = "0".repeat(64);
    },
    /manifest\.sourceTree\.priorManifestSha256/u,
  );
});

test("rejects false overall parity or replay success", () => {
  expectContractFailure(
    (manifest) => {
      manifest.terminalRepositoryProjection.overallContentParity = "PASS";
    },
    /manifest\.terminalRepositoryProjection\.overallContentParity/u,
  );
  expectContractFailure(
    (manifest) => {
      manifest.replay.zeroToHeadLocal = "PASS";
    },
    /manifest\.replay\.zeroToHeadLocal/u,
  );
});

test("base ref fails because it lacks this packet's provenance contract", () => {
  const report = verifyReconciliation({ ref: EXPECTED_MANIFEST.base.commit });
  assert.equal(report.ok, false);
  assert.match(
    report.issues.join("\n"),
    /cannot read provenance manifest from [0-9a-f]{40}/u,
  );
});

test("rejects manifest drift committed on the requested ref", () => {
  withDetachedFixture((fixtureRoot) => {
    writeDriftedFixtureManifest(fixtureRoot);
    runGit(fixtureRoot, ["add", "--", MANIFEST_RELATIVE_PATH]);
    runGit(fixtureRoot, [
      "-c",
      "user.name=Fitness Verifier Test",
      "-c",
      "user.email=fitness-verifier@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "test: drift committed manifest",
    ]);

    const report = verifyReconciliation({ repoRoot: fixtureRoot, ref: "HEAD" });
    assert.equal(report.ok, false);
    assert.match(report.issues.join("\n"), /manifest\.packetId/u);
  });
});

test("ignores uncommitted worktree manifest drift for a requested ref", () => {
  withDetachedFixture((fixtureRoot) => {
    writeDriftedFixtureManifest(fixtureRoot);

    const report = verifyReconciliation({ repoRoot: fixtureRoot, ref: "HEAD" });
    assert.equal(report.ok, true, report.issues.join("\n"));
  });
});

test("CLI with no arguments verifies HEAD", () => {
  const result = runVerifierCli([]);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true, report.issues.join("\n"));
  assert.equal(report.ref, "HEAD");
});

test("CLI --ref verifies the exact requested head", () => {
  const exactHead = runGit(REPO_ROOT, ["rev-parse", "HEAD"]);
  const result = runVerifierCli(["--ref", exactHead]);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true, report.issues.join("\n"));
  assert.equal(report.ref, exactHead);
});

test("CLI --ref rejects the base ref that lacks this packet manifest", () => {
  const result = runVerifierCli(["--ref", EXPECTED_MANIFEST.base.commit]);
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.equal(report.ref, EXPECTED_MANIFEST.base.commit);
  assert.match(report.issues.join("\n"), /cannot read provenance manifest from [0-9a-f]{40}/u);
});

test("CLI rejects an unknown flag", () => {
  expectCliArgumentFailure(["--unknown"], /unknown flag: --unknown/u);
});

test("CLI rejects a missing --ref value", () => {
  expectCliArgumentFailure(["--ref"], /--ref requires a commitish value/u);
});

test("CLI rejects duplicate --ref arguments", () => {
  expectCliArgumentFailure(
    ["--ref", "HEAD", "--ref", "HEAD"],
    /duplicate --ref argument/u,
  );
});

test("CLI rejects extra positional arguments", () => {
  expectCliArgumentFailure(["HEAD"], /unexpected positional argument: HEAD/u);
});

test("CLI requested-ref proof ignores unstaged and staged manifest drift", () => {
  withDetachedFixture((fixtureRoot) => {
    const fixtureVerifierPath = path.join(
      fixtureRoot,
      ...VERIFIER_RELATIVE_PATH.split("/"),
    );
    const currentVerifierPath = path.join(
      REPO_ROOT,
      ...VERIFIER_RELATIVE_PATH.split("/"),
    );
    writeFileSync(fixtureVerifierPath, readFileSync(currentVerifierPath, "utf8"), "utf8");
    writeDriftedFixtureManifest(fixtureRoot);

    const unstagedResult = runVerifierCli(["--ref", "HEAD"], fixtureRoot);
    assert.equal(unstagedResult.status, 0, unstagedResult.stderr);
    assert.equal(JSON.parse(unstagedResult.stdout).ref, "HEAD");

    runGit(fixtureRoot, ["add", "--", MANIFEST_RELATIVE_PATH]);
    const stagedResult = runVerifierCli(["--ref", "HEAD"], fixtureRoot);
    assert.equal(stagedResult.status, 0, stagedResult.stderr);
    assert.equal(JSON.parse(stagedResult.stdout).ref, "HEAD");
  });
});
