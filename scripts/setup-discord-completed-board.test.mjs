import test from "node:test";
import assert from "node:assert/strict";

import {
  COMPLETED_FORUM_NAME,
  COMPLETED_FORUM_TOPIC,
  buildCompletedForumCloneBody,
  parseArgs,
  shouldRecoverCompletedFeedbackReport,
  shouldMirrorCompletedFeedbackReport,
} from "./setup-discord-completed-board.mjs";

test("parseArgs defaults to dry-run and default limit", () => {
  const args = parseArgs([]);

  assert.equal(args.apply, false);
  assert.equal(args.debug, false);
  assert.equal(args.reportId, null);
  assert.equal(args.limit, 100);
});

test("parseArgs reads apply, debug, report id, and limit", () => {
  const args = parseArgs(["--apply", "--debug", "--report-id", "abc12345", "--limit", "25"]);

  assert.equal(args.apply, true);
  assert.equal(args.debug, true);
  assert.equal(args.reportId, "abc12345");
  assert.equal(args.limit, 25);
});

test("buildCompletedForumCloneBody mirrors key source forum settings", () => {
  const body = buildCompletedForumCloneBody({
    parent_id: "category-1",
    nsfw: false,
    rate_limit_per_user: 7,
    default_thread_rate_limit_per_user: 11,
    default_sort_order: 1,
    default_forum_layout: 2,
    default_reaction_emoji: { emoji_id: "emoji-1", emoji_name: null },
    permission_overwrites: [{ id: "role-1", type: 0, allow: "1", deny: "0" }],
    available_tags: [
      { id: "tag-1", name: "Feature", moderated: false, emoji_id: null, emoji_name: "sparkles" },
      { id: "tag-2", name: "Fixed", moderated: false, emoji_id: null, emoji_name: "white_check_mark" },
    ],
  });

  assert.equal(body.name, COMPLETED_FORUM_NAME);
  assert.equal(body.type, 15);
  assert.equal(body.parent_id, "category-1");
  assert.equal(body.topic, COMPLETED_FORUM_TOPIC);
  assert.deepEqual(body.available_tags, [
    { name: "Feature", moderated: false, emoji_name: "sparkles" },
    { name: "Fixed", moderated: false, emoji_name: "white_check_mark" },
  ]);
});

test("shouldRecoverCompletedFeedbackReport skips non-resolved rows", () => {
  const decision = shouldRecoverCompletedFeedbackReport(
    { status: "new" },
    { isTestingCard: false },
  );

  assert.deepEqual(decision, { recover: false, reason: "not_resolved" });
});

test("shouldRecoverCompletedFeedbackReport skips testing cards", () => {
  const decision = shouldRecoverCompletedFeedbackReport(
    { status: "fixed" },
    { isTestingCard: true },
  );

  assert.deepEqual(decision, { recover: false, reason: "testing_card" });
});

test("shouldRecoverCompletedFeedbackReport recovers rows with missing forum references", () => {
  const decision = shouldRecoverCompletedFeedbackReport(
    { status: "fixed" },
    { isTestingCard: false, missingForumRefs: true },
  );

  assert.deepEqual(decision, { recover: true, reason: "missing_forum_refs" });
});

test("shouldRecoverCompletedFeedbackReport recovers archived source threads", () => {
  const decision = shouldRecoverCompletedFeedbackReport(
    { status: "fixed" },
    { isTestingCard: false, threadArchived: true },
  );

  assert.deepEqual(decision, { recover: true, reason: "archived_source_thread" });
});

test("shouldRecoverCompletedFeedbackReport skips active intact threads", () => {
  const decision = shouldRecoverCompletedFeedbackReport(
    { status: "fixed" },
    {
      isTestingCard: false,
      missingForumRefs: false,
      threadMissing: false,
      messageMissing: false,
      threadArchived: false,
      alreadyCompletedBoard: false,
    },
  );

  assert.deepEqual(decision, { recover: false, reason: "active_thread_intact" });
});

test("shouldMirrorCompletedFeedbackReport mirrors intact resolved non-testing rows", () => {
  const decision = shouldMirrorCompletedFeedbackReport(
    { status: "fixed" },
    {
      isTestingCard: false,
      alreadyCompletedBoard: false,
      missingForumRefs: false,
      threadMissing: false,
      messageMissing: false,
      threadArchived: false,
    },
  );

  assert.deepEqual(decision, { mirror: true, reason: "intact_resolved_source_thread" });
});

test("shouldMirrorCompletedFeedbackReport skips cards already in completed board", () => {
  const decision = shouldMirrorCompletedFeedbackReport(
    { status: "fixed" },
    {
      isTestingCard: false,
      alreadyCompletedBoard: true,
    },
  );

  assert.deepEqual(decision, { mirror: false, reason: "already_completed_board" });
});
