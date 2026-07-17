import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
export const REPO_ROOT = path.resolve(path.dirname(currentFilePath), "..", "..");

export const FROZEN_PARITY_EVIDENCE = Object.freeze({
  sourceTree: Object.freeze({
    migrationCount: 101,
    firstVersion: "001",
    lastVersion: "20260716033653",
    manifestClass: "PATH_TAB_GIT_BLOB_LF_NO_TRAILING_LF_SHA256",
    manifestSha256: "d0671af0c557969ce3d24c2a9b41975adeacc0d4073103fd1513426242c1557e",
    recoveryCommit: "60e2c1b182b87e5a719d9c32227c1d2ccf7ebeb5",
  }),
  liveCatalog: Object.freeze({
    versionCount: 101,
    exactNameCount: 99,
    providerStatementRecordCount: 795,
    statementCountExactMigrations: 77,
    providerCanonicalParityMigrations: 97,
    whitespaceParityMigrations: 98,
    commentWhitespaceParityMigrations: 99,
    rawByteParity: "UNKNOWN",
    overallContentParity: "FAIL",
    parityGate: "BLOCKED",
    catalogDigestClass: "VERSION_NAME_STATEMENT_COUNT_PROVIDER_BUNDLE_CANONICAL_SHA256",
    catalogSha256: "7856d247d6f18b7d2c97a18273bc6e235b9db382b4cb5c4868ed6e97bbc80e3",
    providerStatementManifestSha256: "cd50d4975a5652175ba56112d82ccf12ec59da0ebd9c283bf8a868d2cd98afd6",
    localStatementManifestSha256: "3be3957e8314f539784ee20b393c885a7d448f75107070d2c549f83959856b15",
    classificationManifestSha256: "86d7597a35d4b5eb84f173f83514ab91c850fa5cd0a6de47049df918714ddb57",
    combinedEvidenceSha256: "9144d6f2dad3ab191f92ff078a2e03fe189db7bc94a1b101e1c339c15309fa02",
  }),
  historicalNameDrifts: Object.freeze([
    Object.freeze({
      version: "20260515090309",
      gitName: "055_discord_member_links",
      liveName: "20260515103000_055_discord_member_links",
    }),
    Object.freeze({
      version: "20260515090322",
      gitName: "056_compact_public_member_numbers",
      liveName: "20260515120000_056_compact_public_member_numbers",
    }),
  ]),
  substantiveMismatches: Object.freeze([
    Object.freeze({
      version: "043",
      localCanonicalSha256: "f032075540bc114053f5d1e7453a87abda7672f0787013990b3a807c6981a902",
      providerCanonicalSha256: "a451fd20688ec48b33b0d05f380c139382029447c4ecbb0d2bc30f419e965242",
    }),
    Object.freeze({
      version: "20260709073000",
      localCanonicalSha256: "d9531d9fab4e1c9964df35c420003ea9b7f4758b8c232a849fa7cddbc553f240",
      providerCanonicalSha256: "db9a19423ab36cf41be8d9011038f19798cd7598be9a1ae85beb79c3a49625f2",
    }),
  ]),
  representationOnly: Object.freeze([
    Object.freeze({
      version: "20260610121500",
      class: "WHITESPACE_ONLY",
      normalizedSha256: "b5e0b3df17491c9bdca450fa51e43ca1dea20e19680759f7decba1351a5c18e2",
    }),
    Object.freeze({
      version: "20260709074946",
      class: "COMMENT_AND_WHITESPACE_ONLY",
      normalizedSha256: "c6893448c38ea7be6a184e9fa07887ec9176b24c9153c09c65e254fc0ea1c64f",
    }),
  ]),
  nextPackets: Object.freeze(["FP-FIT-CONTENT-REC-002", "FP-PARITY-RATCHET-001"]),
});

