import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_STATUSES,
  DISCORD_FAILURE_REACTION_EMOJI,
  DISCORD_LEGACY_SUCCESS_REACTION,
  DISCORD_SUCCESS_REACTION_EMOJI,
  buildRepairTargets,
  parseArgs,
  planFeedbackStateReactions,
} from "./repair-feedback-board-state.mjs";

test("repair feedback board state parseArgs keeps dry-run defaults", () => {
  const args = parseArgs([]);

  assert.equal(args.apply, false);
  assert.equal(args.debug, false);
  assert.equal(args.includeTesting, false);
  assert.equal(args.limit, 200);
  assert.equal(args.reportId, null);
  assert.equal(args.rowsFile, null);
  assert.equal(args.syncBody, false);
  assert.deepEqual(args.statuses, DEFAULT_STATUSES);
});

test("repair feedback board state parseArgs reads filters", () => {
  const args = parseArgs(["--apply", "--debug", "--include-testing", "--sync-body", "--limit", "20", "--report-id", "abcd1234", "--rows-file", "tmp/rows.json", "--status", "fixed,closed"]);

  assert.equal(args.apply, true);
  assert.equal(args.debug, true);
  assert.equal(args.includeTesting, true);
  assert.equal(args.limit, 20);
  assert.equal(args.reportId, "abcd1234");
  assert.equal(args.rowsFile, "tmp/rows.json");
  assert.equal(args.syncBody, true);
  assert.deepEqual(args.statuses, ["fixed", "closed"]);
});

test("planFeedbackStateReactions applies success to resolved cards and removes stale failure and legacy success", () => {
  const plan = planFeedbackStateReactions({
    status: "fixed",
    reactions: [
      { emoji: { id: "1507384094424694785", name: "fawxzzy" } },
      { emoji: { name: "\u2705" } },
    ],
  });

  assert.equal(plan.resolved, true);
  assert.deepEqual(plan.add, [DISCORD_SUCCESS_REACTION_EMOJI]);
  assert.deepEqual(plan.remove, [DISCORD_FAILURE_REACTION_EMOJI, DISCORD_LEGACY_SUCCESS_REACTION]);
});

test("planFeedbackStateReactions applies failure to unresolved cards and removes stale success", () => {
  const plan = planFeedbackStateReactions({
    status: "confirmed",
    reactions: [
      { emoji: { id: "1507384062166302851", name: "fawxzzy" } },
    ],
  });

  assert.equal(plan.resolved, false);
  assert.deepEqual(plan.add, [DISCORD_FAILURE_REACTION_EMOJI]);
  assert.deepEqual(plan.remove, [DISCORD_SUCCESS_REACTION_EMOJI]);
});

test("buildRepairTargets dedupes linked thread against completed-board copies", () => {
  const targets = buildRepairTargets({
    shortId: "abc12345",
    row: {
      discord_forum_thread_id: "thread-1",
      discord_forum_message_id: "message-1",
    },
    completedCopies: [
      { threadId: "thread-1", messageId: "message-1" },
      { threadId: "thread-2", messageId: "message-2" },
    ],
  });

  assert.deepEqual(targets, [
    {
      kind: "linked",
      shortId: "abc12345",
      threadId: "thread-1",
      messageId: "message-1",
    },
    {
      kind: "completed_copy",
      shortId: "abc12345",
      threadId: "thread-2",
      messageId: "message-2",
    },
  ]);
});
