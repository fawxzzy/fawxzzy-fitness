type RoutineRollbackClient = {
  from(table: string): any;
};

export async function rollbackAppendedRoutineDay(args: {
  client: RoutineRollbackClient;
  userId: string;
  routineId: string;
  routineDayId: string;
  previousCycleLength: number;
}) {
  await args.client
    .from("routine_day_exercises")
    .delete()
    .eq("routine_day_id", args.routineDayId)
    .eq("user_id", args.userId);

  await args.client
    .from("routine_days")
    .delete()
    .eq("id", args.routineDayId)
    .eq("routine_id", args.routineId)
    .eq("user_id", args.userId);

  await args.client
    .from("routines")
    .update({
      cycle_length_days: args.previousCycleLength,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.routineId)
    .eq("user_id", args.userId);
}

export async function rollbackDuplicatedRoutine(args: {
  client: RoutineRollbackClient;
  userId: string;
  routineId: string;
  copiedDayIds?: string[];
}) {
  if (args.copiedDayIds && args.copiedDayIds.length > 0) {
    await args.client
      .from("routine_day_exercises")
      .delete()
      .in("routine_day_id", args.copiedDayIds)
      .eq("user_id", args.userId);

    await args.client
      .from("routine_days")
      .delete()
      .in("id", args.copiedDayIds)
      .eq("user_id", args.userId);
  }

  await args.client
    .from("routines")
    .delete()
    .eq("id", args.routineId)
    .eq("user_id", args.userId);
}
