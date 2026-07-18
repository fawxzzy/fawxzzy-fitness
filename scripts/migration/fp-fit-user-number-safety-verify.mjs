#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
export const REPO_ROOT = path.resolve(path.dirname(currentFilePath), "..", "..");
export const BASE_COMMIT = "bab188a51819a6fb2f8aeabe73627d4ed63dcaa4";
export const MIGRATION_PATH = "supabase/migrations/20260718015422_retire_human_member_number_compaction.sql";
export const EXPECTED_CHANGED_PATHS = Object.freeze([
  "docs/PLAYBOOK_NOTES.md",
  "docs/ops/FP-FIT-USER-NUMBER-SAFETY-001.md",
  "scripts/audit-member-numbers.mjs",
  "scripts/doctor-discord-community.mjs",
  "scripts/member-number-safety-core.mjs",
  "scripts/member-number-safety-core.test.mjs",
  "scripts/migration/fp-fit-user-number-safety-verify.mjs",
  "scripts/migration/fp-fit-user-number-safety-verify.test.mjs",
  MIGRATION_PATH,
]);

export const HISTORICAL_MIGRATIONS = Object.freeze([
  Object.freeze({
    path: "supabase/migrations/044_real_user_numbers.sql",
    sha256: "2350c5c2841b8e049fa098c26492ba4033baf70f04bb5b93f505cab85637809b",
  }),
  Object.freeze({
    path: "supabase/migrations/20260515090322_056_compact_public_member_numbers.sql",
    sha256: "a4e7f706604d356df9c72a83386f5f093eee9b6892b1b1b11fc7632aa153281b",
  }),
  Object.freeze({
    path: "supabase/migrations/20260515160000_060_discord_member_number_sync_queue.sql",
    sha256: "c9624c8c86acac9d605c80675ba0162d82cd3408a204052307b8e3a9f2701ab5",
  }),
]);

