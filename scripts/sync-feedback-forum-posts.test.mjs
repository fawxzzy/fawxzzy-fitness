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
    discord_forum_channel_id: "1504673475489562744",
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
  buildTagNames: ({ reportType, status, severity, includeBacklog }) => [
    reportType === "feature" ? "Feature" : "Bug",
    status === "fawxzzy_review" ? "Ready for Fawxzzy Review" : status === "confirmed" ? "Confirmed" : "New",
    ...(reportType === "feature" ? [] : [severity === "medium" ? "Medium" : "Low"]),
    ...(includeBacklog ? ["Backlog"] : []),
  ],
  buildTitle: ({ area, summary }) => `Feature: ${area} - ${summary}`,
  buildBody: ({ report, reporterLabel }) => `body:${report.report_type}:${reporterLabel}`,
  buildAuditComment: ({ action, actorLabel, note }) => `audit:${action}:${actorLabel}:${note}`,
  shouldApplyBacklogTag: (row) => row.status === "confirmed" || row.status === "fawxzzy_review",
  isTestingCard: (row) => row.area === "Feedback Testing",
};

test("sync forum parseArgs keeps dry-run default and parses filters", () => {
  const args = parseArgs(["--apply", "--limit", "999", "--status", "new,confirmed,closed", "--report-id", "abc", "--debug", "--no-audit-comment", "--include-testing"]);

  assert.equal(args.apply, true);
  assert.equal(args.limit, 100);
  assert.deepEqual(args.statuses, ["new", "confirmed", "closed"]);
  assert.equal(args.reportId, "abc");
  assert.equal(args.debug, true);
  assert.equal(args.noAuditComment, true);
  assert.equal(args.includeTesting, true);
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
  let auditCalls = 0;
  let tagResolveCalls = 0;
  let tagUpdateCalls = 0;

  const result = await runSyncFeedbackForumPosts({
    client: createMockClient([buildRow()]),
    args: {
      apply: false,
      limit: 10,
      statuses: ["new"],
      reportId: null,
      debug: false,
      includeTesting: false,
    },
    helpers,
    discordApi: {
      async updateThreadTitle() {
        titleCalls += 1;
        return { ok: true };
      },
      async resolveTagIdsByName() {
        tagResolveCalls += 1;
        return { ok: true, matchedTagIds: ["tag-feature", "tag-new"], missingTagNames: [] };
      },
      async updateThreadTags() {
        tagUpdateCalls += 1;
        return { ok: true };
      },
      async patchStarterMessage() {
        patchCalls += 1;
        return { ok: true };
      },
      async postThreadMessage() {
        auditCalls += 1;
        return { ok: true };
      },
    },
  });

  assert.equal(titleCalls, 0);
  assert.equal(tagResolveCalls, 0);
  assert.equal(tagUpdateCalls, 0);
  assert.equal(patchCalls, 0);
  assert.equal(auditCalls, 0);
  assert.equal(result.dryRunCount, 1);
  assert.equal(result.updatedCount, 0);
  assert.equal(result.failedCount, 0);
});

