import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import {
  FEEDBACK_PHASE_READINESS_DOC_PATH,
  FEEDBACK_PHASE_READINESS_JSON_PATH,
  FEEDBACK_PHASE_READINESS_MARKDOWN_PATH,
  checkFeedbackPhaseReadiness,
  getFeedbackPhaseReadinessArtifactPaths,
  parseArgs,
  renderFeedbackPhaseReadinessMarkdown,
  writeFeedbackPhaseReadinessArtifacts,
} from "./check-feedback-phase-readiness.mjs";

function createMockClient(rows) {
  return {
    from() {
      return {
        select() {
          return {
            order() {
              return {
                async limit(limit) {
                  return {
                    data: rows.slice(0, limit),
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

test("parseArgs requires next and previous report ids", () => {
  const args = parseArgs(["--report-id", "0ea4e2be", "--requires", "b58590af", "--debug"]);
  assert.equal(args.reportId, "0ea4e2be");
  assert.equal(args.requires, "b58590af");
  assert.equal(args.debug, true);
});

test("checkFeedbackPhaseReadiness fails when the required prior card is missing the resolved reaction", async () => {
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";

  const result = await checkFeedbackPhaseReadiness(
    parseArgs(["--report-id", "0ea4e2be", "--requires", "b58590af"]),
    {
      client: createMockClient([
        {
          id: "0ea4e2be-a2c0-41c8-ac2f-d994c10c0b5e",
          status: "confirmed",
          completion_review_status: "not_required",
          discord_forum_thread_id: "thread-next",
          discord_forum_message_id: "message-next",
          summary: "Spotify Club Phase 5 - Rooms + Search + Cleaner Panel UX",
        },
        {
          id: "b58590af-8c5f-4de0-9466-99d079f74153",
          status: "fixed",
          completion_review_status: "approved",
          discord_forum_thread_id: "thread-prev",
          discord_forum_message_id: "message-prev",
          summary: "Spotify Club Phase 4 - Playback Readiness + Device Handoff",
        },
      ]),
      fetchImpl: async () => new Response(JSON.stringify({
        reactions: [],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      logger: {
        log: () => {},
        error: () => {},
      },
    },
  );

  assert.equal(result.ok, false);
  assert.match(result.failures[0] ?? "", /missing the resolved fawxzzy:1507384062166302851 reaction/);
});

test("checkFeedbackPhaseReadiness passes when the required prior card is fixed, approved, and reacted", async () => {
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";

  const result = await checkFeedbackPhaseReadiness(
    parseArgs(["--report-id", "0ea4e2be", "--requires", "b58590af"]),
    {
      client: createMockClient([
        {
          id: "0ea4e2be-a2c0-41c8-ac2f-d994c10c0b5e",
          status: "confirmed",
          completion_review_status: "not_required",
          discord_forum_thread_id: "thread-next",
          discord_forum_message_id: "message-next",
          summary: "Spotify Club Phase 5 - Rooms + Search + Cleaner Panel UX",
        },
        {
          id: "b58590af-8c5f-4de0-9466-99d079f74153",
          status: "fixed",
          completion_review_status: "approved",
          discord_forum_thread_id: "thread-prev",
          discord_forum_message_id: "message-prev",
          summary: "Spotify Club Phase 4 - Playback Readiness + Device Handoff",
        },
      ]),
      fetchImpl: async () => new Response(JSON.stringify({
        reactions: [
          {
            emoji: { id: "1507384062166302851", name: "fawxzzy" },
          },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      logger: {
        log: () => {},
        error: () => {},
      },
    },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
});

test("phase readiness artifact paths stay under runtime feedback-phase", () => {
  const paths = getFeedbackPhaseReadinessArtifactPaths();
  assert.equal(paths.json, FEEDBACK_PHASE_READINESS_JSON_PATH);
  assert.equal(paths.markdown, FEEDBACK_PHASE_READINESS_MARKDOWN_PATH);
  assert.match(FEEDBACK_PHASE_READINESS_JSON_PATH.replace(/\\/g, "/"), /runtime\/feedback-phase\/latest\.json$/);
  assert.match(FEEDBACK_PHASE_READINESS_MARKDOWN_PATH.replace(/\\/g, "/"), /runtime\/feedback-phase\/latest\.md$/);
});

test("feedback phase readiness lane has a durable local-only operator contract", () => {
  const doc = fs.readFileSync(FEEDBACK_PHASE_READINESS_DOC_PATH, "utf8");
  assert.match(doc, /review-only snapshots for human inspection/i);
  assert.match(doc, /must not mutate Discord, Supabase rows, GitHub issues, or ATLAS receipts/i);
  assert.match(doc, /failing readiness result is still a valid report outcome/i);
});

test("rendered phase readiness markdown includes failure details", () => {
  const markdown = renderFeedbackPhaseReadinessMarkdown({
    ok: false,
    failures: ["required prior card is missing the resolved reaction"],
    nextReport: { id: "next-id" },
    requiredReport: { id: "prev-id", status: "fixed", completion_review_status: "approved" },
  }, {
    reportId: "next-id",
    requires: "prev-id",
  });

  assert.match(markdown, /Feedback Phase Readiness/);
  assert.match(markdown, /Status: FAIL/);
  assert.match(markdown, /required prior card is missing the resolved reaction/);
});

test("phase readiness artifacts are written for failing results too", async () => {
  const cwd = process.cwd();
  const tempRoot = `${cwd}\\tmp\\feedback-phase-readiness-test`;
  const phaseResult = {
    ok: false,
    failures: ["required prior card is not completion-review approved"],
    nextReport: { id: "next-id" },
    requiredReport: { id: "prev-id", status: "fixed", completion_review_status: "pending" },
  };

  await writeFeedbackPhaseReadinessArtifacts(phaseResult, {
    reportId: "next-id",
    requires: "prev-id",
  }, {
    json: `${tempRoot}\\latest.json`,
    markdown: `${tempRoot}\\latest.md`,
  });

  const markdown = fs.readFileSync(`${tempRoot}\\latest.md`, "utf8");
  const json = JSON.parse(fs.readFileSync(`${tempRoot}\\latest.json`, "utf8"));
  assert.match(markdown, /Status: FAIL/);
  assert.equal(json.ok, false);
  fs.rmSync(tempRoot, { recursive: true, force: true });
});
