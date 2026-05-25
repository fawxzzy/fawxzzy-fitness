import {
  FITNESS_VERIFY_BUTTON_CUSTOM_ID,
  FITNESS_VERIFY_CLEANUP_COMMAND_NAME,
  FITNESS_VERIFY_COMMAND_NAME,
  FITNESS_VERIFY_LOCKDOWN_COMMAND_NAME,
  FITNESS_VERIFY_MODAL_CUSTOM_ID,
} from "@/lib/discord/interactions";
import {
  isDiscordApplicationCommand,
  isDiscordMessageComponent,
  isDiscordModalSubmit,
} from "@/lib/discord/runtime/helpers";
import type { DiscordInteraction } from "@/lib/discord/runtime/types";

type VerificationDispatchArgs = {
  interaction: DiscordInteraction;
  jsonResponse: (body: Record<string, unknown>, init?: ResponseInit) => Response;
  buildDiscordVerifyModalResponse: () => Record<string, unknown>;
  handleSetupVerifyInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleVerifyCleanupInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleVerifyLockdownInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleVerifyModalSubmit: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
};

export async function dispatchVerificationInteraction(args: VerificationDispatchArgs): Promise<Response | null> {
  const { interaction } = args;

  if (isDiscordApplicationCommand(interaction, FITNESS_VERIFY_COMMAND_NAME)) {
    return args.jsonResponse(await args.handleSetupVerifyInteraction(interaction));
  }

  if (isDiscordApplicationCommand(interaction, FITNESS_VERIFY_CLEANUP_COMMAND_NAME)) {
    return args.jsonResponse(await args.handleVerifyCleanupInteraction(interaction));
  }

  if (isDiscordApplicationCommand(interaction, FITNESS_VERIFY_LOCKDOWN_COMMAND_NAME)) {
    return args.jsonResponse(await args.handleVerifyLockdownInteraction(interaction));
  }

  if (isDiscordMessageComponent(interaction, FITNESS_VERIFY_BUTTON_CUSTOM_ID)) {
    return args.jsonResponse(args.buildDiscordVerifyModalResponse());
  }

  if (isDiscordModalSubmit(interaction, FITNESS_VERIFY_MODAL_CUSTOM_ID)) {
    return args.jsonResponse(await args.handleVerifyModalSubmit(interaction));
  }

  return null;
}
