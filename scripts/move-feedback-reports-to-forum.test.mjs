import assert from "node:assert/strict";
import test from "node:test";
import {
  matchesMoveSelection,
  parseArgs,
  runMoveFeedbackReportsToForum,
} from "./move-feedback-reports-to-forum.mjs";

function createMockClient(rows) {
  const state = [...rows];

  return {
    rows: state,
    from(table) {
      assert.equal(table, "discord_feedback_reports");

      return {
        select() {
          return {
            order() {
              return {
                async limit() {
                  return { data: state, error: null };
                },
              };
            },
          };
        },
        update(values) {
          return {
            eq(column, targetId) {
              assert.equal(column, "id");
              const index = state.findIndex((row) => row.id === targetId);
              assert.notEqual(index, -1);
              state[index] = {
                ...state[index],
                ...values,
              };

              return {
                select() {
                  return {
                    async single() {
                      return { data: { id: targetId }, error: null };
                    },
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

test("parseArgs accepts target forum, archive source, report ids, and card selectors", () => {
  assert.deepEqual(parseArgs([
    "--apply",
    "--archive-source",
    "--target-forum-id", "forum-2",
    "--report-id", "4309deaf,8ed05d76",
    "--card-id", "FF-MON-001",
    "--card-id-prefix", "FF-,MS-",
  ]), {
    apply: true,
    debug: false,
    archiveSource: true,
    targetForumId: "forum-2",
    reportIds: ["4309deaf", "8ed05d76"],
    cardIds: ["FF-MON-001"],
    cardIdPrefixes: ["FF-", "MS-"],
  });
});

test("matchesMoveSelection matches short report ids and card id prefixes", () => {
  const args = parseArgs(["--report-id", "4309deaf", "--card-id-prefix", "FF-"]);
  assert.equal(matchesMoveSelection({
    id: "4309deaf-9566-476d-8201-178724b7e07f",
    card_id: null,
  }, args), true);
  assert.equal(matchesMoveSelection({
    id: "11111111-2222-4333-8444-555555555555",
    card_id: "FF-MON-001",
  }, args), true);
  assert.equal(matchesMoveSelection({
    id: "99999999-2222-4333-8444-555555555555",
    card_id: "AB-001",
  }, args), false);
});

test("runMoveFeedbackReportsToForum creates target threads and updates selected rows", async () => {
  const client = createMockClient([
    {
      id: "b700c942-1111-4222-8333-123456789abc",
      report_type: "feature",
      status: "confirmed",
      severity: "medium",
      effort_points: 5,
      card_id: "FF-MON-001",
      card_phase: "Phase 1",
      card_priority: "P0",
      depends_on: ["FF-CORE-001"],
      dependency_notes: "note",
      area: "Monetization",
      summary: "Monetization Readiness Gate",
      details: "desc",
      steps_to_reproduce: "steps",
      screenshot_url: null,
      attachment_count: 0,
      attachment_metadata: [],
      attachment_pruned: false,
      reporter_discord_user_id: "user-1",
      reporter_discord_username: "Fawx Security",
      reporter_member_number: null,
      duplicate_count: 1,
      discord_forum_channel_id: "forum-old",
      discord_forum_thread_id: "thread-old",
      discord_forum_message_id: "message-old",
      discord_forum_applied_tag_ids: [],
      discord_forum_title: null,
      created_at: "2026-06-10T12:00:00.000Z",
      updated_at: "2026-06-10T12:00:00.000Z",
      last_seen_at: "2026-06-10T12:00:00.000Z",
    },
  ]);
  const createdThreads = [];
  const archivedThreads = [];

  const summary = await runMoveFeedbackReportsToForum({
    client,
    args: parseArgs([
      "--apply",
      "--archive-source",
      "--target-forum-id", "forum-new",
      "--card-id-prefix", "FF-",
    ]),
    helpers: {
      buildBody: ({ report }) => `body:${report.card_id}`,
      buildReporterLabel: () => "Fawx Security",
      buildTagNames: () => ["Feature", "Confirmed", "Backlog"],
      buildTitle: ({ summary }) => `Feature: ${summary}`,
      formatShortId: (value) => String(value).slice(0, 8),
      shouldApplyBacklogTag: () => true,
    },
    discordApi: {
      async resolveTagIdsByName() {
        return { ok: true, matchedTagIds: ["tag-1", "tag-2"], missingTagNames: [] };
      },
      async createForumThread(args) {
        createdThreads.push(args);
        return { ok: true, threadId: "thread-new", messageId: "message-new" };
      },
      async archiveThread(args) {
        archivedThreads.push(args.threadId);
        return { ok: true };
      },
    },
    now: new Date("2026-06-10T12:00:00.000Z"),
    logger: {
      log() {},
      warn() {},
      error() {},
    },
  });

  assert.equal(summary.movedRows, 1);
  assert.deepEqual(summary.movedReportIds, ["b700c942-1111-4222-8333-123456789abc"]);
  assert.equal(createdThreads.length, 1);
  assert.equal(createdThreads[0].channelId, "forum-new");
  assert.equal(client.rows[0].discord_forum_channel_id, "forum-new");
  assert.equal(client.rows[0].discord_forum_thread_id, "thread-new");
  assert.deepEqual(archivedThreads, ["thread-old"]);
});
