import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordFeedbackEmojiObject,
  buildDiscordFeedbackEmojiPrefix,
  resetDiscordFeedbackEmojiValidationCache,
  resolveDiscordFeedbackEmojiIdSafely,
  validateDiscordFeedbackEmojis,
} from "./feedback-emojis.ts";

test("emoji helper falls back cleanly when env ids are invalid", async () => {
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID = "not-a-snowflake";
  process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID = "still-invalid";

  resetDiscordFeedbackEmojiValidationCache();
  assert.equal(resolveDiscordFeedbackEmojiIdSafely("Bug"), null);
  assert.equal(resolveDiscordFeedbackEmojiIdSafely("Feature"), null);
  assert.deepEqual(await validateDiscordFeedbackEmojis(), {});
  assert.equal(buildDiscordFeedbackEmojiPrefix("Bug"), "");
  assert.equal(buildDiscordFeedbackEmojiObject("Feature"), undefined);

  delete process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID;
  delete process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID;
});

test("emoji validation returns safe button/select payloads only for matching guild emojis", async () => {
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";
  process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID = "1505007702924066916";
  process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID = "1505007651308703877";
  resetDiscordFeedbackEmojiValidationCache();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([
    { id: "1505007702924066916", name: "Bug", available: true },
    { id: "1505007651308703877", name: "Feature", available: true },
    { id: "999999999999999999", name: "Other", available: true },
  ]), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  try {
    const result = await validateDiscordFeedbackEmojis();
    assert.deepEqual(result, {
      Bug: { id: "1505007702924066916", name: "Bug" },
      Feature: { id: "1505007651308703877", name: "Feature" },
    });
    assert.equal(buildDiscordFeedbackEmojiPrefix("Bug"), "<:Bug:1505007702924066916>");
    assert.deepEqual(buildDiscordFeedbackEmojiObject("Feature"), {
      id: "1505007651308703877",
      name: "Feature",
    });
  } finally {
    globalThis.fetch = originalFetch;
    resetDiscordFeedbackEmojiValidationCache();
    delete process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID;
    delete process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID;
  }
});
