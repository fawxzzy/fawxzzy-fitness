import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordFeedbackEmojiPrefix,
  resolveDiscordFeedbackEmojiIdSafely,
} from "./feedback-emojis.ts";

test("emoji helper never throws and falls back cleanly for invalid ids", () => {
  process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID = "not-a-snowflake";
  process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID = "still-not-valid";

  assert.equal(resolveDiscordFeedbackEmojiIdSafely("Bug"), null);
  assert.equal(resolveDiscordFeedbackEmojiIdSafely("Feature"), null);
  assert.equal(buildDiscordFeedbackEmojiPrefix("Bug"), "");
  assert.equal(buildDiscordFeedbackEmojiPrefix("Feature"), "");

  delete process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID;
  delete process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID;
});

test("emoji helper keeps custom emoji decoration disabled even when env ids are present", () => {
  process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID = "1505007702924068916";
  process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID = "1505007651308703877";

  assert.equal(resolveDiscordFeedbackEmojiIdSafely("Bug"), "1505007702924068916");
  assert.equal(resolveDiscordFeedbackEmojiIdSafely("Feature"), "1505007651308703877");
  assert.equal(buildDiscordFeedbackEmojiPrefix("Bug"), "");
  assert.equal(buildDiscordFeedbackEmojiPrefix("Feature"), "");

  delete process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID;
  delete process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID;
});
