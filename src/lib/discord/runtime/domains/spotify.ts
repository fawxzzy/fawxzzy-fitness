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
import type { DiscordInteraction } from "@/lib/discord/runtime/types";

const LEGACY_SPOTIFY_CLUB_SETUP_COMMAND_NAME = "setup-spotify-club";

type JsonResponse = (body: Record<string, unknown>, init?: ResponseInit) => Response;

type SpotifyDispatchArgs = {
  interaction: DiscordInteraction;
  jsonResponse: JsonResponse;
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

function toResponse(
  jsonResponse: JsonResponse,
  response: Response | Record<string, unknown>,
): Response {
  return response instanceof Response ? response : jsonResponse(response);
}

export async function dispatchSpotifyInteraction(args: SpotifyDispatchArgs): Promise<Response | null> {
  const { interaction } = args;

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && (
      interaction.data?.name === FITNESS_SPOTIFY_CLUB_SETUP_COMMAND_NAME
      || interaction.data?.name === LEGACY_SPOTIFY_CLUB_SETUP_COMMAND_NAME
    )
  ) {
    return args.jsonResponse(await args.handleSetupSpotifyClubInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_SPOTIFY_COMMAND_NAME
  ) {
    return toResponse(args.jsonResponse, await args.handleSpotifyInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_JAM_LOBBY_COMMAND_NAME
  ) {
    return args.jsonResponse(await args.handleJamLobbyInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
    && interaction.data?.name === FITNESS_JAM_QUEUE_COMMAND_NAME
  ) {
    return args.jsonResponse(await args.handleJamQueueInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
    && typeof interaction.data?.custom_id === "string"
    && (
      interaction.data.custom_id === FITNESS_SPOTIFY_CONNECT_BUTTON_CUSTOM_ID
      || interaction.data.custom_id === FITNESS_SPOTIFY_STATUS_BUTTON_CUSTOM_ID
      || interaction.data.custom_id === FITNESS_SPOTIFY_DISCONNECT_AUTH_BUTTON_CUSTOM_ID
      || interaction.data.custom_id === FITNESS_SPOTIFY_QUEUE_SUGGEST_BUTTON_CUSTOM_ID
      || interaction.data.custom_id === FITNESS_SPOTIFY_QUEUE_VIEW_BUTTON_CUSTOM_ID
      || interaction.data.custom_id.startsWith("spotify_")
    )
  ) {
    return toResponse(args.jsonResponse, await args.handleSpotifyClubButtonInteraction(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
    && interaction.data?.custom_id === FITNESS_SPOTIFY_QUEUE_SUGGEST_MODAL_CUSTOM_ID
  ) {
    return args.jsonResponse(await args.handleSpotifyQueueSuggestModalSubmit(interaction));
  }

  if (
    interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
    && interaction.data?.custom_id === FITNESS_SPOTIFY_QUEUE_SEARCH_MODAL_CUSTOM_ID
  ) {
    return args.jsonResponse(await args.handleSpotifyQueueSearchModalSubmit(interaction));
  }

  return null;
}
