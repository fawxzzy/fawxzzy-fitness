import assert from "node:assert/strict";
import test from "node:test";
import { parseCardSetArgs, runSeedFeedbackCardSetSelection } from "./seed-feedback-card-set.mjs";
import { listFeedbackCardSets, resolveFeedbackCardSet } from "./feedback-card-sets.mjs";
import { FEEDBACK_MONETIZATION_IMPLEMENTATION_ORDER } from "./feedback-monetization-roadmap.mjs";

function createMockClient(initialRows = []) {
  const rows = [...initialRows];

  return {
    rows,
    from(table) {
      assert.equal(table, "discord_feedback_reports");

      return {
        select() {
          return {
            eq(column, value) {
              assert.equal(column, "report_type");
              return {
                async limit() {
                  return {
                    data: rows.filter((row) => row.report_type === value),
                    error: null,
                  };
                },
              };
            },
          };
        },
        insert(values) {
          const row = {
            id: `row-${rows.length + 1}`,
            completion_review_status: "not_required",
            created_at: "2026-07-09T12:00:00.000Z",
            updated_at: values.updated_at,
            last_seen_at: values.last_seen_at,
            ...values,
          };
          rows.push(row);

          return {
            select() {
              return {
                async single() {
                  return { data: row, error: null };
                },
              };
            },
          };
        },
        update(values) {
          return {
            eq(column, value) {
              assert.equal(column, "id");
              const index = rows.findIndex((row) => row.id === value);
              assert.notEqual(index, -1);
              rows[index] = {
                ...rows[index],
                ...values,
              };

              return {
                select() {
                  return {
                    async single() {
                      return { data: rows[index], error: null };
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

test("parseCardSetArgs separates set selection from seed args", () => {
  assert.deepEqual(parseCardSetArgs([
    "--set",
    "session-exercise-timers",
    "--apply",
    "--skip-sync",
    "--card-id",
    "ff-session-001",
  ]), {
    setName: "session-exercise-timers",
    listSets: false,
    seedArgs: {
      apply: true,
      debug: false,
      cardIds: ["FF-SESSION-001"],
      forumChannelId: null,
      useTestingForum: false,
      skipSync: true,
    },
  });
});

test("generic card-set registry lists the monetization set and preserves FF-QA-002 order", () => {
  const monetizationSet = listFeedbackCardSets().find((entry) => entry.key === "monetization");
  const resolvedSet = resolveFeedbackCardSet("monetization");

  assert.ok(monetizationSet);
  assert.ok(resolvedSet);
  assert.equal(monetizationSet.cardCount, resolvedSet.spec.cards.length);
  assert.equal(resolvedSet.spec.order, FEEDBACK_MONETIZATION_IMPLEMENTATION_ORDER);
  assert.equal(resolvedSet.spec.order[resolvedSet.spec.order.indexOf("FF-QA-001") + 1], "FF-QA-002");
});

test("runSeedFeedbackCardSetSelection seeds the session exercise-timer packet through the generic registry", async () => {
  const client = createMockClient();
  const syncCalls = [];
  const createdThreads = [];
  const logs = [];

  await runSeedFeedbackCardSetSelection({
    argv: ["--set", "session-exercise-timers", "--apply", "--card-id", "FF-SESSION-001"],
    client,
    helpers: {
      buildBody: ({ report }) => `body:${report.card_id}`,
      buildReporterLabel: () => "Fawx Security",
      buildTagNames: ({ status }) => ["Feature", status === "confirmed" ? "Confirmed" : status, "Backlog"],
      buildTitle: ({ area, summary }) => `Feature: ${area} - ${summary}`,
      formatShortId: (value) => String(value).slice(0, 8),
      shouldApplyBacklogTag: () => true,
    },
    discordApi: {
      async resolveTagIdsByName() {
        return { ok: true, matchedTagIds: ["tag-1", "tag-2"], missingTagNames: [] };
      },
      async createForumThread(args) {
        createdThreads.push(args);
        return { ok: true, threadId: "thread-1", messageId: "message-1" };
      },
    },
    syncRunner: async (options) => {
      syncCalls.push(options.args);
      return {
        updatedCount: 1,
        notes: ["SYNCED FF-SESSION-001 [feature/confirmed]"],
      };
    },
    now: new Date("2026-07-09T12:00:00.000Z"),
    logger: {
      log(message) {
        logs.push(message);
      },
    },
    reporterDiscordUserId: "1504700208251146371",
    forumChannelId: "forum-1",
  });

  assert.equal(client.rows.length, 1);
  assert.equal(client.rows[0].card_id, "FF-SESSION-001");
  assert.equal(client.rows[0].discord_forum_thread_id, "thread-1");
  assert.equal(createdThreads.length, 1);
  assert.equal(createdThreads[0].threadName, "Feature: Session - Add Per-Exercise Exercise Timer System");
  assert.equal(syncCalls.length, 1);
  assert.ok(logs.some((line) => /Card set: Session Exercise Timers/.test(line)));
});
