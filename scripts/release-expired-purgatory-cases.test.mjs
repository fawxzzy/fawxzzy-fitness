import assert from "node:assert/strict";
import test from "node:test";
import { parseArgs, runReleaseExpiredPurgatoryCases } from "./release-expired-purgatory-cases.mjs";

function buildCase(overrides = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    target_discord_user_id: "123456789012345678",
    expires_at: "2026-05-16T21:00:00.000Z",
    ...overrides,
  };
}

test("release-expired purgatory parseArgs defaults to dry-run", () => {
  assert.deepEqual(parseArgs([]), {
    apply: false,
    limit: 25,
  });
});

test("expired release script dry-run does not mutate", async () => {
  let expireCalls = 0;
  const result = await runReleaseExpiredPurgatoryCases({
    args: parseArgs([]),
    helpers: {
      listExpiredCases: async () => [buildCase()],
      expireCase: async () => {
        expireCalls += 1;
        return { ok: true };
      },
      formatShortId: (caseId) => caseId.slice(0, 8),
    },
    now: new Date("2026-05-16T22:00:00.000Z"),
  });

  assert.equal(result.apply, false);
  assert.equal(result.expiredCases.length, 1);
  assert.equal(result.results[0]?.status, "dry-run");
  assert.equal(expireCalls, 0);
});

test("expired release script applies case releases when requested", async () => {
  const expiredCases = [
    buildCase(),
    buildCase({ id: "22222222-2222-4222-8222-222222222222" }),
  ];
  const observedCaseIds = [];

  const result = await runReleaseExpiredPurgatoryCases({
    args: parseArgs(["--apply"]),
    helpers: {
      listExpiredCases: async () => expiredCases,
      expireCase: async ({ caseIdOrPrefix }) => {
        observedCaseIds.push(caseIdOrPrefix);
        return { ok: true };
      },
      formatShortId: (caseId) => caseId.slice(0, 8),
    },
    guildId: "1504668396338413670",
  });

  assert.equal(result.apply, true);
  assert.equal(result.releasedCount, 2);
  assert.deepEqual(observedCaseIds, expiredCases.map((caseRow) => caseRow.id));
});
