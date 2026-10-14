import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { createCleanSupabaseLikeDatabase } from "./replay-clean-chain.mjs";

const migration = readFileSync(new URL("../../supabase/migrations/20261014175935_trust_server_metadata_for_member_classification.sql", import.meta.url), "utf8");
const historical = readFileSync(new URL("../../supabase/migrations/20260718015422_retire_human_member_number_compaction.sql", import.meta.url), "utf8");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function historicalFunction(name) {
  const pattern = new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`, "u");
  const match = historical.match(pattern);
  assert.ok(match, `missing historical function ${name}`);
  return match[0];
}
let db;
let preservedBefore;
let preservedAfter;
async function preservedState() {
  return {
    profiles: (await db.query("select * from public.profiles order by id")).rows,
    sequence: (await db.query("select last_value, is_called from public.real_user_number_seq")).rows,
  };
}

before(async () => {
  db = await createCleanSupabaseLikeDatabase();
  await db.exec(`
    create sequence public.real_user_number_seq start 59;
    create table public.profiles (
      id uuid primary key references auth.users(id),
      user_kind text not null default 'human', user_number integer,
      user_number_assigned_at timestamptz
    );
    insert into auth.users(id,email) values
      ('${id(1)}','preserved@example.invalid'),
      ('${id(2)}','historical-label@example.invalid');
    insert into public.profiles values
      ('${id(1)}','human',0,'2026-01-01T00:00:00Z'),
      ('${id(2)}','automation',null,null);
    ${historicalFunction("is_automation_auth_user")}
    ${historicalFunction("assign_real_user_number_on_profile_insert")}
    ${historicalFunction("enforce_immutable_profile_member_identity")}
    create trigger assign_member before insert on public.profiles for each row
      execute function public.assign_real_user_number_on_profile_insert();
    create trigger immutable_member before update on public.profiles for each row
      execute function public.enforce_immutable_profile_member_identity();
  `);
  preservedBefore = await preservedState();
  await db.exec(migration);
  preservedAfter = await preservedState();
  for (const [n, email, app, user] of [
    [3, "ordinary@example.invalid", { account_kind: "AUTOMATION" }, {}],
    [4, "ordinary@example.invalid", {}, { account_kind: "automation" }],
    [5, "codex-qa-test@example.invalid", {}, {}],
    [6, "ordinary@example.invalid", { account_kind: "human" }, {}],
  ]) {
    await db.query("insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values ($1,$2,$3,$4)", [id(n), email, JSON.stringify(app), JSON.stringify(user)]);
  }
});
after(async () => { if (db) await db.close(); });

test("forward migration preserves existing profile identities and sequence state", () => {
  assert.deepEqual(preservedAfter, preservedBefore);
});

test("only server-controlled automation metadata is authoritative", async () => {
  const rows = (await db.query("select id, public.is_automation_auth_user(id) as automation from auth.users where id >= $1 order by id", [id(3)])).rows;
  assert.deepEqual(rows, [3, 4, 5, 6].map((n) => ({ id: id(n), automation: n === 3 })));
});

test("missing and null identities return false", async () => {
  assert.deepEqual((await db.query("select public.is_automation_auth_user($1) as missing, public.is_automation_auth_user(null) as absent", [id(99)])).rows, [{ missing: false, absent: false }]);
});

test("classifier keeps a fixed search path, privileged owner and narrow execute grants", async () => {
  const [row] = (await db.query(`select pg_get_userbyid(proowner) as owner, prosecdef, provolatile, proconfig,
    has_function_privilege('anon',oid,'execute') as anon,
    has_function_privilege('authenticated',oid,'execute') as authenticated,
    has_function_privilege('service_role',oid,'execute') as service_role
    from pg_proc where oid='public.is_automation_auth_user(uuid)'::regprocedure`)).rows;
  assert.deepEqual(row, { owner: "postgres", prosecdef: true, provolatile: "s", proconfig: ["search_path=pg_catalog, pg_temp"], anon: false, authenticated: false, service_role: true });
  const acl = (await db.query(`select pg_get_userbyid(a.grantor) as grantor,
    pg_get_userbyid(a.grantee) as grantee, a.privilege_type, a.is_grantable
    from pg_proc p cross join lateral aclexplode(p.proacl) a
    where p.oid='public.is_automation_auth_user(uuid)'::regprocedure
    order by grantee`)).rows;
  assert.deepEqual(acl, ["postgres", "service_role"].map((grantee) => ({
    grantor: "postgres", grantee, privilege_type: "EXECUTE", is_grantable: false,
  })));
});

async function assertAclDriftRejected(grant, revoke) {
  await db.exec(historicalFunction("is_automation_auth_user"));
  await db.exec(grant);
  const fingerprint = async () => (await db.query(`select pg_get_functiondef(oid) as definition,
    proacl::text as acl from pg_proc
    where oid='public.is_automation_auth_user(uuid)'::regprocedure`)).rows;
  const before = { function: await fingerprint(), state: await preservedState() };
  try {
    await assert.rejects(db.exec(migration), /HOLD_MEMBER_CLASSIFIER_ACL/u);
    await db.exec("rollback");
    assert.deepEqual({ function: await fingerprint(), state: await preservedState() }, before);
  } finally {
    await db.exec("rollback");
    await db.exec(revoke);
    await db.exec(migration);
  }
}

test("unexpected explicit grantee aborts before changing the classifier or data", async () => {
  await db.exec("create role classifier_extra_reader");
  await assertAclDriftRejected(
    "grant execute on function public.is_automation_auth_user(uuid) to classifier_extra_reader",
    "revoke execute on function public.is_automation_auth_user(uuid) from classifier_extra_reader",
  );
});

test("service-role grant option aborts without silently preserving delegation", async () => {
  await assertAclDriftRejected(
    "grant execute on function public.is_automation_auth_user(uuid) to service_role with grant option",
    "revoke grant option for execute on function public.is_automation_auth_user(uuid) from service_role",
  );
});

test("browser roles cannot invoke the classifier directly", async () => {
  for (const role of ["anon", "authenticated"]) {
    try {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select public.is_automation_auth_user($1)", [id(3)]), (error) => error.code === "42501");
    } finally { await db.exec("reset role"); }
  }
});

test("existing allocator ignores spoofed identity and numbers only new humans", async () => {
  const rows = [];
  for (const n of [3, 4, 5, 6]) {
    rows.push((await db.query("insert into public.profiles(id,user_kind,user_number) values ($1,'automation',999) returning id,user_kind,user_number,user_number_assigned_at is not null as assigned", [id(n)])).rows[0]);
  }
  assert.deepEqual(rows, [
    { id: id(3), user_kind: "automation", user_number: null, assigned: false },
    ...[4, 5, 6].map((n) => ({ id: id(n), user_kind: "human", user_number: n + 55, assigned: true })),
  ]);
  await assert.rejects(db.query("update public.profiles set user_number=999 where id=$1", [id(4)]), (error) => error.code === "23514");
});

test("public function shadowing cannot turn a human into automation", async () => {
  await db.exec("create function public.lower(text) returns text language sql immutable as $$ select 'automation'::text $$");
  assert.equal((await db.query("select public.is_automation_auth_user($1) as automation", [id(6)])).rows[0].automation, false);
});

test("reapplying the correction preserves all profile and sequence values", async () => {
  const state = await preservedState();
  await db.exec(migration);
  assert.deepEqual(await preservedState(), state);
});
