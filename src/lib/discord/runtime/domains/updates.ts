import {
  DISCORD_INTERACTION_TYPE,
  FITNESS_UPDATE_LATEST_COMMAND_NAME,
  FITNESS_UPDATE_PUBLISH_COMMAND_NAME,
  FITNESS_UPDATE_PUBLISH_MODAL_CUSTOM_ID_PREFIX,
  FITNESS_UPDATE_SKIP_COMMAND_NAME,
} from "@/lib/discord/interactions";
import type { DiscordInteraction } from "@/lib/discord/runtime/types";

type JsonResponse = (body: Record<string, unknown>, init?: ResponseInit) => Response;

type UpdatesDispatchArgs = {
  interaction: DiscordInteraction;
  jsonResponse: JsonResponse;
  handleUpdateLatestInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleUpdatePublishInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleUpdateSkipInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleUpdatePublishModalSubmit: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
};

export async function dispatchUpdatesInteraction(args: UpdatesDispatchArgs): Promise<Response | null> {
  const { interaction } = args;

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_UPDATE_LATEST_COMMAND_NAME
  ) {
    return args.jsonResponse(await args.handleUpdateLatestInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_UPDATE_PUBLISH_COMMAND_NAME
  ) {
    return args.jsonResponse(await args.handleUpdatePublishInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_UPDATE_SKIP_COMMAND_NAME
  ) {
    return args.jsonResponse(await args.handleUpdateSkipInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
    && typeof interaction.data?.custom_id === "string"
    && interaction.data.custom_id.startsWith(`${FITNESS_UPDATE_PUBLISH_MODAL_CUSTOM_ID_PREFIX}:`)
  ) {
    return args.jsonResponse(await args.handleUpdatePublishModalSubmit(interaction));
  }

  return null;
}
