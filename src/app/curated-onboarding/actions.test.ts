import assert from "node:assert/strict";
import test from "node:test";
import { activateProfileRoutineId } from "@/app/curated-onboarding/activate-profile-routine";

type ActivateProfileError = { message?: string };
type ActivationSingleResult = { data: { id: string } | null; error: ActivateProfileError | null };

type ProfileActivationExecutor = (args: { userId: string; routineId: string }) => Promise<ActivationSingleResult>;

function createProfileActivationQuery(result: ActivationSingleResult) {
  let updateArgs: { userId: string; routineId: string } | null = null;
  let filterColumn: string | null = null;
  let filterValue: string | null = null;
  let selectedColumns: string | null = null;

  const executeProfileActivation: ProfileActivationExecutor = async ({ userId, routineId }) => {
    updateArgs = { userId, routineId };
    filterColumn = "id";
    filterValue = userId;
    selectedColumns = "id";

    return result;
  };

  return {
    executeProfileActivation,
    assertions: {
      assertCalledWithUserAndRoutine(userId: string, routineId: string) {
        assert.equal(updateArgs?.userId, userId);
        assert.equal(updateArgs?.routineId, routineId);
        assert.equal(filterColumn, "id");
        assert.equal(filterValue, userId);
        assert.equal(selectedColumns, "id");
      },
    },
  } as const;
}

test("activateProfileRoutineId activates the profile when one matching row exists", async () => {
  const profileData = createProfileActivationQuery({ data: { id: "user-1" }, error: null });

  const result = await activateProfileRoutineId({
    executeProfileActivation: profileData.executeProfileActivation,
    userId: "user-1",
    routineId: "routine-123",
  });

  assert.deepEqual(result, { ok: true, profileId: "user-1" });
  profileData.assertions.assertCalledWithUserAndRoutine("user-1", "routine-123");
});

test("activateProfileRoutineId fails closed when activation returns zero rows", async () => {
  const profileData = createProfileActivationQuery({ data: null, error: null });

  const result = await activateProfileRoutineId({
    executeProfileActivation: profileData.executeProfileActivation,
    userId: "user-1",
    routineId: "routine-456",
  });

  assert.deepEqual(result, { ok: false, error: "The curated routine was not activated." });
  profileData.assertions.assertCalledWithUserAndRoutine("user-1", "routine-456");
});

test("activateProfileRoutineId propagates update errors without pretending success", async () => {
  const profileData = createProfileActivationQuery({ data: null, error: { message: "RLS denied for profile update." } });

  const result = await activateProfileRoutineId({
    executeProfileActivation: profileData.executeProfileActivation,
    userId: "user-1",
    routineId: "routine-789",
  });

  assert.deepEqual(result, { ok: false, error: "RLS denied for profile update." });
  profileData.assertions.assertCalledWithUserAndRoutine("user-1", "routine-789");
});
