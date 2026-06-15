import assert from "node:assert/strict";
import test from "node:test";
import { rollbackAppendedRoutineDay, rollbackDuplicatedRoutine } from "./routine-copy-rollback.ts";

function createRecordingClient() {
  const operations: Array<Record<string, unknown>> = [];

  const client = {
    from(table: string) {
      const operation: Record<string, unknown> = {
        table,
        filters: [],
      };
      operations.push(operation);

      const chain = {
        delete() {
          operation.type = "delete";
          return chain;
        },
        update(payload: Record<string, unknown>) {
          operation.type = "update";
          operation.payload = payload;
          return chain;
        },
        eq(column: string, value: string | number) {
          (operation.filters as Array<Record<string, unknown>>).push({
            operator: "eq",
            column,
            value,
          });
          return chain;
        },
        in(column: string, values: string[]) {
          (operation.filters as Array<Record<string, unknown>>).push({
            operator: "in",
            column,
            values,
          });
          return chain;
        },
      };

      return chain;
    },
  };

  return {
    client,
    operations,
  };
}

test("rollbackAppendedRoutineDay removes copied exercises, removes the appended day, and restores cycle length", async () => {
  const { client, operations } = createRecordingClient();

  await rollbackAppendedRoutineDay({
    client,
    userId: "user-1",
    routineId: "routine-1",
    routineDayId: "day-1",
    previousCycleLength: 4,
  });

  assert.equal(operations.length, 3);
  assert.deepEqual(operations[0], {
    table: "routine_day_exercises",
    type: "delete",
    filters: [
      { operator: "eq", column: "routine_day_id", value: "day-1" },
      { operator: "eq", column: "user_id", value: "user-1" },
    ],
  });
  assert.deepEqual(operations[1], {
    table: "routine_days",
    type: "delete",
    filters: [
      { operator: "eq", column: "id", value: "day-1" },
      { operator: "eq", column: "routine_id", value: "routine-1" },
      { operator: "eq", column: "user_id", value: "user-1" },
    ],
  });
  assert.equal(operations[2]?.table, "routines");
  assert.equal(operations[2]?.type, "update");
  assert.equal((operations[2]?.payload as Record<string, unknown>)?.cycle_length_days, 4);
  assert.equal(typeof (operations[2]?.payload as Record<string, unknown>)?.updated_at, "string");
  assert.deepEqual(operations[2]?.filters, [
    { operator: "eq", column: "id", value: "routine-1" },
    { operator: "eq", column: "user_id", value: "user-1" },
  ]);
});

test("rollbackDuplicatedRoutine removes copied exercises and copied days before deleting the routine", async () => {
  const { client, operations } = createRecordingClient();

  await rollbackDuplicatedRoutine({
    client,
    userId: "user-1",
    routineId: "routine-1",
    copiedDayIds: ["day-1", "day-2"],
  });

  assert.deepEqual(operations, [
    {
      table: "routine_day_exercises",
      type: "delete",
      filters: [
        { operator: "in", column: "routine_day_id", values: ["day-1", "day-2"] },
        { operator: "eq", column: "user_id", value: "user-1" },
      ],
    },
    {
      table: "routine_days",
      type: "delete",
      filters: [
        { operator: "in", column: "id", values: ["day-1", "day-2"] },
        { operator: "eq", column: "user_id", value: "user-1" },
      ],
    },
    {
      table: "routines",
      type: "delete",
      filters: [
        { operator: "eq", column: "id", value: "routine-1" },
        { operator: "eq", column: "user_id", value: "user-1" },
      ],
    },
  ]);
});

test("rollbackDuplicatedRoutine deletes only the duplicated routine when copied days were never inserted", async () => {
  const { client, operations } = createRecordingClient();

  await rollbackDuplicatedRoutine({
    client,
    userId: "user-1",
    routineId: "routine-1",
    copiedDayIds: [],
  });

  assert.deepEqual(operations, [
    {
      table: "routines",
      type: "delete",
      filters: [
        { operator: "eq", column: "id", value: "routine-1" },
        { operator: "eq", column: "user_id", value: "user-1" },
      ],
    },
  ]);
});
