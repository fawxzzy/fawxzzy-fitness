import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BASE_COMMIT,
  HISTORICAL_MIGRATIONS,
  MIGRATION_PATH,
  REPO_ROOT,
  parseCliArgs,
  validateHistoricalSources,
  validateMemberNumberConsumerSources,
  validateMigrationSource,
} from "./fp-fit-user-number-safety-verify.mjs";

const migrationSource = readFileSync(new URL(`../../${MIGRATION_PATH}`, import.meta.url), "utf8");
const historicalClassifierSource = readFileSync(
  new URL("../../supabase/migrations/044_real_user_numbers.sql", import.meta.url),
  "utf8",
);
const auditSource = readFileSync(new URL("../audit-member-numbers.mjs", import.meta.url), "utf8");
const safetyCoreSource = readFileSync(new URL("../member-number-safety-core.mjs", import.meta.url), "utf8");
const doctorSource = readFileSync(new URL("../doctor-discord-community.mjs", import.meta.url), "utf8");

function expectRejected(source, expectedIssue) {
  const issues = validateMigrationSource(source, { historicalClassifierSource });
  assert.ok(
    issues.some((issue) => issue.includes(expectedIssue)),
    `expected issue containing ${JSON.stringify(expectedIssue)}; got ${JSON.stringify(issues)}`,
  );
}

test("accepted forward migration satisfies the static contract", () => {
  assert.deepEqual(validateMigrationSource(migrationSource, { historicalClassifierSource }), []);
});

test("doctor source is bound to the shared fail-closed member-number predicate", () => {
  assert.deepEqual(validateMemberNumberConsumerSources({ auditSource, safetyCoreSource, doctorSource }), []);

  const bypassedDoctor = doctorSource.replace(
    "const memberNumberSafetyFatalReasons = getMemberNumberSafetyFatalReasons(memberNumberSafety);",
    "const memberNumberSafetyFatalReasons = [];",
  );
  assert.ok(validateMemberNumberConsumerSources({
    auditSource,
    safetyCoreSource,
    doctorSource: bypassedDoctor,
  }).includes("missing doctor shared fatal-reason evaluation"));

  const missingMetadataProjection = doctorSource.replace(
    '.select("id, user_number, user_kind, user_number_assigned_at")',
    '.select("id, user_number, user_kind")',
  );
  assert.ok(validateMemberNumberConsumerSources({
    auditSource,
    safetyCoreSource,
    doctorSource: missingMetadataProjection,
  }).includes("missing doctor reserved-#0 metadata projection"));

  const incompleteEvidence = doctorSource.replace(
    "reservedNumberHighWaterError: memberNumberSafety.reservedNumberHighWaterError,",
    "reservedNumberHighWaterError: null,",
  );
  assert.ok(validateMemberNumberConsumerSources({
    auditSource,
    safetyCoreSource,
    doctorSource: incompleteEvidence,
  }).includes("missing doctor reserved high-water evidence"));
});

test("audit source reports exact gap count, truncation, and capped evidence", () => {
  const missingCount = auditSource.replace(
    "memberNumberSafety.positiveGapCount ?? \"unavailable\"",
    "positiveGaps.length",
  );
  assert.ok(validateMemberNumberConsumerSources({
    auditSource: missingCount,
    safetyCoreSource,
    doctorSource,
  }).includes("missing audit exact positive-gap count evidence"));

  const missingTruncation = auditSource.replace(
    "memberNumberSafety.positiveGapsTruncated ? \"yes\" : \"no\"",
    "\"no\"",
  );
  assert.ok(validateMemberNumberConsumerSources({
    auditSource: missingTruncation,
    safetyCoreSource,
    doctorSource,
  }).includes("missing audit positive-gap truncation evidence"));

  const bypassedFatalReasons = auditSource.replace(
    "const memberNumberSafetyFatalReasons = getMemberNumberSafetyFatalReasons(memberNumberSafety);",
    "const memberNumberSafetyFatalReasons = [];",
  );
  assert.ok(validateMemberNumberConsumerSources({
    auditSource: bypassedFatalReasons,
    safetyCoreSource,
    doctorSource,
  }).includes("missing audit shared fatal-reason evaluation"));

  const incompleteCore = safetyCoreSource.replace(
    'reasons.push("reserved-zero-assignment-metadata-missing");',
    "// missing reserved zero metadata failure",
  );
  assert.ok(validateMemberNumberConsumerSources({
    auditSource,
    safetyCoreSource: incompleteCore,
    doctorSource,
  }).includes("missing shared reserved-#0 metadata fatal reason"));
});

