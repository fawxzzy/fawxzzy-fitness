import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  startSessionFromDayAtomicV1,
  type SessionStartFromDayArgsV1,
} from "./session-start-atomicity";
import * as sessionStartModule from "./session-start-atomicity";

function migrationSql(): string {
  return readFileSync(
    new URL("../../supabase/migrations/20260804000000_session_start_atomicity_v1.sql", import.meta.url),
    "utf8",
  ).toLowerCase();
}

function correctionMigrationSql(): string {
  return readFileSync(
    new URL("../../supabase/migrations/20260811043408_fitness_integrity_completion_v1.sql", import.meta.url),
    "utf8",
  ).toLowerCase();
}

test("production session-start executor exposes only a one-argument repository-owned boundary", () => {
  assert.equal(startSessionFromDayAtomicV1.length, 1);
  assert.deepEqual(Object.keys(sessionStartModule).sort(), ["startSessionFromDayAtomicV1"]);
});

test("callers cannot substitute authentication or the privileged provider client", () => {
  const args = null as unknown as SessionStartFromDayArgsV1;
  const callerSelectedDependencies = {
    async requireAuthenticatedUser() {
      return { id: "fabricated-owner" };
    },
    async createServerProviderClient() {
      throw new Error("caller-selected privileged client must stay unreachable");
    },
  };

  if (false) {
    void startSessionFromDayAtomicV1(
      args,
      // @ts-expect-error The production executor intentionally accepts one argument.
      callerSelectedDependencies,
    );
  }

  assert.equal(startSessionFromDayAtomicV1.length, 1);
});

test("executor source authenticates before constructing its repository-owned provider client", () => {
  const source = readFileSync(new URL("./session-start-atomicity.ts", import.meta.url), "utf8");

  assert.match(source, /^import "server-only";/);
  assert.match(source, /await import\("@\/lib\/auth"\)/);
  assert.match(source, /await import\("@\/lib\/supabase\/admin"\)/);
  assert.match(source, /user = await dependencies\.requireAuthenticatedUser\(\)/);
  assert.match(source, /p_authenticated_user_id: user\.id/);
  assert.match(source, /startSessionFromDayAtomicWithDependenciesV1\(args, DEFAULT_DEPENDENCIES\)/);
  assert.doesNotMatch(source, /export\s+(?:type|interface)\s+SessionStartDependenciesV1/);
  assert.doesNotMatch(source, /export\s+(?:async\s+)?function\s+startSessionFromDayAtomicWithDependenciesV1/);
  assert.doesNotMatch(source, /result\.error\.message|catch \([^)]*\)[\s\S]*?\.message/);
});

test("migration adds a partial unique index that defends every write path", () => {
  assert.match(
    migrationSql(),
    /create unique index if not exists sessions_user_routine_active_uq\s+on public\.sessions \(user_id, routine_id\)\s+where status = 'in_progress' and routine_id is not null/,
  );
});

test("session-start RPC is service-role-only and binds an explicit authenticated user id", () => {
  const sql = migrationSql();
  const signature = String.raw`public\.start_session_from_day_v1\([\s\S]*?\)`;

  assert.match(sql, /p_authenticated_user_id uuid/);
  assert.match(sql, /v_user_id uuid := p_authenticated_user_id/);
  assert.match(sql, /auth\.role\(\) is distinct from 'service_role'/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, new RegExp(String.raw`revoke all on function ${signature} from public`));
  assert.match(sql, new RegExp(String.raw`revoke execute on function ${signature} from anon`));
  assert.match(sql, new RegExp(String.raw`revoke execute on function ${signature} from authenticated`));
  assert.match(sql, new RegExp(String.raw`grant execute on function ${signature} to service_role`));
  assert.doesNotMatch(sql, new RegExp(String.raw`grant execute on function ${signature} to (?:public|anon|authenticated)`));
});

test("session-start RPC revalidates routine and day ownership and preserves its race defenses", () => {
  const sql = migrationSql();

  assert.match(sql, /where routine_day\.id = p_day_id\s+and routine_day\.routine_id = p_routine_id\s+and routine_day\.user_id = v_user_id/);
  assert.match(sql, /where routine\.id = p_routine_id\s+and routine\.user_id = v_user_id/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /'session_start_v1:' \|\| v_user_id::text \|\| ':' \|\| p_routine_id::text/);
  assert.match(sql, /exception\s+when unique_violation then/);
});

test("corrective migration retires the old overload and binds every exercise to the authenticated day", () => {
  const sql = correctionMigrationSql();

  assert.match(sql, /drop function if exists public\.start_session_from_day_v1\(\s*uuid, uuid, text, text, jsonb\s*\)/);
  assert.match(sql, /planned_exercise\.id = \(v_exercise ->> 'routinedayexerciseid'\)::uuid/);
  assert.match(sql, /planned_exercise\.routine_day_id = p_day_id/);
  assert.match(sql, /planned_exercise\.user_id = v_user_id/);
  assert.match(sql, /planned_exercise\.exercise_id = \(v_exercise ->> 'exerciseid'\)::uuid/);
});

test("corrective migration qualifies follow-up job status and updated_at references", () => {
  const sql = correctionMigrationSql();
  const functionBody = sql.split("create or replace function public.claim_session_follow_up_jobs", 2)[1] ?? "";

  assert.match(functionBody, /update public\.session_follow_up_jobs as job/);
  assert.match(functionBody, /job\.status in \('pending', 'failed'\)/);
  assert.match(functionBody, /job\.status = 'processing' and job\.updated_at < stale_before/);
  assert.match(functionBody, /returning\s+job\.id,\s+job\.job_kind,\s+job\.status,\s+job\.attempt_count/);
  assert.doesNotMatch(functionBody, /\bor \(status = 'processing' and updated_at < stale_before\)/);
  assert.match(functionBody, /security invoker\s+set search_path = ''/);
});

test("start-session call-site activation remains separately gated", () => {
  const startSession = readFileSync(new URL("./start-session.ts", import.meta.url), "utf8");
  assert.doesNotMatch(startSession, /start_session_from_day_v1/);
  assert.doesNotMatch(startSession, /session-start-atomicity/);
});
