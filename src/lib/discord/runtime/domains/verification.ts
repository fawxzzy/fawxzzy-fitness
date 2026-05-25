import {
  DISCORD_INTERACTION_TYPE,
  FITNESS_VERIFY_BUTTON_CUSTOM_ID,
  FITNESS_VERIFY_CLEANUP_COMMAND_NAME,
  FITNESS_VERIFY_COMMAND_NAME,
  FITNESS_VERIFY_LOCKDOWN_COMMAND_NAME,
  FITNESS_VERIFY_MODAL_CUSTOM_ID,
} from "@/lib/discord/interactions";
import type { DiscordInteraction } from "@/lib/discord/runtime/types";

type JsonResponse = (body: Record<string, unknown>, init?: ResponseInit) => Response;

type VerificationDispatchArgs = {
  interaction: DiscordInteraction;
  jsonResponse: JsonResponse;
  buildDiscordVerifyModalResponse: () => Record<string, unknown>;
  handleSetupVerifyInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleVerifyCleanupInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleVerifyLockdownInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleVerifyModalSubmit: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
};

export async function dispatchVerificationInteraction(args: VerificationDispatchArgs): Promise<Response | null> {
  const { interaction } = args;

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_VERIFY_COMMAND_NAME
  ) {
    return args.jsonResponse(await args.handleSetupVerifyInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_VERIFY_CLEANUP_COMMAND_NAME
  ) {
    return args.jsonResponse(await args.handleVerifyCleanupInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_VERIFY_LOCKDOWN_COMMAND_NAME
  ) {
    return args.jsonResponse(await args.handleVerifyLockdownInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
    && interaction.data?.custom_id === FITNESS_VERIFY_BUTTON_CUSTOM_ID
  ) {
    return args.jsonResponse(args.buildDiscordVerifyModalResponse());
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
    && interaction.data?.custom_id === FITNESS_VERIFY_MODAL_CUSTOM_ID
  ) {
    return args.jsonResponse(await args.handleVerifyModalSubmit(interaction));
  }

  return null;
}
