import {
  DISCORD_INTERACTION_TYPE,
  FITNESS_MOD_LOG_COMMAND_NAME,
  FITNESS_RELEASE_COMMAND_NAME,
  FITNESS_SERVER_INVENTORY_COMMAND_NAME,
} from "@/lib/discord/interactions";
import type { DiscordInteraction } from "@/lib/discord/runtime/types";

type JsonResponse = (body: Record<string, unknown>, init?: ResponseInit) => Response;

type OperationsDispatchArgs = {
  interaction: DiscordInteraction;
  jsonResponse: JsonResponse;
  handleReleaseInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleModLogInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleServerInventoryInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
};

export async function dispatchOperationsInteraction(args: OperationsDispatchArgs): Promise<Response | null> {
  const { interaction } = args;

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_RELEASE_COMMAND_NAME
  ) {
    return args.jsonResponse(await args.handleReleaseInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_MOD_LOG_COMMAND_NAME
  ) {
    return args.jsonResponse(await args.handleModLogInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_SERVER_INVENTORY_COMMAND_NAME
  ) {
    return args.jsonResponse(await args.handleServerInventoryInteraction(interaction));
  }

  return null;
}
