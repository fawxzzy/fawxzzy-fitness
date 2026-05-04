import test from "node:test";
import assert from "node:assert/strict";

import { ensureProfileForEntryBootstrap, ensureProfileWithClient } from "./profile-core.ts";

const PROFILE_SELECT_WITH_EXTENDED_COLUMNS =
  "id, timezone, active_routine_id, preferred_weight_unit, preferred_distance_unit, user_number, user_kind, user_number_assigned_at";
const PROFILE_SELECT_LEGACY = "id, timezone, active_routine_id";

type QueryResult = {
  data: unknown;
  error: { code?: string; details?: string; message: string } | null;
};

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
          user_number: 7,
          user_kind: "human",
          user_number_assigned_at: "2026-05-04T11:00:00.000Z",
        },
        error: null,
      },
    ],
    single: [],
  });

  const profile = await ensureProfileWithClient("user-1", fake.client as never);

  assert.equal(profile.preferred_weight_unit, "kg");
  assert.equal(profile.preferred_distance_unit, "km");
  assert.equal(profile.user_number, 7);
  assert.equal(profile.user_kind, "human");
  assert.equal(profile.user_number_assigned_at, "2026-05-04T11:00:00.000Z");
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
  assert.equal(profile.user_number, null);
  assert.equal(profile.user_kind, "unknown");
  assert.equal(profile.user_number_assigned_at, null);
  assert.deepEqual(fake.tracker.selects, [
    PROFILE_SELECT_WITH_EXTENDED_COLUMNS,
    PROFILE_SELECT_LEGACY,
  ]);
});

test("ensureProfile falls back when provider reports preferred_weight_unit as a missing column", async () => {
  const fake = createFakeSupabase({
    maybeSingle: [
      {
        data: null,
        error: {
          message: "column profiles.preferred_weight_unit does not exist",
        },
      },
      {
        data: {
          id: "user-2b",
          timezone: "America/Denver",
          active_routine_id: null,
        },
        error: null,
      },
    ],
    single: [],
  });

  const profile = await ensureProfileWithClient("user-2b", fake.client as never);

  assert.equal(profile.preferred_weight_unit, "lbs");
  assert.equal(profile.preferred_distance_unit, "mi");
  assert.equal(profile.user_number, null);
  assert.equal(profile.user_kind, "unknown");
  assert.deepEqual(fake.tracker.selects, [
    PROFILE_SELECT_WITH_EXTENDED_COLUMNS,
    PROFILE_SELECT_LEGACY,
  ]);
});

test("ensureProfile falls back when provider reports preferred_distance_unit as a missing column", async () => {
  const fake = createFakeSupabase({
    maybeSingle: [
      {
        data: null,
        error: {
          message: "column profiles.preferred_distance_unit does not exist",
        },
      },
      {
        data: {
          id: "user-2c",
          timezone: "America/Denver",
          active_routine_id: null,
        },
        error: null,
      },
    ],
    single: [],
  });

  const profile = await ensureProfileWithClient("user-2c", fake.client as never);

  assert.equal(profile.preferred_weight_unit, "lbs");
  assert.equal(profile.preferred_distance_unit, "mi");
  assert.equal(profile.user_number, null);
  assert.equal(profile.user_kind, "unknown");
  assert.deepEqual(fake.tracker.selects, [
    PROFILE_SELECT_WITH_EXTENDED_COLUMNS,
    PROFILE_SELECT_LEGACY,
  ]);
});

