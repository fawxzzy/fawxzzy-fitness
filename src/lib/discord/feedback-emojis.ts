import {
  DISCORD_FEEDBACK_BUG_EMOJI_ID,
  DISCORD_FEEDBACK_FEATURE_EMOJI_ID,
  DISCORD_GUILD_ID,
} from "@/lib/env";
import { fetchDiscordGuildEmojis } from "@/lib/discord/rest";

export type DiscordFeedbackEmojiName = "Bug" | "Feature";

type DiscordFeedbackEmojiObject = {
  id: string;
  name: DiscordFeedbackEmojiName;
};

type DiscordFeedbackEmojiValidationCache = {
  cacheKey: string;
  expiresAt: number;
  emojis: Partial<Record<DiscordFeedbackEmojiName, DiscordFeedbackEmojiObject>>;
};

const FEEDBACK_EMOJI_CACHE_TTL_MS = 5 * 60 * 1000;

let feedbackEmojiCache: DiscordFeedbackEmojiValidationCache | null = null;

function resolveExpectedFeedbackEmojiId(name: DiscordFeedbackEmojiName): string | null {
  try {
    return name === "Bug" ? DISCORD_FEEDBACK_BUG_EMOJI_ID() : DISCORD_FEEDBACK_FEATURE_EMOJI_ID();
  } catch {
    return null;
  }
}

function buildFeedbackEmojiCacheKey(): string {
  let guildId = "";
  try {
    guildId = DISCORD_GUILD_ID();
  } catch {
    guildId = "";
  }

  return [
    guildId,
    resolveExpectedFeedbackEmojiId("Bug") ?? "",
    resolveExpectedFeedbackEmojiId("Feature") ?? "",
  ].join(":");
}

function buildEmojiMarkup(emoji: DiscordFeedbackEmojiObject | undefined): string {
  return emoji ? `<:${emoji.name}:${emoji.id}>` : "";
}

function matchesExpectedGuildEmoji(args: {
  expectedId: string;
  expectedName: DiscordFeedbackEmojiName;
  candidate: { id?: string | null; name?: string | null; available?: boolean };
}): boolean {
  return args.candidate.id === args.expectedId
    && typeof args.candidate.name === "string"
    && args.candidate.name.trim().toLowerCase() === args.expectedName.toLowerCase()
    && args.candidate.available !== false;
}

function getCachedFeedbackEmojis(): Partial<Record<DiscordFeedbackEmojiName, DiscordFeedbackEmojiObject>> {
  const cacheKey = buildFeedbackEmojiCacheKey();
  if (!feedbackEmojiCache || feedbackEmojiCache.cacheKey !== cacheKey || feedbackEmojiCache.expiresAt < Date.now()) {
    return {};
  }

  return feedbackEmojiCache.emojis;
}

export function resetDiscordFeedbackEmojiValidationCache() {
  feedbackEmojiCache = null;
}

export function resolveDiscordFeedbackEmojiIdSafely(name: DiscordFeedbackEmojiName): string | null {
  return resolveExpectedFeedbackEmojiId(name);
}

export async function validateDiscordFeedbackEmojis(): Promise<Partial<Record<DiscordFeedbackEmojiName, DiscordFeedbackEmojiObject>>> {
  const cacheKey = buildFeedbackEmojiCacheKey();
  if (feedbackEmojiCache && feedbackEmojiCache.cacheKey === cacheKey && feedbackEmojiCache.expiresAt >= Date.now()) {
    return feedbackEmojiCache.emojis;
  }

  const bugEmojiId = resolveExpectedFeedbackEmojiId("Bug");
  const featureEmojiId = resolveExpectedFeedbackEmojiId("Feature");
  if (!bugEmojiId && !featureEmojiId) {
    feedbackEmojiCache = {
      cacheKey,
      expiresAt: Date.now() + FEEDBACK_EMOJI_CACHE_TTL_MS,
      emojis: {},
    };
    return {};
  }

  try {
    const guildEmojisResult = await fetchDiscordGuildEmojis({ guildId: DISCORD_GUILD_ID() });
    if (!guildEmojisResult.ok) {
      feedbackEmojiCache = {
        cacheKey,
        expiresAt: Date.now() + FEEDBACK_EMOJI_CACHE_TTL_MS,
        emojis: {},
      };
      return {};
    }

    const validated: Partial<Record<DiscordFeedbackEmojiName, DiscordFeedbackEmojiObject>> = {};
    const guildEmojis = guildEmojisResult.emojis;

    if (bugEmojiId) {
      const bugEmoji = guildEmojis.find((candidate) => matchesExpectedGuildEmoji({
        expectedId: bugEmojiId,
        expectedName: "Bug",
        candidate,
      }));
      if (bugEmoji?.id) {
        validated.Bug = { id: bugEmoji.id, name: "Bug" };
      }
    }

    if (featureEmojiId) {
      const featureEmoji = guildEmojis.find((candidate) => matchesExpectedGuildEmoji({
        expectedId: featureEmojiId,
        expectedName: "Feature",
        candidate,
      }));
      if (featureEmoji?.id) {
        validated.Feature = { id: featureEmoji.id, name: "Feature" };
      }
    }

    feedbackEmojiCache = {
      cacheKey,
      expiresAt: Date.now() + FEEDBACK_EMOJI_CACHE_TTL_MS,
      emojis: validated,
    };
    return validated;
  } catch {
    feedbackEmojiCache = {
      cacheKey,
      expiresAt: Date.now() + FEEDBACK_EMOJI_CACHE_TTL_MS,
      emojis: {},
    };
    return {};
  }
}

export function buildDiscordFeedbackEmojiPrefix(name: DiscordFeedbackEmojiName): string {
  return buildEmojiMarkup(getCachedFeedbackEmojis()[name]);
}

export function buildDiscordFeedbackEmojiObject(name: DiscordFeedbackEmojiName): DiscordFeedbackEmojiObject | undefined {
  return getCachedFeedbackEmojis()[name];
}
