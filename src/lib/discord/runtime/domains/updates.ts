import {
  FITNESS_UPDATE_LATEST_COMMAND_NAME,
  FITNESS_UPDATE_PUBLISH_COMMAND_NAME,
  FITNESS_UPDATE_PUBLISH_MODAL_CUSTOM_ID_PREFIX,
  FITNESS_UPDATE_SKIP_COMMAND_NAME,
} from "@/lib/discord/interactions";
import {
  isDiscordApplicationCommand,
  isDiscordModalSubmitPrefix,
} from "@/lib/discord/runtime/helpers";
import type { DiscordInteraction } from "@/lib/discord/runtime/types";

type UpdatesDispatchArgs = {
  interaction: DiscordInteraction;
  jsonResponse: (body: Record<string, unknown>, init?: ResponseInit) => Response;
  handleUpdateLatestInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleUpdatePublishInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleUpdateSkipInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleUpdatePublishModalSubmit: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
};

export async function dispatchUpdatesInteraction(args: UpdatesDispatchArgs): Promise<Response | null> {
  const { interaction } = args;

  if (isDiscordApplicationCommand(interaction, FITNESS_UPDATE_LATEST_COMMAND_NAME)) {
    return args.jsonResponse(await args.handleUpdateLatestInteraction(interaction));
  }

  if (isDiscordApplicationCommand(interaction, FITNESS_UPDATE_PUBLISH_COMMAND_NAME)) {
    return args.jsonResponse(await args.handleUpdatePublishInteraction(interaction));
  }

  if (isDiscordApplicationCommand(interaction, FITNESS_UPDATE_SKIP_COMMAND_NAME)) {
    return args.jsonResponse(await args.handleUpdateSkipInteraction(interaction));
  }

  if (isDiscordModalSubmitPrefix(interaction, `${FITNESS_UPDATE_PUBLISH_MODAL_CUSTOM_ID_PREFIX}:`)) {
    return args.jsonResponse(await args.handleUpdatePublishModalSubmit(interaction));
  }

  return null;
}