const gitEnvironment = Object.freeze({
  ...process.env,
  GIT_NO_REPLACE_OBJECTS: "1",
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function runGit(repoRoot, args, { encoding = "utf8" } = {}) {
  return execFileSync("git", ["-C", repoRoot, ...args], {
    encoding,
    env: gitEnvironment,
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function resolveCommit(repoRoot, commitish) {
  if (typeof commitish !== "string" || commitish.length === 0 || /[\0\r\n]/u.test(commitish)) {
    throw new Error("commitish must be a non-empty single-line string");
  }
  const resolved = runGit(repoRoot, ["rev-parse", "--verify", "--end-of-options", `${commitish}^{commit}`]).trim();
  if (!/^[0-9a-f]{40}$/u.test(resolved)) {
    throw new Error(`unexpected resolved commit identity: ${resolved}`);
  }
  return resolved;
}

function readCommitPath(repoRoot, commit, relativePath) {
  const treeOutput = runGit(repoRoot, ["ls-tree", "-z", "--full-tree", commit, "--", relativePath], { encoding: "buffer" });
  const records = treeOutput.toString("utf8").split("\0").filter(Boolean);
  if (records.length !== 1) {
    throw new Error(`expected one committed path for ${relativePath}, got ${records.length}`);
  }
  const match = records[0].match(/^100644 blob ([0-9a-f]{40})\t(.+)$/u);
  if (!match || match[2] !== relativePath) {
    throw new Error(`expected regular committed blob for ${relativePath}`);
  }
  return runGit(repoRoot, ["cat-file", "blob", match[1]], { encoding: "buffer" });
}

function listChangedPaths(repoRoot, commit) {
  const output = runGit(repoRoot, ["diff", "--name-status", "-z", BASE_COMMIT, commit, "--"], { encoding: "buffer" });
  const fields = output.toString("utf8").split("\0").filter(Boolean);
  const entries = [];
  for (let index = 0; index < fields.length; index += 2) {
    const status = fields[index];
    const changedPath = fields[index + 1];
    if (!status || !changedPath || /^R|^C/u.test(status)) {
      throw new Error("renames and copies are not allowed in the safety packet");
    }
    entries.push({ status, path: changedPath });
  }
  return entries;
}

function requirePattern(issues, source, pattern, label) {
  if (!pattern.test(source)) {
    issues.push(`missing ${label}`);
  }
}

function forbidPattern(issues, source, pattern, label) {
  if (pattern.test(source)) {
    issues.push(`forbidden ${label}`);
  }
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

export function validateMigrationSource(source) {
  const sql = String(source).replace(/\r\n?/gu, "\n");
  const issues = [];

  requirePattern(issues, sql, /^begin;$/imu, "explicit transaction begin");
  requirePattern(issues, sql, /^commit;$/imu, "explicit transaction commit");
  requirePattern(issues, sql, /lock table public\.profiles in access exclusive mode;/iu, "ACCESS EXCLUSIVE profile lock");
  requirePattern(issues, sql, /exact enabled assignment trigger is missing/iu, "assignment trigger precondition");
  requirePattern(issues, sql, /to_regprocedure\('public\.assign_real_user_number_on_profile_insert\(\)'\)/iu, "assignment function precondition");
  requirePattern(issues, sql, /to_regprocedure\('public\.is_automation_auth_user\(uuid\)'\)/iu, "automation classifier precondition");
  requirePattern(issues, sql, /to_regprocedure\('public\.refresh_discord_member_link_member_number_snapshots\(\)'\)/iu, "Discord refresh helper precondition");
  requirePattern(issues, sql, /trigger_row\.tgtype = 7/iu, "BEFORE INSERT trigger type precondition");
  requirePattern(issues, sql, /trigger_row\.tgtype = 9/iu, "AFTER DELETE trigger type precondition");
  requirePattern(issues, sql, /function_row\.prosecdef[\s\S]*?pg_get_userbyid\(function_row\.proowner\) = 'postgres'[\s\S]*?function_row\.proconfig = array\['search_path=public, auth, pg_temp'\]/iu, "assignment function security precondition");
  requirePattern(issues, sql, /to_regclass\('public\.real_user_number_seq'\)/iu, "sequence precondition");
  requirePattern(issues, sql, /to_regclass\('public\.profiles_user_number_uq'\)/iu, "unique index precondition");
  requirePattern(issues, sql, /compaction objects are in a mixed state/iu, "idempotent compaction terminal-set precondition");
  requirePattern(issues, sql, /duplicate member numbers exist/iu, "duplicate-number precondition");
  requirePattern(issues, sql, /negative human member numbers exist/iu, "negative-number precondition");
  requirePattern(issues, sql, /an automation profile has a member number/iu, "automation-number precondition");
  requirePattern(issues, sql, /sequence_effective_next <= maximum_human_number/iu, "sequence high-water precondition");

  requirePattern(
    issues,
    sql,
    /drop trigger if exists profiles_compact_human_member_numbers_after_delete\s+on public\.profiles restrict;/iu,
    "restricted compaction trigger drop",
  );
  requirePattern(
    issues,
    sql,
    /drop function if exists public\.compact_human_member_numbers_after_profile_delete\(\) restrict;/iu,
    "restricted compaction wrapper drop",
  );
  requirePattern(
    issues,
    sql,
    /drop function if exists public\.compact_human_member_numbers_preserving_zero\(\) restrict;/iu,
    "restricted compactor drop",
  );

  const assignmentBody = sql.match(
    /create or replace function public\.assign_real_user_number_on_profile_insert\(\)[\s\S]*?as \$\$\n([\s\S]*?)\n\$\$;/iu,
  )?.[1] ?? "";
  requirePattern(issues, assignmentBody, /if public\.is_automation_auth_user\(new\.id\) then/iu, "automation-first assignment branch");
  requirePattern(issues, assignmentBody, /new\.user_kind := 'automation';[\s\S]*?new\.user_number := null;[\s\S]*?new\.user_number_assigned_at := null;/iu, "unnumbered automation assignment");
  requirePattern(issues, assignmentBody, /new\.user_kind := 'human';[\s\S]*?new\.user_number := nextval\('public\.real_user_number_seq'\);[\s\S]*?new\.user_number_assigned_at := now\(\);/iu, "sequence-backed human assignment");
  forbidPattern(issues, assignmentBody, /new\.user_number is not null/iu, "caller-supplied number bypass");
  forbidPattern(issues, assignmentBody, /coalesce\(new\.user_number_assigned_at/iu, "caller-supplied assignment timestamp");
  if (countMatches(sql, /nextval\s*\(/giu) !== 1) {
    issues.push("nextval must appear exactly once inside the assignment function definition");
  }

  const immutableBody = sql.match(
    /create or replace function public\.enforce_immutable_profile_member_identity\(\)[\s\S]*?as \$\$\n([\s\S]*?)\n\$\$;/iu,
  )?.[1] ?? "";
  for (const column of ["user_number", "user_kind", "user_number_assigned_at"]) {
    requirePattern(
      issues,
      immutableBody,
      new RegExp(`new\\.${column} is distinct from old\\.${column}`, "iu"),
      `immutable comparator for ${column}`,
    );
  }
  requirePattern(issues, immutableBody, /return new;/iu, "same-value update return");
  requirePattern(
    issues,
    sql,
    /create trigger profiles_enforce_immutable_member_identity_before_update\s+before update on public\.profiles[\s\S]*?execute function public\.enforce_immutable_profile_member_identity\(\);/iu,
    "immutable BEFORE UPDATE trigger",
  );

  requirePattern(issues, sql, /revoke all privileges on sequence public\.real_user_number_seq from public;/iu, "PUBLIC sequence revoke");
  requirePattern(issues, sql, /revoke all privileges on sequence public\.real_user_number_seq from anon, authenticated, service_role;/iu, "client and service sequence revoke");
  requirePattern(issues, sql, /grant select on sequence public\.real_user_number_seq to service_role;/iu, "read-only service sequence grant");
  forbidPattern(issues, sql, /grant\s+[^;]*\b(?:all|usage|update)\b[^;]*on sequence public\.real_user_number_seq[^;]*to\s+(?:public|anon|authenticated|service_role)/iu, "unsafe sequence grant");

  requirePattern(issues, sql, /Deleted numbers leave permanent gaps and are never reused\./u, "immutable number comment");
  requirePattern(issues, sql, /caller-supplied identity values are ignored\./u, "assignment function comment");

  forbidPattern(issues, sql, /\bupdate\s+public\.profiles\b/iu, "existing profile update");
  forbidPattern(issues, sql, /\bsetval\s*\(/iu, "setval call");
  forbidPattern(issues, sql, /alter\s+sequence[\s\S]{0,100}?\brestart\b/iu, "sequence restart");
  forbidPattern(issues, sql, /\breseed\b/iu, "sequence reseed");
  forbidPattern(issues, sql, /\bcascade\b/iu, "CASCADE");
  forbidPattern(issues, sql, /\b53\b/u, "hardcoded current high-water successor");
  forbidPattern(issues, sql, /drop trigger(?: if exists)?\s+profiles_assign_real_user_number_before_insert\b/iu, "assignment trigger drop");
  forbidPattern(issues, sql, /drop function(?: if exists)?\s+public\.assign_real_user_number_on_profile_insert\(\)/iu, "assignment function drop");
  forbidPattern(issues, sql, /drop sequence(?: if exists)?\s+public\.real_user_number_seq\b/iu, "assignment sequence drop");
  forbidPattern(issues, sql, /drop index(?: if exists)?\s+(?:public\.)?profiles_user_number_uq\b/iu, "unique index drop");
  forbidPattern(issues, sql, /create(?: or replace)? function public\.compact_human_member_numbers/iu, "compaction function recreation");
  forbidPattern(issues, sql, /create trigger profiles_compact_human_member_numbers_after_delete/iu, "compaction trigger recreation");

  return issues;
}

export function validateHistoricalSources(sources) {
  const issues = [];
  for (const expected of HISTORICAL_MIGRATIONS) {
    const source = sources.get(expected.path);
    if (!source) {
      issues.push(`missing immutable historical migration: ${expected.path}`);
      continue;
    }
    const actualSha256 = sha256(source);
    if (actualSha256 !== expected.sha256) {
      issues.push(`historical migration changed: ${expected.path}`);
    }
  }
  return issues;
}

export function verifyCommit({ repoRoot = REPO_ROOT, commitish = "HEAD" } = {}) {
  const issues = [];
  let commit = null;
  let changedEntries = [];
  const sources = new Map();

  try {
    commit = resolveCommit(repoRoot, commitish);
    changedEntries = listChangedPaths(repoRoot, commit);
    for (const relativePath of [
      ...EXPECTED_CHANGED_PATHS,
      ...HISTORICAL_MIGRATIONS.map((entry) => entry.path),
    ]) {
      sources.set(relativePath, readCommitPath(repoRoot, commit, relativePath));
    }
  } catch (error) {
    issues.push(`cannot read committed packet from ${JSON.stringify(commitish)}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const actualPaths = changedEntries.map((entry) => entry.path).sort();
  const expectedPaths = [...EXPECTED_CHANGED_PATHS].sort();
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    issues.push(`changed path denominator mismatch: expected ${expectedPaths.join(", ")}; got ${actualPaths.join(", ")}`);
  }
  if (changedEntries.some((entry) => entry.status === "D")) {
    issues.push("packet cannot delete committed paths");
  }

  const migrationSource = sources.get(MIGRATION_PATH)?.toString("utf8") ?? "";
  issues.push(...validateMigrationSource(migrationSource));
  issues.push(...validateHistoricalSources(sources));

  const auditSource = sources.get("scripts/audit-member-numbers.mjs")?.toString("utf8") ?? "";
  const doctorSource = sources.get("scripts/doctor-discord-community.mjs")?.toString("utf8") ?? "";
  const contractSource = sources.get("docs/ops/FP-FIT-USER-NUMBER-SAFETY-001.md")?.toString("utf8") ?? "";
  const basePlaybook = readCommitPath(repoRoot, BASE_COMMIT, "docs/PLAYBOOK_NOTES.md").toString("utf8");
  const candidatePlaybook = sources.get("docs/PLAYBOOK_NOTES.md")?.toString("utf8") ?? "";

  requirePattern(issues, auditSource, /summarizeMemberNumberSafety/u, "shared member-number safety audit usage");
  forbidPattern(issues, auditSource, /Compact numbering expected/u, "stale compact-number audit contract");
  requirePattern(issues, doctorSource, /summarizeMemberNumberSafety/u, "shared member-number safety doctor usage");
  forbidPattern(issues, doctorSource, /Member number compaction and sync rows look healthy/u, "stale compact-number doctor contract");
  requirePattern(issues, contractSource, /FULL_CHAIN_REPLAY: BLOCKED/u, "honest replay blocker");
  requirePattern(issues, contractSource, /PROVIDER_APPLY: NOT_AUTHORIZED/u, "provider apply boundary");
  if (!candidatePlaybook.startsWith(basePlaybook)) {
    issues.push("docs/PLAYBOOK_NOTES.md must be append-only");
  }
  requirePattern(issues, candidatePlaybook.slice(basePlaybook.length), /Member numbers are immutable and never reused/u, "Playbook supersession entry");

  return {
    ok: issues.length === 0,
    packet: "FP-FIT-USER-NUMBER-SAFETY-001",
    requestedCommitish: commitish,
    commit,
    baseCommit: BASE_COMMIT,
    changedPaths: actualPaths,
    migrationPath: MIGRATION_PATH,
    historicalMigrationCount: HISTORICAL_MIGRATIONS.length,
    fullChainReplay: "BLOCKED",
    providerApply: "NOT_AUTHORIZED",
    issues,
  };
}

export function parseCliArgs(argv) {
  if (argv.length === 0) {
    return { commitish: "HEAD" };
  }
  if (argv.length === 2 && argv[0] === "--ref" && argv[1]) {
    return { commitish: argv[1] };
  }
  throw new Error("usage: fp-fit-user-number-safety-verify.mjs [--ref <commitish>]");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { commitish } = parseCliArgs(process.argv.slice(2));
    const report = verifyCommit({ commitish });
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
