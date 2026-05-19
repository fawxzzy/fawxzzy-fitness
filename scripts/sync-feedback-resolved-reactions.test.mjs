import assert from "node:assert/strict";
import test from "node:test";
import {
  DISCORD_RESOLVED_REACTION_EMOJI,
  parseArgs,
  syncResolvedReactions,
} from "./sync-feedback-resolved-reactions.mjs";

function createMockClient(rows) {
  return {
    from() {
      const filters = {
        id: null,
        statuses: null,
      };

      return {
        select() {
          return {
            eq(column, value) {
              if (column === "id") {
                filters.id = value;
              }
              if (column === "status") {
                filters.statuses = [value];
              }
              return this;
            },
            in(column, values) {
              if (column === "status") {
                filters.statuses = values;
              }
              return this;
            },
            order() {
              return {
                async limit(limit) {
                  let filtered = [...rows];
                  if (filters.id) {
                    filtered = filtered.filter((row) => row.id === filters.id);
                  }
                  if (filters.statuses) {
                    filtered = filtered.filter((row) => filters.statuses.includes(row.status));
                  }

                  return {
                    data: filtered.slice(0, limit),
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
}

test("parseArgs keeps dry-run by default and supports targeted filters", () => {
  const args = parseArgs(["--report-id", "d1a33905", "--limit", "5", "--status", "fixed,closed", "--debug", "--include-testing"]);
  assert.equal(args.apply, false);
  assert.equal(args.reportId, "d1a33905");
  assert.equal(args.limit, 5);
  assert.deepEqual(args.statuses, ["fixed", "closed"]);
  assert.equal(args.debug, true);
  assert.equal(args.includeTesting, true);
});

test("syncResolvedReactions dry-run reports actionable resolved cards without mutating", async () => {
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";

  const logs = [];

  const summary = await syncResolvedReactions(
    parseArgs(["--report-id", "d1a33905"]),
    {
      client: createMockClient([
        {
          id: "d1a33905",
          status: "fixed",
          report_type: "feature",
          area: "Spotify Club",
          summary: "Spotify Club Phase 3 - Queue Suggestions + Host Approval",
          details: "Shipped and reviewed.",
          discord_forum_channel_id: "1504673475489562744",
          discord_forum_thread_id: "1505318951146491934",
          discord_forum_message_id: "1505318951146491934",
          completion_review_status: "approved",
        },
      ]),
      logger: {
        log: (message) => logs.push(message),
        warn: (message) => logs.push(message),
      },
    },
  );

  assert.equal(summary.apply, false);
  assert.equal(summary.actionableReports, 1);
  assert.equal(summary.attempted, 0);
  assert.match(String(logs[0] ?? ""), /dry-run/);
});

test("syncResolvedReactions apply uses the encoded Unicode checkmark path", async () => {
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";

  const requests = [];

  const summary = await syncResolvedReactions(
    parseArgs(["--apply", "--report-id", "d1a33905"]),
    {
      client: createMockClient([
        {
          id: "d1a33905",
          status: "fixed",
          report_type: "feature",
          area: "Spotify Club",
          summary: "Spotify Club Phase 3 - Queue Suggestions + Host Approval",
          details: "Shipped and reviewed.",
          discord_forum_channel_id: "1504673475489562744",
          discord_forum_thread_id: "1505318951146491934",
          discord_forum_message_id: "1505318951146491934",
          completion_review_status: "approved",
        },
      ]),
      fetchImpl: async (input, init) => {
        requests.push({ url: String(input), method: String(init?.method ?? "GET") });
        return new Response(null, { status: 204 });
      },
      logger: {
        log: () => {},
        warn: () => {},
      },
    },
  );

  assert.equal(summary.applied, 1);
  assert.equal(summary.failed, 0);
  assert.equal(
    requests.some((request) => request.url.endsWith(`/reactions/${encodeURIComponent(DISCORD_RESOLVED_REACTION_EMOJI)}/@me`) && request.method === "PUT"),
    true,
  );
});

test("syncResolvedReactions skips testing canaries by default and can include them explicitly", async () => {
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_FEEDBACK_TESTING_FORUM_CHANNEL_ID = "testing-forum";

  let reactionAttempts = 0;

  const client = createMockClient([
    {
      id: "d1a33905-1111-4111-8111-111111111111",
      status: "fixed",
      report_type: "feature",
      area: "Feedback Testing",
      summary: "Feedback canary: do not promote",
      details: "testing only",
      discord_forum_channel_id: "testing-forum",
      discord_forum_thread_id: "1505318951146491934",
      discord_forum_message_id: "1505318951146491934",
      completion_review_status: "approved",
    },
  ]);

  const fetchImpl = async () => {
    reactionAttempts += 1;
    return new Response(null, { status: 204 });
  };

  const defaultSummary = await syncResolvedReactions(
    parseArgs(["--apply"]),
    {
      client,
      fetchImpl,
      logger: {
        log: () => {},
        warn: () => {},
      },
    },
  );

  assert.equal(defaultSummary.actionableReports, 0);
  assert.equal(defaultSummary.applied, 0);
  assert.equal(reactionAttempts, 0);

  const includeTestingSummary = await syncResolvedReactions(
    parseArgs(["--apply", "--include-testing"]),
    {
      client,
      fetchImpl,
      logger: {
        log: () => {},
        warn: () => {},
      },
    },
  );

  assert.equal(includeTestingSummary.actionableReports, 1);
  assert.equal(includeTestingSummary.applied, 1);
  assert.equal(reactionAttempts, 1);

  delete process.env.DISCORD_FEEDBACK_TESTING_FORUM_CHANNEL_ID;
});
