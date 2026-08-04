import assert from "node:assert/strict";
import test from "node:test";

import { findExistingInProgressSession, rollbackFailedSessionStart } from "./session-start-integrity";

type PostgrestLikeError = { code?: string; message?: string };

function createFakeSupabaseForExistingSessionCheck(options: {
  data: { id: string } | null;
  error: PostgrestLikeError | null;
}) {
  const eqCalls: Array<[string, unknown]> = [];
  let orderCall: { column: string; ascending: boolean } | null = null;
  let limitCall: number | null = null;

  const builder = {
    select() {
      return builder;
    },
    eq(column: string, value: unknown) {
      eqCalls.push([column, value]);
      return builder;
    },
    order(column: string, opts?: { ascending?: boolean }) {
      orderCall = { column, ascending: opts?.ascending !== false };
      return builder;
    },
    limit(count: number) {
      limitCall = count;
      return builder;
    },
    async maybeSingle() {
      return { data: options.data, error: options.error };
    },
  };

  const supabase = {
    from(_table: string) {
      return builder;
    },
  };

  return {
    supabase: supabase as unknown as Parameters<typeof findExistingInProgressSession>[0]["supabase"],
    eqCalls,
    get orderCall() {
      return orderCall;
    },
    get limitCall() {
      return limitCall;
    },
  };
}

function createFakeSupabaseForRollback(options: { error: PostgrestLikeError | null }) {
  const eqCalls: Array<[string, unknown]> = [];
  let deleteCalled = false;

  const builder = {
    eq(column: string, value: unknown) {
      eqCalls.push([column, value]);
      return builder;
    },
    then<TResult1, TResult2>(
      onfulfilled?: ((value: { error: PostgrestLikeError | null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve({ error: options.error }).then(onfulfilled, onrejected);
    },
  };

  const supabase = {
    from(_table: string) {
      return {
        delete() {
          deleteCalled = true;
          return builder;
        },
      };
    },
  };

  return {
    supabase: supabase as unknown as Parameters<typeof rollbackFailedSessionStart>[0]["supabase"],
    eqCalls,
    get deleteCalled() {
      return deleteCalled;
    },
  };
}

const READ_ERROR: PostgrestLikeError = { code: "57014", message: "statement timeout" };
const DELETE_ERROR: PostgrestLikeError = { code: "42501", message: "permission denied" };

test("findExistingInProgressSession returns the found session with no error", async () => {
  const fake = createFakeSupabaseForExistingSessionCheck({ data: { id: "session-1" }, error: null });

  const result = await findExistingInProgressSession({
    supabase: fake.supabase,
    userId: "user-1",
    routineId: "routine-1",
  });

  assert.deepEqual(result, { session: { id: "session-1" }, error: null });
});

test("findExistingInProgressSession returns session: null with no error when none exists", async () => {
  const fake = createFakeSupabaseForExistingSessionCheck({ data: null, error: null });

  const result = await findExistingInProgressSession({
    supabase: fake.supabase,
    userId: "user-1",
    routineId: "routine-1",
  });

  assert.deepEqual(result, { session: null, error: null });
});

test("findExistingInProgressSession surfaces a query error instead of silently reporting no session", async () => {
  // This is the actual defect being fixed: a failed existence check must
  // never be indistinguishable from "no session exists," because the caller
  // (createSessionFromDay) uses that result to decide whether to create a
  // brand-new session. Silently returning null on error would let a
  // transient DB failure during this check produce a duplicate in-progress
  // session.
  const fake = createFakeSupabaseForExistingSessionCheck({ data: null, error: READ_ERROR });

  const result = await findExistingInProgressSession({
    supabase: fake.supabase,
    userId: "user-1",
    routineId: "routine-1",
  });

  assert.equal(result.session, null);
  assert.deepEqual(result.error, READ_ERROR);
});

test("findExistingInProgressSession scopes the query to user, routine, and in-progress status", async () => {
  const fake = createFakeSupabaseForExistingSessionCheck({ data: null, error: null });

  await findExistingInProgressSession({
    supabase: fake.supabase,
    userId: "user-42",
    routineId: "routine-7",
  });

  assert.deepEqual(fake.eqCalls, [
    ["user_id", "user-42"],
    ["routine_id", "routine-7"],
    ["status", "in_progress"],
  ]);
  assert.deepEqual(fake.orderCall, { column: "performed_at", ascending: false });
  assert.equal(fake.limitCall, 1);
});

test("rollbackFailedSessionStart reports success when the delete succeeds", async () => {
  const fake = createFakeSupabaseForRollback({ error: null });

  const result = await rollbackFailedSessionStart({
    supabase: fake.supabase,
    sessionId: "session-1",
    userId: "user-1",
  });

  assert.deepEqual(result, { rollbackSucceeded: true });
  assert.equal(fake.deleteCalled, true);
});

test("rollbackFailedSessionStart reports failure when the delete itself fails, instead of pretending cleanup happened", async () => {
  const fake = createFakeSupabaseForRollback({ error: DELETE_ERROR });

  const result = await rollbackFailedSessionStart({
    supabase: fake.supabase,
    sessionId: "session-1",
    userId: "user-1",
  });

  assert.deepEqual(result, { rollbackSucceeded: false });
});

test("rollbackFailedSessionStart scopes the delete to the exact session id and user id", async () => {
  const fake = createFakeSupabaseForRollback({ error: null });

  await rollbackFailedSessionStart({
    supabase: fake.supabase,
    sessionId: "session-99",
    userId: "user-3",
  });

  assert.deepEqual(fake.eqCalls, [
    ["id", "session-99"],
    ["user_id", "user-3"],
  ]);
});
