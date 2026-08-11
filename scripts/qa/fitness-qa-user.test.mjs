import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { requireExistingQaUser } from "./fitness-qa-user.mjs";

function buildAdminClient(users) {
  let createCalls = 0;
  let updateCalls = 0;
  return {
    auth: {
      admin: {
        listUsers: async () => ({ data: { users, nextPage: null }, error: null }),
        createUser: async () => {
          createCalls += 1;
          throw new Error("createUser must not be called by data reset.");
        },
        updateUserById: async () => {
          updateCalls += 1;
          throw new Error("updateUserById must not be called by data reset.");
        },
      },
    },
    readMutationCalls: () => ({ createCalls, updateCalls }),
  };
}

test("QA data reset resolves the exact existing user without Auth mutation", async () => {
  const existing = {
    id: "26fd8b9f-8152-462d-b364-8999fafe9da3",
    email: "fitness-local-qa@example.test",
  };
  const adminClient = buildAdminClient([existing]);

  const user = await requireExistingQaUser(adminClient, "  FITNESS-LOCAL-QA@example.test ");

  assert.equal(user, existing);
  assert.deepEqual(adminClient.readMutationCalls(), { createCalls: 0, updateCalls: 0 });
});

test("QA data reset fails closed when the exact existing user is absent", async () => {
  const adminClient = buildAdminClient([]);

  await assert.rejects(
    requireExistingQaUser(adminClient, "fitness-local-qa@example.test"),
    /does not exist.*separately authorized credential-management lane/i,
  );
  assert.deepEqual(adminClient.readMutationCalls(), { createCalls: 0, updateCalls: 0 });
});

test("QA data reset rejects a missing identity before any Auth mutation", async () => {
  const adminClient = buildAdminClient([]);

  await assert.rejects(requireExistingQaUser(adminClient, ""), /FITNESS_QA_EMAIL is required/);
  assert.deepEqual(adminClient.readMutationCalls(), { createCalls: 0, updateCalls: 0 });
});

test("QA session bootstrap has no automatic credential-management fallback", async () => {
  const source = await readFile(new URL("./fitness-qa-user.mjs", import.meta.url), "utf8");
  const match = source.match(
    /export async function bootstrapQaSession\(\) \{([\s\S]*?)\n\}\n\nexport async function readQaSessionArtifact/,
  );

  assert.ok(match, "bootstrapQaSession source block must remain inspectable");
  assert.doesNotMatch(match[1], /ensureQaUser|createServiceRoleClient|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(match[1], /await signInQaUser\(anonClient, credentials\)/);
});
