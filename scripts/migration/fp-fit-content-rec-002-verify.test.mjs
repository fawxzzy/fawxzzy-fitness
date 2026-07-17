import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  EXPECTED_MANIFEST,
  MANIFEST_PATH,
  validateManifestContract,
  verifyReconciliation,
} from "./fp-fit-content-rec-002-verify.mjs";

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
  assert.match(report.issues.join("\n"), /cannot verify 043 identities/u);
  assert.match(report.issues.join("\n"), /stacked path allowlist/u);
});