export const RECOVERED_SOURCES = Object.freeze([
  Object.freeze({
    path: "supabase/migrations/20260713013116_exercise_timer_truth.sql",
    gitBlob: "e9acdd4b24c17dfc254503254b570a52a79548bf",
    rawSha256: "388c4aa3bec9e7dd91d42bfe34fa0e8da2a4cc27652a7e9b9fca5c2bc8dedeb3",
    providerDigestClass: "PROVIDER_RETURNED_STATEMENT_BUNDLE_MD5",
    providerBundleMd5: "d2701d47ce960e1058d4e3d73537e01b",
    localUnitMode: "LEXICAL_STATEMENTS",
    providerStatementCount: 3,
    normalizedUnitSha256: Object.freeze([
      "32216668d108ab602f991a45fa6ab6362cba9ed5948836167923121e30709580",
      "dc135c702b57d8c869d9d1f5e457e844fbcff00a1d75ead9b7d69be3f168436f",
      "04febe520a65b388e3ccc73b9be651067746ea8d70c4f7d293c837ee20630222",
    ]),
    rawFormatStatus: Object.freeze(["NOT_CLAIMED", "UNKNOWN", "NOT_CLAIMED"]),
    unknownCanonicalParitySha256: "e4e18ab38d3d33f71bb4c4b3f34f4963460bd503898236d5ad5efb436f566f19",
  }),
  Object.freeze({
    path: "supabase/migrations/20260713020801_set_timing_truth.sql",
    gitBlob: "5e34f762a255dcf40087e605f8f009e3215f1dff",
    rawSha256: "82ce3b62e60c0c729405ae1af487b382de44d8c618c6dd07232223acd0348bd2",
    providerDigestClass: "PROVIDER_RETURNED_STATEMENT_BUNDLE_MD5",
    providerBundleMd5: "4ceecc520442c0c798fa1b21781cef8e",
    localUnitMode: "LEXICAL_STATEMENTS",
    providerStatementCount: 2,
    normalizedUnitSha256: Object.freeze([
      "e96f67ff55bc1494178562634b1937096e2286a57f08f407e74f753a3d68d491",
      "f7527c9aa3949df500cd24664bf907817cdd20491a148ae0ae672838b666cc58",
    ]),
    rawFormatStatus: Object.freeze(["NOT_CLAIMED", "NOT_CLAIMED"]),
  }),
  Object.freeze({
    path: "supabase/migrations/20260716033653_routine_day_optional.sql",
    gitBlob: "f3fa17151024a57f9e62575f6dc4e8f5898fa5af",
    rawSha256: "2b8d8b73e03f77b6034030a934a31b299529d852e406d4f74322d80866c45172",
    providerDigestClass: "PROVIDER_RETURNED_STATEMENT_BUNDLE_MD5",
    providerBundleMd5: "1988bf82878e3a26b4e065af2f7f6920",
    localUnitMode: "PROVIDER_GROUPED_SOURCE",
    providerStatementCount: 1,
    normalizedUnitSha256: Object.freeze([
      "b1c9824de98372e947d79ea5dc381dbb875c30311242e04fe3985b53c6d3bd02",
    ]),
    rawFormatStatus: Object.freeze(["NOT_CLAIMED"]),
  }),
]);

export const NORMALIZED_UNIT_MANIFEST_SHA256 = "3c789038ba4d6c41572d1c383844456db762ca9b6832ae95c1ff2f63a100460e";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function gitBlobOid(contents) {
  // Git's Windows checkout may materialize CRLF while the committed blob remains LF.
  // The recovery manifest freezes committed Git identity, not platform checkout EOLs.
  const normalizedContents = Buffer.from(contents.toString("utf8").replace(/\r\n/gu, "\n"), "utf8");
  const header = Buffer.from(`blob ${normalizedContents.length}\0`, "utf8");
  return createHash("sha1").update(header).update(normalizedContents).digest("hex");
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function collectMigrationPaths(directory, relativeDirectory = "supabase/migrations") {
  const paths = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = `${relativeDirectory}/${entry.name}`;
    if (entry.isSymbolicLink()) {
      throw new Error(`symbolic links are not allowed in the migration source tree: ${toPosixPath(relativePath)}`);
    }
    if (entry.isDirectory()) {
      paths.push(...collectMigrationPaths(absolutePath, relativePath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".sql")) {
      paths.push(toPosixPath(relativePath));
    }
  }
  return paths.sort();
}

function splitSqlStatements(sql) {
  const statements = [];
  let current = "";
  let mode = "normal";
  let dollarTag = "";

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1] ?? "";
    current += char;

    if (mode === "line-comment") {
      if (char === "\n") mode = "normal";
      continue;
    }
    if (mode === "block-comment") {
      if (char === "*" && next === "/") {
        current += next;
        index += 1;
        mode = "normal";
      }
      continue;
    }
    if (mode === "single-quote") {
      if (char === "'" && next === "'") {
        current += next;
        index += 1;
      } else if (char === "'") {
        mode = "normal";
      }
      continue;
    }
    if (mode === "double-quote") {
      if (char === '"' && next === '"') {
        current += next;
        index += 1;
      } else if (char === '"') {
        mode = "normal";
      }
      continue;
    }
    if (mode === "dollar-quote") {
      if (sql.startsWith(dollarTag, index)) {
        current += dollarTag.slice(1);
        index += dollarTag.length - 1;
        mode = "normal";
      }
      continue;
    }

    if (char === "-" && next === "-") {
      current += next;
      index += 1;
      mode = "line-comment";
      continue;
    }
    if (char === "/" && next === "*") {
      current += next;
      index += 1;
      mode = "block-comment";
      continue;
    }
    if (char === "'") {
      mode = "single-quote";
      continue;
    }
    if (char === '"') {
      mode = "double-quote";
      continue;
    }
    if (char === "$") {
      const match = sql.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/u);
      if (match) {
        dollarTag = match[0];
        current += dollarTag.slice(1);
        index += dollarTag.length - 1;
        mode = "dollar-quote";
        continue;
      }
    }
    if (char === ";") {
      const statement = current.slice(0, -1).trim();
      if (statement) statements.push(statement);
      current = "";
    }
  }

  const remainder = current.trim();
  if (remainder) statements.push(remainder);
  return statements;
}

