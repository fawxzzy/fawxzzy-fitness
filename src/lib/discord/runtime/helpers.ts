import { DISCORD_INTERACTION_TYPE } from "@/lib/discord/interactions";
import type { DiscordInteraction } from "@/lib/discord/runtime/types";

export type DiscordJsonBody = Record<string, unknown>;
export type DiscordJsonResponse = (body: DiscordJsonBody, init?: ResponseInit) => Response;
export type DiscordDispatchResponse = Response | DiscordJsonBody;
export type DiscordDomainDispatcher = () => Promise<Response | null>;

export function toDiscordResponse(
  jsonResponse: DiscordJsonResponse,
  response: DiscordDispatchResponse,
): Response {
  return response instanceof Response ? response : jsonResponse(response);
}

export function getDiscordInteractionCommandName(interaction: DiscordInteraction): string | null {
  return typeof interaction.data?.name === "string" ? interaction.data.name : null;
}

export function getDiscordInteractionCustomId(interaction: DiscordInteraction): string | null {
  return typeof interaction.data?.custom_id === "string" ? interaction.data.custom_id : null;
}

export function isDiscordApplicationCommand(interaction: DiscordInteraction, commandName: string): boolean {
  return interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && getDiscordInteractionCommandName(interaction) === commandName;
}

export function isDiscordMessageComponent(interaction: DiscordInteraction, customId: string): boolean {
  return interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
    && getDiscordInteractionCustomId(interaction) === customId;
}

export function isDiscordMessageComponentPrefix(interaction: DiscordInteraction, prefix: string): boolean {
  const customId = getDiscordInteractionCustomId(interaction);
  return interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
    && customId !== null
    && customId.startsWith(prefix);
}

export function isDiscordModalSubmit(interaction: DiscordInteraction, customId: string): boolean {
  return interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
    && getDiscordInteractionCustomId(interaction) === customId;
}

export function isDiscordModalSubmitPrefix(interaction: DiscordInteraction, prefix: string): boolean {
  const customId = getDiscordInteractionCustomId(interaction);
  return interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
    && customId !== null
    && customId.startsWith(prefix);
}

export async function dispatchDiscordDomainResponses(
  dispatchers: DiscordDomainDispatcher[],
): Promise<Response | null> {
  for (const dispatch of dispatchers) {
    const response = await dispatch();
    if (response) {
      return response;
    }
  }

  return null;
}