test("migration reinstalls the exact immutable historical automation classifier", () => {
  expectRejected(
    migrationSource.replace(
      "lower(coalesce(u.raw_app_meta_data ->> 'account_kind', '')) = 'automation'",
      "lower(coalesce(u.raw_app_meta_data ->> 'account_kind', '')) = 'bot'",
    ),
    "automation classifier definition differs from immutable historical source",
  );
  expectRejected(
    migrationSource.replace("stable\nsecurity definer", "volatile\nsecurity invoker"),
    "automation classifier definition differs from immutable historical source",
  );
  expectRejected(
    migrationSource.replace(
      "alter function public.is_automation_auth_user(uuid) owner to postgres;",
      "",
    ),
    "automation classifier postgres ownership",
  );
  expectRejected(
    migrationSource.replace(
      "revoke execute on function public.is_automation_auth_user(uuid)\n  from public, anon, authenticated;",
      "",
    ),
    "automation classifier client execution revokes",
  );
});

test("migration rejects profile rewrites and sequence mutation", () => {
  expectRejected(`${migrationSource}\nupdate public.profiles set user_number = 1;\n`, "existing profile update");
  expectRejected(`${migrationSource}\nselect setval('public.real_user_number_seq', 1);\n`, "setval call");
  expectRejected(`${migrationSource}\nalter sequence public.real_user_number_seq restart with 1;\n`, "sequence restart");
  expectRejected(`${migrationSource}\nselect 53;\n`, "hardcoded current high-water successor");
});

test("migration rejects destructive or non-idempotent compaction removal", () => {
  expectRejected(
    migrationSource.replace("on public.profiles restrict;", "on public.profiles cascade;"),
    "CASCADE",
  );
  expectRejected(
    migrationSource.replace("drop function if exists public.compact_human_member_numbers_preserving_zero() restrict;", ""),
    "restricted compactor drop",
  );
  expectRejected(
    migrationSource.replace("drop trigger if exists profiles_compact_human_member_numbers_after_delete", "drop trigger profiles_compact_human_member_numbers_after_delete"),
    "restricted compaction trigger drop",
  );
});

test("migration rejects loss of exact source allocator preconditions", () => {
  expectRejected(
    migrationSource.replace("to_regprocedure('public.assign_real_user_number_on_profile_insert()')", "to_regprocedure('public.missing()')"),
    "assignment function precondition",
  );
  expectRejected(
    migrationSource.replace("to_regclass('public.real_user_number_seq')", "to_regclass('public.missing_sequence')"),
    "sequence precondition",
  );
  expectRejected(
    migrationSource.replace("to_regclass('public.profiles_user_number_uq')", "to_regclass('public.missing_index')"),
    "unique index precondition",
  );
  expectRejected(
    migrationSource.replace("sequence_effective_next <= maximum_reserved_number", "sequence_effective_next < -1"),
    "sequence high-water precondition",
  );
  expectRejected(
    migrationSource.replace(
      "where profile.user_number is not null;",
      "where profile.user_kind = 'human'\n    and profile.user_number is not null;",
    ),
    "all-reserved-number high-water query",
  );
});

