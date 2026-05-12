import test from "node:test";
import assert from "node:assert/strict";

import {
  addDeletedSetIdentityKeys,
  filterDeletedDisplaySets,
  getDeletedSetIdentityKeys,
  removeDeletedSetIdentityKeys,
} from "./session-deleted-set-identities.ts";

test("deleted set identity keys include stable, client, and server ids", () => {
  const keys = getDeletedSetIdentityKeys({
    stableId: "stable-set-1",
    client_log_id: "client-set-1",
    id: "server-set-1",
  });

  assert.deepEqual(keys, ["stable-set-1", "client-set-1", "server-set-1"]);
});

test("filterDeletedDisplaySets drops stale server payloads that match any deleted identity", () => {
  const deletedKeys = new Set<string>(["stable-set-1", "server-set-2"]);
  const original = [
    { stableId: "stable-set-1", client_log_id: "client-set-1", id: "server-set-1" },
    { stableId: "stable-set-2", client_log_id: "client-set-2", id: "server-set-2" },
    { stableId: "stable-set-3", client_log_id: "client-set-3", id: "server-set-3" },
  ];

  const filtered = filterDeletedDisplaySets(original, deletedKeys);

  assert.deepEqual(filtered, [
    { stableId: "stable-set-3", client_log_id: "client-set-3", id: "server-set-3" },
  ]);
  assert.deepEqual(original, [
    { stableId: "stable-set-1", client_log_id: "client-set-1", id: "server-set-1" },
    { stableId: "stable-set-2", client_log_id: "client-set-2", id: "server-set-2" },
    { stableId: "stable-set-3", client_log_id: "client-set-3", id: "server-set-3" },
  ]);
});

test("removeDeletedSetIdentityKeys clears tombstones so a delete failure can restore the set", () => {
  const deletedKeys = new Set<string>();
  const set = { stableId: "stable-set-1", client_log_id: "client-set-1", id: "server-set-1" };

  addDeletedSetIdentityKeys(deletedKeys, set);
  assert.deepEqual([...deletedKeys].sort(), ["client-set-1", "server-set-1", "stable-set-1"]);

  removeDeletedSetIdentityKeys(deletedKeys, set);
  assert.equal(deletedKeys.size, 0);
});
