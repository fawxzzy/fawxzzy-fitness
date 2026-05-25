import {
  FITNESS_MOD_LOG_COMMAND_NAME,
  FITNESS_RELEASE_COMMAND_NAME,
  FITNESS_SERVER_INVENTORY_COMMAND_NAME,
} from "@/lib/discord/interactions";
import {
  isDiscordApplicationCommand,
} from "@/lib/discord/runtime/helpers";
import type { DiscordInteraction } from "@/lib/discord/runtime/types";

type OperationsDispatchArgs = {
  interaction: DiscordInteraction;
  jsonResponse: (body: Record<string, unknown>, init?: ResponseInit) => Response;
  handleReleaseInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleModLogInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleServerInventoryInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
};

export async function dispatchOperationsInteraction(args: OperationsDispatchArgs): Promise<Response | null> {
  const { interaction } = args;

  if (isDiscordApplicationCommand(interaction, FITNESS_RELEASE_COMMAND_NAME)) {
    return args.jsonResponse(await args.handleReleaseInteraction(interaction));
  }

  if (isDiscordApplicationCommand(interaction, FITNESS_MOD_LOG_COMMAND_NAME)) {
    return args.jsonResponse(await args.handleModLogInteraction(interaction));
  }

  if (isDiscordApplicationCommand(interaction, FITNESS_SERVER_INVENTORY_COMMAND_NAME)) {
    return args.jsonResponse(await args.handleServerInventoryInteraction(interaction));
  }

  return null;
}
