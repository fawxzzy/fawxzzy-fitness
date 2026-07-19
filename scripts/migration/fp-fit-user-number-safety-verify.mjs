#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
export const REPO_ROOT = path.resolve(path.dirname(currentFilePath), "..", "..");
export const BASE_COMMIT = "317568f9dcbc7d6c9dcf2ad30ef1cd80022ce8b3";
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

function normalizeSqlDefinition(source) {
  return String(source ?? "")
    .replace(/\r\n?/gu, "\n")
    .replace(/\s+/gu, " ")
    .trim();
}

function extractAutomationClassifierDefinition(source) {
  return String(source ?? "").match(
    /create or replace function public\.is_automation_auth_user\(target_user_id uuid\)[\s\S]*?\n\$\$;/iu,
  )?.[0] ?? "";
}

export function validateMemberNumberConsumerSources({ auditSource, safetyCoreSource, doctorSource }) {
  const issues = [];
  const audit = String(auditSource ?? "");
  const core = String(safetyCoreSource ?? "");
  const doctor = String(doctorSource ?? "");
  const paginationStart = core.indexOf("export async function collectCompleteMemberNumberProfileRows");
  const paginationEnd = core.indexOf("export function summarizePositiveMemberNumberGaps");
  const paginationSource = paginationStart >= 0 && paginationEnd > paginationStart
    ? core.slice(paginationStart, paginationEnd)
    : core;

  const pageSizeMatch = core.match(/export const MEMBER_NUMBER_PROFILE_PAGE_SIZE = ([0-9_]+);/u);
  const pageSize = Number(pageSizeMatch?.[1]?.replaceAll("_", ""));
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1_000) {
    issues.push("missing bounded profile safety page size");
  }
  requirePattern(
    issues,
    core,
    /export const MEMBER_NUMBER_PROFILE_SELECT = "id, user_number, user_kind, user_number_assigned_at";/u,
    "exact profile safety projection",
  );
  requirePattern(issues, core, /export async function collectCompleteMemberNumberProfileRows/u, "shared profile safety paginator");
  requirePattern(issues, core, /export async function loadCompleteMemberNumberSafety/u, "shared complete member-number loader");
  requirePattern(issues, paginationSource, /\.select\(MEMBER_NUMBER_PROFILE_SELECT, \{ count: "exact", head: true \}\)/u, "exact unfiltered profile count request");
  requirePattern(issues, paginationSource, /\.select\(MEMBER_NUMBER_PROFILE_SELECT\)/u, "exact profile page projection");
  requirePattern(issues, paginationSource, /\.order\("id", \{ ascending: true \}\)/u, "stable unique profile ordering");
  requirePattern(issues, paginationSource, /\.limit\(pageSize\)/u, "bounded profile page limit");
  requirePattern(issues, paginationSource, /fetchPage\(\{ afterProfileId: lastProfileId, pageSize \}\)/u, "monotonic profile cursor propagation");
  requirePattern(issues, paginationSource, /afterProfileId !== null/u, "nullable first-page profile cursor");
  requirePattern(issues, paginationSource, /\.gt\("id", afterProfileId\)/u, "exclusive profile id cursor");
  forbidPattern(issues, paginationSource, /\.range\(/u, "profile range pagination");
  forbidPattern(issues, paginationSource, /\.offset\(/u, "profile offset pagination");
  requirePattern(issues, paginationSource, /result\.count !== exactCount/u, "profile count drift rejection");
  requirePattern(issues, core, /profileId <= lastProfileId/u, "duplicate and non-increasing profile id rejection");
  requirePattern(issues, paginationSource, /rows after the exact denominator/u, "after-denominator row rejection");
  requirePattern(issues, paginationSource, /page ended before the exact denominator/u, "early short profile page rejection");
  requirePattern(issues, paginationSource, /profile safety pagination overflow/u, "profile pagination overflow rejection");
  requirePattern(issues, paginationSource, /profile safety pagination provider error/u, "sanitized profile provider failure");

  for (const [label, source] of [["audit", audit], ["doctor", doctor]]) {
    requirePattern(
      issues,
      source,
      /loadCompleteMemberNumberSafety\(/u,
      `${label} shared complete profile loader usage`,
    );
    forbidPattern(issues, source, /\.from\("profiles"\)/u, `${label} direct unpaged profile query`);
    forbidPattern(issues, source, /\$\{profile\.id\}/u, `${label} raw profile id output`);
    forbidPattern(issues, source, /\$\{link\.id\}/u, `${label} raw link id output`);
  }

  requirePattern(
    issues,
    audit,
    /Permanent positive gap count: \$\{memberNumberSafety\.positiveGapCount \?\? "unavailable"\}/u,
    "audit exact positive-gap count evidence",
  );
  requirePattern(
    issues,
    audit,
    /Permanent positive gap evidence truncated: \$\{memberNumberSafety\.positiveGapsTruncated \? "yes" : "no"\}/u,
    "audit positive-gap truncation evidence",
  );
  requirePattern(
    issues,
    audit,
    /Permanent positive gap evidence:/u,
    "audit capped positive-gap examples",
  );
  requirePattern(
    issues,
    audit,
    /const memberNumberSafetyFatalReasons = completeProfileSafety\.fatalReasons;/u,
    "audit shared complete fatal-reason result",
  );
  requirePattern(
    issues,
    audit,
    /problems\.push\(\.\.\.memberNumberSafetyFatalReasons\.map\(/u,
    "audit shared fatal-reason exit authority",
  );

  requirePattern(
    issues,
    core,
    /export function getMemberNumberSafetyFatalReasons\(summary\)/u,
    "shared member-number fatal-reason helper",
  );
  requirePattern(
    issues,
    core,
    /hasExactlyOneHumanZero/u,
    "shared exactly-one-human-#0 evidence",
  );
  requirePattern(
    issues,
    core,
    /reserved-zero-assignment-metadata-missing/u,
    "shared reserved-#0 metadata fatal reason",
  );
  requirePattern(
    issues,
    core,
    /numbered-human-assignment-metadata-missing/u,
    "shared every-numbered-human metadata fatal reason",
  );
  requirePattern(
    issues,
    core,
    /humanProfilesMissingNumberCount/u,
    "shared missing-human-number evidence",
  );
  requirePattern(
    issues,
    core,
    /human-member-number-missing/u,
    "shared missing-human-number fatal reason",
  );
  requirePattern(
    issues,
    doctor,
    /const memberNumberSafetyFatalReasons = completeProfileSafety\.fatalReasons;/u,
    "doctor shared complete fatal-reason result",
  );
  requirePattern(
    issues,
    doctor,
    /memberNumberSafetyFatalReasons\.length > 0/u,
    "doctor fail-closed fatal-reason predicate",
  );
  requirePattern(issues, audit, /Profile safety exact count:/u, "audit exact profile denominator evidence");
  requirePattern(issues, audit, /Profile safety data pages:/u, "audit profile page evidence");
  requirePattern(issues, doctor, /profileSafetyExactCount: completeProfileSafety\.exactCount/u, "doctor exact profile denominator evidence");
  requirePattern(issues, doctor, /profileSafetyDataPages: completeProfileSafety\.dataPageCount/u, "doctor profile page evidence");
  requirePattern(
    issues,
    doctor,
    /reservedNumberHighWaterError: memberNumberSafety\.reservedNumberHighWaterError/u,
    "doctor reserved high-water evidence",
  );
  requirePattern(
    issues,
    doctor,
    /minimumSafeNextNumber: memberNumberSafety\.minimumSafeNextNumber/u,
    "doctor minimum safe-next evidence",
  );

  return issues;
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

export function validateMigrationSource(source, { historicalClassifierSource } = {}) {
  const sql = String(source).replace(/\r\n?/gu, "\n");
  const issues = [];
  const preflightBody = sql.match(/do \$\$[\s\S]*?\n\$\$;/iu)?.[0] ?? "";
  const classifierDefinition = extractAutomationClassifierDefinition(sql);
  const historicalClassifierDefinition = extractAutomationClassifierDefinition(historicalClassifierSource);

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
  requirePattern(
    issues,
    preflightBody,
    /select role_row\.oid\s+into strict current_role_oid\s+from pg_roles as role_row\s+where role_row\.rolname = current_user;/iu,
    "current sequence-owner role identity proof",
  );
  requirePattern(
    issues,
    preflightBody,
    /select sequence_relation\.relowner, sequence_relation\.xmin::text\s+into strict sequence_owner, sequence_xmin\s+from pg_class as sequence_relation\s+where sequence_relation\.oid = 'public\.real_user_number_seq'::regclass\s+and sequence_relation\.relkind = 'S';/iu,
    "pre-lock sequence owner and xmin proof",
  );
  requirePattern(
    issues,
    preflightBody,
    /sequence_owner is distinct from current_role_oid[\s\S]*?assignment sequence owner must equal CURRENT_USER/iu,
    "same-owner sequence lock precondition",
  );
  requirePattern(
    issues,
    preflightBody,
    /execute 'alter sequence public\.real_user_number_seq owner to current_user';/iu,
    "same-owner sequence lock operation",
  );
  requirePattern(
    issues,
    preflightBody,
    /select sequence_relation\.relowner, sequence_relation\.xmin::text\s+into strict sequence_owner_after, sequence_xmin_after\s+from pg_class as sequence_relation\s+where sequence_relation\.oid = 'public\.real_user_number_seq'::regclass\s+and sequence_relation\.relkind = 'S';/iu,
    "post-lock sequence owner and xmin proof",
  );
  requirePattern(
    issues,
    preflightBody,
    /sequence_owner_after is distinct from current_role_oid\s+or sequence_owner_after is distinct from sequence_owner\s+or sequence_xmin_after is distinct from sequence_xmin/iu,
    "unchanged sequence owner and xmin proof",
  );
  requirePattern(
    issues,
    preflightBody,
    /assignment sequence owner or catalog identity changed during lock acquisition/iu,
    "sequence lock drift failure",
  );
  requirePattern(issues, sql, /to_regclass\('public\.profiles_user_number_uq'\)/iu, "unique index precondition");
  requirePattern(
    issues,
    preflightBody,
    /index_schema\.nspname = 'public'[\s\S]*?index_relation\.relname = 'profiles_user_number_uq'[\s\S]*?table_schema\.nspname = 'public'[\s\S]*?table_relation\.relname = 'profiles'/iu,
    "unique index schema and table identity",
  );
  requirePattern(
    issues,
    preflightBody,
    /user_number_attribute\.attname = 'user_number'[\s\S]*?user_number_attribute\.attnum > 0[\s\S]*?not user_number_attribute\.attisdropped/iu,
    "unique index user_number attribute identity",
  );
  requirePattern(issues, preflightBody, /and index_row\.indisunique\s*\n/iu, "unique index uniqueness");
  requirePattern(issues, preflightBody, /and index_row\.indisvalid\s*\n/iu, "unique index validity");
  requirePattern(issues, preflightBody, /and index_row\.indisready\s*\n/iu, "unique index readiness");
  requirePattern(issues, preflightBody, /and index_row\.indislive\s*\n/iu, "unique index liveness");
  requirePattern(issues, preflightBody, /index_row\.indnkeyatts = 1/iu, "unique index single key");
  requirePattern(issues, preflightBody, /index_row\.indnatts = 1/iu, "unique index excludes included columns");
  requirePattern(
    issues,
    preflightBody,
    /user_number_attribute\.attnum = any\(index_row\.indkey\)/iu,
    "unique index exact user_number key",
  );
  requirePattern(issues, preflightBody, /index_row\.indexprs is null/iu, "unique index non-expression key");
  requirePattern(
    issues,
    preflightBody,
    /pg_get_expr\(index_row\.indpred, index_row\.indrelid\) = '\(user_number IS NOT NULL\)'/iu,
    "unique index exact partial predicate",
  );
  requirePattern(issues, sql, /compaction objects are in a mixed state/iu, "idempotent compaction terminal-set precondition");
  requirePattern(
    issues,
    preflightBody,
    /select count\(\*\)\s+into profile_count\s+from public\.profiles;/iu,
    "exact profile denominator query",
  );
  requirePattern(
    issues,
    preflightBody,
    /select count\(\*\)\s+into reserved_zero_count\s+from public\.profiles as profile\s+where profile\.user_number = 0;/iu,
    "exact reserved #0 count query",
  );
  requirePattern(
    issues,
    preflightBody,
    /profile_count = 0 and reserved_zero_count <> 0/iu,
    "empty fresh-chain zero denominator precondition",
  );
  requirePattern(
    issues,
    preflightBody,
    /profile_count > 0 and reserved_zero_count <> 1/iu,
    "non-empty exact-one reserved #0 precondition",
  );
  requirePattern(
    issues,
    preflightBody,
    /where profile\.user_number = 0\s+and \(\s*profile\.user_kind is distinct from 'human'\s+or profile\.user_number_assigned_at is null\s*\)/iu,
    "reserved #0 human metadata precondition",
  );
  requirePattern(
    issues,
    preflightBody,
    /where profile\.user_kind = 'human'\s+and profile\.user_number is not null\s+and profile\.user_number_assigned_at is null/iu,
    "every-numbered-human assignment metadata precondition",
  );
  requirePattern(
    issues,
    preflightBody,
    /where profile\.user_kind = 'human'\s+and profile\.user_number is null/iu,
    "every-human-number precondition",
  );
  requirePattern(
    issues,
    preflightBody,
    /where profile\.user_number is not null\s+and profile\.user_kind is distinct from 'human'/iu,
    "all-numbered-profiles-human precondition",
  );
  forbidPattern(issues, preflightBody, /numbered_automation_exists/iu, "automation-only numbered-profile precondition");
  requirePattern(issues, sql, /duplicate member numbers exist/iu, "duplicate-number precondition");
  requirePattern(issues, sql, /negative human member numbers exist/iu, "negative-number precondition");
  requirePattern(issues, preflightBody, /empty fresh-chain profile denominator is ambiguous/iu, "ambiguous empty profile denominator failure");
  requirePattern(issues, preflightBody, /exactly one reserved #0 human profile is required/iu, "non-empty reserved #0 count failure");
  requirePattern(issues, preflightBody, /reserved #0 profile has invalid human identity metadata/iu, "reserved #0 metadata failure");
  requirePattern(issues, preflightBody, /a numbered human profile is missing assignment metadata/iu, "numbered human metadata failure");
  requirePattern(issues, preflightBody, /a human profile is missing its member number/iu, "missing human member-number failure");
  requirePattern(issues, preflightBody, /a numbered profile is not human/iu, "numbered nonhuman failure");
  requirePattern(
    issues,
    sql,
    /select coalesce\(max\(profile\.user_number\), -1\)\s+into maximum_reserved_number\s+from public\.profiles as profile\s+where profile\.user_number is not null;/iu,
    "all-reserved-number high-water query",
  );
  requirePattern(issues, sql, /sequence_effective_next <= maximum_reserved_number/iu, "sequence high-water precondition");
  requirePattern(
    issues,
    preflightBody,
    /select\s+sequence_catalog\.seqtypid,\s+sequence_catalog\.seqstart,\s+sequence_catalog\.seqincrement,\s+sequence_catalog\.seqmin,\s+sequence_catalog\.seqmax,\s+sequence_catalog\.seqcycle,\s+sequence_catalog\.seqcache\s+into strict\s+sequence_type,\s+sequence_start,\s+sequence_increment,\s+sequence_minimum,\s+sequence_maximum,\s+sequence_cycles,\s+sequence_cache\s+from pg_sequence as sequence_catalog\s+where sequence_catalog\.seqrelid = 'public\.real_user_number_seq'::regclass;/iu,
    "authoritative single-row sequence catalog proof",
  );
  requirePattern(issues, preflightBody, /sequence_increment is distinct from 1/iu, "sequence increment fail-closed proof");
  requirePattern(issues, preflightBody, /sequence_cycles is distinct from false/iu, "non-cycling sequence precondition");
  requirePattern(issues, preflightBody, /sequence_cache is distinct from 1/iu, "single-value sequence cache precondition");
  requirePattern(issues, preflightBody, /sequence_effective_next is null/iu, "unverifiable sequence fail-closed proof");
  requirePattern(
    issues,
    preflightBody,
    /if profile_count = 0 and \(\s*maximum_reserved_number is distinct from -1\s+or sequence_type is distinct from 'integer'::regtype\s+or sequence_start is distinct from 1\s+or sequence_minimum is distinct from 1\s+or sequence_maximum is distinct from 2147483647\s+or sequence_last_value is distinct from 1\s+or sequence_called is distinct from false\s+or sequence_effective_next is distinct from 1\s*\) then/iu,
    "exact pristine empty fresh-chain allocator precondition",
  );
  requirePattern(issues, preflightBody, /empty fresh-chain allocator is not pristine/iu, "pristine empty allocator failure");

  const profileLockIndex = sql.indexOf("lock table public.profiles in access exclusive mode;");
  const preLockOwnerIndex = sql.indexOf("into strict sequence_owner, sequence_xmin");
  const sequenceLockIndex = sql.indexOf("execute 'alter sequence public.real_user_number_seq owner to current_user';");
  const postLockOwnerIndex = sql.indexOf("into strict sequence_owner_after, sequence_xmin_after");
  const profileValidationIndex = sql.indexOf("into profile_count\n  from public.profiles;");
  const sequenceValidationIndex = sql.indexOf("from public.real_user_number_seq as sequence_row;");
  if (!(profileLockIndex >= 0
    && preLockOwnerIndex > profileLockIndex
    && sequenceLockIndex > preLockOwnerIndex
    && postLockOwnerIndex > sequenceLockIndex
    && profileValidationIndex > postLockOwnerIndex
    && sequenceValidationIndex > postLockOwnerIndex)) {
    issues.push("profile-first sequence lock ordering is not preserved");
  }

  if (!historicalClassifierDefinition) {
    issues.push("missing immutable historical automation classifier provenance");
  } else if (normalizeSqlDefinition(classifierDefinition) !== normalizeSqlDefinition(historicalClassifierDefinition)) {
    issues.push("automation classifier definition differs from immutable historical source");
  }
  if (countMatches(sql, /create or replace function public\.is_automation_auth_user\(target_user_id uuid\)/giu) !== 1) {
    issues.push("automation classifier must be reinstalled exactly once");
  }
  requirePattern(
    issues,
    sql,
    /alter function public\.is_automation_auth_user\(uuid\) owner to postgres;/iu,
    "automation classifier postgres ownership",
  );
  requirePattern(
    issues,
    sql,
    /revoke execute on function public\.is_automation_auth_user\(uuid\)\s+from public, anon, authenticated;/iu,
    "automation classifier client execution revokes",
  );
  forbidPattern(
    issues,
    sql,
    /revoke execute on function public\.is_automation_auth_user\(uuid\)[^;]*service_role/iu,
    "service-role classifier execution revoke",
  );
  const classifierIndex = sql.indexOf(classifierDefinition);
  const preflightEndIndex = sql.indexOf(preflightBody) + preflightBody.length;
  const assignmentIndex = sql.indexOf("create or replace function public.assign_real_user_number_on_profile_insert()");
  if (!classifierDefinition || classifierIndex < preflightEndIndex || classifierIndex > assignmentIndex) {
    issues.push("automation classifier must be reinstalled after preflight and before classifier-dependent assignment");
  }

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

  forbidPattern(issues, sql, /\binsert\s+into\s+public\.profiles\b/iu, "profile seed or reservation insert");
  forbidPattern(issues, sql, /\bupdate\s+public\.profiles\b/iu, "existing profile update");
  forbidPattern(issues, sql, /\bsetval\s*\(/iu, "setval call");
  const sqlWithoutExpectedSequenceLock = sql.replace(
    /execute 'alter sequence public\.real_user_number_seq owner to current_user';/iu,
    "",
  );
  if (countMatches(sql, /execute 'alter sequence public\.real_user_number_seq owner to current_user';/giu) !== 1) {
    issues.push("same-owner sequence lock must appear exactly once");
  }
  forbidPattern(issues, sqlWithoutExpectedSequenceLock, /\balter\s+sequence\b/iu, "unsupported sequence alteration");
  forbidPattern(issues, sql, /lock\s+table\s+public\.real_user_number_seq/iu, "invalid sequence LOCK TABLE");
  forbidPattern(issues, sql, /pg_(?:try_)?advisory_(?:xact_)?lock/iu, "advisory sequence lock substitute");
  forbidPattern(issues, sql, /\b(?:insert|update|delete)\s+(?:from\s+)?pg_(?:class|sequence)\b/iu, "direct sequence catalog mutation");
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
  issues.push(...validateMigrationSource(migrationSource, {
    historicalClassifierSource: sources.get("supabase/migrations/044_real_user_numbers.sql")?.toString("utf8") ?? "",
  }));
  issues.push(...validateHistoricalSources(sources));

  const auditSource = sources.get("scripts/audit-member-numbers.mjs")?.toString("utf8") ?? "";
  const doctorSource = sources.get("scripts/doctor-discord-community.mjs")?.toString("utf8") ?? "";
  const safetyCoreSource = sources.get("scripts/member-number-safety-core.mjs")?.toString("utf8") ?? "";
  const contractSource = sources.get("docs/ops/FP-FIT-USER-NUMBER-SAFETY-001.md")?.toString("utf8") ?? "";
  const basePlaybook = readCommitPath(repoRoot, BASE_COMMIT, "docs/PLAYBOOK_NOTES.md").toString("utf8");
  const candidatePlaybook = sources.get("docs/PLAYBOOK_NOTES.md")?.toString("utf8") ?? "";

  requirePattern(issues, auditSource, /loadCompleteMemberNumberSafety/u, "shared complete member-number audit usage");
  forbidPattern(issues, auditSource, /Compact numbering expected/u, "stale compact-number audit contract");
  requirePattern(issues, doctorSource, /loadCompleteMemberNumberSafety/u, "shared complete member-number doctor usage");
  issues.push(...validateMemberNumberConsumerSources({ auditSource, safetyCoreSource, doctorSource }));
  forbidPattern(issues, doctorSource, /Member number compaction and sync rows look healthy/u, "stale compact-number doctor contract");
  requirePattern(issues, contractSource, /FULL_CHAIN_REPLAY: BLOCKED/u, "honest replay blocker");
  requirePattern(issues, contractSource, /PROVIDER_APPLY: NOT_AUTHORIZED/u, "provider apply boundary");
  requirePattern(issues, contractSource, /exactly one existing profile reserves `#0` as a human with assignment metadata/u, "documented reserved #0 precondition");
  requirePattern(issues, contractSource, /every numbered profile is human/u, "documented numbered-human precondition");
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