function normalizeStatement(statement) {
  return statement
    .replace(/\r\n?/gu, "\n")
    .trim()
    .replace(/;\s*$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function parseVersionAndName(relativePath) {
  const fileName = path.posix.basename(relativePath);
  const match = fileName.match(/^([^_]+)_(.+)\.sql$/u);
  if (!match) return null;
  return { version: match[1], name: match[2] };
}

function compareField(issues, actual, expected, label) {
  if (actual !== expected) issues.push(`${label}: expected ${expected}, got ${actual}`);
}

export function validateEvidenceContract(evidence = FROZEN_PARITY_EVIDENCE) {
  const issues = [];
  const expected = FROZEN_PARITY_EVIDENCE;
  const actualCatalog = evidence?.liveCatalog ?? {};
  const expectedCatalog = expected.liveCatalog;
  for (const key of [
    "versionCount",
    "exactNameCount",
    "providerStatementRecordCount",
    "statementCountExactMigrations",
    "providerCanonicalParityMigrations",
    "whitespaceParityMigrations",
    "commentWhitespaceParityMigrations",
    "rawByteParity",
    "overallContentParity",
    "parityGate",
    "catalogSha256",
    "providerStatementManifestSha256",
    "localStatementManifestSha256",
    "classificationManifestSha256",
    "combinedEvidenceSha256",
  ]) {
    compareField(issues, actualCatalog[key], expectedCatalog[key], `liveCatalog.${key}`);
  }

  if (actualCatalog.rawByteParity === "PASS") {
    issues.push("raw byte parity cannot be promoted to PASS from provider-returned canonical statement text");
  }
  if (actualCatalog.overallContentParity === "PASS") {
    issues.push("overall content parity cannot be PASS while substantive mismatches remain");
  }
  compareField(issues, evidence?.historicalNameDrifts?.length, 2, "historicalNameDrifts.length");
  compareField(issues, evidence?.substantiveMismatches?.length, 2, "substantiveMismatches.length");
  compareField(issues, evidence?.representationOnly?.length, 2, "representationOnly.length");
  compareField(issues, JSON.stringify(evidence?.historicalNameDrifts), JSON.stringify(expected.historicalNameDrifts), "historicalNameDrifts");
  compareField(issues, JSON.stringify(evidence?.substantiveMismatches), JSON.stringify(expected.substantiveMismatches), "substantiveMismatches");
  compareField(issues, JSON.stringify(evidence?.representationOnly), JSON.stringify(expected.representationOnly), "representationOnly");
  compareField(issues, JSON.stringify(evidence?.nextPackets), JSON.stringify(expected.nextPackets), "nextPackets");
  return issues;
}

export function verifyRecovery({ repoRoot = REPO_ROOT, evidence = FROZEN_PARITY_EVIDENCE } = {}) {
  const issues = validateEvidenceContract(evidence);
  const migrationDirectory = path.join(repoRoot, "supabase", "migrations");
  let migrationPaths = [];

  try {
    migrationPaths = collectMigrationPaths(migrationDirectory);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
  }

  const manifestEntries = [];
  const identities = [];
  for (const relativePath of migrationPaths) {
    const absolutePath = path.join(repoRoot, ...relativePath.split("/"));
    const contents = readFileSync(absolutePath);
    manifestEntries.push(`${relativePath}\t${gitBlobOid(contents)}`);
    const identity = parseVersionAndName(relativePath);
    if (!identity) {
      issues.push(`invalid migration source name: ${relativePath}`);
    } else {
      identities.push(identity);
    }
  }

  const manifestSha256 = sha256(manifestEntries.join("\n"));
  compareField(issues, migrationPaths.length, FROZEN_PARITY_EVIDENCE.sourceTree.migrationCount, "migration source count");
  compareField(issues, manifestSha256, FROZEN_PARITY_EVIDENCE.sourceTree.manifestSha256, "migration source manifest");

  const versions = identities.map((identity) => identity.version);
  compareField(issues, new Set(versions).size, versions.length, "unique migration version count");
  compareField(issues, versions[0], FROZEN_PARITY_EVIDENCE.sourceTree.firstVersion, "first migration version");
  compareField(issues, versions.at(-1), FROZEN_PARITY_EVIDENCE.sourceTree.lastVersion, "last migration version");

  const recoveredReports = [];
  for (const expected of RECOVERED_SOURCES) {
    const absolutePath = path.join(repoRoot, ...expected.path.split("/"));
    if (!existsSync(absolutePath) || !lstatSync(absolutePath).isFile()) {
      issues.push(`missing recovered source: ${expected.path}`);
      continue;
    }
    const contents = readFileSync(absolutePath);
    const rawSha256 = sha256(contents);
    const gitBlob = gitBlobOid(contents);
    compareField(issues, rawSha256, expected.rawSha256, `${expected.path} raw sha256`);
    compareField(issues, gitBlob, expected.gitBlob, `${expected.path} git blob`);

    const sourceText = contents.toString("utf8");
    const units = expected.localUnitMode === "PROVIDER_GROUPED_SOURCE"
      ? [sourceText]
      : splitSqlStatements(sourceText);
    const unitDigests = units.map((unit) => sha256(normalizeStatement(unit)));
    compareField(issues, units.length, expected.providerStatementCount, `${expected.path} normalized unit count`);
    compareField(issues, JSON.stringify(unitDigests), JSON.stringify(expected.normalizedUnitSha256), `${expected.path} normalized unit digests`);

    recoveredReports.push({
      path: expected.path,
      gitBlob,
      rawSha256,
      providerDigestClass: expected.providerDigestClass,
      providerBundleMd5: expected.providerBundleMd5,
      normalizedUnitCount: unitDigests.length,
      rawFormatStatus: expected.rawFormatStatus,
    });
  }

  const normalizedUnitManifestSha256 = sha256(
    RECOVERED_SOURCES.flatMap((source) => source.normalizedUnitSha256).join("\n"),
  );
  compareField(issues, normalizedUnitManifestSha256, NORMALIZED_UNIT_MANIFEST_SHA256, "normalized unit manifest");
  const rawFormatUnknownCount = RECOVERED_SOURCES
    .flatMap((source) => source.rawFormatStatus)
    .filter((status) => status === "UNKNOWN").length;
  compareField(issues, rawFormatUnknownCount, 1, "raw format UNKNOWN count");

  return {
    ok: issues.length === 0,
    packet: "FP-FIT-REC-001",
    sourceTree: {
      migrationCount: migrationPaths.length,
      versionCount: new Set(versions).size,
      firstVersion: versions[0] ?? null,
      lastVersion: versions.at(-1) ?? null,
      manifestSha256,
    },
    recoveredSources: recoveredReports,
    normalizedStatementUnits: {
      count: RECOVERED_SOURCES.flatMap((source) => source.normalizedUnitSha256).length,
      manifestSha256: normalizedUnitManifestSha256,
      rawFormatUnknownCount,
    },
    liveEvidence: {
      versionCount: evidence?.liveCatalog?.versionCount,
      exactNameCount: evidence?.liveCatalog?.exactNameCount,
      providerStatementRecordCount: evidence?.liveCatalog?.providerStatementRecordCount,
      statementCountExactMigrations: evidence?.liveCatalog?.statementCountExactMigrations,
      providerCanonicalParityMigrations: evidence?.liveCatalog?.providerCanonicalParityMigrations,
      whitespaceParityMigrations: evidence?.liveCatalog?.whitespaceParityMigrations,
      commentWhitespaceParityMigrations: evidence?.liveCatalog?.commentWhitespaceParityMigrations,
      rawByteParity: evidence?.liveCatalog?.rawByteParity,
      overallContentParity: evidence?.liveCatalog?.overallContentParity,
      parityGate: evidence?.liveCatalog?.parityGate,
    },
    issues,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = verifyRecovery();
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
}
