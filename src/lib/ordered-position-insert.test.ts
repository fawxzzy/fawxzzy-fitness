import assert from "node:assert/strict";
import test from "node:test";

import { insertRoutineDayExerciseAtEnd, insertSessionExerciseAtEnd } from "./ordered-position-insert";

type PostgrestLikeError = { code?: string; message?: string };
type InsertResult<TData> = { data: TData | null; error: PostgrestLikeError | null };

type FakeSupabaseOptions<TData> = {
  existingMaxPosition: number | null;
  readError?: PostgrestLikeError;
  /** Called once per insert attempt; return the result for that attempt. */
  onInsertAttempt: (payload: Record<string, unknown>, attemptIndex: number) => InsertResult<TData>;
};

function createFakeSupabase<TData>(options: FakeSupabaseOptions<TData>) {
  let attemptIndex = 0;
  const readCalls: Array<{ table: string; eqCalls: Array<[string, unknown]> }> = [];
  const insertedPayloads: Record<string, unknown>[] = [];

  function makeInsertBuilder(table: string, payload: Record<string, unknown>) {
    const currentAttempt = attemptIndex;
    attemptIndex += 1;
    insertedPayloads.push(payload);
    const result = options.onInsertAttempt(payload, currentAttempt);

    return {
      select() {
        return {
          async single() {
            return result;
          },
        };
      },
      then<TResult1, TResult2>(
        onfulfilled?: ((value: InsertResult<TData>) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        return Promise.resolve(result).then(onfulfilled, onrejected);
      },
    };
  }

  function makeReadBuilder(table: string) {
    const eqCalls: Array<[string, unknown]> = [];
    readCalls.push({ table, eqCalls });

    const builder = {
      select() {
        return builder;
      },
      eq(column: string, value: unknown) {
        eqCalls.push([column, value]);
        return builder;
      },
      order() {
        return builder;
      },
      limit() {
        return builder;
      },
      async maybeSingle() {
        if (options.readError) {
          return { data: null, error: options.readError };
        }
        return {
          data: options.existingMaxPosition === null ? null : { position: options.existingMaxPosition },
          error: null,
        };
      },
    };

    return builder;
  }

  const supabase = {
    from(table: string) {
      return {
        select() {
          return makeReadBuilder(table);
        },
        insert(payload: Record<string, unknown>) {
          return makeInsertBuilder(table, payload);
        },
      };
    },
  };

  return {
    supabase: supabase as unknown as Parameters<typeof insertRoutineDayExerciseAtEnd>[0]["supabase"],
    insertedPayloads,
    readCalls,
    get attemptCount() {
      return attemptIndex;
    },
  };
}

const UNIQUE_VIOLATION: PostgrestLikeError = { code: "23505", message: "duplicate key value violates unique constraint" };
const OTHER_ERROR: PostgrestLikeError = { code: "42501", message: "permission denied" };

test("computes position 0 for the first row in an empty scope", async () => {
  const fake = createFakeSupabase({
    existingMaxPosition: null,
    onInsertAttempt: (payload) => ({ data: { ...payload }, error: null }),
  });

  const result = await insertRoutineDayExerciseAtEnd<Record<string, unknown>>({
    supabase: fake.supabase,
    routineDayId: "day-1",
    userId: "user-1",
    values: { exercise_id: "ex-1" },
    select: "*",
  });

  assert.equal(result.error, null);
  assert.equal(result.data?.position, 0);
  assert.equal(fake.attemptCount, 1);
});

test("computes position as one past the current maximum", async () => {
  const fake = createFakeSupabase({
    existingMaxPosition: 4,
    onInsertAttempt: (payload) => ({ data: { ...payload }, error: null }),
  });

  const result = await insertSessionExerciseAtEnd<Record<string, unknown>>({
    supabase: fake.supabase,
    sessionId: "session-1",
    userId: "user-1",
    values: { exercise_id: "ex-2" },
    select: "*",
  });

  assert.equal(result.data?.position, 5);
});

test("scopes and user-scopes the position read to the correct columns and ids", async () => {
  const fake = createFakeSupabase({
    existingMaxPosition: 2,
    onInsertAttempt: (payload) => ({ data: { ...payload }, error: null }),
  });

  await insertRoutineDayExerciseAtEnd<Record<string, unknown>>({
    supabase: fake.supabase,
    routineDayId: "day-42",
    userId: "user-99",
    values: {},
  });

  assert.equal(fake.readCalls.length, 1);
  assert.deepEqual(fake.readCalls[0]?.eqCalls, [
    ["routine_day_id", "day-42"],
    ["user_id", "user-99"],
  ]);
});

test("retries with a fresh position on a unique-violation and succeeds once the conflict clears", async () => {
  const fake = createFakeSupabase({
    existingMaxPosition: 0,
    onInsertAttempt: (payload, attemptIndex) => {
      if (attemptIndex === 0) {
        return { data: null, error: UNIQUE_VIOLATION };
      }
      return { data: { ...payload }, error: null };
    },
  });

  const result = await insertRoutineDayExerciseAtEnd<Record<string, unknown>>({
    supabase: fake.supabase,
    routineDayId: "day-1",
    userId: "user-1",
    values: {},
    select: "*",
  });

  assert.equal(result.error, null);
  assert.equal(fake.attemptCount, 2);
  assert.equal(fake.readCalls.length, 2, "each retry attempt must re-read the position, not reuse a stale value");
});

test("fails fast on a non-unique-violation insert error without retrying", async () => {
  const fake = createFakeSupabase({
    existingMaxPosition: 0,
    onInsertAttempt: () => ({ data: null, error: OTHER_ERROR }),
  });

  const result = await insertRoutineDayExerciseAtEnd<Record<string, unknown>>({
    supabase: fake.supabase,
    routineDayId: "day-1",
    userId: "user-1",
    values: {},
    select: "*",
  });

  assert.deepEqual(result.error, OTHER_ERROR);
  assert.equal(fake.attemptCount, 1, "a non-conflict error must not be retried");
});

test("gives up after the fixed retry ceiling of 5 attempts under persistent conflicts", async () => {
  const fake = createFakeSupabase({
    existingMaxPosition: 0,
    onInsertAttempt: () => ({ data: null, error: UNIQUE_VIOLATION }),
  });

  const result = await insertRoutineDayExerciseAtEnd<Record<string, unknown>>({
    supabase: fake.supabase,
    routineDayId: "day-1",
    userId: "user-1",
    values: {},
    select: "*",
  });

  assert.deepEqual(result.error, UNIQUE_VIOLATION);
  assert.equal(fake.attemptCount, 5, "must attempt exactly the documented retry ceiling, no more and no fewer");
});

test("re-reads a changed position on retry instead of reusing the first attempt's stale value", async () => {
  let currentMax = 0;
  const seenPositions: unknown[] = [];
  const fake = createFakeSupabase({
    get existingMaxPosition() {
      return currentMax;
    },
    onInsertAttempt: (payload: Record<string, unknown>, attemptIndex: number) => {
      seenPositions.push(payload.position);
      if (attemptIndex === 0) {
        // Simulate a concurrent writer committing a row between our read and our insert.
        currentMax = 9;
        return { data: null, error: UNIQUE_VIOLATION };
      }
      return { data: { ...payload }, error: null };
    },
  } as unknown as Parameters<typeof createFakeSupabase>[0]);

  const result = await insertRoutineDayExerciseAtEnd<Record<string, unknown>>({
    supabase: fake.supabase,
    routineDayId: "day-1",
    userId: "user-1",
    values: {},
    select: "*",
  });

  assert.equal(result.error, null);
  assert.deepEqual(seenPositions, [1, 10], "the second attempt must use the freshly-read position, not the first attempt's");
});

test("propagates a position-read error without attempting an insert", async () => {
  const readError: PostgrestLikeError = { code: "57014", message: "statement timeout" };
  const fake = createFakeSupabase({
    existingMaxPosition: 0,
    readError,
    onInsertAttempt: () => ({ data: null, error: null }),
  });

  const result = await insertRoutineDayExerciseAtEnd<Record<string, unknown>>({
    supabase: fake.supabase,
    routineDayId: "day-1",
    userId: "user-1",
    values: {},
    select: "*",
  });

  assert.deepEqual(result.error, readError);
  assert.equal(fake.attemptCount, 0, "an insert must never be attempted once the position read itself fails");
});

test("supports the no-select insert path used by fire-and-forget callers", async () => {
  const fake = createFakeSupabase({
    existingMaxPosition: 0,
    onInsertAttempt: () => ({ data: null, error: null }),
  });

  const result = await insertSessionExerciseAtEnd({
    supabase: fake.supabase,
    sessionId: "session-1",
    userId: "user-1",
    values: { exercise_id: "ex-3" },
  });

  assert.equal(result.error, null);
  assert.equal(result.data, null);
});

test("merges the caller-supplied values with the computed position rather than overwriting them", async () => {
  const fake = createFakeSupabase({
    existingMaxPosition: 7,
    onInsertAttempt: (payload) => ({ data: { ...payload }, error: null }),
  });

  await insertSessionExerciseAtEnd<Record<string, unknown>>({
    supabase: fake.supabase,
    sessionId: "session-1",
    userId: "user-1",
    values: { exercise_id: "ex-4", notes: "warm-up" },
    select: "*",
  });

  assert.deepEqual(fake.insertedPayloads[0], { exercise_id: "ex-4", notes: "warm-up", position: 8 });
});

test("the computed position always wins over a caller-supplied position value", async () => {
  const fake = createFakeSupabase({
    existingMaxPosition: 2,
    onInsertAttempt: (payload) => ({ data: { ...payload }, error: null }),
  });

  await insertSessionExerciseAtEnd<Record<string, unknown>>({
    supabase: fake.supabase,
    sessionId: "session-1",
    userId: "user-1",
    // A caller passing its own stale/incorrect `position` must not be able to
    // bypass the freshly-computed one -- the spread order in the source puts
    // `position` last specifically to guarantee this.
    values: { exercise_id: "ex-5", position: 9999 },
    select: "*",
  });

  assert.equal(fake.insertedPayloads[0]?.position, 3, "the computed position must overwrite any caller-supplied position");
});
