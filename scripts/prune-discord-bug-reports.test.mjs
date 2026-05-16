import assert from "node:assert/strict";
import test from "node:test";
import {
  parseArgs,
  resolveStatusCutoffDays,
  runPruneDiscordBugReports,
} from "./prune-discord-bug-reports.mjs";

test("prune parseArgs keeps dry-run default and parses statuses", () => {
  const args = parseArgs(["--status", "spam,closed", "--limit", "25"]);
  assert.equal(args.apply, false);
  assert.deepEqual(args.statuses, ["spam", "closed"]);
  assert.equal(args.limit, 25);
});

test("prune resolveStatusCutoffDays uses defaults unless overridden", () => {
  assert.equal(resolveStatusCutoffDays("spam", null), 7);
  assert.equal(resolveStatusCutoffDays("duplicate", 14), 14);
});

test("prune dry-run does not mutate", async () => {
  let deleteCalled = false;
  const client = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                lt() {
                  return {
                    order() {
                      return {
                        async limit() {
                          return {
                            data: [{ id: "report-1", status: "spam", last_seen_at: "2026-05-01T00:00:00.000Z" }],
                            error: null,
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
        delete() {
          deleteCalled = true;
          return {
            in() {
              return { error: null };
            },
          };
        },
      };
    },
  };

  const result = await runPruneDiscordBugReports({
    client,
    args: {
      apply: false,
      olderThanDays: null,
      statuses: ["spam"],
      limit: 10,
    },
    now: new Date("2026-05-15T00:00:00.000Z"),
  });

  assert.equal(deleteCalled, false);
  assert.equal(result.deletedCount, 0);
  assert.equal(result.summaries[0]?.matched, 1);
});
