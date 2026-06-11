import { resolveReplacementActiveRoutineId } from "@/lib/active-routine-fallback";

type RoutineDeleteError = {
  message?: string;
};

type RoutineDeleteProfileRow = {
  active_routine_id: string | null;
};

type RoutineDeleteIdentityRow = {
  id: string;
};

type ProfilesRoutineDeleteQuery = {
  select(columns: "active_routine_id"): {
    eq(column: "id", value: string): {
      maybeSingle(): Promise<{
        data: RoutineDeleteProfileRow | null;
        error: RoutineDeleteError | null;
      }>;
    };
  };
  update(values: { active_routine_id: string | null }): {
    eq(column: "id", value: string): Promise<{
      error: RoutineDeleteError | null;
    }>;
  };
};

type RoutinesRoutineDeleteQuery = {
  delete(): {
    eq(column: "id", value: string): {
      eq(column: "user_id", value: string): Promise<{
        error: RoutineDeleteError | null;
      }>;
    };
  };
  select(columns: "id"): {
    eq(column: "user_id", value: string): {
      order(column: "updated_at", options: { ascending: boolean }): {
        order(column: "id", options: { ascending: boolean }): {
          limit(count: 1): Promise<{
            data: RoutineDeleteIdentityRow[] | null;
            error: RoutineDeleteError | null;
          }>;
        };
      };
    };
  };
};

type SessionsRoutineDeleteQuery = {
  select(columns: "id"): {
    eq(column: "user_id", value: string): {
      eq(column: "routine_id", value: string): Promise<{
        data: RoutineDeleteIdentityRow[] | null;
        error: RoutineDeleteError | null;
      }>;
    };
  };
  delete(): {
    eq(column: "routine_id", value: string): {
      eq(column: "user_id", value: string): Promise<{
        error: RoutineDeleteError | null;
      }>;
    };
  };
};

type ProgressionEventsRoutineDeleteQuery = {
  delete(): {
    eq(column: "user_id", value: string): {
      eq(column: "routine_id", value: string): Promise<{
        error: RoutineDeleteError | null;
      }>;
      in(column: "source_session_id", values: string[]): Promise<{
        error: RoutineDeleteError | null;
      }>;
    };
  };
};

export type RoutineDeleteClient = {
  from(table: "profiles"): ProfilesRoutineDeleteQuery;
  from(table: "routines"): RoutinesRoutineDeleteQuery;
  from(table: "sessions"): SessionsRoutineDeleteQuery;
  from(table: "progression_events"): ProgressionEventsRoutineDeleteQuery;
};

export type DeleteRoutineMutationResult =
  | {
      ok: true;
      deletedActiveRoutine: boolean;
      replacementRoutineId: string | null;
    }
  | {
      ok: false;
      error: string;
      reason:
        | "profile-lookup-failed"
        | "session-lookup-failed"
        | "progression-delete-failed"
        | "session-delete-failed"
        | "routine-delete-failed"
        | "replacement-routine-lookup-failed"
        | "profile-update-failed";
    };

export async function deleteRoutineMutation(args: {
  routineId: string;
  supabase: RoutineDeleteClient;
  userId: string;
}): Promise<DeleteRoutineMutationResult> {
  const { data: profile, error: profileError } = await args.supabase
    .from("profiles")
    .select("active_routine_id")
    .eq("id", args.userId)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      error: profileError.message || "Failed to resolve active routine.",
      reason: "profile-lookup-failed",
    };
  }

  const deletingActiveRoutine = profile?.active_routine_id === args.routineId;

  const { data: routineSessions, error: routineSessionsError } = await args.supabase
    .from("sessions")
    .select("id")
    .eq("user_id", args.userId)
    .eq("routine_id", args.routineId);

  if (routineSessionsError) {
    return {
      ok: false,
      error: routineSessionsError.message || "Failed to resolve routine sessions.",
      reason: "session-lookup-failed",
    };
  }

  const routineSessionIds = (routineSessions ?? []).map((row) => row.id).filter(Boolean);

  const { error: progressionDeleteError } = await args.supabase
    .from("progression_events")
    .delete()
    .eq("user_id", args.userId)
    .eq("routine_id", args.routineId);

  if (progressionDeleteError) {
    return {
      ok: false,
      error: progressionDeleteError.message || "Failed to delete routine progression events.",
      reason: "progression-delete-failed",
    };
  }

  if (routineSessionIds.length > 0) {
    const { error: sessionProgressionDeleteError } = await args.supabase
      .from("progression_events")
      .delete()
      .eq("user_id", args.userId)
      .in("source_session_id", routineSessionIds);

    if (sessionProgressionDeleteError) {
      return {
        ok: false,
        error: sessionProgressionDeleteError.message || "Failed to delete session-linked progression events.",
        reason: "progression-delete-failed",
      };
    }
  }

  const { error: sessionDeleteError } = await args.supabase
    .from("sessions")
    .delete()
    .eq("routine_id", args.routineId)
    .eq("user_id", args.userId);

  if (sessionDeleteError) {
    return {
      ok: false,
      error: sessionDeleteError.message || "Failed to delete routine sessions.",
      reason: "session-delete-failed",
    };
  }

  const { error: deleteError } = await args.supabase
    .from("routines")
    .delete()
    .eq("id", args.routineId)
    .eq("user_id", args.userId);

  if (deleteError) {
    return {
      ok: false,
      error: deleteError.message || "Failed to delete routine.",
      reason: "routine-delete-failed",
    };
  }

  if (!deletingActiveRoutine) {
    return {
      ok: true,
      deletedActiveRoutine: false,
      replacementRoutineId: null,
    };
  }

  const { data: remainingRoutines, error: remainingRoutinesError } = await args.supabase
    .from("routines")
    .select("id")
    .eq("user_id", args.userId)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(1);

  if (remainingRoutinesError) {
    return {
      ok: false,
      error: remainingRoutinesError.message || "Failed to resolve replacement routine.",
      reason: "replacement-routine-lookup-failed",
    };
  }

  const replacementRoutineId = resolveReplacementActiveRoutineId(remainingRoutines ?? []);
  const { error: profileUpdateError } = await args.supabase
    .from("profiles")
    .update({ active_routine_id: replacementRoutineId })
    .eq("id", args.userId);

  if (profileUpdateError) {
    return {
      ok: false,
      error: profileUpdateError.message || "Failed to update active routine.",
      reason: "profile-update-failed",
    };
  }

  return {
    ok: true,
    deletedActiveRoutine: true,
    replacementRoutineId,
  };
}
