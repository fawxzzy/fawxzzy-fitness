import test from "node:test";
import assert from "node:assert/strict";
import {
  PROFILE_PREFERENCE_COLUMN_MISSING_MESSAGE,
  PROFILE_QA_VISIBILITY_COLUMN_MISSING_MESSAGE,
  updateProfileQaLlelVisibility,
  updateProfileUnitPreferences,
} from "@/lib/dal/profile-settings";

function createProfileSettingsClient(result: { error: { message?: string } | null }) {
  const calls: Array<{
    table: string;
    values: Record<string, unknown>;
    userId: string;
  }> = [];

  return {
    calls,
    client: {
      from(table: "profiles") {
        return {
          update(values: Record<string, unknown>) {
            return {
              async eq(_column: "id", userId: string) {
                calls.push({
                  table,
                  values,
                  userId,
                });
                return result;
              },
            };
          },
        };
      },
    },
  };
}

test("updateProfileUnitPreferences writes both profile preference columns", async () => {
  const { client, calls } = createProfileSettingsClient({ error: null });

  const result = await updateProfileUnitPreferences({
    distanceUnit: "km",
    supabase: client,
    userId: "user-1",
    weightUnit: "kg",
  });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, [{
    table: "profiles",
    userId: "user-1",
    values: {
      preferred_weight_unit: "kg",
      preferred_distance_unit: "km",
    },
  }]);
});

test("updateProfileUnitPreferences classifies missing profile migrations", async () => {
  const { client } = createProfileSettingsClient({
    error: {
      message: "column profiles.preferred_weight_unit does not exist",
    },
  });

  const result = await updateProfileUnitPreferences({
    distanceUnit: "mi",
    supabase: client,
    userId: "user-2",
    weightUnit: "lbs",
  });

  assert.deepEqual(result, {
    ok: false,
    error: PROFILE_PREFERENCE_COLUMN_MISSING_MESSAGE,
    reason: "missing-column",
  });
});

test("updateProfileQaLlelVisibility preserves backend error messages", async () => {
  const { client } = createProfileSettingsClient({
    error: {
      message: "database is unavailable",
    },
  });

  const result = await updateProfileQaLlelVisibility({
    showQaLlelData: true,
    supabase: client,
    userId: "user-3",
  });

  assert.deepEqual(result, {
    ok: false,
    error: "database is unavailable",
    reason: "unknown",
  });
});

test("updateProfileQaLlelVisibility classifies missing QA visibility column", async () => {
  const { client } = createProfileSettingsClient({
    error: {
      message: "Could not find the 'show_qa_llel_data' column of 'profiles' in the schema cache",
    },
  });

  const result = await updateProfileQaLlelVisibility({
    showQaLlelData: false,
    supabase: client,
    userId: "user-4",
  });

  assert.deepEqual(result, {
    ok: false,
    error: PROFILE_QA_VISIBILITY_COLUMN_MISSING_MESSAGE,
    reason: "missing-column",
  });
});
