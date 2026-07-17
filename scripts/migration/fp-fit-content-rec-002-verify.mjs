import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const MANIFEST_RELATIVE_PATH =
  "docs/registry/migrations/FP-FIT-CONTENT-REC-002.v1.json";
export const MANIFEST_PATH = path.join(
  REPO_ROOT,
  ...MANIFEST_RELATIVE_PATH.split("/"),
);

export const EXPECTED_MANIFEST = Object.freeze({
  schemaVersion: 1,
  packetId: "FP-FIT-CONTENT-REC-002",
  repository: "fawxzzy/fawxzzy-fitness",
  base: {
    branch: "main",
    commit: "d50fb86bf9e1ec77af0eb922eb7d99da212f5264",
  },
  sourceTree: {
    migrationCount: 101,
    manifestCanonicalization: "SORTED_PATH_TAB_GIT_BLOB_OID_WITH_LF_JOIN",
    priorPacket: "FP-FIT-REC-001",
    priorManifestSha256: "d0671af0c557969ce3d24c2a9b41975adeacc0d4073103fd1513426242c1557e",
    terminalManifestSha256: "d0671af0c557969ce3d24c2a9b41975adeacc0d4073103fd1513426242c1557e",
  },
  historicalNameAliases: [
    {
      version: "20260515090309",
      gitName: "055_discord_member_links",
      providerName: "20260515103000_055_discord_member_links",
    },
    {
      version: "20260515090322",
      gitName: "056_compact_public_member_numbers",
      providerName: "20260515120000_056_compact_public_member_numbers",
    },
  ],
  migrations: [
    {
      version: "043",
      path: "supabase/migrations/043_hide_standalone_stretch_catalog_rows.sql",
      executable: {
        sourceClass: "REPLAY_SAFE_REPOSITORY_BLOB",
        gitBlob: "42a8bd9aef05ad8aeb5efd8db644bc70a711a78f",
        byteLength: 376,
        rawSha256: "f5231385f72b80ecac0c5f92616e2d1a692ee61b88cdca738386a1ddee077346",
        providerCanonicalParity: "FAIL",
        whitespaceParity: "FAIL",
        commentWhitespaceParity: "FAIL",
        preconditionHandling: "CREATES_SLUG_BEFORE_UPDATE",
      },
      providerCanonicalHistorical: {
        sourceClass: "COMMITTED_NON_EXECUTABLE_PROVENANCE_BLOB",
        provenancePath:
          "docs/registry/migrations/provenance/043_hide_standalone_stretch_catalog_rows.provider-canonical.sql.txt",
        gitBlob: "ceb74dae0443e4f5b4ef83ae56e989f9ae6d1395",
        byteLength: 303,
        rawSha256: "e0aa179c8d32e662ce747d8121bd6fcec893ec592e2daa5675a993358894c534",
        providerCanonicalParity: "PASS",
        whitespaceParity: "PASS",
        commentWhitespaceParity: "PASS",
        executableStatus: "PROHIBITED_UNTIL_TARGET_BOOTSTRAP_PROVES_SLUG_PRECONDITION",
      },
    },
    {
      version: "20260709073000",
      path: "supabase/migrations/20260709073000_billing_subscription_receipt_dedupe.sql",
      executable: {
        gitBlob: "5d15f5b7232f40e750c696b536d5b08145c64037",
        byteLength: 4231,
        rawSha256: "2ba64e3725d014abca605528175f551826f43da433caf8c30c27b96d804569ea",
      },
      providerCanonicalRepresentation: {
        evidenceClass: "PROVIDER_CANONICAL_REPRESENTATION",
        byteLength: 163,
        normalizedSha256: "db9a19423ab36cf41be8d9011038f19798cd7598be9a1ae85beb79c3a49625f2",
      },
      rawByteProvenance: "UNKNOWN",
      historicalExecutableReplacement: "PROHIBITED",
      futureGovernanceGate: "OWNER_RECEIPT_BEHAVIOR_SCHEMA_PARITY_AND_FAITHFUL_DISPOSABLE_REPLAY",
    },
  ],
  priorEvidenceSnapshot: {
    providerCanonicalParity: "97/101",
    whitespaceParity: "98/101",
    commentWhitespaceParity: "99/101",
    substantiveMismatchVersions: ["043", "20260709073000"],
  },
  terminalRepositoryProjection: {
    providerCanonicalParity: "97/101",
    whitespaceParity: "98/101",
    commentWhitespaceParity: "99/101",
    unresolvedVersions: ["043", "20260709073000"],
    rawByteParity: "UNKNOWN",
    overallContentParity: "BLOCKED",
  },
  replay: {
    zeroToHeadLocal: "BLOCKED",
    reasons: [
      "NO_ADMITTED_LOCAL_SUPABASE_RUNTIME",
      "PROVIDER_CANONICAL_043_REQUIRES_UNPROVEN_PREEXISTING_SLUG",
    ],
    substitutes: "PROHIBITED",
  },
  targetBootstrap: {
    state: "REQUIRED_BEFORE_043_PROVIDER_CANONICAL_EXECUTABLE_ADOPTION",
    proof: "FAITHFUL_DISPOSABLE_REPLAY_PROVING_SLUG_EXISTS_BEFORE_VERSION_043",
    syntheticHistoricalMutation: "PROHIBITED",
  },
  nextPacket: {
    id: "FP-PARITY-RATCHET-001",
    state: "PROHIBITED_UNTIL_TARGET_BOOTSTRAP_REPLAY_AND_GOVERNANCE_GATES",
  },
});

