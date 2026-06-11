import assert from "node:assert/strict";
import test from "node:test";

import {
  deleteRoutineMutation,
  type RoutineDeleteClient,
} from "@/lib/dal/routine-delete";

type RoutineDeleteError = {
  message?: string;
} | null;

function createRoutineDeleteClient(options?: {
  deleteError?: RoutineDeleteError;
  profileData?: { active_routine_id: string | null } | null;
  profileError?: RoutineDeleteError;
  profileUpdateError?: RoutineDeleteError;
  progressionRoutineDeleteError?: RoutineDeleteError;
  progressionSessionDeleteError?: RoutineDeleteError;
  remainingRoutines?: Array<{ id: string }> | null;
  remainingRoutinesError?: RoutineDeleteError;
  routineSessions?: Array<{ id: string }> | null;
  routineSessionsError?: RoutineDeleteError;
  sessionDeleteError?: RoutineDeleteError;
}) {
  const calls: Array<
    | { type: "profiles-select"; userId: string }
    | { routineId: string; type: "sessions-select"; userId: string }
    | { routineId: string; type: "progression-events-delete-routine"; userId: string }
    | { sessionIds: string[]; type: "progression-events-delete-sessions"; userId: string }
    | { routineId: string; type: "sessions-delete"; userId: string }
    | { routineId: string; type: "routines-delete"; userId: string }
    | { type: "routines-select"; userId: string }
    | { replacementRoutineId: string | null; type: "profiles-update"; userId: string }
  > = [];

  const from = ((table: "profiles" | "routines") => {
      if (table === "profiles") {
        return {
          select(_columns: "active_routine_id") {
            return {
              eq(_column: "id", userId: string) {
                return {
                  async maybeSingle() {
                    calls.push({
                      type: "profiles-select",
                      userId,
                    });

                    return {
                      data: options?.profileData ?? null,
                      error: options?.profileError ?? null,
                    };
                  },
                };
              },
            };
          },
          update(values: { active_routine_id: string | null }) {
            return {
              async eq(_column: "id", userId: string) {
                calls.push({
                  type: "profiles-update",
                  userId,
                  replacementRoutineId: values.active_routine_id,
                });

                return {
                  error: options?.profileUpdateError ?? null,
                };
              },
            };
          },
        };
      }

      if (table === "sessions") {
        return {
          select(_columns: "id") {
            return {
              eq(_column: "user_id", userId: string) {
                return {
                  async eq(_innerColumn: "routine_id", routineId: string) {
                    calls.push({
                      type: "sessions-select",
                      routineId,
                      userId,
                    });

                    return {
                      data: options?.routineSessions ?? [],
                      error: options?.routineSessionsError ?? null,
                    };
                  },
                };
              },
            };
          },
          delete() {
            return {
              eq(_column: "routine_id", routineId: string) {
                return {
                  async eq(_innerColumn: "user_id", userId: string) {
                    calls.push({
                      type: "sessions-delete",
                      routineId,
                      userId,
                    });

                    return {
                      error: options?.sessionDeleteError ?? null,
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "progression_events") {
        return {
          delete() {
            return {
              eq(_column: "user_id", userId: string) {
                return {
                  async eq(_innerColumn: "routine_id", routineId: string) {
                    calls.push({
                      type: "progression-events-delete-routine",
                      routineId,
                      userId,
                    });

                    return {
                      error: options?.progressionRoutineDeleteError ?? null,
                    };
                  },
                  async in(_innerColumn: "source_session_id", sessionIds: string[]) {
                    calls.push({
                      type: "progression-events-delete-sessions",
                      sessionIds,
                      userId,
                    });

                    return {
                      error: options?.progressionSessionDeleteError ?? null,
                    };
                  },
                };
              },
            };
          },
        };
      }

      return {
        delete() {
          return {
            eq(_column: "id", routineId: string) {
              return {
                async eq(_innerColumn: "user_id", userId: string) {
                  calls.push({
                    type: "routines-delete",
                    routineId,
                    userId,
                  });

                  return {
                    error: options?.deleteError ?? null,
                  };
                },
              };
            },
          };
        },
        select(_columns: "id") {
          return {
            eq(_column: "user_id", userId: string) {
              return {
                order(_orderColumn: "updated_at", _orderOptions: { ascending: boolean }) {
                  return {
                    order(_fallbackColumn: "id", _fallbackOptions: { ascending: boolean }) {
                      return {
                        async limit(_count: 1) {
                          calls.push({
                            type: "routines-select",
                            userId,
                          });

                          return {
                            data: options?.remainingRoutines ?? [],
                            error: options?.remainingRoutinesError ?? null,
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    }) as RoutineDeleteClient["from"];

  const client: RoutineDeleteClient = {
    from,
  };

  return {
    calls,
    client,
  };
}

test("deleteRoutineMutation assumes the action already validated routineId", async () => {
  const { client, calls } = createRoutineDeleteClient({
    deleteError: {
      message: "delete failed",
    },
    profileData: {
      active_routine_id: null,
    },
  });

  const result = await deleteRoutineMutation({
    routineId: "",
    supabase: client,
    userId: "user-1",
  });

  assert.deepEqual(result, {
    ok: false,
    error: "delete failed",
    reason: "routine-delete-failed",
  });
  assert.deepEqual(calls, [
    {
      type: "profiles-select",
      userId: "user-1",
    },
    {
      routineId: "",
      type: "sessions-select",
      userId: "user-1",
    },
    {
      routineId: "",
      type: "progression-events-delete-routine",
      userId: "user-1",
    },
    {
      routineId: "",
      type: "sessions-delete",
      userId: "user-1",
    },
    {
      type: "routines-delete",
      routineId: "",
      userId: "user-1",
    },
  ]);
});

test("deleteRoutineMutation surfaces profile lookup failures", async () => {
  const { client } = createRoutineDeleteClient({
    profileError: {
      message: "profile unavailable",
    },
  });

  const result = await deleteRoutineMutation({
    routineId: "routine-1",
    supabase: client,
    userId: "user-2",
  });

  assert.deepEqual(result, {
    ok: false,
    error: "profile unavailable",
    reason: "profile-lookup-failed",
  });
});

test("deleteRoutineMutation surfaces routine session lookup failures", async () => {
  const { client } = createRoutineDeleteClient({
    profileData: {
      active_routine_id: null,
    },
    routineSessionsError: {
      message: "session lookup failed",
    },
  });

  const result = await deleteRoutineMutation({
    routineId: "routine-lookup",
    supabase: client,
    userId: "user-lookup",
  });

  assert.deepEqual(result, {
    ok: false,
    error: "session lookup failed",
    reason: "session-lookup-failed",
  });
});

test("deleteRoutineMutation surfaces progression cleanup failures", async () => {
  const { client } = createRoutineDeleteClient({
    profileData: {
      active_routine_id: null,
    },
    progressionRoutineDeleteError: {
      message: "progression cleanup failed",
    },
  });

  const result = await deleteRoutineMutation({
    routineId: "routine-progression",
    supabase: client,
    userId: "user-progression",
  });

  assert.deepEqual(result, {
    ok: false,
    error: "progression cleanup failed",
    reason: "progression-delete-failed",
  });
});

test("deleteRoutineMutation deletes session-linked progression events when routine sessions exist", async () => {
  const { client, calls } = createRoutineDeleteClient({
    profileData: {
      active_routine_id: null,
    },
    routineSessions: [
      { id: "session-1" },
      { id: "session-2" },
    ],
  });

  const result = await deleteRoutineMutation({
    routineId: "routine-with-sessions",
    supabase: client,
    userId: "user-with-sessions",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls.slice(0, 5), [
    {
      type: "profiles-select",
      userId: "user-with-sessions",
    },
    {
      type: "sessions-select",
      routineId: "routine-with-sessions",
      userId: "user-with-sessions",
    },
    {
      type: "progression-events-delete-routine",
      routineId: "routine-with-sessions",
      userId: "user-with-sessions",
    },
    {
      type: "progression-events-delete-sessions",
      sessionIds: ["session-1", "session-2"],
      userId: "user-with-sessions",
    },
    {
      type: "sessions-delete",
      routineId: "routine-with-sessions",
      userId: "user-with-sessions",
    },
  ]);
});

test("deleteRoutineMutation surfaces routine session delete failures", async () => {
  const { client } = createRoutineDeleteClient({
    profileData: {
      active_routine_id: null,
    },
    sessionDeleteError: {
      message: "session delete failed",
    },
  });

  const result = await deleteRoutineMutation({
    routineId: "routine-session-delete",
    supabase: client,
    userId: "user-session-delete",
  });

  assert.deepEqual(result, {
    ok: false,
    error: "session delete failed",
    reason: "session-delete-failed",
  });
});

test("deleteRoutineMutation surfaces routine delete failures", async () => {
  const { client } = createRoutineDeleteClient({
    deleteError: {
      message: "delete failed",
    },
    profileData: {
      active_routine_id: "routine-2",
    },
  });

  const result = await deleteRoutineMutation({
    routineId: "routine-1",
    supabase: client,
    userId: "user-3",
  });

  assert.deepEqual(result, {
    ok: false,
    error: "delete failed",
    reason: "routine-delete-failed",
  });
});

test("deleteRoutineMutation skips profile updates when deleting a non-active routine", async () => {
  const { client, calls } = createRoutineDeleteClient({
    profileData: {
      active_routine_id: "routine-active",
    },
  });

  const result = await deleteRoutineMutation({
    routineId: "routine-4",
    supabase: client,
    userId: "user-4",
  });

  assert.deepEqual(result, {
    ok: true,
    deletedActiveRoutine: false,
    replacementRoutineId: null,
  });
  assert.deepEqual(calls, [
    {
      type: "profiles-select",
      userId: "user-4",
    },
    {
      type: "sessions-select",
      routineId: "routine-4",
      userId: "user-4",
    },
    {
      type: "progression-events-delete-routine",
      routineId: "routine-4",
      userId: "user-4",
    },
    {
      type: "sessions-delete",
      routineId: "routine-4",
      userId: "user-4",
    },
    {
      type: "routines-delete",
      routineId: "routine-4",
      userId: "user-4",
    },
  ]);
});

test("deleteRoutineMutation updates the active routine to a replacement when needed", async () => {
  const { client, calls } = createRoutineDeleteClient({
    profileData: {
      active_routine_id: "routine-active",
    },
    remainingRoutines: [
      { id: "routine-replacement" },
    ],
  });

  const result = await deleteRoutineMutation({
    routineId: "routine-active",
    supabase: client,
    userId: "user-5",
  });

  assert.deepEqual(result, {
    ok: true,
    deletedActiveRoutine: true,
    replacementRoutineId: "routine-replacement",
  });
  assert.deepEqual(calls, [
    {
      type: "profiles-select",
      userId: "user-5",
    },
    {
      type: "sessions-select",
      routineId: "routine-active",
      userId: "user-5",
    },
    {
      type: "progression-events-delete-routine",
      routineId: "routine-active",
      userId: "user-5",
    },
    {
      type: "sessions-delete",
      routineId: "routine-active",
      userId: "user-5",
    },
    {
      type: "routines-delete",
      routineId: "routine-active",
      userId: "user-5",
    },
    {
      type: "routines-select",
      userId: "user-5",
    },
    {
      type: "profiles-update",
      replacementRoutineId: "routine-replacement",
      userId: "user-5",
    },
  ]);
});

test("deleteRoutineMutation clears active_routine_id when the last routine is deleted", async () => {
  const { client, calls } = createRoutineDeleteClient({
    profileData: {
      active_routine_id: "routine-last",
    },
    remainingRoutines: [],
  });

  const result = await deleteRoutineMutation({
    routineId: "routine-last",
    supabase: client,
    userId: "user-6",
  });

  assert.deepEqual(result, {
    ok: true,
    deletedActiveRoutine: true,
    replacementRoutineId: null,
  });
  assert.deepEqual(calls.at(-1), {
    type: "profiles-update",
    replacementRoutineId: null,
    userId: "user-6",
  });
});

test("deleteRoutineMutation surfaces replacement routine lookup failures", async () => {
  const { client } = createRoutineDeleteClient({
    profileData: {
      active_routine_id: "routine-active",
    },
    remainingRoutinesError: {
      message: "replacement lookup failed",
    },
  });

  const result = await deleteRoutineMutation({
    routineId: "routine-active",
    supabase: client,
    userId: "user-7",
  });

  assert.deepEqual(result, {
    ok: false,
    error: "replacement lookup failed",
    reason: "replacement-routine-lookup-failed",
  });
});

test("deleteRoutineMutation surfaces profile update failures", async () => {
  const { client } = createRoutineDeleteClient({
    profileData: {
      active_routine_id: "routine-active",
    },
    profileUpdateError: {
      message: "profile update failed",
    },
    remainingRoutines: [
      { id: "routine-replacement" },
    ],
  });

  const result = await deleteRoutineMutation({
    routineId: "routine-active",
    supabase: client,
    userId: "user-8",
  });

  assert.deepEqual(result, {
    ok: false,
    error: "profile update failed",
    reason: "profile-update-failed",
  });
});
