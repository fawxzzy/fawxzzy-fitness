import assert from "node:assert/strict";
import test from "node:test";
import {
  checkFeedbackPhaseReadiness,
  parseArgs,
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
  assert.match(result.failures[0] ?? "", /missing the resolved ✅ reaction/);
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
            emoji: { name: "✅" },
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
