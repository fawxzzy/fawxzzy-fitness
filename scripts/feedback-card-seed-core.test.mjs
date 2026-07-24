import assert from "node:assert/strict";
import test from "node:test";
import { getTargetForumChannelId } from "./feedback-card-seed-core.mjs";

test("getTargetForumChannelId prefers an explicit forum override", () => {
  assert.equal(getTargetForumChannelId({
    forumChannelId: "forum-123",
    useTestingForum: false,
  }, {
    targetForumEnv: "DISCORD_FITNESS_FEEDBACK_FORUM_CHANNEL_ID",
  }), "forum-123");
});

test("getTargetForumChannelId requires the spec target forum env for dedicated Fitness card sets", () => {
  const previousFitnessForum = process.env.DISCORD_FITNESS_FEEDBACK_FORUM_CHANNEL_ID;
  delete process.env.DISCORD_FITNESS_FEEDBACK_FORUM_CHANNEL_ID;

  try {
    assert.throws(() => getTargetForumChannelId({
      forumChannelId: null,
      useTestingForum: false,
    }, {
      targetForumEnv: "DISCORD_FITNESS_FEEDBACK_FORUM_CHANNEL_ID",
    }), /Missing required env: DISCORD_FITNESS_FEEDBACK_FORUM_CHANNEL_ID/);
  } finally {
    if (previousFitnessForum === undefined) {
      delete process.env.DISCORD_FITNESS_FEEDBACK_FORUM_CHANNEL_ID;
    } else {
      process.env.DISCORD_FITNESS_FEEDBACK_FORUM_CHANNEL_ID = previousFitnessForum;
    }
  }
});
