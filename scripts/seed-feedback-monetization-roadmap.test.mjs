import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildRoadmapInsertValues,
  buildRoadmapStepsToReproduce,
  parseArgs,
  runSeedFeedbackMonetizationRoadmap,
} from "./seed-feedback-monetization-roadmap.mjs";
import {
  FEEDBACK_MONETIZATION_IMPLEMENTATION_ORDER,
  FEEDBACK_MONETIZATION_ROADMAP,
} from "./feedback-monetization-roadmap.mjs";

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
            created_at: "2026-06-10T12:00:00.000Z",
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

test("parseArgs accepts apply, testing forum, skip-sync, and card filters", () => {
  assert.deepEqual(parseArgs(["--apply", "--testing-forum", "--skip-sync", "--forum-channel-id", "forum-42", "--card-id", "FF-MON-001,ff-mon-002"]), {
    apply: true,
    debug: false,
    cardIds: ["FF-MON-001", "FF-MON-002"],
    forumChannelId: "forum-42",
    useTestingForum: true,
    skipSync: true,
  });
});

test("buildRoadmapStepsToReproduce stores user story and acceptance criteria in labeled blocks", () => {
  const card = FEEDBACK_MONETIZATION_ROADMAP[0];
  const value = buildRoadmapStepsToReproduce(card);

  assert.match(value, /^User Story:\n/);
  assert.match(value, /\n\nAcceptance Criteria:\n- /);
  assert.match(value, /paid launch decisions depend on real product readiness/);
});

test("buildRoadmapInsertValues maps roadmap cards into bounded feature rows", () => {
  const card = FEEDBACK_MONETIZATION_ROADMAP[1];
  const values = buildRoadmapInsertValues(card, {
    nowIso: "2026-06-10T12:00:00.000Z",
    forumChannelId: "forum-1",
    reporterDiscordUserId: "1504700208251146371",
  });

  assert.equal(values.card_id, "FF-CORE-001");
  assert.equal(values.status, "fixed");
  assert.equal(values.discord_forum_channel_id, "forum-1");
  assert.equal(values.reporter_discord_user_id, "1504700208251146371");
  assert.match(values.details, /^Roadmap Type:/);
  assert.match(values.steps_to_reproduce, /Acceptance Criteria:/);
});

test("buildRoadmapInsertValues preserves closed launch gate status", () => {
  const card = FEEDBACK_MONETIZATION_ROADMAP.find((entry) => entry.cardId === "FF-MON-001");
  assert.ok(card);

  const values = buildRoadmapInsertValues(card, {
    nowIso: "2026-06-10T12:00:00.000Z",
    forumChannelId: "forum-1",
    reporterDiscordUserId: "1504700208251146371",
  });

  assert.equal(values.status, "fixed");
});

test("premium cycle analytics returns to planning without placeholder UI claims", () => {
  const card = FEEDBACK_MONETIZATION_ROADMAP.find((entry) => entry.cardId === "FF-ANALYTICS-002");
  assert.ok(card);

  assert.equal(card.boardStatus, "confirmed");
  assert.equal(card.title, "Plan Premium Cycle Analytics Experience");
  assert.match(card.description, /Do not render locked placeholder metrics/i);
  assert.ok(card.acceptanceCriteria.some((criterion) => /No premium analytics UI renders/i.test(criterion)));
});

test("hosted CI runs the curated engine and roadmap contract suites", () => {
  const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const workflow = fs.readFileSync(path.join(repoRoot, ".github", "workflows", "ci.yml"), "utf8");

  assert.match(workflow, /--test src\/features\/curated-onboarding\/engine\.test\.ts/);
  assert.match(workflow, /--test scripts\/seed-feedback-monetization-roadmap\.test\.mjs/);
});

test("implementation order covers every roadmap card exactly once and respects internal dependencies", () => {
  const roadmapCardIds = FEEDBACK_MONETIZATION_ROADMAP.map((card) => card.cardId);

  assert.deepEqual([...FEEDBACK_MONETIZATION_IMPLEMENTATION_ORDER].sort(), [...roadmapCardIds].sort());
  assert.equal(new Set(FEEDBACK_MONETIZATION_IMPLEMENTATION_ORDER).size, FEEDBACK_MONETIZATION_IMPLEMENTATION_ORDER.length);

  const orderIndex = new Map(FEEDBACK_MONETIZATION_IMPLEMENTATION_ORDER.map((cardId, index) => [cardId, index]));
  for (const card of FEEDBACK_MONETIZATION_ROADMAP) {
    for (const dependencyId of card.dependsOn) {
      if (!orderIndex.has(dependencyId)) {
        continue;
      }
      assert.ok(
        orderIndex.get(dependencyId) < orderIndex.get(card.cardId),
        `${card.cardId} appears before dependency ${dependencyId}`,
      );
    }
  }
});

test("human roadmap doc order stays aligned with the seeded implementation order", () => {
  const roadmapDocPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs", "ops", "FITNESS-MONETIZATION-ROADMAP.md");
  const roadmapDoc = fs.readFileSync(roadmapDocPath, "utf8");
  const docOrder = [...roadmapDoc.matchAll(/^\d+\.\s+`(FF-[A-Z0-9-]+)`/gm)].map((match) => match[1]);

  assert.deepEqual(docOrder, FEEDBACK_MONETIZATION_IMPLEMENTATION_ORDER);
});

test("runSeedFeedbackMonetizationRoadmap creates missing rows and forum threads, then syncs them", async () => {
  const client = createMockClient();
  const syncCalls = [];
  const createdThreads = [];
  const logs = [];

  await runSeedFeedbackMonetizationRoadmap({
    client,
    args: {
      apply: true,
      debug: false,
      cardIds: ["FF-MON-001"],
      useTestingForum: false,
      skipSync: false,
    },
    helpers: {
      buildBody: ({ report }) => `body:${report.card_id}`,
      buildReporterLabel: () => "Fawx Security",
      buildTagNames: ({ status }) => ["Feature", status === "confirmed" ? "Confirmed" : status, "Backlog"],
      buildTitle: ({ summary }) => `Feature: Monetization - ${summary}`,
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
        notes: ["SYNCED FF-MON-001 [feature/confirmed]"],
      };
    },
    now: new Date("2026-06-10T12:00:00.000Z"),
    logger: {
      log(message) {
        logs.push(message);
      },
    },
    reporterDiscordUserId: "1504700208251146371",
    forumChannelId: "forum-1",
  });

  assert.equal(client.rows.length, 1);
  assert.equal(client.rows[0].card_id, "FF-MON-001");
  assert.equal(client.rows[0].discord_forum_thread_id, "thread-1");
  assert.equal(createdThreads.length, 1);
  assert.equal(createdThreads[0].threadName, "Feature: Monetization - Monetization Readiness Gate");
  assert.equal(syncCalls.length, 1);
  assert.equal(syncCalls[0].apply, true);
  assert.ok(logs.some((line) => /Rows created: 1/.test(line)));
});
