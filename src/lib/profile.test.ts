import test from "node:test";
import assert from "node:assert/strict";

import { ensureProfileWithClient } from "./profile-core.ts";

type QueryResult = { data: unknown; error: { message: string } | null };

function createFakeSupabase(script: { maybeSingle: QueryResult[]; single: QueryResult[] }) {
  const tracker = {
    selects: [] as string[],
    inserts: [] as Array<Record<string, unknown>>,
  };

  class FakeQuery {
    select(columns: string) {
      tracker.selects.push(columns);
      return this;
    }

    eq() {
      return this;
    }

    maybeSingle() {
      const result = script.maybeSingle.shift();
      return Promise.resolve(result ?? { data: null, error: null });
    }

    insert(payload: Record<string, unknown>) {
      tracker.inserts.push(payload);
      return this;
    }

    single() {
      const result = script.single.shift();
      return Promise.resolve(result ?? { data: null, error: null });
    }
  }

  return {
    client: {
      from() {
        return new FakeQuery();
      },
    },
    tracker,
  };
}

test("ensureProfile returns persisted preference columns when available", async () => {
  const fake = createFakeSupabase({
    maybeSingle: [
      {
        data: {
          id: "user-1",
          timezone: "America/New_York",
          active_routine_id: null,
          preferred_weight_unit: "kg",
          preferred_distance_unit: "km",
        },
        error: null,
      },
    ],
    single: [],
  });

  const profile = await ensureProfileWithClient("user-1", fake.client as never);

  assert.equal(profile.preferred_weight_unit, "kg");
  assert.equal(profile.preferred_distance_unit, "km");
  assert.equal(fake.tracker.inserts.length, 0);
});

test("ensureProfile falls back to legacy select and hydrates defaults when preference columns are missing", async () => {
  const fake = createFakeSupabase({
    maybeSingle: [
      {
        data: null,
        error: {
          message: "Could not find the 'preferred_distance_unit' column of 'profiles' in the schema cache",
        },
      },
      {
        data: {
          id: "user-2",
          timezone: "America/Chicago",
          active_routine_id: null,
        },
        error: null,
      },
    ],
    single: [],
  });

  const profile = await ensureProfileWithClient("user-2", fake.client as never);

  assert.equal(profile.preferred_weight_unit, "lbs");
  assert.equal(profile.preferred_distance_unit, "mi");
  assert.deepEqual(fake.tracker.selects, [
    "id, timezone, active_routine_id, preferred_weight_unit, preferred_distance_unit",
    "id, timezone, active_routine_id",
  ]);
});

test("ensureProfile creates a profile in legacy mode without preference columns and returns default units", async () => {
  const fake = createFakeSupabase({
    maybeSingle: [
      {
        data: null,
        error: {
          message: "Could not find the 'preferred_weight_unit' column of 'profiles' in the schema cache",
        },
      },
      { data: null, error: null },
    ],
    single: [
      {
        data: {
          id: "user-3",
          timezone: "America/Los_Angeles",
          active_routine_id: null,
        },
        error: null,
      },
    ],
  });

  const profile = await ensureProfileWithClient("user-3", fake.client as never);

  assert.equal(fake.tracker.inserts.length, 1);
  assert.equal(fake.tracker.inserts[0].id, "user-3");
  assert.equal(typeof fake.tracker.inserts[0].timezone, "string");
  assert.equal(profile.preferred_weight_unit, "lbs");
  assert.equal(profile.preferred_distance_unit, "mi");
});
