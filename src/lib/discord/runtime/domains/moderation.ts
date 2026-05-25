import {
  FITNESS_PURGATORY_COMMAND_NAME,
  FITNESS_PURGATORY_SETUP_COMMAND_NAME,
  FITNESS_WARNINGS_COMMAND_NAME,
  FITNESS_WARN_COMMAND_NAME,
  FITNESS_WARNING_CLEAR_COMMAND_NAME,
} from "@/lib/discord/interactions";
import { isDiscordApplicationCommand } from "@/lib/discord/runtime/helpers";
import type { DiscordInteraction } from "@/lib/discord/runtime/types";

type ModerationDispatchArgs = {
  interaction: DiscordInteraction;
  jsonResponse: (body: Record<string, unknown>, init?: ResponseInit) => Response;
  handleWarnInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleWarningsInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleWarningClearInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handlePurgatorySetupInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handlePurgatoryInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
};

export async function dispatchModerationInteraction(args: ModerationDispatchArgs): Promise<Response | null> {
  const { interaction } = args;

  if (isDiscordApplicationCommand(interaction, FITNESS_PURGATORY_SETUP_COMMAND_NAME)) {
    return args.jsonResponse(await args.handlePurgatorySetupInteraction(interaction));
  }

  if (isDiscordApplicationCommand(interaction, FITNESS_WARN_COMMAND_NAME)) {
    return args.jsonResponse(await args.handleWarnInteraction(interaction));
  }

  if (isDiscordApplicationCommand(interaction, FITNESS_WARNINGS_COMMAND_NAME)) {
    return args.jsonResponse(await args.handleWarningsInteraction(interaction));
  }

  if (isDiscordApplicationCommand(interaction, FITNESS_WARNING_CLEAR_COMMAND_NAME)) {
    return args.jsonResponse(await args.handleWarningClearInteraction(interaction));
  }

  if (isDiscordApplicationCommand(interaction, FITNESS_PURGATORY_COMMAND_NAME)) {
    return args.jsonResponse(await args.handlePurgatoryInteraction(interaction));
  }

  return null;
}
