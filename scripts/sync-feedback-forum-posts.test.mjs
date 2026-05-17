import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LIMIT,
  DEFAULT_STATUSES,
  parseArgs,
  runSyncFeedbackForumPosts,
} from "./sync-feedback-forum-posts.mjs";

function buildRow(overrides = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    report_type: "feature",
    status: "new",
    severity: "medium",
    area: "Routines",
    summary: "Let me share a routine",
    details: "Add a community share flow.",
    steps_to_reproduce: null,
    screenshot_url: null,
    attachment_count: 0,
    attachment_metadata: null,
    attachment_pruned: false,
    reporter_discord_user_id: "123456789012345678",
    reporter_discord_username: "zac",
    reporter_member_number: 4,
    duplicate_count: 1,
    discord_forum_thread_id: "1504673475489562745",
    discord_forum_message_id: "1504673475489562746",
    updated_at: "2026-05-16T12:00:00.000Z",
    last_seen_at: "2026-05-16T12:00:00.000Z",
    ...overrides,
  };
}

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

const helpers = {
  formatShortId: () => "11111111",
  buildReporterLabel: ({ reporterMemberNumber }) => `Member #${reporterMemberNumber}`,
  buildTitle: ({ area, summary }) => `Feature: ${area} — ${summary}`,
  buildBody: ({ report, reporterLabel }) => `body:${report.report_type}:${reporterLabel}`,
};

test("sync forum parseArgs keeps dry-run default and parses filters", () => {
  const args = parseArgs(["--apply", "--limit", "999", "--status", "new,confirmed,closed", "--report-id", "abc", "--debug"]);

  assert.equal(args.apply, true);
  assert.equal(args.limit, 100);
  assert.deepEqual(args.statuses, ["new", "confirmed", "closed"]);
  assert.equal(args.reportId, "abc");
  assert.equal(args.debug, true);
});

test("sync forum parseArgs defaults to the active feedback statuses", () => {
  const args = parseArgs([]);

  assert.equal(args.apply, false);
  assert.equal(args.limit, DEFAULT_LIMIT);
  assert.deepEqual(args.statuses, DEFAULT_STATUSES);
});

test("sync forum dry-run does not mutate Discord", async () => {
  let titleCalls = 0;
  let patchCalls = 0;

  const result = await runSyncFeedbackForumPosts({
    client: createMockClient([buildRow()]),
    args: {
      apply: false,
      limit: 10,
      statuses: ["new"],
      reportId: null,
      debug: false,
    },
    helpers,
    discordApi: {
      async updateThreadTitle() {
        titleCalls += 1;
        return { ok: true };
      },
      async patchStarterMessage() {
        patchCalls += 1;
        return { ok: true };
      },
    },
  });

  assert.equal(titleCalls, 0);
  assert.equal(patchCalls, 0);
  assert.equal(result.dryRunCount, 1);
  assert.equal(result.updatedCount, 0);
  assert.equal(result.failedCount, 0);
});

test("sync forum apply mode updates thread titles and starter messages", async () => {
  const observed = [];

  const result = await runSyncFeedbackForumPosts({
    client: createMockClient([buildRow()]),
    args: {
      apply: true,
      limit: 10,
      statuses: ["new"],
      reportId: null,
      debug: false,
    },
    helpers,
    discordApi: {
      async updateThreadTitle(args) {
        observed.push({ type: "title", args });
        return { ok: true };
      },
      async patchStarterMessage(args) {
        observed.push({ type: "message", args });
        return { ok: true };
      },
    },
  });

  assert.equal(result.updatedCount, 1);
  assert.deepEqual(observed, [
    {
      type: "title",
      args: {
        threadId: "1504673475489562745",
        title: "Feature: Routines — Let me share a routine",
      },
    },
    {
      type: "message",
      args: {
        channelId: "1504673475489562745",
        messageId: "1504673475489562746",
        content: "body:feature:Member #4",
      },
    },
  ]);
});

test("sync forum skips rows without starter message ids safely", async () => {
  let titleCalls = 0;
  let patchCalls = 0;

  const result = await runSyncFeedbackForumPosts({
    client: createMockClient([buildRow({ discord_forum_message_id: null })]),
    args: {
      apply: true,
      limit: 10,
      statuses: ["new"],
      reportId: null,
      debug: false,
    },
    helpers,
    discordApi: {
      async updateThreadTitle() {
        titleCalls += 1;
        return { ok: true };
      },
      async patchStarterMessage() {
        patchCalls += 1;
        return { ok: true };
      },
    },
  });

  assert.equal(titleCalls, 0);
  assert.equal(patchCalls, 0);
  assert.equal(result.skippedMissingMessageId, 1);
  assert.equal(result.failedCount, 0);
});
