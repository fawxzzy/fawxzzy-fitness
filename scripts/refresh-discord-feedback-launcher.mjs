import {
  DISCORD_FEEDBACK_PANEL_CHANNEL_ID,
  DISCORD_GUILD_ID,
  DISCORD_MAIN_CHANNEL_ID,
} from "@/lib/env";
import {
  buildDiscordFeedbackPanelMessagePayload,
  discordMessageHasFeedbackPanel,
} from "@/lib/discord/interactions";
import {
  createDiscordChannelMessage,
  createDiscordGuildChannel,
  deleteDiscordChannelMessage,
  fetchDiscordChannel,
  fetchDiscordChannelMessages,
  fetchDiscordGuildChannels,
  updateDiscordChannel,
} from "@/lib/discord/rest";

const CANONICAL_CHANNEL_NAME = "feedback-submission";
const LEGACY_CHANNEL_NAMES = new Set(["submit-feedback"]);

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    dryRun: argv.includes("--dry-run"),
    json: argv.includes("--json"),
  };
}

function isStandardTextChannel(type) {
  return type === 0;
}

function normalizeChannelName(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isLegacyChannelName(value) {
  return LEGACY_CHANNEL_NAMES.has(normalizeChannelName(value));
}

function isManagedChannelName(value) {
  const normalized = normalizeChannelName(value);
  return normalized === CANONICAL_CHANNEL_NAME || LEGACY_CHANNEL_NAMES.has(normalized);
}

async function maybeRenameLegacyChannel(channel, apply) {
  if (!isLegacyChannelName(channel?.name)) {
    return { ok: true, channel };
  }

  if (!apply) {
    return {
      ok: true,
      channel: {
        ...channel,
        name: CANONICAL_CHANNEL_NAME,
      },
      renamed: true,
    };
  }

  const renameResult = await updateDiscordChannel({
    channelId: channel.id,
    name: CANONICAL_CHANNEL_NAME,
  });
  if (!renameResult.ok) {
    return {
      ok: false,
      message: `Failed to rename legacy feedback channel ${channel.id}: ${renameResult.message ?? renameResult.code}`,
    };
  }

  return {
    ok: true,
    channel: {
      ...channel,
      name: CANONICAL_CHANNEL_NAME,
    },
    renamed: true,
  };
}

async function resolveTargetChannel(apply) {
  const configuredChannelId = DISCORD_FEEDBACK_PANEL_CHANNEL_ID();
  if (configuredChannelId) {
    const configuredResult = await fetchDiscordChannel({ channelId: configuredChannelId });
    if (configuredResult.ok && isStandardTextChannel(configuredResult.channel.type)) {
      const renameResult = await maybeRenameLegacyChannel(configuredResult.channel, apply);
      if (!renameResult.ok) {
        throw new Error(renameResult.message);
      }

      return {
        channel: renameResult.channel,
        source: "configured-env",
        renamed: Boolean(renameResult.renamed),
      };
    }
  }

  const guildChannelsResult = await fetchDiscordGuildChannels({ guildId: DISCORD_GUILD_ID() });
  if (!guildChannelsResult.ok) {
    throw new Error(`Failed to load guild channels: ${guildChannelsResult.message ?? guildChannelsResult.code}`);
  }

  const canonicalChannel = guildChannelsResult.channels.find((channel) => (
    channel.id
    && isStandardTextChannel(channel.type)
    && normalizeChannelName(channel.name) === CANONICAL_CHANNEL_NAME
  ));
  if (canonicalChannel?.id) {
    return {
      channel: canonicalChannel,
      source: "existing-canonical",
      renamed: false,
    };
  }

  const legacyChannel = guildChannelsResult.channels.find((channel) => (
    channel.id
    && isStandardTextChannel(channel.type)
    && isLegacyChannelName(channel.name)
  ));
  if (legacyChannel?.id) {
    const renameResult = await maybeRenameLegacyChannel(legacyChannel, apply);
    if (!renameResult.ok) {
      throw new Error(renameResult.message);
    }

    return {
      channel: renameResult.channel,
      source: "existing-legacy",
      renamed: true,
    };
  }

  const sourceChannelId = DISCORD_MAIN_CHANNEL_ID();
  if (!sourceChannelId) {
    throw new Error(
      "No dedicated feedback launcher channel exists and DISCORD_MAIN_CHANNEL_ID is not configured for channel creation fallback.",
    );
  }

  const sourceChannelResult = await fetchDiscordChannel({ channelId: sourceChannelId });
  if (!sourceChannelResult.ok) {
    throw new Error(`Failed to load source channel for launcher creation: ${sourceChannelResult.message ?? sourceChannelResult.code}`);
  }

  const sourceChannel = sourceChannelResult.channel;
  if (sourceChannel.id && isManagedChannelName(sourceChannel.name) && isStandardTextChannel(sourceChannel.type)) {
    const renameResult = await maybeRenameLegacyChannel(sourceChannel, apply);
    if (!renameResult.ok) {
      throw new Error(renameResult.message);
    }

    return {
      channel: renameResult.channel,
      source: "main-channel-reused",
      renamed: Boolean(renameResult.renamed),
    };
  }

  if (!apply) {
    return {
      channel: {
        id: null,
        name: CANONICAL_CHANNEL_NAME,
        type: 0,
        parent_id: sourceChannel.parent_id ?? null,
        position: typeof sourceChannel.position === "number" ? sourceChannel.position + 1 : null,
      },
      source: "would-create",
      renamed: false,
    };
  }

  const createResult = await createDiscordGuildChannel({
    guildId: DISCORD_GUILD_ID(),
    name: CANONICAL_CHANNEL_NAME,
    type: 0,
    parentId: typeof sourceChannel.parent_id === "string" ? sourceChannel.parent_id : null,
    position: typeof sourceChannel.position === "number" ? sourceChannel.position + 1 : null,
  });
  if (!createResult.ok) {
    throw new Error(`Failed to create feedback launcher channel: ${createResult.message ?? createResult.code}`);
  }

  return {
    channel: createResult.channel,
    source: "created",
    renamed: false,
  };
}

async function collectExistingPanelMessages(channelId) {
  const messagesResult = await fetchDiscordChannelMessages({
    channelId,
    limit: 50,
  });
  if (!messagesResult.ok) {
    throw new Error(`Failed to load feedback launcher channel messages: ${messagesResult.message ?? messagesResult.code}`);
  }

  return messagesResult.messages.filter((message) => (
    message.id
    && message.author?.bot
    && discordMessageHasFeedbackPanel(message)
  ));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = buildDiscordFeedbackPanelMessagePayload();
  const targetResult = await resolveTargetChannel(args.apply);
  const channelId = typeof targetResult.channel.id === "string" ? targetResult.channel.id : null;
  const staleMessageIds = channelId ? (await collectExistingPanelMessages(channelId)).map((message) => message.id) : [];

  const summary = {
    apply: args.apply,
    source: targetResult.source,
    renamedChannel: targetResult.renamed,
    channelId,
    channelName: targetResult.channel.name ?? CANONICAL_CHANNEL_NAME,
    stalePanelMessageIds: staleMessageIds,
    payloadPreview: payload,
  };

  if (!args.apply) {
    if (args.json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(`feedback launcher dry-run -> ${summary.channelName} (${summary.source})`);
      console.log(`stale launcher messages: ${summary.stalePanelMessageIds.length}`);
      console.log(JSON.stringify(summary.payloadPreview, null, 2));
    }
    return;
  }

  if (!channelId) {
    throw new Error("Launcher apply mode requires a real Discord channel id.");
  }

  for (const messageId of staleMessageIds) {
    const deleteResult = await deleteDiscordChannelMessage({ channelId, messageId });
    if (!deleteResult.ok && deleteResult.code !== "DISCORD_DELETE_MESSAGE_NOT_FOUND") {
      throw new Error(`Failed to delete stale launcher ${messageId}: ${deleteResult.message ?? deleteResult.code}`);
    }
  }

  const createResult = await createDiscordChannelMessage({
    channelId,
    body: payload,
  });
  if (!createResult.ok) {
    throw new Error(`Failed to create refreshed feedback launcher: ${createResult.message ?? createResult.code}`);
  }

  const result = {
    ...summary,
    createdMessageId: createResult.messageId,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`feedback launcher refreshed in <#${channelId}>`);
    console.log(`removed stale launchers: ${staleMessageIds.length}`);
    console.log(`created launcher message: ${createResult.messageId ?? "unknown"}`);
  }
}

main().catch((error) => {
  console.error(`refresh-discord-feedback-launcher failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