test("sync forum apply mode updates tags titles starter messages and audit comments", async () => {
  const observed = [];

  const result = await runSyncFeedbackForumPosts({
    client: createMockClient([buildRow()]),
    args: {
      apply: true,
      limit: 10,
      statuses: ["new"],
      reportId: null,
      debug: false,
      includeTesting: false,
    },
    helpers,
    discordApi: {
      async updateThreadTitle(args) {
        observed.push({ type: "title", args });
        return { ok: true };
      },
      async resolveTagIdsByName(args) {
        observed.push({ type: "resolve-tags", args });
        return { ok: true, matchedTagIds: ["tag-feature", "tag-new"], missingTagNames: [] };
      },
      async updateThreadTags(args) {
        observed.push({ type: "tags", args });
        return { ok: true };
      },
      async patchStarterMessage(args) {
        observed.push({ type: "message", args });
        return { ok: true };
      },
      async postThreadMessage(args) {
        observed.push({ type: "audit", args });
        return { ok: true };
      },
    },
  });

  assert.equal(result.updatedCount, 1);
  assert.deepEqual(observed, [
    {
      type: "resolve-tags",
      args: {
        channelId: "1504673475489562744",
        tagNames: ["Feature", "New"],
      },
    },
    {
      type: "tags",
      args: {
        threadId: "1504673475489562745",
        appliedTagIds: ["tag-feature", "tag-new"],
      },
    },
    {
      type: "title",
      args: {
        threadId: "1504673475489562745",
        title: "Feature: Routines - Let me share a routine",
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
    {
      type: "audit",
      args: {
        threadId: "1504673475489562745",
        content: "audit:sync_format:Fawx Security:Applied Feedback Card Structure v2.",
      },
    },
  ]);
});

test("sync forum apply mode can disable audit comments", async () => {
  let auditCalls = 0;

  const result = await runSyncFeedbackForumPosts({
    client: createMockClient([buildRow()]),
    args: {
      apply: true,
      limit: 10,
      statuses: ["new"],
      reportId: null,
      debug: false,
      noAuditComment: true,
      includeTesting: false,
    },
    helpers,
    discordApi: {
      async updateThreadTitle() {
        return { ok: true };
      },
      async resolveTagIdsByName() {
        return { ok: true, matchedTagIds: ["tag-feature", "tag-new"], missingTagNames: [] };
      },
      async updateThreadTags() {
        return { ok: true };
      },
      async patchStarterMessage() {
        return { ok: true };
      },
      async postThreadMessage() {
        auditCalls += 1;
        return { ok: true };
      },
    },
  });

  assert.equal(auditCalls, 0);
  assert.equal(result.updatedCount, 1);
});

test("sync forum skips rows without starter message ids safely", async () => {
  let titleCalls = 0;
  let patchCalls = 0;
  let auditCalls = 0;
  let tagResolveCalls = 0;
  let tagUpdateCalls = 0;

  const result = await runSyncFeedbackForumPosts({
    client: createMockClient([buildRow({ discord_forum_message_id: null })]),
    args: {
      apply: true,
      limit: 10,
      statuses: ["new"],
      reportId: null,
      debug: false,
      includeTesting: false,
    },
    helpers,
    discordApi: {
      async updateThreadTitle() {
        titleCalls += 1;
        return { ok: true };
      },
      async resolveTagIdsByName() {
        tagResolveCalls += 1;
        return { ok: true, matchedTagIds: ["tag-feature", "tag-new"], missingTagNames: [] };
      },
      async updateThreadTags() {
        tagUpdateCalls += 1;
        return { ok: true };
      },
      async patchStarterMessage() {
        patchCalls += 1;
        return { ok: true };
      },
      async postThreadMessage() {
        auditCalls += 1;
        return { ok: true };
      },
    },
  });

  assert.equal(titleCalls, 0);
  assert.equal(tagResolveCalls, 0);
  assert.equal(tagUpdateCalls, 0);
  assert.equal(patchCalls, 0);
  assert.equal(auditCalls, 0);
  assert.equal(result.skippedMissingMessageId, 1);
  assert.equal(result.failedCount, 0);
});

test("sync forum apply mode adds Backlog tags to reviewed cards and excludes testing canaries by default", async () => {
  const observed = [];

  const result = await runSyncFeedbackForumPosts({
    client: createMockClient([
      buildRow({
        status: "confirmed",
        area: "Routines",
      }),
      buildRow({
        id: "22222222-2222-4222-8222-222222222222",
        status: "confirmed",
        area: "Feedback Testing",
        discord_forum_thread_id: "1504673475489562747",
        discord_forum_message_id: "1504673475489562748",
      }),
    ]),
    args: {
      apply: true,
      limit: 10,
      statuses: ["confirmed"],
      reportId: null,
      debug: false,
      noAuditComment: true,
      includeTesting: false,
    },
    helpers,
    discordApi: {
      async updateThreadTitle() {
        return { ok: true };
      },
      async resolveTagIdsByName(args) {
        observed.push(args);
        return { ok: true, matchedTagIds: ["tag-feature", "tag-confirmed", "tag-backlog"], missingTagNames: [] };
      },
      async updateThreadTags() {
        return { ok: true };
      },
      async patchStarterMessage() {
        return { ok: true };
      },
      async postThreadMessage() {
        return { ok: true };
      },
    },
  });

  assert.equal(result.totalRows, 2);
  assert.equal(result.rows.length, 1);
  assert.deepEqual(observed, [{
    channelId: "1504673475489562744",
    tagNames: ["Feature", "Confirmed", "Backlog"],
  }]);
});