test("migration requires one valid human #0 and rejects every numbered nonhuman", () => {
  expectRejected(
    migrationSource.replace("reserved_zero_count <> 1", "reserved_zero_count < 0"),
    "exact-one reserved #0 precondition",
  );
  expectRejected(
    migrationSource.replace(
      "profile.user_kind is distinct from 'human'\n        or profile.user_number_assigned_at is null",
      "profile.user_kind = 'human'",
    ),
    "reserved #0 human metadata precondition",
  );
  expectRejected(
    migrationSource.replace(
      "profile.user_kind is distinct from 'human'\n  )\n  into numbered_nonhuman_exists",
      "profile.user_kind = 'automation'\n  )\n  into numbered_nonhuman_exists",
    ),
    "all-numbered-profiles-human precondition",
  );
  expectRejected(
    migrationSource.replace(
      "where profile.user_number = 0;",
      "where profile.user_number = 1;",
    ),
    "exact reserved #0 count query",
  );
});

test("migration rejects caller-supplied human identity bypass", () => {
  const bypassed = migrationSource.replace(
    "begin\n  if public.is_automation_auth_user(new.id) then",
    "begin\n  if new.user_number is not null then\n    return new;\n  end if;\n\n  if public.is_automation_auth_user(new.id) then",
  );
  expectRejected(bypassed, "caller-supplied number bypass");

  expectRejected(
    migrationSource.replace("new.user_number_assigned_at := now();", "new.user_number_assigned_at := coalesce(new.user_number_assigned_at, now());"),
    "caller-supplied assignment timestamp",
  );
});

test("migration rejects incomplete immutable identity enforcement", () => {
  expectRejected(
    migrationSource.replace(
      "or new.user_kind is distinct from old.user_kind",
      "or new.user_kind = old.user_kind",
    ),
    "immutable comparator for user_kind",
  );
  expectRejected(
    migrationSource.replace("create trigger profiles_enforce_immutable_member_identity_before_update", "create trigger wrong_identity_trigger"),
    "immutable BEFORE UPDATE trigger",
  );
});

test("migration rejects unsafe sequence grants", () => {
  const unsafe = migrationSource.replace(
    "grant select on sequence public.real_user_number_seq to service_role;",
    "grant usage, update on sequence public.real_user_number_seq to authenticated;",
  );
  expectRejected(unsafe, "unsafe sequence grant");
});

test("historical migration digests are immutable", () => {
  const sources = new Map(
    HISTORICAL_MIGRATIONS.map((entry) => [
      entry.path,
      execFileSync("git", ["-C", REPO_ROOT, "show", `${BASE_COMMIT}:${entry.path}`], {
        encoding: "buffer",
        env: { ...process.env, GIT_NO_REPLACE_OBJECTS: "1" },
      }),
    ]),
  );
  assert.deepEqual(validateHistoricalSources(sources), []);

  const changed = new Map(sources);
  changed.set(HISTORICAL_MIGRATIONS[0].path, Buffer.from(`${changed.get(HISTORICAL_MIGRATIONS[0].path)}\n-- drift\n`));
  assert.deepEqual(
    validateHistoricalSources(changed),
    [`historical migration changed: ${HISTORICAL_MIGRATIONS[0].path}`],
  );
});

test("CLI accepts only default HEAD or one explicit ref", () => {
  assert.deepEqual(parseCliArgs([]), { commitish: "HEAD" });
  assert.deepEqual(parseCliArgs(["--ref", "abc123"]), { commitish: "abc123" });
  assert.throws(() => parseCliArgs(["--ref"]), /usage/u);
  assert.throws(() => parseCliArgs(["--ref", "a", "--ref", "b"]), /usage/u);
  assert.throws(() => parseCliArgs(["--unknown"]), /usage/u);
  assert.throws(() => parseCliArgs(["HEAD"]), /usage/u);
  assert.ok(REPO_ROOT.endsWith("fitness-user-number-safety-001") || REPO_ROOT.endsWith("fawxzzy-fitness"));
});
