import {
  DISCORD_FEEDBACK_BUG_EMOJI_ID,
  DISCORD_FEEDBACK_FEATURE_EMOJI_ID,
} from "@/lib/env";

export type DiscordFeedbackEmojiName = "Bug" | "Feature";

export function resolveDiscordFeedbackEmojiIdSafely(name: DiscordFeedbackEmojiName): string | null {
  try {
    return name === "Bug" ? DISCORD_FEEDBACK_BUG_EMOJI_ID() : DISCORD_FEEDBACK_FEATURE_EMOJI_ID();
  } catch {
    return null;
  }
}

export function buildDiscordFeedbackEmojiPrefix(_name: DiscordFeedbackEmojiName): string {
  // Custom feedback emoji decoration stays disabled until the bot can verify the emoji
  // is available in the active guild and safe for the target Discord payload.
  return "";
}