const EXPECTED_PATHS = [
  "docs/ops/FP-FIT-CONTENT-REC-002-RECEIPT.md",
  "docs/registry/migrations/FP-FIT-CONTENT-REC-002.v1.json",
  "docs/registry/migrations/provenance/043_hide_standalone_stretch_catalog_rows.provider-canonical.sql.txt",
  "scripts/migration/fp-fit-content-rec-002-verify.mjs",
  "scripts/migration/fp-fit-content-rec-002-verify.test.mjs",
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function runGit(repoRoot, args, { text = true } = {}) {
  const result = spawnSync("git", ["-C", repoRoot, ...args], {
    encoding: text ? "utf8" : null,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString("utf8") : result.stderr;
    throw new Error(`git ${args.join(" ")} failed: ${stderr.trim()}`);
  }
  return result.stdout;
}

function compareContract(actual, expected, contractPath, issues) {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      issues.push(`${contractPath} must be an array`);
      return;
    }
    if (actual.length !== expected.length) {
      issues.push(`${contractPath} length expected ${expected.length}, received ${actual.length}`);
    }
    for (let index = 0; index < Math.max(actual.length, expected.length); index += 1) {
      compareContract(actual[index], expected[index], `${contractPath}[${index}]`, issues);
    }
    return;
  }
  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
      issues.push(`${contractPath} must be an object`);
      return;
    }
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      issues.push(`${contractPath} keys expected ${expectedKeys.join(",")}, received ${actualKeys.join(",")}`);
    }
    for (const key of new Set([...actualKeys, ...expectedKeys])) {
      compareContract(actual[key], expected[key], `${contractPath}.${key}`, issues);
    }
    return;
  }
  if (actual !== expected) {
    issues.push(`${contractPath} expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

export function validateManifestContract(manifest) {
  const issues = [];
  compareContract(manifest, EXPECTED_MANIFEST, "manifest", issues);
  return issues;
}

function blobOidAtRef(repoRoot, ref, relativePath) {
  return runGit(repoRoot, ["rev-parse", `${ref}:${relativePath}`]).trim();
}

function readBlob(repoRoot, oid) {
  return runGit(repoRoot, ["cat-file", "blob", oid], { text: false });
}

function readBlobAtRef(repoRoot, ref, relativePath) {
  return readBlob(repoRoot, blobOidAtRef(repoRoot, ref, relativePath));
}

function migrationTreeAtRef(repoRoot, ref) {
  const output = runGit(repoRoot, ["ls-tree", "-r", "--full-tree", ref, "--", "supabase/migrations"]);
  const entries = output
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\d+ blob ([0-9a-f]{40})\t(.+)$/u);
      if (!match) {
        throw new Error(`unexpected ls-tree row: ${line}`);
      }
      return { oid: match[1], path: match[2] };
    })
    .filter(({ path: relativePath }) => relativePath.endsWith(".sql"))
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  return {
    entries,
    manifestSha256: sha256(entries.map(({ oid, path: relativePath }) => `${relativePath}\t${oid}`).join("\n")),
  };
}

function checkBlob(issues, repoRoot, label, expected, actualOid) {
  if (actualOid !== expected.gitBlob) {
    issues.push(`${label} Git blob expected ${expected.gitBlob}, received ${actualOid}`);
  }
  let bytes;
  try {
    bytes = readBlob(repoRoot, expected.gitBlob);
  } catch (error) {
    issues.push(`${label} immutable Git blob unavailable: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (bytes.length !== expected.byteLength) {
    issues.push(`${label} byte length expected ${expected.byteLength}, received ${bytes.length}`);
  }
  const rawSha256 = sha256(bytes);
  if (rawSha256 !== expected.rawSha256) {
    issues.push(`${label} raw sha256 expected ${expected.rawSha256}, received ${rawSha256}`);
  }
}

export function verifyReconciliation({
  repoRoot = REPO_ROOT,
  ref = "HEAD",
} = {}) {
  const issues = [];
  let manifest;
  try {
    manifest = JSON.parse(readBlobAtRef(repoRoot, ref, MANIFEST_RELATIVE_PATH).toString("utf8"));
  } catch (error) {
    return {
      ok: false,
      packet: "FP-FIT-CONTENT-REC-002",
      ref,
      issues: [
        `cannot read provenance manifest from ${ref}: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
  issues.push(...validateManifestContract(manifest));

  try {
    runGit(repoRoot, ["merge-base", "--is-ancestor", EXPECTED_MANIFEST.base.commit, ref]);
  } catch {
    issues.push(`exact base ${EXPECTED_MANIFEST.base.commit} is not an ancestor of ${ref}`);
  }

  let priorTree;
  let currentTree;
  try {
    priorTree = migrationTreeAtRef(repoRoot, EXPECTED_MANIFEST.base.commit);
    currentTree = migrationTreeAtRef(repoRoot, ref);
    if (priorTree.entries.length !== EXPECTED_MANIFEST.sourceTree.migrationCount) {
      issues.push(`prior migration count expected ${EXPECTED_MANIFEST.sourceTree.migrationCount}, received ${priorTree.entries.length}`);
    }
    if (priorTree.manifestSha256 !== EXPECTED_MANIFEST.sourceTree.priorManifestSha256) {
      issues.push(`prior FP-FIT-REC-001 source manifest expected ${EXPECTED_MANIFEST.sourceTree.priorManifestSha256}, received ${priorTree.manifestSha256}`);
    }
    if (currentTree.entries.length !== EXPECTED_MANIFEST.sourceTree.migrationCount) {
      issues.push(`current migration count expected ${EXPECTED_MANIFEST.sourceTree.migrationCount}, received ${currentTree.entries.length}`);
    }
    if (currentTree.manifestSha256 !== EXPECTED_MANIFEST.sourceTree.terminalManifestSha256) {
      issues.push(`terminal source manifest expected ${EXPECTED_MANIFEST.sourceTree.terminalManifestSha256}, received ${currentTree.manifestSha256}`);
    }
  } catch (error) {
    issues.push(`cannot verify migration source trees: ${error instanceof Error ? error.message : String(error)}`);
  }

  const version043 = EXPECTED_MANIFEST.migrations[0];
  const versionBilling = EXPECTED_MANIFEST.migrations[1];
  try {
    const oid043 = blobOidAtRef(repoRoot, ref, version043.path);
    checkBlob(issues, repoRoot, "043 executable", version043.executable, oid043);
    const providerProvenanceOid = blobOidAtRef(
      repoRoot,
      ref,
      version043.providerCanonicalHistorical.provenancePath,
    );
    checkBlob(
      issues,
      repoRoot,
      "043 provider-canonical historical provenance",
      version043.providerCanonicalHistorical,
      providerProvenanceOid,
    );
    const executableText = readBlob(repoRoot, oid043).toString("utf8");
    const slugCreateIndex = executableText.indexOf("add column if not exists slug text null");
    const slugUseIndex = executableText.indexOf("update public.exercises");
    if (slugCreateIndex < 0 || slugUseIndex < 0 || slugCreateIndex > slugUseIndex) {
      issues.push("043 executable must create slug before the catalog update uses it");
    }
  } catch (error) {
    issues.push(`cannot verify 043 identities: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const billingOid = blobOidAtRef(repoRoot, ref, versionBilling.path);
    checkBlob(issues, repoRoot, "20260709073000 executable", versionBilling.executable, billingOid);
  } catch (error) {
    issues.push(`cannot verify 20260709073000 identity: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const changedPaths = runGit(repoRoot, ["diff", "--name-only", `${EXPECTED_MANIFEST.base.commit}..${ref}`])
      .split(/\r?\n/u)
      .filter(Boolean)
      .sort();
    if (JSON.stringify(changedPaths) !== JSON.stringify(EXPECTED_PATHS)) {
      issues.push(`stacked path allowlist expected ${EXPECTED_PATHS.join(",")}, received ${changedPaths.join(",")}`);
    }
  } catch (error) {
    issues.push(`cannot verify stacked path allowlist: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    ok: issues.length === 0,
    packet: EXPECTED_MANIFEST.packetId,
    ref,
    baseCommit: EXPECTED_MANIFEST.base.commit,
    sourceTree: {
      migrationCount: currentTree?.entries.length ?? null,
      priorManifestSha256: priorTree?.manifestSha256 ?? null,
      terminalManifestSha256: currentTree?.manifestSha256 ?? null,
    },
    historicalNameAliasCount: EXPECTED_MANIFEST.historicalNameAliases.length,
    version043: {
      executableGitBlob: version043.executable.gitBlob,
      providerCanonicalHistoricalProvenancePath: version043.providerCanonicalHistorical.provenancePath,
      providerCanonicalHistoricalGitBlob: version043.providerCanonicalHistorical.gitBlob,
      providerCanonicalHistoricalStatus: version043.providerCanonicalHistorical.executableStatus,
      preconditionHandling: version043.executable.preconditionHandling,
    },
    version20260709073000: {
      executableGitBlob: versionBilling.executable.gitBlob,
      providerEvidenceClass: versionBilling.providerCanonicalRepresentation.evidenceClass,
      providerNormalizedSha256: versionBilling.providerCanonicalRepresentation.normalizedSha256,
      rawByteProvenance: versionBilling.rawByteProvenance,
      historicalExecutableReplacement: versionBilling.historicalExecutableReplacement,
    },
    terminalRepositoryProjection: EXPECTED_MANIFEST.terminalRepositoryProjection,
    zeroToHeadLocalReplay: EXPECTED_MANIFEST.replay.zeroToHeadLocal,
    targetBootstrap: EXPECTED_MANIFEST.targetBootstrap,
    nextPacket: EXPECTED_MANIFEST.nextPacket,
    issues,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = verifyReconciliation();
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
}
