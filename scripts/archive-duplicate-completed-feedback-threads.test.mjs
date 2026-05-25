import test from "node:test";
import assert from "node:assert/strict";

import {
  parseArgs,
  parseReportShortIdFromContent,
  shouldArchiveCompletedDuplicateThread,
} from "./archive-duplicate-completed-feedback-threads.mjs";

test("parseArgs defaults to dry-run", () => {
  const args = parseArgs([]);

  assert.equal(args.apply, false);
  assert.equal(args.debug, false);
});

test("parseArgs reads apply and debug flags", () => {
  const args = parseArgs(["--apply", "--debug"]);

  assert.equal(args.apply, true);
  assert.equal(args.debug, true);
});

test("parseReportShortIdFromContent returns report ids", () => {
  const shortId = parseReportShortIdFromContent("Feature request\nReport ID: `16d98fc2`\nStatus: fixed");

  assert.equal(shortId, "16d98fc2");
});

test("shouldArchiveCompletedDuplicateThread archives active non-completed-board duplicates", () => {
  const decision = shouldArchiveCompletedDuplicateThread({
    thread: {
      id: "thread-1",
      parent_id: "forum-source",
      archived: false,
    },
    completedForumId: "forum-completed",
    completedShortIds: new Set(["16d98fc2"]),
    starterMessageContent: "Report ID: `16d98fc2`",
  });

  assert.deepEqual(decision, {
    archive: true,
    reason: "completed_board_duplicate",
    shortId: "16d98fc2",
  });
});

test("shouldArchiveCompletedDuplicateThread skips completed board threads", () => {
  const decision = shouldArchiveCompletedDuplicateThread({
    thread: {
      id: "thread-1",
      parent_id: "forum-completed",
      archived: false,
    },
    completedForumId: "forum-completed",
    completedShortIds: new Set(["16d98fc2"]),
    starterMessageContent: "Report ID: `16d98fc2`",
  });

  assert.deepEqual(decision, {
    archive: false,
    reason: "completed_board_thread",
  });
});

test("shouldArchiveCompletedDuplicateThread skips non-duplicates", () => {
  const decision = shouldArchiveCompletedDuplicateThread({
    thread: {
      id: "thread-1",
      parent_id: "forum-source",
      archived: false,
    },
    completedForumId: "forum-completed",
    completedShortIds: new Set(["aaaaaaaa"]),
    starterMessageContent: "Report ID: `16d98fc2`",
  });

  assert.deepEqual(decision, {
    archive: false,
    reason: "not_completed_duplicate",
    shortId: "16d98fc2",
  });
});
