export async function assertFixedBaselineOwnedByUser(client, userId, baseline) {
  const fixedRows = [
    { table: "sets", column: "session_exercise_id", values: Object.values(baseline.sessionExerciseIds) },
    { table: "session_exercises", column: "id", values: Object.values(baseline.sessionExerciseIds) },
    { table: "sessions", column: "id", values: Object.values(baseline.sessionIds) },
    { table: "routine_day_exercises", column: "id", values: Object.values(baseline.routineDayExerciseIds) },
    { table: "routine_days", column: "id", values: [baseline.routineDayId] },
    { table: "routines", column: "id", values: [baseline.routineId] },
  ];

  for (const { table, column, values } of fixedRows) {
    const { data, error, count } = await client.from(table).select("user_id", { count: "exact" }).in(column, values);
    if (error) throw new Error(`Unable to check fixed QA baseline ownership in ${table}: ${error.message}`);
    if (!Array.isArray(data) || !Number.isSafeInteger(count) || count < 0 || count !== data.length) {
      throw new Error(`QA reset refused: incomplete fixed baseline ownership read in ${table}.`);
    }
    if (data.some((row) => typeof row?.user_id !== "string" || row.user_id !== userId)) {
      throw new Error(`QA reset refused: fixed baseline rows in ${table} belong to another user.`);
    }
  }
}

export async function guardAndDeleteUserOwnedRows(client, userId, baseline, deleteOwnedRows) {
  await assertFixedBaselineOwnedByUser(client, userId, baseline);
  await deleteOwnedRows(client, userId);
}
