import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertFixedBaselineOwnedByUser, guardAndDeleteUserOwnedRows } from "./fitness-qa-baseline-ownership.mjs";

const baseline = {
  sessionExerciseIds: { one: "exercise-1" }, sessionIds: { one: "session-1" },
  routineDayExerciseIds: { one: "day-exercise-1" }, routineDayId: "day-1", routineId: "routine-1",
};

function client(rows = {}, failedTable = null, overrides = {}) {
  const reads = [];
  let writes = 0;
  return {
    from(table) {
      return {
        select(column, options) {
          assert.equal(column, "user_id");
          assert.deepEqual(options, { count: "exact" });
          return { async in(key, ids) {
            reads.push({ table, key, ids });
            if (Object.hasOwn(overrides, table)) return overrides[table];
            return { data: rows[table] ?? [], count: (rows[table] ?? []).length, error: table === failedTable ? new Error("read failed") : null };
          } };
        },
        delete() { writes++; throw new Error("unexpected write"); },
        insert() { writes++; throw new Error("unexpected write"); },
        upsert() { writes++; throw new Error("unexpected write"); },
      };
    },
    snapshot: () => ({ reads, writes }),
  };
}

test("missing and same-owner partial baseline remain resettable", async () => {
  for (const rows of [{}, { routines: [{ user_id: "current" }] }]) {
    const db = client(rows);
    await assertFixedBaselineOwnedByUser(db, "current", baseline);
    assert.equal(db.snapshot().reads.length, 6);
    assert.equal(db.snapshot().writes, 0);
  }
});

test("a cross-owner fixed routine rejects reset without writes", async () => {
  const db = client({ routines: [{ user_id: "former" }] });
  await assert.rejects(assertFixedBaselineOwnedByUser(db, "current", baseline), /belong to another user/);
  assert.equal(db.snapshot().writes, 0);
});

test("a cross-owner partial child or failed ownership read rejects reset", async () => {
  const child = client({ session_exercises: [{ user_id: "former" }] });
  await assert.rejects(assertFixedBaselineOwnedByUser(child, "current", baseline), /belong to another user/);
  assert.equal(child.snapshot().writes, 0);

  const failed = client({}, "sessions");
  await assert.rejects(assertFixedBaselineOwnedByUser(failed, "current", baseline), /Unable to check/);
  assert.equal(failed.snapshot().writes, 0);
});

test("null, missing, truncated and uncounted responses fail closed", async () => {
  for (const response of [
    { data: null, count: 0, error: null },
    { count: 0, error: null },
    { data: [], count: 1, error: null },
    { data: [], error: null },
    { data: [{ user_id: null }], count: 1, error: null },
  ]) {
    const db = client({}, null, { routines: response });
    await assert.rejects(assertFixedBaselineOwnedByUser(db, "current", baseline));
    assert.equal(db.snapshot().writes, 0);
  }
});

test("reset write boundary is unreachable when the final ownership read rejects", async () => {
  for (const db of [
    client({ routines: [{ user_id: "former" }] }),
    client({}, "routines"),
    client({}, null, { routines: { data: null, count: 0, error: null } }),
  ]) {
    let deletes = 0;
    await assert.rejects(guardAndDeleteUserOwnedRows(db, "current", baseline, () => { deletes++; }));
    assert.equal(db.snapshot().reads.length, 6);
    assert.equal(deletes, 0);
  }

  const db = client({ routines: [{ user_id: "current" }] });
  let deletes = 0;
  await guardAndDeleteUserOwnedRows(db, "current", baseline, () => { deletes++; });
  assert.equal(deletes, 1);
});

test("production reset invokes the guarded boundary before its first write", async () => {
  const source = (await readFile(new URL("./fitness-qa-user.mjs", import.meta.url), "utf8")).replaceAll("\r\n", "\n");
  const reset = source.match(/export async function resetQaUserData\(\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(reset);
  assert.match(reset, /await guardAndDeleteUserOwnedRows\(serviceRoleClient, user\.id, QA_BASELINE, deleteUserOwnedRows\)/);
  assert.doesNotMatch(reset, /await deleteUserOwnedRows\(/);
  assert.ok(reset.indexOf("await guardAndDeleteUserOwnedRows(") < reset.indexOf('.from("profiles").upsert('));
});
