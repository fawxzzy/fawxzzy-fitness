import {
  DISCORD_BUG_REPORT_FORUM_CHANNEL_ID,
  DISCORD_FEEDBACK_PANEL_CHANNEL_ID,
  DISCORD_MAIN_CHANNEL_ID,
  DISCORD_MOD_LOG_CHANNEL_ID,
  DISCORD_PURGATORY_CATEGORY_ID,
  DISCORD_PURGATORY_CHANNEL_ID,
  DISCORD_PURGATORY_ROLE_ID,
  DISCORD_UPDATES_CHANNEL_ID,
  DISCORD_VERIFY_CHANNEL_ID_OPTIONAL,
  DISCORD_VERIFIED_ROLE_ID_OPTIONAL,
} from "@/lib/env";
import {
  fetchDiscordGuildChannels,
  fetchDiscordGuildEmojis,
  fetchDiscordGuildRoles,
} from "@/lib/discord/rest";

function formatChannelLine(label: string, id: string | null, name: string | null) {
  if (!id) {
    return `- ${label}: not configured`;
  }

  return `- ${label}: ${name ? `#${name}` : "missing"} (\`${id}\`)`;
}

function formatRoleLine(label: string, id: string | null, name: string | null) {
  if (!id) {
    return `- ${label}: not configured`;
  }

  return `- ${label}: ${name ?? "missing"} (\`${id}\`)`;
}

export async function buildDiscordServerInventorySummary(args: {
  guildId: string;
}) {
  const [channelsResult, rolesResult, emojisResult] = await Promise.all([
    fetchDiscordGuildChannels({ guildId: args.guildId }),
    fetchDiscordGuildRoles({ guildId: args.guildId }),
    fetchDiscordGuildEmojis({ guildId: args.guildId }),
  ]);

  if (!channelsResult.ok) {
    return "Could not load guild channels right now.";
  }

  if (!rolesResult.ok) {
    return "Could not load guild roles right now.";
  }

  if (!emojisResult.ok) {
    return "Could not load guild emojis right now.";
  }

  const channelMap = new Map(channelsResult.channels.map((channel) => [channel.id, channel]));
  const roleMap = new Map(rolesResult.roles.map((role) => [role.id, role]));
  const forumChannelId = DISCORD_BUG_REPORT_FORUM_CHANNEL_ID();
  const forumChannel = forumChannelId ? channelMap.get(forumChannelId) ?? null : null;
  const forumTags = Array.isArray(forumChannel?.available_tags) ? forumChannel.available_tags.slice(0, 8) : [];

  const lines = [
    "# Server Inventory",
    "",
    "Channels",
    formatChannelLine("Updates", DISCORD_UPDATES_CHANNEL_ID(), channelMap.get(DISCORD_UPDATES_CHANNEL_ID() ?? "")?.name ?? null),
    formatChannelLine("Main", DISCORD_MAIN_CHANNEL_ID(), channelMap.get(DISCORD_MAIN_CHANNEL_ID() ?? "")?.name ?? null),
    formatChannelLine("Verify", DISCORD_VERIFY_CHANNEL_ID_OPTIONAL(), channelMap.get(DISCORD_VERIFY_CHANNEL_ID_OPTIONAL() ?? "")?.name ?? null),
    formatChannelLine("Feedback panel", DISCORD_FEEDBACK_PANEL_CHANNEL_ID(), channelMap.get(DISCORD_FEEDBACK_PANEL_CHANNEL_ID() ?? "")?.name ?? null),
    formatChannelLine("Feedback forum", forumChannelId, forumChannel?.name ?? null),
    formatChannelLine("Purgatory category", DISCORD_PURGATORY_CATEGORY_ID(), channelMap.get(DISCORD_PURGATORY_CATEGORY_ID() ?? "")?.name ?? null),
    formatChannelLine("Purgatory channel", DISCORD_PURGATORY_CHANNEL_ID(), channelMap.get(DISCORD_PURGATORY_CHANNEL_ID() ?? "")?.name ?? null),
    formatChannelLine("Mod log", DISCORD_MOD_LOG_CHANNEL_ID(), channelMap.get(DISCORD_MOD_LOG_CHANNEL_ID() ?? "")?.name ?? null),
    "",
    "Roles",
    formatRoleLine("Verified", DISCORD_VERIFIED_ROLE_ID_OPTIONAL(), roleMap.get(DISCORD_VERIFIED_ROLE_ID_OPTIONAL() ?? "")?.name ?? null),
    formatRoleLine("Purgatory", DISCORD_PURGATORY_ROLE_ID(), roleMap.get(DISCORD_PURGATORY_ROLE_ID() ?? "")?.name ?? null),
    "",
    `Guild emojis: ${emojisResult.emojis.length}`,
    forumTags.length > 0 ? "Feedback forum tags" : "Feedback forum tags: none found",
    ...(forumTags.length > 0
      ? forumTags.map((tag) => `- ${tag.name ?? "unnamed"} (\`${tag.id ?? "missing"}\`)`)
      : []),
    "",
    "Full export",
    "- Run `npm run discord:inventory` for Markdown and JSON output.",
  ];

  return lines.join("\n");
}