test("ensureProfile falls back when provider reports user_number as a missing column", async () => {
  const fake = createFakeSupabase({
    maybeSingle: [
      {
        data: null,
        error: {
          message: "column profiles.user_number does not exist",
        },
      },
      {
        data: {
          id: "user-2d",
          timezone: "America/Phoenix",
          active_routine_id: null,
        },
        error: null,
      },
    ],
    single: [],
  });

  const profile = await ensureProfileWithClient("user-2d", fake.client as never);

  assert.equal(profile.user_number, null);
  assert.equal(profile.user_kind, "unknown");
  assert.equal(profile.user_number_assigned_at, null);
  assert.deepEqual(fake.tracker.selects, [
    PROFILE_SELECT_WITH_EXTENDED_COLUMNS,
    PROFILE_SELECT_LEGACY,
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
  assert.equal("user_number" in fake.tracker.inserts[0], false);
  assert.equal("user_kind" in fake.tracker.inserts[0], false);
  assert.equal("user_number_assigned_at" in fake.tracker.inserts[0], false);
  assert.equal(profile.preferred_weight_unit, "lbs");
  assert.equal(profile.preferred_distance_unit, "mi");
  assert.equal(profile.user_number, null);
  assert.equal(profile.user_kind, "unknown");
});

test("ensureProfile recovers from a read-then-insert collision by reloading the inserted row", async () => {
  const fake = createFakeSupabase({
    maybeSingle: [
      { data: null, error: null },
      {
        data: {
          id: "user-4",
          timezone: "America/New_York",
          active_routine_id: null,
          preferred_weight_unit: "lbs",
          preferred_distance_unit: "mi",
          user_number: 1,
          user_kind: "human",
          user_number_assigned_at: "2026-05-04T12:00:00.000Z",
        },
        error: null,
      },
    ],
    single: [
      {
        data: null,
        error: {
          code: "23505",
          message: "duplicate key value violates unique constraint \"profiles_pkey\"",
        },
      },
    ],
  });

  const profile = await ensureProfileWithClient("user-4", fake.client as never);

  assert.equal(profile.id, "user-4");
  assert.equal(profile.timezone, "America/New_York");
  assert.equal(fake.tracker.inserts.length, 1);
  assert.deepEqual(fake.tracker.selects, [
    PROFILE_SELECT_WITH_EXTENDED_COLUMNS,
    PROFILE_SELECT_WITH_EXTENDED_COLUMNS,
    PROFILE_SELECT_WITH_EXTENDED_COLUMNS,
  ]);
});

test("ensureProfile recovers when a transient read failure is followed by a concurrent create collision", async () => {
  const fake = createFakeSupabase({
    maybeSingle: [
      {
        data: null,
        error: {
          code: "PGRST003",
          message: "request timed out before profile read completed",
        },
      },
      {
        data: {
          id: "user-5",
          timezone: "America/Chicago",
          active_routine_id: null,
          preferred_weight_unit: "lbs",
          preferred_distance_unit: "mi",
          user_number: 2,
          user_kind: "human",
          user_number_assigned_at: "2026-05-04T12:15:00.000Z",
        },
        error: null,
      },
    ],
    single: [
      {
        data: null,
        error: {
          code: "23505",
          message: "duplicate key value violates unique constraint \"profiles_pkey\"",
        },
      },
    ],
  });

  const profile = await ensureProfileWithClient("user-5", fake.client as never);

  assert.equal(profile.id, "user-5");
  assert.equal(profile.timezone, "America/Chicago");
  assert.equal(fake.tracker.inserts.length, 1);
});

test("ensureProfile re-reads after a recoverable insert failure and returns the created row", async () => {
  const fake = createFakeSupabase({
    maybeSingle: [
      { data: null, error: null },
      {
        data: {
          id: "user-6",
          timezone: "America/Los_Angeles",
          active_routine_id: null,
          preferred_weight_unit: "lbs",
          preferred_distance_unit: "mi",
          user_number: 3,
          user_kind: "human",
          user_number_assigned_at: "2026-05-04T12:30:00.000Z",
        },
        error: null,
      },
    ],
    single: [
      {
        data: null,
        error: {
          code: "PGRST003",
          message: "request timed out before insert response completed",
        },
      },
    ],
  });

  const profile = await ensureProfileWithClient("user-6", fake.client as never);

  assert.equal(profile.id, "user-6");
  assert.equal(profile.timezone, "America/Los_Angeles");
  assert.equal(fake.tracker.inserts.length, 1);
});

test("ensureProfileForEntryBootstrap logs and fails open when profile bootstrap stays flaky", async () => {
  const logs: Array<{ message: string; details: Record<string, unknown> }> = [];

  const result = await ensureProfileForEntryBootstrap("user-7", {
    ensureProfileImpl: async () => {
      throw Object.assign(new Error("profiles unavailable"), {
        code: "PGRST003",
        details: "request timed out",
      });
    },
    logError: (message, details) => {
      logs.push({ message, details });
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.profile, null);
  assert.equal(logs.length, 1);
  assert.equal(logs[0]?.message, "[entry] profile bootstrap failed; continuing with authenticated fallback");
  assert.equal(logs[0]?.details.route, "/entry");
  assert.equal(logs[0]?.details.stage, "ensureProfile");
  assert.equal(logs[0]?.details.errorMessage, "profiles unavailable");
});
