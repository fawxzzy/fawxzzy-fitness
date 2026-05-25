import {
  DISCORD_INTERACTION_TYPE,
  FITNESS_JAM_LOBBY_COMMAND_NAME,
  FITNESS_JAM_QUEUE_COMMAND_NAME,
  FITNESS_SPOTIFY_CLUB_SETUP_COMMAND_NAME,
  FITNESS_SPOTIFY_COMMAND_NAME,
  FITNESS_SPOTIFY_CONNECT_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_DISCONNECT_AUTH_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_QUEUE_SEARCH_MODAL_CUSTOM_ID,
  FITNESS_SPOTIFY_QUEUE_SUGGEST_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_QUEUE_SUGGEST_MODAL_CUSTOM_ID,
  FITNESS_SPOTIFY_QUEUE_VIEW_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_STATUS_BUTTON_CUSTOM_ID,
} from "@/lib/discord/interactions";
import {
  getDiscordInteractionCustomId,
  isDiscordApplicationCommand,
  isDiscordModalSubmit,
  toDiscordResponse,
} from "@/lib/discord/runtime/helpers";
import type { DiscordInteraction } from "@/lib/discord/runtime/types";

const LEGACY_SPOTIFY_CLUB_SETUP_COMMAND_NAME = "setup-spotify-club";

type SpotifyDispatchArgs = {
  interaction: DiscordInteraction;
  jsonResponse: (body: Record<string, unknown>, init?: ResponseInit) => Response;
  handleSetupSpotifyClubInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleSpotifyInteraction: (
    interaction: DiscordInteraction,
  ) => Promise<Response | Record<string, unknown>> | Response | Record<string, unknown>;
  handleJamLobbyInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleJamQueueInteraction: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleSpotifyClubButtonInteraction: (
    interaction: DiscordInteraction,
  ) => Promise<Response | Record<string, unknown>> | Response | Record<string, unknown>;
  handleSpotifyQueueSuggestModalSubmit: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
  handleSpotifyQueueSearchModalSubmit: (interaction: DiscordInteraction) => Promise<Record<string, unknown>>;
};

export async function dispatchSpotifyInteraction(args: SpotifyDispatchArgs): Promise<Response | null> {
  const { interaction } = args;
  const customId = getDiscordInteractionCustomId(interaction);

  if (
    isDiscordApplicationCommand(interaction, FITNESS_SPOTIFY_CLUB_SETUP_COMMAND_NAME)
    || isDiscordApplicationCommand(interaction, LEGACY_SPOTIFY_CLUB_SETUP_COMMAND_NAME)
  ) {
    return args.jsonResponse(await args.handleSetupSpotifyClubInteraction(interaction));
  }

  if (isDiscordApplicationCommand(interaction, FITNESS_SPOTIFY_COMMAND_NAME)) {
    return toDiscordResponse(args.jsonResponse, await args.handleSpotifyInteraction(interaction));
  }

  if (isDiscordApplicationCommand(interaction, FITNESS_JAM_LOBBY_COMMAND_NAME)) {
    return args.jsonResponse(await args.handleJamLobbyInteraction(interaction));
  }

  if (isDiscordApplicationCommand(interaction, FITNESS_JAM_QUEUE_COMMAND_NAME)) {
    return args.jsonResponse(await args.handleJamQueueInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
    && customId !== null
    && (
      customId === FITNESS_SPOTIFY_CONNECT_BUTTON_CUSTOM_ID
      || customId === FITNESS_SPOTIFY_STATUS_BUTTON_CUSTOM_ID
      || customId === FITNESS_SPOTIFY_DISCONNECT_AUTH_BUTTON_CUSTOM_ID
      || customId === FITNESS_SPOTIFY_QUEUE_SUGGEST_BUTTON_CUSTOM_ID
      || customId === FITNESS_SPOTIFY_QUEUE_VIEW_BUTTON_CUSTOM_ID
      || customId.startsWith("spotify_")
    )
  ) {
    return toDiscordResponse(args.jsonResponse, await args.handleSpotifyClubButtonInteraction(interaction));
  }

  if (isDiscordModalSubmit(interaction, FITNESS_SPOTIFY_QUEUE_SUGGEST_MODAL_CUSTOM_ID)) {
    return args.jsonResponse(await args.handleSpotifyQueueSuggestModalSubmit(interaction));
  }

  if (isDiscordModalSubmit(interaction, FITNESS_SPOTIFY_QUEUE_SEARCH_MODAL_CUSTOM_ID)) {
    return args.jsonResponse(await args.handleSpotifyQueueSearchModalSubmit(interaction));
  }

  return null;
}
