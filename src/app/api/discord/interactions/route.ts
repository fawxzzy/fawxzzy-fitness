import { randomUUID } from "node:crypto";
import {
  DISCORD_APPLICATION_ID,
  DISCORD_BUG_REPORT_FORUM_CHANNEL_ID,
  DISCORD_FEEDBACK_PANEL_CHANNEL_ID,
  DISCORD_GUILD_ID,
  DISCORD_MAIN_CHANNEL_ID,
  DISCORD_SPOTIFY_CLUB_CHANNEL_ID,
  DISCORD_SPOTIFY_CLUB_TEST_CHANNEL_ID,
  DISCORD_UPDATES_CHANNEL_ID,
  DISCORD_UNVERIFIED_ROLE_ID,
  DISCORD_VERIFY_CHANNEL_ID,
  DISCORD_VERIFY_MESSAGE_BODY,
  DISCORD_VERIFY_MESSAGE_TITLE,
  DISCORD_VERIFIED_ROLE_ID,
  optionalEnv,
} from "@/lib/env";
import { verifyDiscordInteractionSignature } from "@/lib/discord/interaction-signature";
import {
  buildDiscordAllowedMentions,
  buildDiscordBugForumTagNames,
  buildDiscordBugForumThreadBody,
  buildDiscordBugForumThreadTitle,
  buildDiscordBugReporterLabel,
  createDiscordBugReport,
  DISCORD_BUG_REPORT_STATUS_TAG_LABELS,
  DISCORD_BUG_REPORT_TYPE_TAG_LABELS,
  type DiscordFeedbackAttachmentMetadata,
  formatDiscordCompletionReviewStatusLabel,
  extractDiscordBugReportModalFields,
  findDiscordBugReportByIdOrPrefix,
  formatDiscordBugReportShortId,
  normalizeDiscordCompletionReviewStatus,
  listRecentDiscordFeedbackReports,
  normalizeDiscordFeedbackReportType,
  normalizeDiscordBugReportStatus,
  postFeedbackCardAuditComment,
  recordDiscordBugReportForumThread,
  recordDiscordBugReportForumState,
  requiresDiscordFeedbackCompletionReview,
  shouldApplyDiscordFeedbackBacklogTag,
  updateDiscordFeedbackCompletionReview,
  updateDiscordFeedbackReportContent,
  updateDiscordBugReportStatus,
  withdrawDiscordFeedbackReport,
} from "@/lib/discord/bug-reports";
import type { DiscordBugReportRow } from "@/lib/discord/bug-reports";
import {
  buildDiscordFeedbackPanelMessagePayload,
  buildDiscordFeedbackPanelSubmitModalResponse,
  buildDiscordFeedbackManageCardResponse,
  buildDiscordFeedbackManageLookupModalResponse,
  buildDiscordSpotifyClubPanelMessagePayload,
  buildDiscordEphemeralMessageResponseWithComponents,
  buildDiscordSpotifyQueueSearchModalResponse,
  buildDiscordSpotifyQueueSuggestModalResponse,
  buildDiscordSpotifyTrackSearchResultsResponse,
  buildDiscordFeedbackUpdatePickerResponse,
  buildDiscordFeedbackUpdateModalResponse,
  buildDiscordFeedbackWithdrawSelectedModalResponse,
  buildDiscordUpdatePublishModalResponse,
  buildDiscordEphemeralMessageResponse,
  buildDiscordPongResponse,
  buildDiscordVerifyMessagePayload,
  buildDiscordVerifyModalResponse,
  DISCORD_MESSAGE_FLAG_EPHEMERAL,
  DISCORD_PERMISSION_ADD_REACTIONS,
  DISCORD_PERMISSION_ADMINISTRATOR,
  DISCORD_PERMISSION_CREATE_PRIVATE_THREADS,
  DISCORD_PERMISSION_CREATE_PUBLIC_THREADS,
  DISCORD_PERMISSION_MANAGE_GUILD,
  DISCORD_PERMISSION_READ_MESSAGE_HISTORY,
  DISCORD_PERMISSION_SEND_MESSAGES,
  DISCORD_PERMISSION_SEND_MESSAGES_IN_THREADS,
  DISCORD_PERMISSION_VIEW_CHANNEL,
  discordMemberHasBugStatusPermission,
  discordMemberHasModerationPermission,
  discordMessageHasFeedbackPanel,
  discordMessageHasSpotifyClubPanel,
  discordMemberHasSetupPermission,
  discordMessageHasVerifyButton,
  FITNESS_FEEDBACK_COMMAND_NAME,
  FITNESS_FEEDBACK_PANEL_SUBMIT_BUTTON_CUSTOM_ID,
  FITNESS_FEEDBACK_PANEL_SUBMIT_MODAL_CUSTOM_ID,
  FITNESS_FEEDBACK_ATTACHMENT_INPUT_CUSTOM_ID,
  FITNESS_FEEDBACK_PANEL_TYPE_INPUT_CUSTOM_ID,
  FITNESS_BUG_SUMMARY_INPUT_CUSTOM_ID,
  FITNESS_BUG_AREA_INPUT_CUSTOM_ID,
  FITNESS_BUG_DETAILS_INPUT_CUSTOM_ID,
  FITNESS_FEEDBACK_SETUP_COMMAND_NAME,
  FITNESS_FEEDBACK_UPDATE_PICKER_SELECT_CUSTOM_ID,
  FITNESS_FEEDBACK_REPORT_MODAL_CUSTOM_ID_PREFIX,
  FITNESS_FEEDBACK_PANEL_UPDATE_BUTTON_CUSTOM_ID,
  FITNESS_FEEDBACK_COMPLETION_REVIEW_COMMAND_NAME,
  FITNESS_FEEDBACK_COMPLETION_REVIEW_DECISION_OPTION_NAME,
  FITNESS_FEEDBACK_STATUS_COMMAND_NAME,
  FITNESS_FEEDBACK_UPDATE_PICKER_BUTTON_CUSTOM_ID_PREFIX,
  FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_BUTTON_CUSTOM_ID,
  FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_INPUT_CUSTOM_ID,
  FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_MODAL_CUSTOM_ID,
  FITNESS_FEEDBACK_WITHDRAW_MODAL_CUSTOM_ID,
  FITNESS_FEEDBACK_WITHDRAW_NOTE_INPUT_CUSTOM_ID,
  FITNESS_FEEDBACK_WITHDRAW_REPORT_SELECT_CUSTOM_ID,
  FITNESS_FEEDBACK_WITHDRAW_REPORT_ID_INPUT_CUSTOM_ID,
  FITNESS_FEEDBACK_WITHDRAW_COMMAND_NAME,
  FITNESS_BUG_STATUS_NOTE_OPTION_NAME,
  FITNESS_BUG_STATUS_REPORT_ID_OPTION_NAME,
  FITNESS_BUG_STATUS_STATUS_OPTION_NAME,
  FITNESS_UPDATE_DRAFT_ID_OPTION_NAME,
  FITNESS_UPDATE_LATEST_COMMAND_NAME,
  FITNESS_MOD_LOG_COMMAND_NAME,
  FITNESS_MOD_LOG_LIMIT_OPTION_NAME,
  FITNESS_SERVER_INVENTORY_COMMAND_NAME,
  FITNESS_UPDATE_PUBLISH_COMMAND_NAME,
  FITNESS_PURGATORY_COMMAND_NAME,
  FITNESS_PURGATORY_DURATION_OPTION_NAME,
  FITNESS_PURGATORY_REASON_OPTION_NAME,
  FITNESS_PURGATORY_SETUP_COMMAND_NAME,
  FITNESS_PURGATORY_USER_OPTION_NAME,
  FITNESS_RELEASE_CASE_ID_OPTION_NAME,
  FITNESS_RELEASE_COMMAND_NAME,
  FITNESS_RELEASE_NOTE_OPTION_NAME,
  FITNESS_WARNING_CLEAR_COMMAND_NAME,
  FITNESS_JAM_LOBBY_CLOSE_SUBCOMMAND_NAME,
  FITNESS_JAM_LOBBY_COMMAND_NAME,
  FITNESS_JAM_LOBBY_OPEN_SUBCOMMAND_NAME,
  FITNESS_JAM_LOBBY_STATUS_SUBCOMMAND_NAME,
  FITNESS_JAM_QUEUE_APPROVE_SUBCOMMAND_NAME,
  FITNESS_JAM_QUEUE_COMMAND_NAME,
  FITNESS_JAM_QUEUE_ITEM_OPTION_NAME,
  FITNESS_JAM_QUEUE_LIST_SUBCOMMAND_NAME,
  FITNESS_JAM_QUEUE_REASON_OPTION_NAME,
  FITNESS_JAM_QUEUE_REJECT_SUBCOMMAND_NAME,
  FITNESS_JAM_QUEUE_REMOVE_SUBCOMMAND_NAME,
  FITNESS_JAM_QUEUE_SUGGEST_SUBCOMMAND_NAME,
  FITNESS_JAM_QUEUE_TRACK_OPTION_NAME,
  FITNESS_WARNING_SEVERITY_OPTION_NAME,
  FITNESS_SPOTIFY_CLUB_SETUP_COMMAND_NAME,
  FITNESS_SPOTIFY_COMMAND_NAME,
  FITNESS_SPOTIFY_CONNECT_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_CONTROLS_OPEN_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_APPROVAL_MODE_TOGGLE_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_DISCONNECT_AUTH_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_CONNECT_SUBCOMMAND_NAME,
  FITNESS_SPOTIFY_DEVICE_CHECK_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_DISCONNECT_SUBCOMMAND_NAME,
  FITNESS_SPOTIFY_JOIN_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_LEAVE_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_QUEUE_PENDING_VIEW_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_QUEUE_PENDING_APPROVE_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_QUEUE_PENDING_REJECT_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_QUEUE_SUGGEST_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_QUEUE_SEARCH_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_QUEUE_SEARCH_MODAL_CUSTOM_ID,
  FITNESS_SPOTIFY_QUEUE_SEARCH_SELECT_CUSTOM_ID,
  FITNESS_SPOTIFY_QUEUE_SUGGEST_MODAL_CUSTOM_ID,
  FITNESS_SPOTIFY_QUEUE_VIEW_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_ROOM_CLOSE_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_ROOM_OPEN_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_MIRROR_REFRESH_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_MIRROR_TOGGLE_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_SEARCH_QUERY_INPUT_CUSTOM_ID,
  FITNESS_SPOTIFY_START_QUEUE_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_STATUS_BUTTON_CUSTOM_ID,
  FITNESS_SPOTIFY_STATUS_SUBCOMMAND_NAME,
  FITNESS_SPOTIFY_TRACK_INPUT_CUSTOM_ID,
  FITNESS_WARNINGS_COMMAND_NAME,
  FITNESS_WARN_COMMAND_NAME,
  FITNESS_UPDATE_PUBLISH_MODAL_CUSTOM_ID_PREFIX,
  FITNESS_UPDATE_SKIP_COMMAND_NAME,
  FITNESS_UPDATE_SKIP_REASON_OPTION_NAME,
  FITNESS_UPDATE_TITLE_INPUT_CUSTOM_ID,
  FITNESS_UPDATE_WHAT_CHANGED_INPUT_CUSTOM_ID,
  FITNESS_UPDATE_WHY_IT_MATTERS_INPUT_CUSTOM_ID,
  extractDiscordFeedbackManageEditReportId,
  extractDiscordFeedbackManageWithdrawReportId,
  extractDiscordFeedbackUpdatePickerReportId,
  extractDiscordFeedbackUpdateReportIdFromModalCustomId,
  extractDiscordFeedbackWithdrawSelectedReportId,
  extractDiscordUpdateDraftIdFromPublishModalCustomId,
  resolveDiscordFeedbackReportTypeFromModalCustomId,
  DISCORD_INTERACTION_TYPE,
  FITNESS_FEEDBACK_MANAGE_CANCEL_BUTTON_CUSTOM_ID,
  FITNESS_VERIFY_BUTTON_CUSTOM_ID,
  FITNESS_VERIFY_CLEANUP_COMMAND_NAME,
  FITNESS_VERIFY_COMMAND_NAME,
  FITNESS_VERIFY_LOCKDOWN_COMMAND_NAME,
  FITNESS_VERIFY_MODAL_CUSTOM_ID,
  extractDiscordCommandIntegerOption,
  extractDiscordCommandSubcommand,
  extractDiscordCommandStringOption,
  extractDiscordCommandUserOption,
  extractDiscordModalFileUploadIds,
  extractDiscordModalStringSelectValue,
  extractDiscordModalTextInputValue,
} from "@/lib/discord/interactions";
import {
  createDiscordModerationWarning,
  ensureDiscordPurgatoryInfrastructure,
  formatDiscordModerationCaseShortId,
  getDiscordModerationLogSummary,
  getDiscordWarningsSummary,
  moveDiscordUserToPurgatory,
  parseDiscordModerationDuration,
  parseDiscordModerationWarningSeverity,
  releaseDiscordPurgatoryCase,
  resolveDiscordModerationWarningCase,
} from "@/lib/discord/moderation";
import {
  addDiscordGuildMemberRole,
  createDiscordRole,
  createDiscordGuildChannel,
  createDiscordChannelMessage,
  createDiscordForumThreadWithMessage,
  createDiscordInteractionFollowupMessage,
  createDiscordMessageReaction,
  deleteDiscordChannelMessage,
  deleteDiscordChannel,
  deferDiscordInteractionEphemeral,
  editDiscordOriginalInteractionResponse,
  fetchDiscordChannel,
  fetchDiscordChannelArchivedPrivateThreads,
  fetchDiscordChannelArchivedPublicThreads,
  fetchDiscordGuildChannels,
  fetchDiscordGuildMember,
  fetchDiscordGuildRoles,
  fetchDiscordChannelMessages,
  fetchDiscordGuildActiveThreads,
  patchDiscordChannelMessage,
  resolveDiscordForumTagIdsByName,
  removeDiscordGuildMemberRole,
  updateDiscordChannel,
  updateDiscordChannelPermissionOverwrite,
  updateDiscordForumThreadArchiveState,
  updateDiscordForumThreadTags,
  updateDiscordForumThreadTitle,
  updateDiscordGuildMemberNickname,
} from "@/lib/discord/rest";
import { buildSpotifyAuthorizationUrl, buildSpotifyOAuthStartUrl } from "@/lib/spotify/oauth";
import {
  buildDiscordSpotifyLobbyStatusSummary,
  closeDiscordSpotifyLobby,
  formatDiscordSpotifyLobbyStatusLabel,
  getLatestDiscordSpotifyLobby,
  openDiscordSpotifyLobby,
  updateDiscordSpotifyLobbySettings,
  upsertDiscordSpotifyLobbyPanel,
  type DiscordSpotifyApprovalMode,
} from "@/lib/spotify/lobbies";
import {
  countJoinedDiscordSpotifyRoomMembers,
  getDiscordSpotifyRoomMember,
  joinDiscordSpotifyRoom,
  leaveAllJoinedDiscordSpotifyRoomMembers,
  leaveDiscordSpotifyRoom,
} from "@/lib/spotify/room-members";
import {
  formatSearchResultsForDiscord,
  searchSpotifyTracks,
} from "@/lib/spotify/search";
import {
  buildSpotifyMissingPlaybackPermissionsCopy,
  buildSpotifyNoActiveDeviceCopy,
  buildSpotifyPlaybackReadyCopy,
  buildSpotifyStatusCopy,
  disconnectDiscordSpotifyConnection,
  getDiscordSpotifyConnection,
  hasSpotifyPlaybackScopes,
} from "@/lib/spotify/tokens";
import {
  approveDiscordSpotifyQueueItem,
  buildDiscordSpotifyQueueActionSummary,
  buildDiscordSpotifyQueuePreviewLines,
  buildDiscordSpotifyQueueSummaryTextForViewer,
  clearActiveDiscordSpotifyQueueItems,
  formatQueueTrackLabel,
  getRecentDiscordSpotifyQueueHistory,
  getCurrentDiscordSpotifyLobbyForQueue,
  getDiscordSpotifyQueueSummary,
  markDiscordSpotifyQueueItemPlaying,
  rejectDiscordSpotifyQueueItem,
  removeDiscordSpotifyQueueItem,
  suggestDiscordSpotifyQueueItem,
} from "@/lib/spotify/queue";
import { syncSpotifyMirrorForLobby } from "@/lib/spotify/mirror";
import {
  buildSpotifyPlayerAccessToken,
  getActiveSpotifyDevice,
  getAvailableSpotifyDevices,
  startSpotifyPlaybackOnDevice,
  SpotifyPlayerApiError,
} from "@/lib/spotify/player";
import {
  validateDiscordFeedbackEmojis,
} from "@/lib/discord/feedback-emojis";
import { buildDiscordServerInventorySummary } from "@/lib/discord/server-inventory";
import {
  buildDiscordUpdateLatestSummary,
  findDiscordUpdateDraftByIdOrPrefix,
  formatDiscordUpdateDraftShortId,
  listLatestDiscordUpdateDrafts,
  publishDiscordUpdateDraft,
  skipDiscordUpdateDraft,
} from "@/lib/discord/update-drafts";
import { upsertDiscordMemberLink } from "@/lib/discord/member-links";
import {
  formatDiscordMemberNickname,
  shouldDisplayDiscordMemberNumber,
} from "@/lib/discord/member-number";
import { consumeDiscordVerificationTokenForDiscordUser } from "@/lib/discord/verification-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
};

const DISCORD_FEEDBACK_ALLOWED_ATTACHMENT_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const DISCORD_FEEDBACK_MAX_ATTACHMENT_COUNT = 3;
const DISCORD_FEEDBACK_MAX_ATTACHMENT_SIZE_BYTES = 8 * 1024 * 1024;
const DISCORD_FEEDBACK_LAUNCHER_CHANNEL_NAME = "submit-feedback";
const DISCORD_FEEDBACK_LAUNCHER_CHANNEL_TOPIC = "Start here to submit or manage Fawxzzy Fitness feedback cards.";
const DISCORD_COMMANDER_ROLE_NAME = "Fawxzzy Commander";
const DISCORD_MESSAGE_COMMAND_FEEDBACK_SETUP_TRIGGERS = [
  "bot feedback setup",
  "bot setup feedback",
];
const DISCORD_MESSAGE_COMMAND_POLL_LIMIT = 25;
const DISCORD_MESSAGE_COMMAND_MAX_PER_RUN = 3;
const DISCORD_MESSAGE_COMMAND_SUCCESS_REACTION = "\u2705";
const DISCORD_MESSAGE_COMMAND_WARNING_REACTION = "\u26a0\ufe0f";
const DISCORD_MESSAGE_COMMAND_FORBIDDEN_REACTION = "\ud83d\udeab";
const DISCORD_MESSAGE_COMMAND_PROCESSED_REACTIONS = new Set([
  DISCORD_MESSAGE_COMMAND_SUCCESS_REACTION,
  DISCORD_MESSAGE_COMMAND_WARNING_REACTION,
  DISCORD_MESSAGE_COMMAND_FORBIDDEN_REACTION,
]);
const SPOTIFY_START_QUEUE_URI_LIMIT = 50;

type DiscordInteraction = {
  id?: unknown;
  application_id?: unknown;
  token?: unknown;
  type?: unknown;
  guild_id?: unknown;
  message?: {
    id?: unknown;
    flags?: unknown;
  } | null;
  member?: {
    permissions?: unknown;
    nick?: unknown;
    user?: {
      id?: unknown;
      username?: unknown;
      global_name?: unknown;
    };
  } | null;
  user?: {
    id?: unknown;
    username?: unknown;
    global_name?: unknown;
  } | null;
  data?: {
    name?: unknown;
    custom_id?: unknown;
    values?: unknown;
    components?: unknown;
    options?: unknown;
    resolved?: {
      attachments?: Record<string, {
        id?: unknown;
        filename?: unknown;
        content_type?: unknown;
        size?: unknown;
        url?: unknown;
        proxy_url?: unknown;
      }>;
    } | null;
  } | null;
};

type DiscordMessageCommand = {
  id?: unknown;
  content?: unknown;
  author?: {
    id?: unknown;
    bot?: unknown;
  };
  member?: {
    roles?: unknown;
  };
  reactions?: unknown;
};

function jsonResponse(body: Record<string, unknown>, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

function resolveDiscordInteractionUser(interaction: DiscordInteraction): {
  id: string | null;
  username: string | null;
  globalName: string | null;
  currentDisplayName: string | null;
} {
  const memberUser = interaction.member?.user;
  const directUser = interaction.user;
  const idCandidate = memberUser?.id ?? directUser?.id;
  const usernameCandidate = memberUser?.username ?? directUser?.username;
  const globalNameCandidate = memberUser?.global_name ?? directUser?.global_name;
  const displayNameCandidate = interaction.member?.nick ?? globalNameCandidate ?? usernameCandidate;

  return {
    id: typeof idCandidate === "string" ? idCandidate : null,
    username: typeof usernameCandidate === "string" ? usernameCandidate : null,
    globalName: typeof globalNameCandidate === "string" ? globalNameCandidate : null,
    currentDisplayName: typeof displayNameCandidate === "string" ? displayNameCandidate : null,
  };
}

function interactionMatchesGuild(interaction: DiscordInteraction): boolean {
  return typeof interaction.guild_id === "string" && interaction.guild_id === DISCORD_GUILD_ID();
}

async function buildSpotifyConnectResponse(discordUserId: string) {
  try {
    return buildDiscordEphemeralMessageResponseWithComponents({
      ...buildSpotifyConnectActionBody(discordUserId),
    });
  } catch (error) {
    console.error("[discord-interactions] spotify-connect-button failed", {
      requestId: randomUUID(),
      discordUserId,
      error: error instanceof Error ? error.message : String(error),
    });

    try {
      const { authorizationUrl } = buildSpotifyAuthorizationUrl(discordUserId, {
        includeLiveQueueScopes: true,
      });
      return buildDiscordEphemeralMessageResponse(
        `Spotify could not render the authorize button. Open this fallback link, then return here and press Refresh Spotify Status:\n${authorizationUrl}`,
      );
    } catch (fallbackError) {
      console.error("[discord-interactions] spotify-connect-button fallback failed", {
        requestId: randomUUID(),
        discordUserId,
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
    }

    return buildDiscordEphemeralMessageResponse("Spotify could not generate a connect link right now. Try again in a moment.");
  }
}

function buildSpotifyConnectActionBody(discordUserId: string, args?: {
  authorizeLabel?: string;
  copy?: string[];
}) {
  const authorizationUrl = buildSpotifyOAuthStartUrl(discordUserId, {
    includeLiveQueueScopes: true,
  });

  return {
    content: (args?.copy ?? [
      "After authorizing, return here and press Refresh Spotify Status.",
      "If Discord has not updated yet, open Spotify Club Controls again.",
    ]).join("\n"),
    components: [
      {
        type: 1 as const,
        components: [
          {
            type: 2 as const,
            style: 5 as const,
            label: args?.authorizeLabel ?? "Authorize Spotify",
            url: authorizationUrl,
          },
          {
            type: 2 as const,
            style: 2 as const,
            custom_id: FITNESS_SPOTIFY_STATUS_BUTTON_CUSTOM_ID,
            label: "Refresh Spotify Status",
          },
        ],
      },
    ],
  };
}

async function buildSpotifyPlaybackUpgradeResponse(discordUserId: string) {
  try {
    const { authorizationUrl } = buildSpotifyAuthorizationUrl(discordUserId, {
      includeLiveQueueScopes: true,
    });

    return buildDiscordEphemeralMessageResponse(
      `${buildSpotifyMissingPlaybackPermissionsCopy()}\n${authorizationUrl}`,
    );
  } catch (error) {
    console.error("[discord-interactions] spotify-playback-upgrade failed", {
      requestId: randomUUID(),
      discordUserId,
      error: error instanceof Error ? error.message : String(error),
    });

    return buildDiscordEphemeralMessageResponse("Spotify could not generate a playback-upgrade link right now. Try again in a moment.");
  }
}

async function buildSpotifyPlaybackUpgradeMessage(discordUserId: string): Promise<string> {
  const response = await buildSpotifyPlaybackUpgradeResponse(discordUserId);
  return typeof response.data?.content === "string"
    ? response.data.content
    : buildSpotifyMissingPlaybackPermissionsCopy();
}

function resolveSpotifyPlayerErrorMessage(error: unknown): string {
  if (error instanceof SpotifyPlayerApiError) {
    return error.message;
  }

  return "Spotify playback readiness could not be checked right now. Try again in a moment.";
}

async function resolveSpotifyPlaybackReadiness(args: {
  discordUserId: string;
  includeUpgradeLink?: boolean;
}): Promise<{
  ready: boolean;
  content: string;
  connection: Awaited<ReturnType<typeof getDiscordSpotifyConnection>>;
  activeDeviceId: string | null;
  activeDeviceName: string | null;
  accessToken: string | null;
}> {
  const connection = await getDiscordSpotifyConnection(args.discordUserId);
  if (!connection) {
    return {
      ready: false,
      content: buildSpotifyStatusCopy(null),
      connection: null,
      activeDeviceId: null,
      activeDeviceName: null,
      accessToken: null,
    };
  }

  if (!connection.is_premium) {
    return {
      ready: false,
      content: buildSpotifyStatusCopy(connection),
      connection,
      activeDeviceId: null,
      activeDeviceName: null,
      accessToken: null,
    };
  }

  if (!hasSpotifyPlaybackScopes(connection.scopes)) {
    return {
      ready: false,
      content: args.includeUpgradeLink
        ? await buildSpotifyPlaybackUpgradeMessage(args.discordUserId)
        : buildSpotifyMissingPlaybackPermissionsCopy(),
      connection,
      activeDeviceId: null,
      activeDeviceName: null,
      accessToken: null,
    };
  }

  try {
    const accessToken = await buildSpotifyPlayerAccessToken(connection);
    const devices = await getAvailableSpotifyDevices(connection, accessToken);
    const activeDevice = getActiveSpotifyDevice(devices);

    if (!activeDevice?.id) {
      return {
        ready: false,
        content: `Spotify connected. Premium verified. ${buildSpotifyNoActiveDeviceCopy()}`,
        connection,
        activeDeviceId: null,
        activeDeviceName: null,
        accessToken,
      };
    }

    return {
      ready: true,
      content: buildSpotifyPlaybackReadyCopy(activeDevice.name),
      connection,
      activeDeviceId: activeDevice.id,
      activeDeviceName: activeDevice.name,
      accessToken,
    };
  } catch (error) {
    if (
      error instanceof SpotifyPlayerApiError
      && error.code === "SPOTIFY_RECONNECT_REQUIRED"
      && args.includeUpgradeLink
    ) {
      return {
        ready: false,
        content: await buildSpotifyPlaybackUpgradeMessage(args.discordUserId),
        connection,
        activeDeviceId: null,
        activeDeviceName: null,
        accessToken: null,
      };
    }

    return {
      ready: false,
      content: resolveSpotifyPlayerErrorMessage(error),
      connection,
      activeDeviceId: null,
      activeDeviceName: null,
      accessToken: null,
    };
  }
}

async function buildSpotifyStatusResponse(discordUserId: string) {
  try {
    return buildDiscordEphemeralMessageResponse(
      (await resolveSpotifyPlaybackReadiness({
        discordUserId,
        includeUpgradeLink: true,
      })).content,
    );
  } catch (error) {
    console.error("[discord-interactions] spotify-status failed", {
      requestId: randomUUID(),
      discordUserId,
      error: error instanceof Error ? error.message : String(error),
    });

    return buildDiscordEphemeralMessageResponse("Spotify status could not be loaded right now. Try again in a moment.");
  }
}

async function buildSpotifyStartQueueResponse(discordUserId: string): Promise<string> {
  const readiness = await resolveSpotifyPlaybackReadiness({
    discordUserId,
    includeUpgradeLink: true,
  });

  if (!readiness.ready || !readiness.connection || !readiness.activeDeviceId || !readiness.accessToken) {
    return readiness.content;
  }

  const openLobby = await getCurrentDiscordSpotifyLobbyForQueue();
  if (!openLobby) {
    return "Spotify Club lobby is Closed. Open a lobby before starting playback.";
  }

  const queueSummary = await getDiscordSpotifyQueueSummary({
    lobbyId: openLobby.id,
  });
  const roomQueueItems = queueSummary.roomQueueItems.slice(0, SPOTIFY_START_QUEUE_URI_LIMIT);
  const fallbackSpotifyUpNextItems = roomQueueItems.length === 0
    ? queueSummary.spotifyUpNextItems.slice(0, SPOTIFY_START_QUEUE_URI_LIMIT)
    : [];
  const approvedQueueItems = roomQueueItems.length > 0 ? roomQueueItems : fallbackSpotifyUpNextItems;
  const nextApprovedItem = approvedQueueItems[0];
  if (!nextApprovedItem) {
    return "No Room Queue tracks are queued yet.";
  }

  await startSpotifyPlaybackOnDevice({
    connection: readiness.connection,
    deviceId: readiness.activeDeviceId,
    spotifyUris: approvedQueueItems.map((item) => item.spotify_uri),
    accessToken: readiness.accessToken,
  });

  await markDiscordSpotifyQueueItemPlaying({
    lobbyId: openLobby.id,
    queueItemId: nextApprovedItem.id,
  });
  await syncDiscordSpotifyClubPanelFromState().catch(() => ({ ok: false as const }));

  const queueLabel = roomQueueItems.length > 0 ? "Room Queue" : "Spotify Up Next mirror";
  const sourceCount = roomQueueItems.length > 0
    ? queueSummary.roomQueueItems.length
    : queueSummary.spotifyUpNextItems.length;
  const cappedSuffix = sourceCount > approvedQueueItems.length
    ? ` Spotify received the first ${approvedQueueItems.length} tracks; keep the room queue open for the rest.`
    : "";

  return `Starting ${approvedQueueItems.length} ${queueLabel} track${approvedQueueItems.length === 1 ? "" : "s"} on your active Spotify device.${cappedSuffix}`;
}

async function buildSpotifyDisconnectResponse(discordUserId: string) {
  try {
    const openLobby = await getCurrentDiscordSpotifyLobbyForQueue();
    if (openLobby) {
      try {
        if (openLobby.host_discord_user_id === discordUserId) {
          await clearActiveDiscordSpotifyQueueItems({
            lobbyId: openLobby.id,
            reason: "host_disconnect",
          });
        }
        await leaveDiscordSpotifyRoom({
          lobbyId: openLobby.id,
          discordUserId,
        });
      } catch (error) {
        console.warn("[discord-interactions] spotify leave-room during disconnect skipped", {
          requestId: randomUUID(),
          lobbyId: openLobby.id,
          discordUserId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    await disconnectDiscordSpotifyConnection(discordUserId);
    await syncDiscordSpotifyClubPanelFromState().catch((error) => {
      console.warn("[discord-interactions] spotify disconnect panel sync skipped", {
        requestId: randomUUID(),
        discordUserId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { ok: false as const };
    });
    return buildDiscordEphemeralMessageResponse("Spotify disconnected.");
  } catch (error) {
    console.error("[discord-interactions] spotify-disconnect failed", {
      requestId: randomUUID(),
      discordUserId,
      error: error instanceof Error ? error.message : String(error),
    });

    return buildDiscordEphemeralMessageResponse("Spotify could not be disconnected right now. Try again in a moment.");
  }
}

async function getSpotifyClubRoomContext() {
  const lobby = await getLatestDiscordSpotifyLobby();
  if (lobby?.status === "open" && lobby.spotify_mirror_enabled) {
    await syncSpotifyMirrorForLobby(lobby).catch((error) => {
      console.warn("[discord-interactions] spotify mirror context sync skipped", {
        requestId: randomUUID(),
        lobbyId: lobby.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    });
  }
  const queueSummary = lobby
    ? await getDiscordSpotifyQueueSummary({ lobbyId: lobby.id })
    : { roomQueueItems: [], spotifyUpNextItems: [], approvedItems: [], pendingItems: [], recentItems: [] };
  let joinedMemberCount = 0;
  if (lobby) {
    try {
      joinedMemberCount = await countJoinedDiscordSpotifyRoomMembers({ lobbyId: lobby.id });
    } catch (error) {
      console.warn("[discord-interactions] spotify room member count unavailable", {
        requestId: randomUUID(),
        lobbyId: lobby.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    lobby,
    queueSummary,
    joinedMemberCount,
  };
}

async function closeSpotifyRoomWithCleanup() {
  const openLobby = await getCurrentDiscordSpotifyLobbyForQueue();
  if (openLobby) {
    await clearActiveDiscordSpotifyQueueItems({
      lobbyId: openLobby.id,
      reason: "room_closed",
    });
    await leaveAllJoinedDiscordSpotifyRoomMembers({
      lobbyId: openLobby.id,
    });
  }

  return closeDiscordSpotifyLobby();
}

async function syncSpotifyMirrorIfEnabled(lobby: Awaited<ReturnType<typeof getLatestDiscordSpotifyLobby>>) {
  if (!lobby || lobby.status !== "open" || !lobby.spotify_mirror_enabled) {
    return null;
  }

  return syncSpotifyMirrorForLobby(lobby);
}

async function getCurrentDiscordSpotifyRoomMembership(args: {
  lobbyId: string;
  discordUserId: string;
}) {
  try {
    const membership = await getDiscordSpotifyRoomMember(args);
    return membership?.status === "joined" ? membership : null;
  } catch (error) {
    console.warn("[discord-interactions] spotify room membership unavailable, using implicit main-room access", {
      requestId: randomUUID(),
      lobbyId: args.lobbyId,
      discordUserId: args.discordUserId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      id: `implicit:${args.lobbyId}:${args.discordUserId}`,
      lobby_id: args.lobbyId,
      discord_user_id: args.discordUserId,
      spotify_user_id: null,
      status: "joined" as const,
      joined_at: new Date().toISOString(),
      left_at: null,
      last_seen_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

function buildSpotifyControlHubStatusLine(connection: Awaited<ReturnType<typeof getDiscordSpotifyConnection>>): string {
  if (!connection) {
    return "Spotify: Not connected yet.";
  }

  if (!connection.is_premium) {
    return "Spotify: Connected, but this account is not Premium.";
  }

  if (!hasSpotifyPlaybackScopes(connection.scopes)) {
    return "Spotify: Jam Ready. Upgrade Spotify access for live queue and playback handoff.";
  }

  return "Spotify: Jam Ready. Check your playback device before starting the queue on Spotify.";
}

type SpotifyControlHubState = {
  lobby: Awaited<ReturnType<typeof getLatestDiscordSpotifyLobby>>;
  openLobby: Awaited<ReturnType<typeof getLatestDiscordSpotifyLobby>>;
  queueSummary: Awaited<ReturnType<typeof getDiscordSpotifyQueueSummary>>;
  recentHistory: Awaited<ReturnType<typeof getRecentDiscordSpotifyQueueHistory>>;
  joinedMemberCount: number;
  connection: Awaited<ReturnType<typeof getDiscordSpotifyConnection>>;
  membership: Awaited<ReturnType<typeof getCurrentDiscordSpotifyRoomMembership>>;
  canManageRoom: boolean;
};

async function loadSpotifyControlHubState(args: {
  discordUserId: string;
  permissions: string | null;
}): Promise<SpotifyControlHubState> {
  const { lobby, queueSummary, joinedMemberCount } = await getSpotifyClubRoomContext();
  const openLobby = lobby?.status === "open" ? lobby : null;
  const recentHistory = lobby
    ? await getRecentDiscordSpotifyQueueHistory({ lobbyId: lobby.id, limit: 3 })
    : [];
  const connection = await getDiscordSpotifyConnection(args.discordUserId);
  const membership = openLobby
    ? await getCurrentDiscordSpotifyRoomMembership({
      lobbyId: openLobby.id,
      discordUserId: args.discordUserId,
    })
    : null;

  return {
    lobby,
    openLobby,
    queueSummary,
    recentHistory,
    joinedMemberCount,
    connection,
    membership,
    canManageRoom: spotifyQueueManagementAllowed({
      permissions: args.permissions,
      discordUserId: args.discordUserId,
      lobbyHostDiscordUserId: openLobby?.host_discord_user_id,
    }),
  };
}

function buildSpotifyControlHubMessageBody(args: {
  state: SpotifyControlHubState;
  notice?: string | null;
}) {
  const roomName = args.state.lobby?.room_name?.trim() || "Main Room";
  const roomVisibility = args.state.lobby?.visibility === "private" ? "Private" : "Public";
  const membershipLabel = args.state.membership ? "Joined" : "Not joined";
  const approvedQueueCount = args.state.queueSummary.roomQueueItems.length;
  const pendingQueueCount = args.state.queueSummary.pendingItems.length;
  const approvalModeLabel = args.state.lobby?.approval_mode === "review"
    ? "Review"
    : args.state.lobby?.approval_mode === "host_only"
      ? "Host Only"
      : "Auto for Jam Ready";
  const mirrorLabel = args.state.lobby?.spotify_mirror_enabled
    ? `On / ${args.state.queueSummary.spotifyUpNextItems.length} Spotify Up Next`
    : "Off";
  const playbackReady = Boolean(args.state.connection?.is_premium && hasSpotifyPlaybackScopes(args.state.connection.scopes));
  const spotifyLabel = !args.state.connection
    ? "Not connected"
    : !args.state.connection.is_premium
      ? "Connected / Not Premium"
      : playbackReady
        ? "Playback Ready"
        : "Jam Ready";
  const historyLine = args.state.recentHistory.length > 0
    ? `Recent: ${args.state.recentHistory.slice(0, 2).map((item) => formatQueueTrackLabel(item)).join(" / ")}`
    : "Recent: none";

  return [
    "**Spotify Club Controls**",
    ...(args.notice?.trim() ? [args.notice.trim(), ""] : []),
    `Room: **${roomName}** (${roomVisibility})`,
    `Status: **${formatDiscordSpotifyLobbyStatusLabel(args.state.lobby)}**${args.state.openLobby?.host_discord_user_id ? ` / Host: <@${args.state.openLobby.host_discord_user_id}>` : ""}`,
    `Membership: ${membershipLabel}`,
    `Spotify: ${spotifyLabel}`,
    `Room Queue: ${approvedQueueCount} active / ${pendingQueueCount} pending`,
    `Mirror: ${mirrorLabel}${args.state.lobby?.spotify_mirror_last_synced_at ? ` / ${args.state.lobby.spotify_mirror_last_synced_at}` : ""}`,
    `Members: ${args.state.joinedMemberCount}`,
    historyLine,
    "",
    args.state.canManageRoom ? `Approval: ${approvalModeLabel}` : null,
    "Detailed queue, Spotify Up Next, and history live in View Queue. Music stays inside Spotify.",
  ].filter((line): line is string => typeof line === "string").join("\n");
}

function buildSpotifyControlHubComponents(args: {
  state: SpotifyControlHubState;
}) {
  const connected = Boolean(args.state.connection);
  const joined = Boolean(args.state.membership);
  const roomOpen = Boolean(args.state.openLobby);
  const hasStartableQueue = args.state.queueSummary.roomQueueItems.length > 0
    || args.state.queueSummary.spotifyUpNextItems.length > 0;
  const reviewMode = args.state.lobby?.approval_mode === "review";
  const hostOnlyMode = args.state.lobby?.approval_mode === "host_only";
  const components: Array<{
    type: 1;
    components: Array<{
      type: 2;
      style: 1 | 2 | 4;
      custom_id: string;
      label: string;
      disabled?: boolean;
    }>;
  }> = [];

  if (!connected) {
    components.push({
      type: 1,
      components: [
        {
          type: 2,
          style: 1,
          custom_id: FITNESS_SPOTIFY_CONNECT_BUTTON_CUSTOM_ID,
          label: "Connect Spotify",
        },
        {
          type: 2,
          style: 2,
          custom_id: FITNESS_SPOTIFY_STATUS_BUTTON_CUSTOM_ID,
          label: "Refresh Spotify Status",
        },
      ],
    });
  } else if (!joined) {
    const row = [];
    if (roomOpen) {
      row.push({
        type: 2 as const,
        style: 1 as const,
        custom_id: FITNESS_SPOTIFY_JOIN_BUTTON_CUSTOM_ID,
        label: "Join Spotify Club",
      });
    }
    row.push({
      type: 2 as const,
      style: 4 as const,
      custom_id: FITNESS_SPOTIFY_DISCONNECT_AUTH_BUTTON_CUSTOM_ID,
      label: "Disconnect Spotify Auth",
    });
    components.push({
      type: 1,
      components: row,
    });
  } else {
    components.push({
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          custom_id: FITNESS_SPOTIFY_QUEUE_SEARCH_BUTTON_CUSTOM_ID,
          label: "Search Track",
        },
        {
          type: 2,
          style: 2,
          custom_id: FITNESS_SPOTIFY_QUEUE_SUGGEST_BUTTON_CUSTOM_ID,
          label: reviewMode ? "Suggest Track" : hostOnlyMode ? "Host Add" : "Paste Spotify Link",
        },
        {
          type: 2,
          style: 2,
          custom_id: FITNESS_SPOTIFY_QUEUE_VIEW_BUTTON_CUSTOM_ID,
          label: "View Queue",
        },
      ],
    });
    components.push({
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          custom_id: FITNESS_SPOTIFY_START_QUEUE_BUTTON_CUSTOM_ID,
          label: "Start Queue on Spotify",
          disabled: !roomOpen || !hasStartableQueue,
        },
        {
          type: 2,
          style: 2,
          custom_id: FITNESS_SPOTIFY_STATUS_BUTTON_CUSTOM_ID,
          label: "Refresh Spotify Status",
        },
      ],
    });
    components.push({
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          custom_id: FITNESS_SPOTIFY_LEAVE_BUTTON_CUSTOM_ID,
          label: "Leave Jam",
        },
        {
          type: 2,
          style: 4,
          custom_id: FITNESS_SPOTIFY_DISCONNECT_AUTH_BUTTON_CUSTOM_ID,
          label: "Disconnect Spotify Auth",
        },
      ],
    });
  }

  if (args.state.canManageRoom) {
    const roomButtons = [];
    if (!roomOpen) {
      roomButtons.push({
        type: 2 as const,
        style: 1 as const,
        custom_id: FITNESS_SPOTIFY_ROOM_OPEN_BUTTON_CUSTOM_ID,
        label: "Open Room",
      });
    } else {
      roomButtons.push({
        type: 2 as const,
        style: 4 as const,
        custom_id: FITNESS_SPOTIFY_ROOM_CLOSE_BUTTON_CUSTOM_ID,
        label: "Close Room",
      });
    }
    components.push({
      type: 1,
      components: roomButtons,
    });
    if (roomOpen) {
      components.push({
        type: 1,
        components: [
          {
            type: 2,
            style: 2,
            custom_id: FITNESS_SPOTIFY_APPROVAL_MODE_TOGGLE_BUTTON_CUSTOM_ID,
            label: reviewMode ? "Use Host Only" : hostOnlyMode ? "Use Auto Adds" : "Use Review Mode",
          },
          {
            type: 2,
            style: 2,
            custom_id: FITNESS_SPOTIFY_MIRROR_REFRESH_BUTTON_CUSTOM_ID,
            label: "Refresh Spotify Up Next",
          },
        ],
      });
    }
    if (roomOpen && reviewMode) {
      components.push({
        type: 1,
        components: [
          {
            type: 2,
            style: 2,
            custom_id: FITNESS_SPOTIFY_QUEUE_PENDING_VIEW_BUTTON_CUSTOM_ID,
            label: "View Pending Suggestions",
          },
          ...(args.state.queueSummary.pendingItems.length > 0
            ? [
              {
                type: 2 as const,
                style: 1 as const,
                custom_id: FITNESS_SPOTIFY_QUEUE_PENDING_APPROVE_BUTTON_CUSTOM_ID,
                label: "Approve Next",
              },
              {
                type: 2 as const,
                style: 4 as const,
                custom_id: FITNESS_SPOTIFY_QUEUE_PENDING_REJECT_BUTTON_CUSTOM_ID,
                label: "Reject Next",
              },
            ]
            : []),
        ],
      });
    }
  }

  return components;
}

function buildSpotifyControlHubResponse(args: {
  state: SpotifyControlHubState;
  notice?: string | null;
}) {
  return buildDiscordEphemeralMessageResponseWithComponents({
    content: buildSpotifyControlHubMessageBody(args),
    components: buildSpotifyControlHubComponents({ state: args.state }),
  });
}

function buildSpotifyControlHubEditBody(args: {
  state: SpotifyControlHubState;
  notice?: string | null;
}) {
  return {
    content: buildSpotifyControlHubMessageBody(args),
    components: buildSpotifyControlHubComponents({ state: args.state }),
  };
}

async function buildSpotifyControlHubEditBodyForUser(args: {
  discordUserId: string;
  permissions: string | null;
  notice?: string | null;
}) {
  return buildSpotifyControlHubEditBody({
    state: await loadSpotifyControlHubState({
      discordUserId: args.discordUserId,
      permissions: args.permissions,
    }),
    notice: args.notice,
  });
}

async function buildSpotifyStatusHubEditBodyForUser(args: {
  discordUserId: string;
  permissions: string | null;
}) {
  const connection = await getDiscordSpotifyConnection(args.discordUserId);
  if (!connection) {
    return buildSpotifyConnectActionBody(args.discordUserId);
  }

  if (!connection.is_premium) {
    return buildSpotifyControlHubEditBodyForUser({
      discordUserId: args.discordUserId,
      permissions: args.permissions,
      notice: buildSpotifyStatusCopy(connection),
    });
  }

  if (!hasSpotifyPlaybackScopes(connection.scopes)) {
    return buildSpotifyConnectActionBody(args.discordUserId, {
      authorizeLabel: "Upgrade Spotify Access",
      copy: [
        buildSpotifyStatusCopy(connection),
        "After authorizing, return here and press Refresh Spotify Status.",
      ],
    });
  }

  const readiness = await resolveSpotifyPlaybackReadiness({
    discordUserId: args.discordUserId,
    includeUpgradeLink: false,
  });
  return buildSpotifyControlHubEditBodyForUser({
    discordUserId: args.discordUserId,
    permissions: args.permissions,
    notice: readiness.content,
  });
}

async function buildSpotifyControlHubResponseForUser(args: {
  discordUserId: string;
  permissions: string | null;
  notice?: string | null;
}) {
  return buildSpotifyControlHubResponse({
    state: await loadSpotifyControlHubState({
      discordUserId: args.discordUserId,
      permissions: args.permissions,
    }),
    notice: args.notice,
  });
}

function isEphemeralSpotifyControlHubInteraction(interaction: DiscordInteraction) {
  const flags = typeof interaction.message?.flags === "number"
    ? interaction.message.flags
    : typeof interaction.message?.flags === "string"
      ? Number.parseInt(interaction.message.flags, 10)
      : 0;

  return Number.isFinite(flags) && (flags & DISCORD_MESSAGE_FLAG_EPHEMERAL) === DISCORD_MESSAGE_FLAG_EPHEMERAL;
}

async function handleSpotifyInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This Spotify Club flow is only available in the configured server.");
  }

  const discordUser = resolveDiscordInteractionUser(interaction);
  const discordUserId = discordUser.id;
  const subcommand = extractDiscordCommandSubcommand(interaction.data?.options);

  if (!discordUserId || !subcommand?.name) {
    return buildDiscordEphemeralMessageResponse("Spotify Club could not read that command. Try again.");
  }

  if (subcommand.name === FITNESS_SPOTIFY_CONNECT_SUBCOMMAND_NAME) {
    return buildSpotifyConnectResponse(discordUserId);
  }

  if (subcommand.name === FITNESS_SPOTIFY_STATUS_SUBCOMMAND_NAME) {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-status-command",
      fallback: () => buildSpotifyStatusResponse(discordUserId),
      process: async () => (
        await resolveSpotifyPlaybackReadiness({
          discordUserId,
          includeUpgradeLink: true,
        })
      ).content,
      genericFailureContent: "Spotify status could not be loaded right now. Try again in a moment.",
    });
  }

  if (subcommand.name === FITNESS_SPOTIFY_DISCONNECT_SUBCOMMAND_NAME) {
    return buildSpotifyDisconnectResponse(discordUserId);
  }

  return buildDiscordEphemeralMessageResponse("That Spotify subcommand is not available in this phase yet.");
}

const DISCORD_PERMISSION_MANAGE_ROLES = BigInt(1) << BigInt(28);

function parseDiscordPermissionBitfield(value: string | null | undefined): bigint | null {
  if (!value) {
    return null;
  }

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function getHighestDiscordRolePosition(roleIds: string[] | null | undefined, roles: Array<{ id?: string; position?: number }> | null | undefined) {
  if (!Array.isArray(roleIds) || !Array.isArray(roles)) {
    return null;
  }

  let highest: number | null = null;
  for (const roleId of roleIds) {
    const match = roles.find((role) => role.id === roleId);
    if (!match || typeof match.position !== "number") {
      continue;
    }

    highest = highest === null ? match.position : Math.max(highest, match.position);
  }

  return highest;
}

function botHasDiscordManageRolesPermission(roles: Array<{ id?: string; permissions?: string }> | null | undefined, botRoleIds: string[] | null | undefined) {
  if (!Array.isArray(roles) || !Array.isArray(botRoleIds)) {
    return null;
  }

  for (const roleId of botRoleIds) {
    const role = roles.find((entry) => entry.id === roleId);
    const permissions = parseDiscordPermissionBitfield(role?.permissions ?? null);
    if (permissions === null) {
      continue;
    }

    if (
      (permissions & DISCORD_PERMISSION_ADMINISTRATOR) === DISCORD_PERMISSION_ADMINISTRATOR
      || (permissions & DISCORD_PERMISSION_MANAGE_ROLES) === DISCORD_PERMISSION_MANAGE_ROLES
    ) {
      return true;
    }
  }

  return false;
}

async function diagnoseVerifiedRoleAssignmentFailure(args: {
  targetDiscordUserId: string;
  addRoleResult: { code: string; status: number; message: string | null };
}) {
  const verifiedRoleId = DISCORD_VERIFIED_ROLE_ID();
  const [targetMemberResult, guildRolesResult, botMemberResult] = await Promise.all([
    fetchDiscordGuildMember({
      guildId: DISCORD_GUILD_ID(),
      userId: args.targetDiscordUserId,
    }),
    fetchDiscordGuildRoles({
      guildId: DISCORD_GUILD_ID(),
    }),
    fetchDiscordGuildMember({
      guildId: DISCORD_GUILD_ID(),
      userId: DISCORD_APPLICATION_ID(),
    }),
  ]);
  const targetMemberStatus = targetMemberResult.ok ? 200 : targetMemberResult.status;
  const guildRolesStatus = guildRolesResult.ok ? 200 : guildRolesResult.status;
  const botMemberStatus = botMemberResult.ok ? 200 : botMemberResult.status;

  if (targetMemberResult.ok && Array.isArray(targetMemberResult.member.roles) && targetMemberResult.member.roles.includes(verifiedRoleId)) {
    return {
      alreadyHasRole: true,
      message: null,
      diagnostics: {
        targetMemberStatus,
        guildRolesStatus,
        botMemberStatus,
      },
    };
  }

  if (args.addRoleResult.status === 404 && !targetMemberResult.ok && targetMemberResult.status === 404) {
    return {
      alreadyHasRole: false,
      message: "Fitness verified your token, but Discord could not find your server member record. Leave and rejoin the server, then try Verify again.",
      diagnostics: {
        targetMemberStatus,
        guildRolesStatus,
        botMemberStatus,
      },
    };
  }

  const verifiedRole = guildRolesResult.ok
    ? guildRolesResult.roles.find((role) => role.id === verifiedRoleId)
    : null;
  if (args.addRoleResult.status === 404 && !verifiedRole) {
    return {
      alreadyHasRole: false,
      message: "Fitness verified your token, but Discord could not find the configured Verified role. Ask an admin to run /server-inventory and confirm the Verified role wiring.",
      diagnostics: {
        targetMemberStatus,
        guildRolesStatus,
        botMemberStatus,
      },
    };
  }

  if (guildRolesResult.ok && botMemberResult.ok && verifiedRole) {
    const botHighestRolePosition = getHighestDiscordRolePosition(botMemberResult.member.roles, guildRolesResult.roles);
    const targetHighestRolePosition = getHighestDiscordRolePosition(targetMemberResult.ok ? targetMemberResult.member.roles : null, guildRolesResult.roles);
    const botCanManageRoles = botHasDiscordManageRolesPermission(guildRolesResult.roles, botMemberResult.member.roles);

    if (botCanManageRoles === false) {
      return {
        alreadyHasRole: false,
        message: "Fitness verified your token, but Fawx Security no longer has Manage Roles in Discord. Ask an admin to restore that permission and try again.",
        diagnostics: {
          botHighestRolePosition,
          targetHighestRolePosition,
          verifiedRolePosition: verifiedRole.position ?? null,
          botCanManageRoles,
        },
      };
    }

    if (typeof botHighestRolePosition === "number" && typeof verifiedRole.position === "number" && botHighestRolePosition <= verifiedRole.position) {
      return {
        alreadyHasRole: false,
        message: "Fitness verified your token, but the Fawx Security role is not above Verified in Discord's role list. Move it higher and try again.",
        diagnostics: {
          botHighestRolePosition,
          targetHighestRolePosition,
          verifiedRolePosition: verifiedRole.position,
          botCanManageRoles,
        },
      };
    }

    if (
      typeof botHighestRolePosition === "number"
      && typeof targetHighestRolePosition === "number"
      && targetHighestRolePosition >= botHighestRolePosition
    ) {
      return {
        alreadyHasRole: false,
        message: "Fitness verified your token, but Discord cannot manage one of your current roles yet. Ask an admin to move Fawx Security above your highest server role and try again.",
        diagnostics: {
          botHighestRolePosition,
          targetHighestRolePosition,
          verifiedRolePosition: verifiedRole.position ?? null,
          botCanManageRoles,
        },
      };
    }
  }

  if (args.addRoleResult.status >= 500 || /internal network error/i.test(String(args.addRoleResult.message ?? ""))) {
    return {
      alreadyHasRole: false,
      message: "Fitness verified your token, but Discord had a temporary role-update failure. Try Verify again in a moment.",
      diagnostics: {
        targetMemberStatus,
        guildRolesStatus,
        botMemberStatus,
      },
    };
  }

  return {
    alreadyHasRole: false,
    message: "Fitness verified your token, but Discord rejected the Verified role update. Ask an admin to confirm Fawx Security can manage the Verified role and retry.",
    diagnostics: {
      targetMemberStatus,
      guildRolesStatus,
      botMemberStatus,
    },
  };
}

function shouldArchiveFeedbackThread(status: string): boolean {
  return status === "duplicate" || status === "withdrawn";
}

function isResolvedFeedbackStatus(status: string): boolean {
  return status === "fixed" || status === "closed";
}

function deriveCompletionReviewUpdate(args: {
  previousReport: DiscordBugReportRow;
  nextStatus: DiscordBugReportRow["status"];
}) {
  const currentStatus = args.previousReport.completion_review_status;

  if (requiresDiscordFeedbackCompletionReview(args.previousReport) && isResolvedFeedbackStatus(args.nextStatus)) {
    return {
      completionReviewStatus: "pending" as const,
      completionReviewedAt: null,
      completionReviewedByDiscordUserId: null,
      completionReviewNote: null,
    };
  }

  if (args.nextStatus === "duplicate" || args.nextStatus === "withdrawn" || args.nextStatus === "spam") {
    if (currentStatus === "approved" || currentStatus === "needs_followup") {
      return null;
    }

    return {
      completionReviewStatus: "not_required" as const,
      completionReviewedAt: null,
      completionReviewedByDiscordUserId: null,
      completionReviewNote: null,
    };
  }

  if (!isResolvedFeedbackStatus(args.nextStatus) && currentStatus === "pending") {
    return {
      completionReviewStatus: "not_required" as const,
      completionReviewedAt: null,
      completionReviewedByDiscordUserId: null,
      completionReviewNote: null,
    };
  }

  return null;
}

function canAccessAnyFeedbackReport(permissions: string | null) {
  return discordMemberHasBugStatusPermission(permissions);
}

function isDiscordForumLikeChannel(type: unknown): boolean {
  return type === 15 || type === 16;
}

function isDiscordMissingPermissionsFailure(result: { status?: number; message?: string | null }): boolean {
  return result.status === 403 || /missing permissions/i.test(String(result.message ?? ""));
}

function buildDiscordPanelPermissionFailureResponse() {
  return buildDiscordEphemeralMessageResponse(
    "Discord could not create the feedback launcher. The bot needs View Channel, Read Message History, and Send Messages. Manage Channels may also be required when auto-creating submit-feedback. Embed Links and Use External Emojis are optional.",
  );
}

function buildSpotifyClubPanelPermissionFailureResponse() {
  return buildDiscordEphemeralMessageResponse(
    "Discord could not create the Spotify Club panel. The bot needs View Channel, Read Message History, and Send Messages in the configured Spotify Club channel.",
  );
}

function buildSpotifyClubOutdatedPanelResponse() {
  return buildDiscordEphemeralMessageResponse("This Spotify Club panel is outdated. Ask staff to run /setup-spotify-club.");
}

function buildDiscordFeedbackLookupFailureResponse(code: string) {
  if (code === "DISCORD_BUG_REPORT_AMBIGUOUS_ID") {
    return buildDiscordEphemeralMessageResponse("That report id matched multiple feedback reports. Copy the full Report ID from the forum post.");
  }

  return buildDiscordEphemeralMessageResponse("Could not find that feedback report. Copy the Report ID from the forum post and try again.");
}

function buildNoContentResponse(status = 202) {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": NO_STORE_HEADERS["Cache-Control"],
    },
  });
}

function truncateDiscordSelectText(value: string, maxLength: number) {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

async function ensureFeedbackPanelChannel() {
  const configuredChannelId = DISCORD_FEEDBACK_PANEL_CHANNEL_ID();
  if (configuredChannelId) {
    return {
      ok: true as const,
      channelId: configuredChannelId,
      channelLabel: "configured channel",
    };
  }

  const forumChannelId = DISCORD_BUG_REPORT_FORUM_CHANNEL_ID();
  if (!forumChannelId) {
    return {
      ok: false as const,
      code: "DISCORD_FEEDBACK_PANEL_CHANNEL_NOT_CONFIGURED",
      message: "Missing feedback panel channel and feedback forum channel.",
    };
  }

  const forumResult = await fetchDiscordChannel({ channelId: forumChannelId });
  if (!forumResult.ok) {
    return forumResult;
  }

  const guildChannelsResult = await fetchDiscordGuildChannels({ guildId: DISCORD_GUILD_ID() });
  if (!guildChannelsResult.ok) {
    return guildChannelsResult;
  }

  const existingChannel = guildChannelsResult.channels.find((channel) => (
    channel.type === 0
    && channel.name === DISCORD_FEEDBACK_LAUNCHER_CHANNEL_NAME
    && channel.parent_id === forumResult.channel.parent_id
  ));

  const targetPosition = typeof forumResult.channel.position === "number"
    ? Math.max(0, forumResult.channel.position)
    : undefined;

  if (existingChannel?.id) {
    const shouldRetunePlacement =
      existingChannel.topic !== DISCORD_FEEDBACK_LAUNCHER_CHANNEL_TOPIC
      || existingChannel.parent_id !== forumResult.channel.parent_id
      || (
        typeof targetPosition === "number"
        && typeof existingChannel.position === "number"
        && existingChannel.position !== targetPosition
      );

    if (shouldRetunePlacement) {
      const updateResult = await updateDiscordChannel({
        channelId: existingChannel.id,
        topic: DISCORD_FEEDBACK_LAUNCHER_CHANNEL_TOPIC,
        parentId: forumResult.channel.parent_id ?? null,
        position: targetPosition,
      });

      if (!updateResult.ok) {
        return updateResult;
      }
    }

    return {
      ok: true as const,
      channelId: existingChannel.id,
      channelLabel: `#${DISCORD_FEEDBACK_LAUNCHER_CHANNEL_NAME}`,
    };
  }

  const createResult = await createDiscordGuildChannel({
    guildId: DISCORD_GUILD_ID(),
    name: DISCORD_FEEDBACK_LAUNCHER_CHANNEL_NAME,
    type: 0,
    topic: DISCORD_FEEDBACK_LAUNCHER_CHANNEL_TOPIC,
    parentId: forumResult.channel.parent_id ?? null,
    position: targetPosition,
  });

  if (!createResult.ok) {
    return createResult;
  }

  return {
    ok: true as const,
    channelId: createResult.channel.id,
    channelLabel: `#${DISCORD_FEEDBACK_LAUNCHER_CHANNEL_NAME}`,
  };
}

function ensureSpotifyClubPanelChannel() {
  const channelId = DISCORD_SPOTIFY_CLUB_CHANNEL_ID();
  if (!channelId) {
    return {
      ok: false as const,
      code: "DISCORD_SPOTIFY_CLUB_CHANNEL_NOT_CONFIGURED",
      message: "Spotify Club channel is not configured yet.",
    };
  }

  return {
    ok: true as const,
    channelId,
    channelLabel: `<#${channelId}>`,
  };
}

async function loadRecentFeedbackReportOptions(args: {
  reporterDiscordUserId: string | null;
  includeAllReports?: boolean;
  excludedStatuses?: Array<keyof typeof DISCORD_BUG_REPORT_STATUS_TAG_LABELS>;
}) {
  if (!args.includeAllReports && !args.reporterDiscordUserId) {
    return null;
  }

  const recentReportsResult = await listRecentDiscordFeedbackReports({
    reporterDiscordUserId: args.includeAllReports ? null : args.reporterDiscordUserId,
    excludedStatuses: args.excludedStatuses,
    limit: 25,
  });

  if (!recentReportsResult.ok || recentReportsResult.reports.length === 0) {
    return null;
  }

  return recentReportsResult.reports.map((report) => {
    const typeLabel = DISCORD_BUG_REPORT_TYPE_TAG_LABELS[report.report_type];
    const statusLabel = DISCORD_BUG_REPORT_STATUS_TAG_LABELS[report.status];
    const areaLabel = report.area?.trim() ? report.area.trim() : "No area";

    return {
      label: truncateDiscordSelectText(`${formatDiscordBugReportShortId(report.id)} | ${report.summary}`, 100),
      value: report.id,
      description: truncateDiscordSelectText(`${typeLabel} | ${statusLabel} | ${areaLabel}`, 100),
    };
  });
}

function resolveSelectedFeedbackReportId(args: {
  components: unknown;
  selectCustomId: string;
  textInputCustomId: string;
}) {
  return extractDiscordModalStringSelectValue(args.components, args.selectCustomId)
    ?? extractDiscordModalTextInputValue(args.components, args.textInputCustomId);
}

function extractDiscordComponentSelectValue(values: unknown): string | null {
  return Array.isArray(values) && typeof values[0] === "string"
    ? values[0]
    : null;
}

type DeferredDiscordEphemeralInteractionResult =
  | string
  | {
    content: string;
    components?: unknown[];
  };

function normalizeDeferredDiscordEphemeralInteractionResult(
  result: DeferredDiscordEphemeralInteractionResult,
): { content: string; components?: unknown[] } {
  if (typeof result === "string") {
    return { content: result };
  }

  return {
    content: result.content,
    components: result.components,
  };
}

async function syncDiscordFeedbackStarterMessage(args: {
  report: DiscordBugReportRow;
}) {
  if (!args.report.discord_forum_thread_id || !args.report.discord_forum_message_id) {
    return { ok: true as const };
  }

  const reporterLabel = buildDiscordBugReporterLabel({
    reporterDiscordUsername: args.report.reporter_discord_username,
    reporterMemberNumber: args.report.reporter_member_number,
  });
  const patchStarterMessageResult = await patchDiscordChannelMessage({
    channelId: args.report.discord_forum_thread_id,
    messageId: args.report.discord_forum_message_id,
    body: {
      content: buildDiscordBugForumThreadBody({
        report: args.report,
        reporterLabel,
      }),
      allowed_mentions: buildDiscordAllowedMentions({
        reporterDiscordUserId: args.report.reporter_discord_user_id,
        includeReporter: false,
      }),
    },
  });

  if (patchStarterMessageResult.ok) {
    return { ok: true as const };
  }

  console.error("[discord-interactions] feedback forum starter message patch failed", {
    requestId: randomUUID(),
    reportId: args.report.id,
    code: patchStarterMessageResult.code,
    status: patchStarterMessageResult.status,
    message: patchStarterMessageResult.message,
  });

  return { ok: false as const };
}

async function buildDeferredDiscordEphemeralInteractionResponse(args: {
  interaction: DiscordInteraction;
  actionLabel: string;
  fallback: () => Promise<Record<string, unknown>>;
  process: () => Promise<DeferredDiscordEphemeralInteractionResult>;
  genericFailureContent: string;
}) {
  const interactionId = typeof args.interaction.id === "string" ? args.interaction.id : null;
  const applicationId = typeof args.interaction.application_id === "string" ? args.interaction.application_id : null;
  const interactionToken = typeof args.interaction.token === "string" ? args.interaction.token : null;

  if (!interactionId || !applicationId || !interactionToken) {
    return jsonResponse(await args.fallback());
  }

  const deferResult = await deferDiscordInteractionEphemeral({
    interactionId,
    interactionToken,
  });

  if (!deferResult.ok) {
    console.warn(`[discord-interactions] ${args.actionLabel} defer failed`, {
      requestId: randomUUID(),
      interactionId,
      code: deferResult.code,
      status: deferResult.status,
      message: deferResult.message,
    });
    return jsonResponse(await args.fallback());
  }

  let resultBody = { content: args.genericFailureContent } as { content: string; components?: unknown[] };

  try {
    resultBody = normalizeDeferredDiscordEphemeralInteractionResult(await args.process());
  } catch (error) {
    console.error(`[discord-interactions] deferred ${args.actionLabel} failed`, {
      requestId: randomUUID(),
      interactionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const editResult = await editDiscordOriginalInteractionResponse({
    applicationId,
    interactionToken,
    content: resultBody.content,
    components: resultBody.components,
  });

  if (!editResult.ok) {
    console.error(`[discord-interactions] edit original ${args.actionLabel} interaction failed`, {
      requestId: randomUUID(),
      interactionId,
      code: editResult.code,
      status: editResult.status,
      message: editResult.message,
    });
    const followupResult = await createDiscordInteractionFollowupMessage({
      applicationId,
      interactionToken,
      content: resultBody.content || args.genericFailureContent,
      components: resultBody.components,
      flags: DISCORD_MESSAGE_FLAG_EPHEMERAL,
    });
    if (!followupResult.ok) {
      console.error(`[discord-interactions] followup ${args.actionLabel} interaction failed`, {
        requestId: randomUUID(),
        interactionId,
        code: followupResult.code,
        status: followupResult.status,
        message: followupResult.message,
      });
    }
  }

  return buildNoContentResponse();
}

function coerceDiscordFeedbackAttachmentMetadata(value: unknown): DiscordFeedbackAttachmentMetadata | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== "string"
    || typeof candidate.filename !== "string"
    || typeof candidate.content_type !== "string"
    || typeof candidate.size !== "number"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    filename: candidate.filename.slice(0, 120),
    contentType: candidate.content_type.slice(0, 100),
    size: candidate.size,
    url: typeof candidate.url === "string" ? candidate.url.slice(0, 500) : null,
    proxyUrl: typeof candidate.proxy_url === "string" ? candidate.proxy_url.slice(0, 500) : null,
  };
}

function extractValidatedFeedbackAttachments(interaction: DiscordInteraction): {
  ok: true;
  attachments: DiscordFeedbackAttachmentMetadata[];
} | {
  ok: false;
  message: string;
} {
  const attachmentIds = extractDiscordModalFileUploadIds(
    interaction.data?.components,
    FITNESS_FEEDBACK_ATTACHMENT_INPUT_CUSTOM_ID,
  ).slice(0, DISCORD_FEEDBACK_MAX_ATTACHMENT_COUNT + 1);

  if (attachmentIds.length === 0) {
    return { ok: true, attachments: [] };
  }

  if (attachmentIds.length > DISCORD_FEEDBACK_MAX_ATTACHMENT_COUNT) {
    return {
      ok: false,
      message: "Upload up to 3 PNG, JPG, WEBP, or GIF images under 8 MB each.",
    };
  }

  const resolvedAttachments = interaction.data?.resolved?.attachments ?? {};
  const attachments: DiscordFeedbackAttachmentMetadata[] = [];

  for (const attachmentId of attachmentIds) {
    const attachment = coerceDiscordFeedbackAttachmentMetadata(resolvedAttachments[attachmentId]);
    if (!attachment) {
      return {
        ok: false,
        message: "Upload up to 3 PNG, JPG, WEBP, or GIF images under 8 MB each.",
      };
    }

    if (
      !DISCORD_FEEDBACK_ALLOWED_ATTACHMENT_CONTENT_TYPES.has(attachment.contentType)
      || attachment.size > DISCORD_FEEDBACK_MAX_ATTACHMENT_SIZE_BYTES
    ) {
      return {
        ok: false,
        message: "Upload up to 3 PNG, JPG, WEBP, or GIF images under 8 MB each.",
      };
    }

    attachments.push(attachment);
  }

  return { ok: true, attachments };
}

function logDiscordFeedbackSoftFailure(args: {
  stage: string;
  reportId: string;
  code?: string | null;
  status?: number | null;
  message?: string | null;
  error?: unknown;
}) {
  console.warn("[discord-interactions] feedback optional step failed", {
    requestId: randomUUID(),
    reportId: args.reportId,
    stage: args.stage,
    code: args.code ?? null,
    status: args.status ?? null,
    message: args.message ?? null,
    error: args.error instanceof Error ? args.error.message : args.error ? String(args.error) : null,
  });
}

function appendDiscordFeedbackWarning(baseMessage: string, warning: string | null) {
  if (!warning) {
    return baseMessage;
  }

  return `${baseMessage} Warning: ${warning}`;
}

async function ensureDiscordResolvedFeedbackReaction(args: {
  report: DiscordBugReportRow;
}): Promise<{ warning: string | null }> {
  if (!isResolvedFeedbackStatus(args.report.status) || !requiresDiscordFeedbackCompletionReview(args.report)) {
    return { warning: null };
  }

  if (!args.report.discord_forum_thread_id || !args.report.discord_forum_message_id) {
    logDiscordFeedbackSoftFailure({
      stage: "resolved-reaction-missing-starter",
      reportId: args.report.id,
      message: "Missing forum thread id or starter message id for resolved reaction sync.",
    });
    return {
      warning: "Discord could not verify the resolved checkmark because the public starter post id is missing.",
    };
  }

  const reactionResult = await createDiscordMessageReaction({
    channelId: args.report.discord_forum_thread_id,
    messageId: args.report.discord_forum_message_id,
    emoji: "✅",
  });

  if (reactionResult.ok) {
    return { warning: null };
  }

  logDiscordFeedbackSoftFailure({
    stage: "resolved-reaction",
    reportId: args.report.id,
    code: reactionResult.code,
    status: reactionResult.status,
    message: reactionResult.message,
  });

  return {
    warning: "Discord could not apply the resolved checkmark on the public starter post.",
  };
}

function buildDiscordUpdateDraftLookupFailureResponse(code: string) {
  if (code === "DISCORD_UPDATE_DRAFT_AMBIGUOUS_ID") {
    return buildDiscordEphemeralMessageResponse("That update draft id matched multiple drafts. Use the full draft id.");
  }

  return buildDiscordEphemeralMessageResponse("Could not find that update draft. Use /update-latest to grab a current draft id.");
}

async function syncDiscordFeedbackForumThread(args: {
  report: DiscordBugReportRow;
}): Promise<{ forumSyncFailed: boolean }> {
  await validateDiscordFeedbackEmojis();
  const forumChannelId = args.report.discord_forum_channel_id ?? DISCORD_BUG_REPORT_FORUM_CHANNEL_ID();
  const forumTitle = buildDiscordBugForumThreadTitle({
    reportType: args.report.report_type,
    area: args.report.area,
    summary: args.report.summary,
  });

  let forumSyncFailed = false;
  if (!args.report.discord_forum_thread_id || !forumChannelId) {
    return {
      forumSyncFailed: false,
    };
  }

  let matchedTagIds: string[] | null = null;
  const tagResolutionResult = await resolveDiscordForumTagIdsByName({
    channelId: forumChannelId,
    tagNames: buildDiscordBugForumTagNames({
      reportType: args.report.report_type,
      status: args.report.status,
      severity: args.report.severity,
      includeBacklog: shouldApplyDiscordFeedbackBacklogTag(args.report),
    }),
  });

  if (tagResolutionResult.ok) {
    matchedTagIds = tagResolutionResult.matchedTagIds;
    if (tagResolutionResult.missingTagNames.length > 0) {
      console.warn("[discord-interactions] feedback forum tags missing", {
        requestId: randomUUID(),
        reportId: args.report.id,
        missingTagNames: tagResolutionResult.missingTagNames,
      });
    }
  } else {
    forumSyncFailed = true;
    console.warn("[discord-interactions] feedback forum tag resolution failed", {
      requestId: randomUUID(),
      reportId: args.report.id,
      code: tagResolutionResult.code,
      status: tagResolutionResult.status,
      message: tagResolutionResult.message,
    });
  }

  const titleUpdateResult = await updateDiscordForumThreadTitle({
    threadId: args.report.discord_forum_thread_id,
    title: forumTitle,
  });

  if (!titleUpdateResult.ok) {
    forumSyncFailed = true;
    console.error("[discord-interactions] feedback forum title update failed", {
      requestId: randomUUID(),
      reportId: args.report.id,
      code: titleUpdateResult.code,
      status: titleUpdateResult.status,
      message: titleUpdateResult.message,
    });
  }

  if (matchedTagIds) {
    const tagUpdateResult = await updateDiscordForumThreadTags({
      threadId: args.report.discord_forum_thread_id,
      appliedTagIds: matchedTagIds,
    });

    if (!tagUpdateResult.ok) {
      forumSyncFailed = true;
      console.error("[discord-interactions] feedback forum tag update failed", {
        requestId: randomUUID(),
        reportId: args.report.id,
        code: tagUpdateResult.code,
        status: tagUpdateResult.status,
        message: tagUpdateResult.message,
      });
    }
  }

  const recordStateResult = await recordDiscordBugReportForumState({
    reportId: args.report.id,
    forumTitle,
    forumAppliedTagIds: matchedTagIds,
  });

  if (!recordStateResult.ok) {
    forumSyncFailed = true;
    console.error("[discord-interactions] feedback forum state update failed", {
      requestId: randomUUID(),
      reportId: args.report.id,
    });
  }

  return {
    forumSyncFailed,
  };
}

async function postFeedbackAuditComment(args: {
  report: DiscordBugReportRow;
  action: "status_update" | "completion_review" | "withdraw" | "reporter_update" | "staff_update" | "duplicate_signal" | "sync_format";
  actorLabel?: string | null;
  includeReporterMention?: boolean;
  statusBefore?: DiscordBugReportRow["status"] | null;
  statusAfter?: DiscordBugReportRow["status"] | null;
  completionReviewStatus?: DiscordBugReportRow["completion_review_status"] | null;
  note?: string | null;
  duplicateCount?: number | null;
}): Promise<{ ok: boolean; messageId: string | null }> {
  if (!args.report.discord_forum_thread_id) {
    return { ok: true, messageId: null };
  }

  const result = await postFeedbackCardAuditComment({
    threadId: args.report.discord_forum_thread_id,
    action: args.action,
    actorLabel: args.actorLabel,
    reportType: args.report.report_type,
    reporterDiscordUserId: args.report.reporter_discord_user_id,
    includeReporterMention: args.includeReporterMention ?? false,
    statusBefore: args.statusBefore ?? null,
    statusAfter: args.statusAfter ?? null,
    completionReviewStatus: args.completionReviewStatus ?? null,
    note: args.note ?? null,
    reportId: args.report.id,
    duplicateCount: args.duplicateCount ?? null,
  });

  if (!result.ok) {
    logDiscordFeedbackSoftFailure({
      stage: `audit-comment:${args.action}`,
      reportId: args.report.id,
      code: result.code,
      status: result.status,
      message: result.message,
    });

    return { ok: false, messageId: null };
  }

  return { ok: true, messageId: result.messageId };
}

async function upsertDiscordFeedbackPanel() {
  const panelChannelResult = await ensureFeedbackPanelChannel();
  if (!panelChannelResult.ok) {
    return panelChannelResult;
  }

  const channelId = panelChannelResult.channelId;

  const feedbackEmojis = await validateDiscordFeedbackEmojis();
  const payload = buildDiscordFeedbackPanelMessagePayload({
    emojis: feedbackEmojis,
  });
  const channelResult = await fetchDiscordChannel({ channelId });
  if (!channelResult.ok) {
    return { ok: false as const, code: channelResult.code, status: channelResult.status, message: channelResult.message };
  }

  if (isDiscordForumLikeChannel(channelResult.channel.type)) {
    const createPanelThread = async () => {
      const createResult = await createDiscordForumThreadWithMessage({
        channelId,
        threadName: "Fawxzzy Feedback",
        messageBody: {
          embeds: payload.embeds,
          components: payload.components,
        },
      });

      return createResult.ok
        ? { ok: true as const, action: "created" as const, channelLabel: panelChannelResult.channelLabel }
        : { ok: false as const, code: createResult.code, status: createResult.status, message: createResult.message };
    };

    const activeThreadsResult = await fetchDiscordGuildActiveThreads({ guildId: DISCORD_GUILD_ID() });
    if (!activeThreadsResult.ok) {
      if (isDiscordMissingPermissionsFailure(activeThreadsResult)) {
        return activeThreadsResult;
      }

      return createPanelThread();
    }

    const existingThread = activeThreadsResult.threads.find((thread) => (
      thread.parent_id === channelId
      && thread.owner_id === DISCORD_APPLICATION_ID()
      && thread.name === "Fawxzzy Feedback"
    )) ?? activeThreadsResult.threads.find((thread) => (
      thread.parent_id === channelId
      && thread.name === "Fawxzzy Feedback"
    ));

    if (!existingThread?.id) {
      return createPanelThread();
    }

    const patchResult = await patchDiscordChannelMessage({
      channelId: existingThread.id,
      messageId: existingThread.id,
      body: {
        embeds: payload.embeds,
        components: payload.components,
      },
    });

    if (patchResult.ok) {
      return { ok: true as const, action: "updated" as const, channelLabel: panelChannelResult.channelLabel };
    }

    if (patchResult.status === 404) {
      return createPanelThread();
    }

    return { ok: false as const, code: patchResult.code, status: patchResult.status, message: patchResult.message };
  }

  const createPanelMessage = async () => {
    const createResult = await createDiscordChannelMessage({
      channelId,
      body: payload,
    });

    return createResult.ok
      ? { ok: true as const, action: "created" as const, channelLabel: panelChannelResult.channelLabel }
      : { ok: false as const, code: createResult.code, status: createResult.status, message: createResult.message };
  };

  const messagesResult = await fetchDiscordChannelMessages({
    channelId,
    limit: 50,
  });

  if (!messagesResult.ok) {
    if (isDiscordMissingPermissionsFailure(messagesResult)) {
      return messagesResult;
    }

    return createPanelMessage();
  }

  const existingMessage = messagesResult.messages.find((message) => (
    message.author?.id === DISCORD_APPLICATION_ID() && discordMessageHasFeedbackPanel(message)
  )) ?? messagesResult.messages.find(discordMessageHasFeedbackPanel);

  if (!existingMessage) {
    return createPanelMessage();
  }

  const patchResult = await patchDiscordChannelMessage({
    channelId,
    messageId: existingMessage.id,
    body: payload,
  });

  if (patchResult.ok) {
    return { ok: true as const, action: "updated" as const, channelLabel: panelChannelResult.channelLabel };
  }

  if (patchResult.status === 404) {
    return createPanelMessage();
  }

  return { ok: false as const, code: patchResult.code, status: patchResult.status, message: patchResult.message };
}

async function upsertDiscordSpotifyClubPanel() {
  const panelChannelResult = ensureSpotifyClubPanelChannel();
  if (!panelChannelResult.ok) {
    return panelChannelResult;
  }

  const { lobby, queueSummary, joinedMemberCount } = await getSpotifyClubRoomContext();
  const payload = buildDiscordSpotifyClubPanelMessagePayload({
    roomName: lobby?.room_name ?? "Main Room",
    roomVisibility: lobby?.visibility ?? "public",
    lobbyStatusLabel: formatDiscordSpotifyLobbyStatusLabel(lobby),
    hostDiscordUserId: lobby?.status === "open" ? lobby.host_discord_user_id : null,
    memberCount: joinedMemberCount,
    queuePreviewLines: buildDiscordSpotifyQueuePreviewLines(queueSummary),
    activeQueueCount: queueSummary.approvedItems.length,
    pendingSuggestionCount: queueSummary.pendingItems.length,
    hasApprovedQueue: queueSummary.approvedItems.length > 0,
  });

  const channelResult = await fetchDiscordChannel({ channelId: panelChannelResult.channelId });
  if (!channelResult.ok) {
    return { ok: false as const, code: channelResult.code, status: channelResult.status, message: channelResult.message };
  }

  if (isDiscordForumLikeChannel(channelResult.channel.type)) {
    return {
      ok: false as const,
      code: "DISCORD_SPOTIFY_CLUB_PANEL_UNSUPPORTED_CHANNEL_TYPE",
      status: 400,
      message: "Spotify Club panel requires a standard text channel.",
    };
  }

  const createPanelMessage = async (staleMessageIds: string[] = []) => {
    const createResult = await createDiscordChannelMessage({
      channelId: panelChannelResult.channelId,
      body: payload,
    });

    if (!createResult.ok || !createResult.messageId) {
      return createResult.ok
        ? { ok: false as const, code: "DISCORD_SPOTIFY_CLUB_PANEL_MISSING_MESSAGE_ID", status: 500, message: "Spotify Club panel message id was missing." }
        : createResult;
    }

    await upsertDiscordSpotifyLobbyPanel({
      panelChannelId: panelChannelResult.channelId,
      panelMessageId: createResult.messageId,
    });

    let duplicateCount = 0;
    for (const messageId of [...new Set(staleMessageIds.filter(Boolean))]) {
      const deleteResult = await deleteDiscordChannelMessage({
        channelId: panelChannelResult.channelId,
        messageId,
      });

      if (deleteResult.ok || deleteResult.code === "DISCORD_DELETE_MESSAGE_NOT_FOUND") {
        duplicateCount += 1;
      }
    }

    return {
      ok: true as const,
      action: "created" as const,
      channelLabel: panelChannelResult.channelLabel,
      messageId: createResult.messageId,
      duplicateCount,
    };
  };

  const messagesResult = await fetchDiscordChannelMessages({
    channelId: panelChannelResult.channelId,
    limit: 50,
  });

  if (!messagesResult.ok) {
    if (isDiscordMissingPermissionsFailure(messagesResult)) {
      return messagesResult;
    }

    return createPanelMessage();
  }

  const canonicalMessageId = lobby?.panel_channel_id === panelChannelResult.channelId
    ? lobby.panel_message_id
    : null;
  const existingMessage = messagesResult.messages.find((message) => message.id === canonicalMessageId)
    ?? messagesResult.messages.find((message) => (
      message.author?.id === DISCORD_APPLICATION_ID() && discordMessageHasSpotifyClubPanel(message)
    ))
    ?? messagesResult.messages.find(discordMessageHasSpotifyClubPanel);

  if (!existingMessage) {
    return createPanelMessage();
  }

  const patchResult = await patchDiscordChannelMessage({
    channelId: panelChannelResult.channelId,
    messageId: existingMessage.id,
    body: payload,
  });

  const duplicateMessages = messagesResult.messages.filter((message) => (
    message.id !== existingMessage.id
    && message.author?.id === DISCORD_APPLICATION_ID()
    && discordMessageHasSpotifyClubPanel(message)
  ));
  const duplicateMessageIds = duplicateMessages.map((message) => message.id);

  if (
    !patchResult.ok
    && patchResult.status !== 404
    && !isDiscordAgedMessageEditLimitFailure(patchResult)
  ) {
    return { ok: false as const, code: patchResult.code, status: patchResult.status, message: patchResult.message };
  }

  if (
    !patchResult.ok
    && (patchResult.status === 404 || isDiscordAgedMessageEditLimitFailure(patchResult))
  ) {
    return createPanelMessage([existingMessage.id, ...duplicateMessageIds]);
  }

  await upsertDiscordSpotifyLobbyPanel({
    panelChannelId: panelChannelResult.channelId,
    panelMessageId: existingMessage.id,
  });

  let duplicateCount = 0;
  for (const message of duplicateMessages) {
    const deleteResult = await deleteDiscordChannelMessage({
      channelId: panelChannelResult.channelId,
      messageId: message.id,
    });

    if (deleteResult.ok || deleteResult.code === "DISCORD_DELETE_MESSAGE_NOT_FOUND") {
      duplicateCount += 1;
    }
  }

  return {
    ok: true as const,
    action: "updated" as const,
    channelLabel: panelChannelResult.channelLabel,
    messageId: existingMessage.id,
    duplicateCount,
  };
}

function isDiscordAgedMessageEditLimitFailure(result: {
  status: number;
  message: string | null;
}) {
  return result.status === 429 && /older than 1 hour/i.test(result.message ?? "");
}

async function recreateDiscordSpotifyClubPanelFromState(args: {
  channelId: string;
  previousMessageId: string;
  payload: ReturnType<typeof buildDiscordSpotifyClubPanelMessagePayload>;
}) {
  const createResult = await createDiscordChannelMessage({
    channelId: args.channelId,
    body: args.payload,
  });

  if (!createResult.ok || !createResult.messageId) {
    return createResult.ok
      ? { ok: false as const, code: "DISCORD_SPOTIFY_CLUB_PANEL_MISSING_MESSAGE_ID", status: 500, message: "Spotify Club panel message id was missing." }
      : createResult;
  }

  await upsertDiscordSpotifyLobbyPanel({
    panelChannelId: args.channelId,
    panelMessageId: createResult.messageId,
  });

  await deleteDiscordChannelMessage({
    channelId: args.channelId,
    messageId: args.previousMessageId,
  });

  return { ok: true as const, skipped: false as const, recreated: true as const };
}

async function syncDiscordSpotifyClubPanelFromState() {
  const lobby = await getLatestDiscordSpotifyLobby();
  if (!lobby?.panel_channel_id || !lobby.panel_message_id) {
    return { ok: true as const, skipped: true as const };
  }

  const queueSummary = await getDiscordSpotifyQueueSummary({ lobbyId: lobby.id });
  let joinedMemberCount = 0;
  try {
    joinedMemberCount = await countJoinedDiscordSpotifyRoomMembers({ lobbyId: lobby.id });
  } catch (error) {
    console.warn("[discord-interactions] spotify room member count unavailable during panel sync", {
      requestId: randomUUID(),
      lobbyId: lobby.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  const payload = buildDiscordSpotifyClubPanelMessagePayload({
    roomName: lobby.room_name,
    roomVisibility: lobby.visibility,
    lobbyStatusLabel: formatDiscordSpotifyLobbyStatusLabel(lobby),
    hostDiscordUserId: lobby.status === "open" ? lobby.host_discord_user_id : null,
    memberCount: joinedMemberCount,
    queuePreviewLines: buildDiscordSpotifyQueuePreviewLines(queueSummary),
    activeQueueCount: queueSummary.approvedItems.length,
    pendingSuggestionCount: queueSummary.pendingItems.length,
    hasApprovedQueue: queueSummary.approvedItems.length > 0,
  });

  const patchResult = await patchDiscordChannelMessage({
    channelId: lobby.panel_channel_id,
    messageId: lobby.panel_message_id,
    body: payload,
  });

  if (patchResult.ok) {
    return { ok: true as const, skipped: false as const };
  }

  if (patchResult.status === 404) {
    return { ok: true as const, skipped: true as const };
  }

  if (isDiscordAgedMessageEditLimitFailure(patchResult)) {
    return recreateDiscordSpotifyClubPanelFromState({
      channelId: lobby.panel_channel_id,
      previousMessageId: lobby.panel_message_id,
      payload,
    });
  }

  return { ok: false as const, code: patchResult.code, status: patchResult.status, message: patchResult.message };
}

function normalizeDiscordMessageCommandContent(value: unknown): string {
  return typeof value === "string"
    ? value.toLowerCase().replace(/\s+/g, " ").trim()
    : "";
}

function discordMessageRequestsFeedbackSetup(message: DiscordMessageCommand): boolean {
  const normalizedContent = normalizeDiscordMessageCommandContent(message.content);
  return DISCORD_MESSAGE_COMMAND_FEEDBACK_SETUP_TRIGGERS.some((trigger) => normalizedContent.includes(trigger));
}

function discordMessageHasProcessedCommandReaction(message: DiscordMessageCommand): boolean {
  const reactions = Array.isArray(message.reactions) ? message.reactions : [];
  return reactions.some((reaction) => {
    if (!reaction || typeof reaction !== "object") {
      return false;
    }

    const candidate = reaction as {
      me?: unknown;
      emoji?: {
        name?: unknown;
      };
    };
    return candidate.me === true
      && typeof candidate.emoji?.name === "string"
      && DISCORD_MESSAGE_COMMAND_PROCESSED_REACTIONS.has(candidate.emoji.name);
  });
}

function combineDiscordRolePermissions(args: {
  roleIds: string[];
  roles: Array<{ id?: string; permissions?: string }>;
}): bigint {
  let combined = BigInt(0);
  for (const roleId of args.roleIds) {
    const role = args.roles.find((candidate) => candidate.id === roleId);
    if (!role?.permissions) {
      continue;
    }

    try {
      combined |= BigInt(role.permissions);
    } catch {
      // Ignore malformed role permission values from Discord.
    }
  }

  return combined;
}

function discordRolePermissionsAllowSetup(permissions: bigint): boolean {
  return (permissions & DISCORD_PERMISSION_ADMINISTRATOR) === DISCORD_PERMISSION_ADMINISTRATOR
    || (permissions & DISCORD_PERMISSION_MANAGE_GUILD) === DISCORD_PERMISSION_MANAGE_GUILD;
}

async function replyToDiscordMessageCommand(args: {
  channelId: string;
  guildId: string;
  messageId: string;
  content: string;
}) {
  return createDiscordChannelMessage({
    channelId: args.channelId,
    body: {
      content: args.content,
      message_reference: {
        message_id: args.messageId,
        channel_id: args.channelId,
        guild_id: args.guildId,
        fail_if_not_exists: false,
      },
      allowed_mentions: {
        parse: [],
        replied_user: false,
      },
    },
  });
}

async function markDiscordMessageCommandProcessed(args: {
  channelId: string;
  messageId: string;
  emoji: string;
}) {
  const result = await createDiscordMessageReaction({
    channelId: args.channelId,
    messageId: args.messageId,
    emoji: args.emoji,
  });

  if (!result.ok) {
    console.warn("[discord-message-command] processed reaction failed", {
      requestId: randomUUID(),
      code: result.code,
      status: result.status,
      message: result.message,
    });
  }
}

async function ensureDiscordCommanderRole(args: {
  guildId: string;
  authorId: string;
  memberRoleIds: string[];
  guildRoles: Array<{ id?: string; name?: string; permissions?: string }>;
}) {
  const existingRole = args.guildRoles.find((role) => role.name === DISCORD_COMMANDER_ROLE_NAME);
  const authorPermissions = combineDiscordRolePermissions({
    roleIds: args.memberRoleIds,
    roles: args.guildRoles,
  });
  const authorCanBootstrap = discordRolePermissionsAllowSetup(authorPermissions);

  if (existingRole?.id) {
    return {
      ok: true as const,
      roleId: existingRole.id,
      roleCreated: false,
      authorCanBootstrap,
    };
  }

  if (!authorCanBootstrap) {
    return {
      ok: false as const,
      code: "DISCORD_COMMANDER_ROLE_MISSING",
      message: `Only members with the ${DISCORD_COMMANDER_ROLE_NAME} role can use bot message commands.`,
    };
  }

  const createResult = await createDiscordRole({
    guildId: args.guildId,
    name: DISCORD_COMMANDER_ROLE_NAME,
  });

  if (!createResult.ok || !createResult.role.id) {
    return {
      ok: false as const,
      code: createResult.ok ? "DISCORD_COMMANDER_ROLE_CREATE_FAILED" : createResult.code,
      message: createResult.ok ? "Could not create the commander role." : createResult.message,
    };
  }

  return {
    ok: true as const,
    roleId: createResult.role.id,
    roleCreated: true,
    authorCanBootstrap,
  };
}

async function processDiscordFeedbackSetupMessageCommand(args: {
  channelId: string;
  message: DiscordMessageCommand;
}) {
  const messageId = typeof args.message.id === "string" ? args.message.id : null;
  const authorId = typeof args.message.author?.id === "string" ? args.message.author.id : null;
  if (!messageId || !authorId) {
    return { ok: false as const, code: "DISCORD_MESSAGE_COMMAND_INVALID_MESSAGE" };
  }

  const guildId = DISCORD_GUILD_ID();
  const rolesResult = await fetchDiscordGuildRoles({ guildId });
  if (!rolesResult.ok) {
    await markDiscordMessageCommandProcessed({
      channelId: args.channelId,
      messageId,
      emoji: DISCORD_MESSAGE_COMMAND_WARNING_REACTION,
    });
    return rolesResult;
  }

  const messageMemberRoleIds = Array.isArray(args.message.member?.roles)
    ? args.message.member.roles.filter((roleId): roleId is string => typeof roleId === "string")
    : null;
  const memberResult = messageMemberRoleIds
    ? { ok: true as const, member: { roles: messageMemberRoleIds } }
    : await fetchDiscordGuildMember({ guildId, userId: authorId });
  if (!memberResult.ok) {
    await markDiscordMessageCommandProcessed({
      channelId: args.channelId,
      messageId,
      emoji: DISCORD_MESSAGE_COMMAND_WARNING_REACTION,
    });
    return memberResult;
  }

  const memberRoleIds = Array.isArray(memberResult.member.roles)
    ? memberResult.member.roles.filter((roleId): roleId is string => typeof roleId === "string")
    : [];
  const commanderRoleResult = await ensureDiscordCommanderRole({
    guildId,
    authorId,
    memberRoleIds,
    guildRoles: rolesResult.roles,
  });

  if (!commanderRoleResult.ok) {
    await replyToDiscordMessageCommand({
      channelId: args.channelId,
      guildId,
      messageId,
      content: `Only members with the ${DISCORD_COMMANDER_ROLE_NAME} role can use bot message commands.`,
    });
    await markDiscordMessageCommandProcessed({
      channelId: args.channelId,
      messageId,
      emoji: DISCORD_MESSAGE_COMMAND_FORBIDDEN_REACTION,
    });
    return commanderRoleResult;
  }

  let hasCommanderRole = memberRoleIds.includes(commanderRoleResult.roleId);
  if (!hasCommanderRole && commanderRoleResult.authorCanBootstrap) {
    const addRoleResult = await addDiscordGuildMemberRole({
      guildId,
      userId: authorId,
      roleId: commanderRoleResult.roleId,
    });
    hasCommanderRole = addRoleResult.ok;
  }

  if (!hasCommanderRole) {
    await replyToDiscordMessageCommand({
      channelId: args.channelId,
      guildId,
      messageId,
      content: commanderRoleResult.roleCreated
        ? `${DISCORD_COMMANDER_ROLE_NAME} was created. Assign it to yourself or another operator, then retry.`
        : `Only members with the ${DISCORD_COMMANDER_ROLE_NAME} role can use bot message commands.`,
    });
    await markDiscordMessageCommandProcessed({
      channelId: args.channelId,
      messageId,
      emoji: DISCORD_MESSAGE_COMMAND_FORBIDDEN_REACTION,
    });
    return { ok: false as const, code: "DISCORD_MESSAGE_COMMAND_FORBIDDEN" };
  }

  const upsertResult = await upsertDiscordFeedbackPanel();
  if (!upsertResult.ok) {
    console.error("[discord-message-command] feedback setup failed", {
      requestId: randomUUID(),
      code: upsertResult.code,
      status: "status" in upsertResult ? upsertResult.status : undefined,
      message: upsertResult.message,
    });
    await replyToDiscordMessageCommand({
      channelId: args.channelId,
      guildId,
      messageId,
      content: "Feedback setup failed. Check bot permissions and configured feedback channels.",
    });
    await markDiscordMessageCommandProcessed({
      channelId: args.channelId,
      messageId,
      emoji: DISCORD_MESSAGE_COMMAND_WARNING_REACTION,
    });
    return upsertResult;
  }

  await replyToDiscordMessageCommand({
    channelId: args.channelId,
    guildId,
    messageId,
    content: upsertResult.action === "updated"
      ? `Feedback launcher updated in ${upsertResult.channelLabel}.`
      : `Feedback launcher created in ${upsertResult.channelLabel}.`,
  });
  await markDiscordMessageCommandProcessed({
    channelId: args.channelId,
    messageId,
    emoji: DISCORD_MESSAGE_COMMAND_SUCCESS_REACTION,
  });
  return { ok: true as const, action: upsertResult.action };
}

function validateDiscordMessageCommandPollRequest(request: Request):
  | { ok: true }
  | { ok: false; status: number; message: string } {
  const secret = optionalEnv("DISCORD_MESSAGE_COMMAND_POLL_SECRET") ?? optionalEnv("CRON_SECRET");
  if (!secret) {
    return {
      ok: false,
      status: 503,
      message: "Discord message command polling is not configured.",
    };
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${secret}`) {
    return {
      ok: false,
      status: 401,
      message: "Unauthorized.",
    };
  }

  return { ok: true };
}

async function pollDiscordMessageCommands() {
  const channelId = DISCORD_MAIN_CHANNEL_ID();
  if (!channelId) {
    return {
      ok: false as const,
      code: "DISCORD_MAIN_CHANNEL_NOT_CONFIGURED",
      processed: [],
    };
  }

  const messagesResult = await fetchDiscordChannelMessages({
    channelId,
    limit: DISCORD_MESSAGE_COMMAND_POLL_LIMIT,
  });
  if (!messagesResult.ok) {
    return {
      ok: false as const,
      code: messagesResult.code,
      status: messagesResult.status,
      message: messagesResult.message,
      processed: [],
    };
  }

  const candidates = [...messagesResult.messages]
    .reverse()
    .filter((message) => {
      const candidate = message as DiscordMessageCommand;
      return candidate.author?.bot !== true
        && discordMessageRequestsFeedbackSetup(candidate)
        && !discordMessageHasProcessedCommandReaction(candidate);
    })
    .slice(0, DISCORD_MESSAGE_COMMAND_MAX_PER_RUN);

  const processed = [];
  for (const message of candidates) {
    const result = await processDiscordFeedbackSetupMessageCommand({
      channelId,
      message: message as DiscordMessageCommand,
    });
    processed.push({
      messageId: message.id,
      ok: result.ok,
      code: "code" in result ? result.code : null,
      action: "action" in result ? result.action : null,
    });
  }

  return {
    ok: true as const,
    processed,
  };
}

async function upsertDiscordVerifyMessage(): Promise<
  | { ok: true; action: "created" | "updated"; messageId: string | null }
  | { ok: false; code: string; message: string | null }
> {
  const payload = buildDiscordVerifyMessagePayload({
    title: DISCORD_VERIFY_MESSAGE_TITLE(),
    body: DISCORD_VERIFY_MESSAGE_BODY(),
  });

  const createVerifyMessage = async () => {
    const createResult = await createDiscordChannelMessage({
      channelId: DISCORD_VERIFY_CHANNEL_ID(),
      body: payload,
    });

    return createResult.ok
      ? { ok: true as const, action: "created" as const, messageId: createResult.messageId }
      : { ok: false as const, code: createResult.code, message: createResult.message };
  };

  const messagesResult = await fetchDiscordChannelMessages({
    channelId: DISCORD_VERIFY_CHANNEL_ID(),
    limit: 50,
  });

  if (!messagesResult.ok) {
    return createVerifyMessage();
  }

  const existingMessage = messagesResult.messages.find((message) => (
    message.author?.id === DISCORD_APPLICATION_ID() && discordMessageHasVerifyButton(message)
  )) ?? messagesResult.messages.find(discordMessageHasVerifyButton);

  if (existingMessage) {
    const patchResult = await patchDiscordChannelMessage({
      channelId: DISCORD_VERIFY_CHANNEL_ID(),
      messageId: existingMessage.id,
      body: payload,
    });

    if (patchResult.ok) {
      return { ok: true, action: "updated" as const, messageId: existingMessage.id };
    }

    if (patchResult.status === 404) {
      return createVerifyMessage();
    }

    return { ok: false, code: patchResult.code, message: patchResult.message };
  }

  return createVerifyMessage();
}

function resolveCanonicalVerifyPanelMessage(messages: Array<{ id: string; author?: { id?: string }; components?: unknown[] }>) {
  return messages.find((message) => (
    message.author?.id === DISCORD_APPLICATION_ID() && discordMessageHasVerifyButton(message)
  )) ?? messages.find(discordMessageHasVerifyButton) ?? null;
}

function buildVerifyLockdownOverwrite() {
  const allow = DISCORD_PERMISSION_VIEW_CHANNEL | DISCORD_PERMISSION_READ_MESSAGE_HISTORY;
  const deny = DISCORD_PERMISSION_SEND_MESSAGES
    | DISCORD_PERMISSION_CREATE_PUBLIC_THREADS
    | DISCORD_PERMISSION_CREATE_PRIVATE_THREADS
    | DISCORD_PERMISSION_SEND_MESSAGES_IN_THREADS
    | DISCORD_PERMISSION_ADD_REACTIONS;

  return {
    allow: String(allow),
    deny: String(deny),
    type: 0 as const,
  };
}

async function cleanupDiscordVerifyChannel(): Promise<
  | { ok: true; deletedMessageCount: number; deletedThreadCount: number; panelAction: "updated" | "created" }
  | { ok: false; code: string; status?: number; message: string | null }
> {
  const ensurePanelResult = await upsertDiscordVerifyMessage();
  if (!ensurePanelResult.ok) {
    return ensurePanelResult;
  }

  const messagesResult = await fetchDiscordChannelMessages({
    channelId: DISCORD_VERIFY_CHANNEL_ID(),
    limit: 100,
  });

  if (!messagesResult.ok) {
    return { ok: false as const, code: messagesResult.code, status: messagesResult.status, message: messagesResult.message };
  }

  const canonicalPanelId = ensurePanelResult.messageId
    ?? resolveCanonicalVerifyPanelMessage(messagesResult.messages)?.id
    ?? null;
  const messagesToDelete = messagesResult.messages.filter((message) => message.id !== canonicalPanelId);

  let deletedMessageCount = 0;
  for (const message of messagesToDelete) {
    const deleteResult = await deleteDiscordChannelMessage({
      channelId: DISCORD_VERIFY_CHANNEL_ID(),
      messageId: message.id,
    });

    if (deleteResult.ok || deleteResult.code === "DISCORD_DELETE_MESSAGE_NOT_FOUND") {
      deletedMessageCount += 1;
      continue;
    }

    return { ok: false as const, code: deleteResult.code, status: deleteResult.status, message: deleteResult.message };
  }

  const activeThreadsResult = await fetchDiscordGuildActiveThreads({ guildId: DISCORD_GUILD_ID() });
  if (!activeThreadsResult.ok) {
    return { ok: false as const, code: activeThreadsResult.code, status: activeThreadsResult.status, message: activeThreadsResult.message };
  }

  const archivedPublicThreadsResult = await fetchDiscordChannelArchivedPublicThreads({
    channelId: DISCORD_VERIFY_CHANNEL_ID(),
  });
  if (!archivedPublicThreadsResult.ok) {
    return {
      ok: false as const,
      code: archivedPublicThreadsResult.code,
      status: archivedPublicThreadsResult.status,
      message: archivedPublicThreadsResult.message,
    };
  }

  const archivedPrivateThreadsResult = await fetchDiscordChannelArchivedPrivateThreads({
    channelId: DISCORD_VERIFY_CHANNEL_ID(),
  });
  if (!archivedPrivateThreadsResult.ok && !isDiscordMissingPermissionsFailure(archivedPrivateThreadsResult)) {
    return {
      ok: false as const,
      code: archivedPrivateThreadsResult.code,
      status: archivedPrivateThreadsResult.status,
      message: archivedPrivateThreadsResult.message,
    };
  }

  const verifyThreads = [
    ...activeThreadsResult.threads.filter((thread) => thread.parent_id === DISCORD_VERIFY_CHANNEL_ID()),
    ...archivedPublicThreadsResult.threads,
    ...(archivedPrivateThreadsResult.ok ? archivedPrivateThreadsResult.threads : []),
  ];

  const uniqueThreads = [...new Map(verifyThreads.map((thread) => [thread.id, thread])).values()];
  let deletedThreadCount = 0;
  for (const thread of uniqueThreads) {
    const deleteResult = await deleteDiscordChannel({ channelId: thread.id });
    if (deleteResult.ok || deleteResult.code === "DISCORD_DELETE_CHANNEL_NOT_FOUND") {
      deletedThreadCount += 1;
      continue;
    }

    const archiveResult = await updateDiscordForumThreadArchiveState({
      threadId: thread.id,
      archived: true,
      locked: true,
    });

    if (!archiveResult.ok) {
      return { ok: false as const, code: archiveResult.code, status: archiveResult.status, message: archiveResult.message };
    }

    deletedThreadCount += 1;
  }

  return {
    ok: true as const,
    deletedMessageCount,
    deletedThreadCount,
    panelAction: ensurePanelResult.action,
  };
}

async function applyDiscordVerifyLockdown() {
  const overwrite = buildVerifyLockdownOverwrite();
  const overwriteIds = [
    DISCORD_GUILD_ID(),
    DISCORD_VERIFIED_ROLE_ID(),
    DISCORD_UNVERIFIED_ROLE_ID(),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  let appliedOverwriteCount = 0;
  for (const overwriteId of overwriteIds) {
    const result = await updateDiscordChannelPermissionOverwrite({
      channelId: DISCORD_VERIFY_CHANNEL_ID(),
      overwriteId,
      overwrite,
    });

    if (!result.ok) {
      return { ok: false as const, code: result.code, status: result.status, message: result.message };
    }

    appliedOverwriteCount += 1;
  }

  return {
    ok: true as const,
    appliedOverwriteCount,
  };
}

async function handleSetupVerifyInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This command can only be used in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasSetupPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to set up verification.");
  }

  const upsertResult = await upsertDiscordVerifyMessage();
  if (!upsertResult.ok) {
    console.error("[discord-interactions] setup-verify failed", {
      requestId: randomUUID(),
      code: upsertResult.code,
      message: upsertResult.message,
    });

    return buildDiscordEphemeralMessageResponse("Discord could not update the verification message right now.");
  }

  return buildDiscordEphemeralMessageResponse(
    upsertResult.action === "updated"
      ? "Verification message updated in the configured verify channel."
      : "Verification message created in the configured verify channel.",
  );
}

async function handleVerifyCleanupInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This command can only be used in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasSetupPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to clean up verification.");
  }

  const cleanupResult = await cleanupDiscordVerifyChannel();
  if (!cleanupResult.ok) {
    console.error("[discord-interactions] verify-cleanup failed", {
      requestId: randomUUID(),
      code: cleanupResult.code,
      status: "status" in cleanupResult ? cleanupResult.status : undefined,
      message: cleanupResult.message,
    });

    return buildDiscordEphemeralMessageResponse("Discord could not clean up the verify channel right now.");
  }

  return buildDiscordEphemeralMessageResponse(
    `Verify channel cleaned. Removed ${cleanupResult.deletedMessageCount} message(s) and ${cleanupResult.deletedThreadCount} thread(s). Official panel ${cleanupResult.panelAction === "updated" ? "updated" : "created"}.`,
  );
}

async function handleVerifyLockdownInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This command can only be used in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasSetupPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to lock down verification.");
  }

  const lockdownResult = await applyDiscordVerifyLockdown();
  if (!lockdownResult.ok) {
    console.error("[discord-interactions] verify-lockdown failed", {
      requestId: randomUUID(),
      code: lockdownResult.code,
      status: "status" in lockdownResult ? lockdownResult.status : undefined,
      message: lockdownResult.message,
    });

    return buildDiscordEphemeralMessageResponse("Discord could not lock down the verify channel right now.");
  }

  return buildDiscordEphemeralMessageResponse(
    `Verify channel locked down. Applied ${lockdownResult.appliedOverwriteCount} permission overwrite(s) for the access panel.`,
  );
}

async function handleSetupFeedbackInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This command can only be used in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasSetupPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to set up feedback.");
  }

  const upsertResult = await upsertDiscordFeedbackPanel();
  if (!upsertResult.ok) {
    console.error("[discord-interactions] setup-feedback failed", {
      requestId: randomUUID(),
      code: upsertResult.code,
      status: "status" in upsertResult ? upsertResult.status : undefined,
      message: upsertResult.message,
    });

    if (isDiscordMissingPermissionsFailure(upsertResult)) {
      return buildDiscordPanelPermissionFailureResponse();
    }

    if (upsertResult.code === "DISCORD_FEEDBACK_PANEL_CHANNEL_NOT_CONFIGURED") {
      return buildDiscordEphemeralMessageResponse("Discord feedback panel channel is not configured.");
    }

    return buildDiscordEphemeralMessageResponse("Discord could not update the feedback panel right now.");
  }

  return buildDiscordEphemeralMessageResponse(
    upsertResult.action === "updated"
      ? `Feedback launcher updated in ${upsertResult.channelLabel}.`
      : `Feedback launcher created in ${upsertResult.channelLabel}.`,
  );
}

async function handleSetupSpotifyClubInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This command can only be used in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasSetupPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to set up Spotify Club.");
  }

  const upsertResult = await upsertDiscordSpotifyClubPanel();
  if (!upsertResult.ok) {
    console.error("[discord-interactions] setup-spotify-club failed", {
      requestId: randomUUID(),
      code: upsertResult.code,
      status: "status" in upsertResult ? upsertResult.status : undefined,
      message: upsertResult.message,
    });

    if (isDiscordMissingPermissionsFailure(upsertResult)) {
      return buildSpotifyClubPanelPermissionFailureResponse();
    }

    if (upsertResult.code === "DISCORD_SPOTIFY_CLUB_CHANNEL_NOT_CONFIGURED") {
      return buildDiscordEphemeralMessageResponse("Spotify Club channel is not configured yet.");
    }

    return buildDiscordEphemeralMessageResponse("Discord could not update the Spotify Club panel right now.");
  }

  const duplicateSuffix = upsertResult.duplicateCount > 0
    ? ` Cleaned up ${upsertResult.duplicateCount} stale panel duplicate(s).`
    : "";

  return buildDiscordEphemeralMessageResponse(
    upsertResult.action === "updated"
      ? `Spotify Club panel updated in ${upsertResult.channelLabel}.${duplicateSuffix}`
      : `Spotify Club panel created in ${upsertResult.channelLabel}.${duplicateSuffix}`,
  );
}

async function handleJamLobbyInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This Spotify Club flow is only available in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasModerationPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to manage the Spotify Club lobby.");
  }

  const discordUser = resolveDiscordInteractionUser(interaction);
  const subcommand = extractDiscordCommandSubcommand(interaction.data?.options);

  if (!subcommand?.name) {
    return buildDiscordEphemeralMessageResponse("Spotify Club could not read that lobby command. Try again.");
  }

  if (subcommand.name === FITNESS_JAM_LOBBY_STATUS_SUBCOMMAND_NAME) {
    return buildDiscordEphemeralMessageResponse(
      buildDiscordSpotifyLobbyStatusSummary(await getLatestDiscordSpotifyLobby()),
    );
  }

  if (subcommand.name === FITNESS_JAM_LOBBY_OPEN_SUBCOMMAND_NAME) {
    if (!discordUser.id) {
      return buildDiscordEphemeralMessageResponse("Spotify Club could not identify the lobby host. Try again.");
    }

    const hostConnection = await getDiscordSpotifyConnection(discordUser.id);
    await openDiscordSpotifyLobby({
      hostDiscordUserId: discordUser.id,
      hostSpotifyUserId: hostConnection?.spotify_user_id ?? null,
      spotifyMirrorEnabled: Boolean(hostConnection?.is_premium && hasSpotifyPlaybackScopes(hostConnection.scopes)),
    });
    const syncResult = await syncDiscordSpotifyClubPanelFromState();

    if (!syncResult.ok) {
      console.error("[discord-interactions] jam-lobby open panel sync failed", {
        requestId: randomUUID(),
        code: syncResult.code,
        status: syncResult.status,
        message: syncResult.message,
      });
      return buildDiscordEphemeralMessageResponse("Spotify Club lobby is Open, but the panel could not be refreshed right now.");
    }

    return buildDiscordEphemeralMessageResponse("Spotify Club lobby is now Open.");
  }

  if (subcommand.name === FITNESS_JAM_LOBBY_CLOSE_SUBCOMMAND_NAME) {
    await closeSpotifyRoomWithCleanup();
    const syncResult = await syncDiscordSpotifyClubPanelFromState();

    if (!syncResult.ok) {
      console.error("[discord-interactions] jam-lobby close panel sync failed", {
        requestId: randomUUID(),
        code: syncResult.code,
        status: syncResult.status,
        message: syncResult.message,
      });
      return buildDiscordEphemeralMessageResponse("Spotify Club lobby is Closed, but the panel could not be refreshed right now.");
    }

    return buildDiscordEphemeralMessageResponse("Spotify Club lobby is now Closed.");
  }

  return buildDiscordEphemeralMessageResponse("That jam-lobby command is not available in this phase yet.");
}

function spotifyQueueManagementAllowed(args: {
  permissions: string | null;
  discordUserId: string | null;
  lobbyHostDiscordUserId: string | null | undefined;
}) {
  return discordMemberHasModerationPermission(args.permissions)
    || (args.discordUserId !== null && args.discordUserId === (args.lobbyHostDiscordUserId ?? null));
}

function buildSpotifyQueueLobbyClosedResponse() {
  return buildDiscordEphemeralMessageResponse("Spotify Club lobby is Closed. Open a lobby before using the queue.");
}

async function postSpotifyClubQueueAuditMessage(args: {
  channelId: string | null;
  content: string;
}) {
  const testingChannelId = resolveSpotifyClubTestingChannelId(args.channelId);
  if (!testingChannelId) {
    return { ok: true as const };
  }

  const result = await createDiscordChannelMessage({
    channelId: testingChannelId,
    body: {
      content: args.content,
      allowed_mentions: buildDiscordAllowedMentions({
        reporterDiscordUserId: null,
        includeReporter: false,
      }),
    },
  });

  if (!result.ok) {
    console.warn("[discord-interactions] spotify queue audit message failed", {
      requestId: randomUUID(),
      code: result.code,
      status: result.status,
      message: result.message,
    });
  }
}

function resolveSpotifyClubTestingChannelId(publicChannelId: string | null) {
  const testingChannelId = DISCORD_SPOTIFY_CLUB_TEST_CHANNEL_ID();
  if (!testingChannelId || testingChannelId === publicChannelId) {
    return null;
  }

  return testingChannelId;
}

async function buildSpotifyQueueCommandListResponse(lobbyId: string, viewerDiscordUserId?: string | null) {
  const lobby = await getLatestDiscordSpotifyLobby();
  if (lobby?.id === lobbyId) {
    await syncSpotifyMirrorIfEnabled(lobby).catch(() => null);
  }
  return buildDiscordEphemeralMessageResponse(await buildSpotifyQueueDetailText(lobbyId, viewerDiscordUserId));
}

async function buildSpotifyQueueDetailText(lobbyId: string, viewerDiscordUserId?: string | null) {
  const summary = await getDiscordSpotifyQueueSummary({ lobbyId });
  return buildDiscordSpotifyQueueSummaryTextForViewer(summary, viewerDiscordUserId);
}

async function handleSpotifyQueueSuggestion(args: {
  lobbyId: string;
  panelChannelId: string | null;
  discordUserId: string;
  spotifyUrlOrUri: string;
  approvalMode: DiscordSpotifyApprovalMode;
  sourceType?: "discord_search" | "discord_link";
  canManageQueue?: boolean;
}) {
  const connection = await getDiscordSpotifyConnection(args.discordUserId);
  if (args.approvalMode === "host_only" && !args.canManageQueue) {
    throw new Error("This Spotify Club room is host-only right now.");
  }
  if (!connection) {
    throw new Error("Connect Spotify before adding tracks to Spotify Club.");
  }
  if (!connection.is_premium) {
    throw new Error("Spotify Club queue adds require a Premium account to be Jam Ready.");
  }

  const item = await suggestDiscordSpotifyQueueItem({
    lobbyId: args.lobbyId,
    spotifyUrlOrUri: args.spotifyUrlOrUri,
    suggestedByDiscordUserId: args.discordUserId,
    suggestedBySpotifyUserId: connection?.spotify_user_id ?? null,
    approvalMode: args.approvalMode,
    sourceType: args.sourceType ?? "discord_link",
  });
  const syncResult = await syncDiscordSpotifyClubPanelFromState();
  await postSpotifyClubQueueAuditMessage({
    channelId: args.panelChannelId,
    content: buildDiscordSpotifyQueueActionSummary({
      action: "suggested",
      item,
      actorDiscordUserId: args.discordUserId,
    }),
  });

  const successMessage = item.approval_state === "approved"
    ? "Track added to the Spotify Club queue."
    : "Suggestion added to the queue for host review.";

  if (!syncResult.ok) {
    return buildDiscordEphemeralMessageResponse(`${successMessage} The panel could not be refreshed right now.`);
  }

  return buildDiscordEphemeralMessageResponse(successMessage);
}

async function requireJoinedSpotifyRoom(args: {
  lobbyId: string;
  discordUserId: string;
}) {
  const membership = await getCurrentDiscordSpotifyRoomMembership(args);
  if (!membership) {
    throw new Error("Join Spotify Club first.");
  }

  return membership;
}

async function handleJamQueueInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This Spotify Club flow is only available in the configured server.");
  }

  const discordUser = resolveDiscordInteractionUser(interaction);
  const subcommand = extractDiscordCommandSubcommand(interaction.data?.options);
  const latestLobby = await getCurrentDiscordSpotifyLobbyForQueue();

  if (!discordUser.id || !subcommand?.name) {
    return buildDiscordEphemeralMessageResponse("Spotify Club could not read that queue command. Try again.");
  }

  if (!latestLobby) {
    return buildSpotifyQueueLobbyClosedResponse();
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;

  if (subcommand.name === FITNESS_JAM_QUEUE_SUGGEST_SUBCOMMAND_NAME) {
    const spotifyUrlOrUri = extractDiscordCommandStringOption(subcommand.options, FITNESS_JAM_QUEUE_TRACK_OPTION_NAME);
    if (!spotifyUrlOrUri) {
      return buildDiscordEphemeralMessageResponse("Paste a Spotify track URL or spotify:track URI.");
    }

    try {
      return await handleSpotifyQueueSuggestion({
        lobbyId: latestLobby.id,
        panelChannelId: latestLobby.panel_channel_id,
        discordUserId: discordUser.id,
        spotifyUrlOrUri,
        approvalMode: latestLobby.approval_mode,
        sourceType: "discord_link",
        canManageQueue: spotifyQueueManagementAllowed({
          permissions,
          discordUserId: discordUser.id,
          lobbyHostDiscordUserId: latestLobby.host_discord_user_id,
        }),
      });
    } catch (error) {
      return buildDiscordEphemeralMessageResponse(
        error instanceof Error ? error.message : "Spotify Club could not save that suggestion right now.",
      );
    }
  }

  if (subcommand.name === FITNESS_JAM_QUEUE_LIST_SUBCOMMAND_NAME) {
    return buildSpotifyQueueCommandListResponse(latestLobby.id, discordUser.id);
  }

  if (!spotifyQueueManagementAllowed({
    permissions,
    discordUserId: discordUser.id,
    lobbyHostDiscordUserId: latestLobby.host_discord_user_id,
  })) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to manage the Spotify Club queue.");
  }

  const itemIdOrPrefix = extractDiscordCommandStringOption(subcommand.options, FITNESS_JAM_QUEUE_ITEM_OPTION_NAME);
  const reason = extractDiscordCommandStringOption(subcommand.options, FITNESS_JAM_QUEUE_REASON_OPTION_NAME);
  if (!itemIdOrPrefix) {
    return buildDiscordEphemeralMessageResponse("Queue item id is required.");
  }

  try {
    if (subcommand.name === FITNESS_JAM_QUEUE_APPROVE_SUBCOMMAND_NAME) {
      const item = await approveDiscordSpotifyQueueItem({
        queueItemIdOrPrefix: itemIdOrPrefix,
        lobbyId: latestLobby.id,
        approvedByDiscordUserId: discordUser.id,
      });
      const syncResult = await syncDiscordSpotifyClubPanelFromState();
      await postSpotifyClubQueueAuditMessage({
        channelId: latestLobby.panel_channel_id,
        content: buildDiscordSpotifyQueueActionSummary({
          action: "approved",
          item,
          actorDiscordUserId: discordUser.id,
        }),
      });

      return buildDiscordEphemeralMessageResponse(
        syncResult.ok ? "Queue item approved." : "Queue item approved, but the panel could not be refreshed right now.",
      );
    }

    if (subcommand.name === FITNESS_JAM_QUEUE_REJECT_SUBCOMMAND_NAME) {
      const item = await rejectDiscordSpotifyQueueItem({
        queueItemIdOrPrefix: itemIdOrPrefix,
        lobbyId: latestLobby.id,
        rejectedByDiscordUserId: discordUser.id,
        reason,
      });
      const syncResult = await syncDiscordSpotifyClubPanelFromState();
      await postSpotifyClubQueueAuditMessage({
        channelId: latestLobby.panel_channel_id,
        content: buildDiscordSpotifyQueueActionSummary({
          action: "rejected",
          item,
          actorDiscordUserId: discordUser.id,
          reason,
        }),
      });

      return buildDiscordEphemeralMessageResponse(
        syncResult.ok ? "Queue item rejected." : "Queue item rejected, but the panel could not be refreshed right now.",
      );
    }

    if (subcommand.name === FITNESS_JAM_QUEUE_REMOVE_SUBCOMMAND_NAME) {
      const item = await removeDiscordSpotifyQueueItem({
        queueItemIdOrPrefix: itemIdOrPrefix,
        lobbyId: latestLobby.id,
        removedByDiscordUserId: discordUser.id,
        reason,
      });
      const syncResult = await syncDiscordSpotifyClubPanelFromState();
      await postSpotifyClubQueueAuditMessage({
        channelId: latestLobby.panel_channel_id,
        content: buildDiscordSpotifyQueueActionSummary({
          action: "removed",
          item,
          actorDiscordUserId: discordUser.id,
          reason,
        }),
      });

      return buildDiscordEphemeralMessageResponse(
        syncResult.ok ? "Queue item removed." : "Queue item removed, but the panel could not be refreshed right now.",
      );
    }
  } catch (error) {
    return buildDiscordEphemeralMessageResponse(
      error instanceof Error ? error.message : "Spotify Club could not update that queue item right now.",
    );
  }

  return buildDiscordEphemeralMessageResponse("That jam-queue command is not available in this phase yet.");
}

async function handleSpotifyQueueSuggestModalSubmit(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This Spotify Club flow is only available in the configured server.");
  }

  const discordUser = resolveDiscordInteractionUser(interaction);
  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  const latestLobby = await getCurrentDiscordSpotifyLobbyForQueue();
  const spotifyUrlOrUri = extractDiscordModalTextInputValue(interaction.data?.components, FITNESS_SPOTIFY_TRACK_INPUT_CUSTOM_ID);

  if (!discordUser.id || !spotifyUrlOrUri) {
    return buildDiscordEphemeralMessageResponse("Paste a Spotify track URL or spotify:track URI.");
  }

  if (!latestLobby) {
    return buildSpotifyQueueLobbyClosedResponse();
  }

  try {
    await requireJoinedSpotifyRoom({
      lobbyId: latestLobby.id,
      discordUserId: discordUser.id,
    });
    return await handleSpotifyQueueSuggestion({
      lobbyId: latestLobby.id,
      panelChannelId: latestLobby.panel_channel_id,
      discordUserId: discordUser.id,
      spotifyUrlOrUri,
      approvalMode: latestLobby.approval_mode,
      sourceType: "discord_link",
      canManageQueue: spotifyQueueManagementAllowed({
        permissions,
        discordUserId: discordUser.id,
        lobbyHostDiscordUserId: latestLobby.host_discord_user_id,
      }),
    });
  } catch (error) {
    return buildDiscordEphemeralMessageResponse(
      error instanceof Error ? error.message : "Spotify Club could not save that suggestion right now.",
    );
  }
}

async function handleSpotifyQueueSearchModalSubmit(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This Spotify Club flow is only available in the configured server.");
  }

  const discordUser = resolveDiscordInteractionUser(interaction);
  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  const latestLobby = await getCurrentDiscordSpotifyLobbyForQueue();
  const query = extractDiscordModalTextInputValue(interaction.data?.components, FITNESS_SPOTIFY_SEARCH_QUERY_INPUT_CUSTOM_ID);

  if (!discordUser.id || !query?.trim()) {
    return buildDiscordEphemeralMessageResponse("Enter a Spotify search query first.");
  }

  if (!latestLobby) {
    return buildSpotifyQueueLobbyClosedResponse();
  }

  try {
    await requireJoinedSpotifyRoom({
      lobbyId: latestLobby.id,
      discordUserId: discordUser.id,
    });

    if (/spotify:track:[A-Za-z0-9]{22}/i.test(query) || /open\.spotify\.com\/track\/[A-Za-z0-9]{22}/i.test(query)) {
      return await handleSpotifyQueueSuggestion({
        lobbyId: latestLobby.id,
        panelChannelId: latestLobby.panel_channel_id,
        discordUserId: discordUser.id,
        spotifyUrlOrUri: query,
        approvalMode: latestLobby.approval_mode,
        sourceType: "discord_link",
        canManageQueue: spotifyQueueManagementAllowed({
          permissions,
          discordUserId: discordUser.id,
          lobbyHostDiscordUserId: latestLobby.host_discord_user_id,
        }),
      });
    }

    const results = await searchSpotifyTracks(query, { limit: 10, market: "US" });
    const options = formatSearchResultsForDiscord(results);
    if (options.length === 0) {
      return buildDiscordEphemeralMessageResponse(`No Spotify tracks matched "${query.trim()}". Try a different search.`);
    }

    return buildDiscordSpotifyTrackSearchResultsResponse({
      query,
      options,
    });
  } catch (error) {
    return buildDiscordEphemeralMessageResponse(
      error instanceof Error ? error.message : "Spotify search could not be loaded right now.",
    );
  }
}

async function handleSpotifyClubButtonInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This Spotify Club flow is only available in the configured server.");
  }

  const discordUser = resolveDiscordInteractionUser(interaction);
  const customId = typeof interaction.data?.custom_id === "string" ? interaction.data.custom_id : null;
  const messageId = typeof interaction.message?.id === "string" ? interaction.message.id : null;
  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  const isEphemeralHubInteraction = isEphemeralSpotifyControlHubInteraction(interaction);

  if (!customId || !discordUser.id) {
    return buildSpotifyClubOutdatedPanelResponse();
  }

  const discordUserId = discordUser.id;
  const loadLatestLobby = () => getLatestDiscordSpotifyLobby();
  const loadOpenLobby = async () => {
    const lobby = await loadLatestLobby();
    return lobby?.status === "open" ? lobby : null;
  };
  const validateCanonicalPanelInteraction = async () => {
    if (isEphemeralHubInteraction) {
      return true;
    }
    const latestLobby = await loadLatestLobby();
    return Boolean(latestLobby?.panel_message_id && messageId && latestLobby.panel_message_id === messageId);
  };

  if (customId === FITNESS_SPOTIFY_QUEUE_SEARCH_SELECT_CUSTOM_ID) {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-search-select",
      fallback: async () => buildSpotifyControlHubResponseForUser({
        discordUserId,
        permissions,
        notice: "Spotify Club could not save that track right now. Try again in a moment.",
      }),
      process: async () => {
        const openLobby = await loadOpenLobby();
        if (!openLobby) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "Spotify Club lobby is Closed. Open a room before using the queue.",
          });
        }

        try {
          await requireJoinedSpotifyRoom({
            lobbyId: openLobby.id,
            discordUserId,
          });

          const spotifyUri = extractDiscordComponentSelectValue(interaction.data?.values);
          if (!spotifyUri) {
            return buildSpotifyControlHubEditBodyForUser({
              discordUserId,
              permissions,
              notice: "Choose a Spotify track result first.",
            });
          }

          const response = await handleSpotifyQueueSuggestion({
            lobbyId: openLobby.id,
            panelChannelId: openLobby.panel_channel_id,
            discordUserId,
            spotifyUrlOrUri: spotifyUri,
            approvalMode: openLobby.approval_mode,
            sourceType: "discord_search",
            canManageQueue: spotifyQueueManagementAllowed({
              permissions,
              discordUserId,
              lobbyHostDiscordUserId: openLobby.host_discord_user_id,
            }),
          });

          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: typeof response.data?.content === "string"
              ? response.data.content
              : "Track added to Spotify Club.",
          });
        } catch (error) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: error instanceof Error ? error.message : "Spotify Club could not save that suggestion right now.",
          });
        }
      },
      genericFailureContent: "Spotify Club could not save that track right now. Try again in a moment.",
    });
  }

  if (
    customId !== FITNESS_SPOTIFY_CONTROLS_OPEN_BUTTON_CUSTOM_ID
    && customId !== FITNESS_SPOTIFY_QUEUE_SEARCH_SELECT_CUSTOM_ID
    && !isEphemeralHubInteraction
  ) {
    return buildSpotifyClubOutdatedPanelResponse();
  }

  if (customId === FITNESS_SPOTIFY_CONTROLS_OPEN_BUTTON_CUSTOM_ID) {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-controls-open-button",
      fallback: async () => buildSpotifyControlHubResponseForUser({
        discordUserId,
        permissions,
        notice: "Spotify Club controls could not be opened right now. Try again in a moment.",
      }),
      process: async () => {
        if (!await validateCanonicalPanelInteraction()) {
          return "This Spotify Club panel is outdated. Ask staff to run /setup-spotify-club.";
        }

        return buildSpotifyControlHubEditBodyForUser({
          discordUserId,
          permissions,
        });
      },
      genericFailureContent: "Spotify Club controls could not be opened right now. Try again in a moment.",
    });
  }

  if (customId === FITNESS_SPOTIFY_CONNECT_BUTTON_CUSTOM_ID) {
    return buildSpotifyConnectResponse(discordUserId);
  }

  if (customId === FITNESS_SPOTIFY_JOIN_BUTTON_CUSTOM_ID) {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-controls-join-button",
      fallback: async () => buildSpotifyControlHubResponseForUser({
        discordUserId,
        permissions,
        notice: "Spotify Club could not update your room membership right now. Try again in a moment.",
      }),
      process: async () => {
        const openLobby = await loadOpenLobby();
        if (!openLobby) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "Spotify Club lobby is Closed. Open a room before joining.",
          });
        }

        const connection = await getDiscordSpotifyConnection(discordUserId);
        if (!connection) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "Connect Spotify first, then join Spotify Club.",
          });
        }

        await joinDiscordSpotifyRoom({
          lobbyId: openLobby.id,
          discordUserId,
          spotifyUserId: connection.spotify_user_id,
        });
        const syncResult = await syncDiscordSpotifyClubPanelFromState();
        return buildSpotifyControlHubEditBodyForUser({
          discordUserId,
          permissions,
          notice: syncResult.ok
            ? `You joined ${openLobby.room_name || "Spotify Club"}.`
            : `You joined ${openLobby.room_name || "Spotify Club"}, but the public panel could not be refreshed right now.`,
        });
      },
      genericFailureContent: "Spotify Club could not update your room membership right now. Try again in a moment.",
    });
  }

  if (customId === FITNESS_SPOTIFY_LEAVE_BUTTON_CUSTOM_ID) {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-controls-leave-button",
      fallback: async () => buildSpotifyControlHubResponseForUser({
        discordUserId,
        permissions,
        notice: "Spotify Club could not update your room membership right now. Try again in a moment.",
      }),
      process: async () => {
        const openLobby = await loadOpenLobby();
        if (!openLobby) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "Spotify Club lobby is Closed. There is no active room to leave right now.",
          });
        }

        const membership = await getCurrentDiscordSpotifyRoomMembership({
          lobbyId: openLobby.id,
          discordUserId,
        });
        if (!membership) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "You are not in Spotify Club right now.",
          });
        }

        await leaveDiscordSpotifyRoom({
          lobbyId: openLobby.id,
          discordUserId,
        });
        const syncResult = await syncDiscordSpotifyClubPanelFromState();
        return buildSpotifyControlHubEditBodyForUser({
          discordUserId,
          permissions,
          notice: syncResult.ok
            ? `You left ${openLobby.room_name || "Spotify Club"}.`
            : `You left ${openLobby.room_name || "Spotify Club"}, but the public panel could not be refreshed right now.`,
        });
      },
      genericFailureContent: "Spotify Club could not update your room membership right now. Try again in a moment.",
    });
  }

  if (customId === FITNESS_SPOTIFY_STATUS_BUTTON_CUSTOM_ID) {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-status-button",
      fallback: () => buildSpotifyStatusResponse(discordUserId),
      process: async () => buildSpotifyStatusHubEditBodyForUser({
        discordUserId,
        permissions,
      }),
      genericFailureContent: "Spotify status could not be loaded right now. Try again in a moment.",
    });
  }

  if (customId === FITNESS_SPOTIFY_DISCONNECT_AUTH_BUTTON_CUSTOM_ID || customId === "spotify_disconnect") {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-disconnect-auth-button",
      fallback: () => buildSpotifyDisconnectResponse(discordUserId),
      process: async () => {
        const openLobby = await loadOpenLobby();
        await disconnectDiscordSpotifyConnection(discordUserId);
        if (openLobby) {
          try {
            if (openLobby.host_discord_user_id === discordUserId) {
              await clearActiveDiscordSpotifyQueueItems({
                lobbyId: openLobby.id,
                reason: "host_disconnect",
              });
            }
            await leaveDiscordSpotifyRoom({
              lobbyId: openLobby.id,
              discordUserId,
            });
          } catch (error) {
            console.warn("[discord-interactions] spotify leave-room during auth disconnect skipped", {
              requestId: randomUUID(),
              lobbyId: openLobby.id,
              discordUserId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        const syncResult = await syncDiscordSpotifyClubPanelFromState().catch(() => ({ ok: false as const }));
        return buildSpotifyControlHubEditBodyForUser({
          discordUserId,
          permissions,
          notice: syncResult.ok
            ? "Spotify disconnected."
            : "Spotify disconnected, but the public panel could not be refreshed right now.",
        });
      },
      genericFailureContent: "Spotify could not be disconnected right now. Try again in a moment.",
    });
  }

  if (customId === FITNESS_SPOTIFY_QUEUE_SEARCH_BUTTON_CUSTOM_ID) {
    return buildDiscordSpotifyQueueSearchModalResponse();
  }

  if (customId === FITNESS_SPOTIFY_QUEUE_VIEW_BUTTON_CUSTOM_ID) {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-queue-view-button",
      fallback: async () => {
        const openLobby = await getCurrentDiscordSpotifyLobbyForQueue();
        if (!openLobby) {
          return buildSpotifyQueueLobbyClosedResponse();
        }

        return buildSpotifyQueueCommandListResponse(openLobby.id, discordUserId);
      },
      process: async () => {
        const openLobby = await getCurrentDiscordSpotifyLobbyForQueue();
        if (!openLobby) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "Spotify Club lobby is Closed. Open a room before using the queue.",
          });
        }

        const membership = await getCurrentDiscordSpotifyRoomMembership({
          lobbyId: openLobby.id,
          discordUserId,
        });
        if (!membership) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "Join Spotify Club first.",
          });
        }

        await syncSpotifyMirrorIfEnabled(openLobby).catch(() => null);
        return buildSpotifyControlHubEditBodyForUser({
          discordUserId,
          permissions,
          notice: await buildSpotifyQueueDetailText(openLobby.id, discordUserId),
        });
      },
      genericFailureContent: "Spotify Club queue could not be loaded right now. Try again in a moment.",
    });
  }

  if (customId === FITNESS_SPOTIFY_QUEUE_SUGGEST_BUTTON_CUSTOM_ID) {
    return buildDiscordSpotifyQueueSuggestModalResponse();
  }

  if (customId === FITNESS_SPOTIFY_DEVICE_CHECK_BUTTON_CUSTOM_ID) {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-device-check-button",
      fallback: () => buildSpotifyStatusResponse(discordUserId),
      process: async () => {
        const openLobby = await loadOpenLobby();
        if (!openLobby) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "Spotify Club lobby is Closed. Open a room before checking playback readiness.",
          });
        }

        const membership = await getCurrentDiscordSpotifyRoomMembership({
          lobbyId: openLobby.id,
          discordUserId,
        });
        if (!membership) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "Join Spotify Club first.",
          });
        }

        return buildSpotifyControlHubEditBodyForUser({
          discordUserId,
          permissions,
          notice: (
            await resolveSpotifyPlaybackReadiness({
              discordUserId,
              includeUpgradeLink: true,
            })
          ).content,
        });
      },
      genericFailureContent: "Spotify playback readiness could not be checked right now. Try again in a moment.",
    });
  }

  if (customId === FITNESS_SPOTIFY_START_QUEUE_BUTTON_CUSTOM_ID) {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-start-queue-button",
      fallback: async () => buildDiscordEphemeralMessageResponse("Spotify playback could not be started right now. Try again in a moment."),
      process: async () => {
        const openLobby = await loadOpenLobby();
        if (!openLobby) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "Spotify Club lobby is Closed. Open a room before starting playback.",
          });
        }

        const membership = await getCurrentDiscordSpotifyRoomMembership({
          lobbyId: openLobby.id,
          discordUserId,
        });
        if (!membership) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "Join Spotify Club first.",
          });
        }

        return buildSpotifyControlHubEditBodyForUser({
          discordUserId,
          permissions,
          notice: await buildSpotifyStartQueueResponse(discordUserId),
        });
      },
      genericFailureContent: "Spotify playback could not be started right now. Try again in a moment.",
    });
  }

  if (customId === FITNESS_SPOTIFY_ROOM_OPEN_BUTTON_CUSTOM_ID) {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-room-open-button",
      fallback: async () => buildSpotifyControlHubResponseForUser({
        discordUserId,
        permissions,
        notice: "Spotify Club could not open the room right now. Try again in a moment.",
      }),
      process: async () => {
        const latestLobby = await loadLatestLobby();
        if (!spotifyQueueManagementAllowed({
          permissions,
          discordUserId,
          lobbyHostDiscordUserId: latestLobby?.status === "open" ? latestLobby.host_discord_user_id : null,
        })) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "You do not have permission to manage the Spotify Club room.",
          });
        }

        const connection = await getDiscordSpotifyConnection(discordUserId);
        await openDiscordSpotifyLobby({
          hostDiscordUserId: discordUserId,
          hostSpotifyUserId: connection?.spotify_user_id ?? null,
          spotifyMirrorEnabled: Boolean(connection?.is_premium && hasSpotifyPlaybackScopes(connection.scopes)),
        });
        const syncResult = await syncDiscordSpotifyClubPanelFromState();
        return buildSpotifyControlHubEditBodyForUser({
          discordUserId,
          permissions,
          notice: syncResult.ok
            ? "Spotify Club room is now Open."
            : "Spotify Club room is now Open, but the public panel could not be refreshed right now.",
        });
      },
      genericFailureContent: "Spotify Club could not open the room right now. Try again in a moment.",
    });
  }

  if (customId === FITNESS_SPOTIFY_ROOM_CLOSE_BUTTON_CUSTOM_ID) {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-room-close-button",
      fallback: async () => buildSpotifyControlHubResponseForUser({
        discordUserId,
        permissions,
        notice: "Spotify Club could not close the room right now. Try again in a moment.",
      }),
      process: async () => {
        const openLobby = await loadOpenLobby();
        if (!spotifyQueueManagementAllowed({
          permissions,
          discordUserId,
          lobbyHostDiscordUserId: openLobby?.host_discord_user_id,
        })) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "You do not have permission to manage the Spotify Club room.",
          });
        }

        await closeSpotifyRoomWithCleanup();
        const syncResult = await syncDiscordSpotifyClubPanelFromState();
        return buildSpotifyControlHubEditBodyForUser({
          discordUserId,
          permissions,
          notice: syncResult.ok
            ? "Spotify Club room is now Closed."
            : "Spotify Club room is now Closed, but the public panel could not be refreshed right now.",
        });
      },
      genericFailureContent: "Spotify Club could not close the room right now. Try again in a moment.",
    });
  }

  if (customId === FITNESS_SPOTIFY_APPROVAL_MODE_TOGGLE_BUTTON_CUSTOM_ID) {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-approval-mode-toggle-button",
      fallback: async () => buildSpotifyControlHubResponseForUser({
        discordUserId,
        permissions,
        notice: "Spotify Club approval mode could not be updated right now. Try again in a moment.",
      }),
      process: async () => {
        const lobby = await getLatestDiscordSpotifyLobby();
        if (!lobby) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "Spotify Club room settings are not available yet.",
          });
        }

        if (!spotifyQueueManagementAllowed({
          permissions,
          discordUserId,
          lobbyHostDiscordUserId: lobby.host_discord_user_id,
        })) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "You do not have permission to manage the Spotify Club room.",
          });
        }

        const nextMode: DiscordSpotifyApprovalMode = lobby.approval_mode === "auto_approve_jam_ready"
          ? "review"
          : lobby.approval_mode === "review"
            ? "host_only"
            : "auto_approve_jam_ready";
        await updateDiscordSpotifyLobbySettings({
          lobbyId: lobby.id,
          approvalMode: nextMode,
        });
        await syncDiscordSpotifyClubPanelFromState().catch(() => ({ ok: false as const }));

        return buildSpotifyControlHubEditBodyForUser({
          discordUserId,
          permissions,
          notice: nextMode === "auto_approve_jam_ready"
            ? "Approval mode is now Auto for Jam Ready users. New Jam Ready adds go straight into the queue."
            : nextMode === "review"
              ? "Approval mode is now Review. New adds wait for host approval."
              : "Approval mode is now Host Only. Only the host or staff can add tracks.",
        });
      },
      genericFailureContent: "Spotify Club approval mode could not be updated right now. Try again in a moment.",
    });
  }

  if (customId === FITNESS_SPOTIFY_MIRROR_TOGGLE_BUTTON_CUSTOM_ID || customId === FITNESS_SPOTIFY_MIRROR_REFRESH_BUTTON_CUSTOM_ID) {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-mirror-button",
      fallback: async () => buildSpotifyControlHubResponseForUser({
        discordUserId,
        permissions,
        notice: "Spotify live queue mirror could not be updated right now. Try again in a moment.",
      }),
      process: async () => {
        const lobby = await getCurrentDiscordSpotifyLobbyForQueue();
        if (!lobby) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "Spotify Club lobby is Closed. Open a room before using live queue mirror.",
          });
        }

        if (!spotifyQueueManagementAllowed({
          permissions,
          discordUserId,
          lobbyHostDiscordUserId: lobby.host_discord_user_id,
        })) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "You do not have permission to manage the Spotify Club room.",
          });
        }

        const nextEnabled = customId === FITNESS_SPOTIFY_MIRROR_REFRESH_BUTTON_CUSTOM_ID
          ? lobby.spotify_mirror_enabled
          : !lobby.spotify_mirror_enabled;
        const updatedLobby = await updateDiscordSpotifyLobbySettings({
          lobbyId: lobby.id,
          spotifyMirrorEnabled: nextEnabled,
        });
        const syncResult = nextEnabled ? await syncSpotifyMirrorForLobby(updatedLobby) : null;
        await syncDiscordSpotifyClubPanelFromState().catch(() => ({ ok: false as const }));

        return buildSpotifyControlHubEditBodyForUser({
          discordUserId,
          permissions,
          notice: nextEnabled
            ? syncResult?.ok
              ? `Live Spotify mirror synced ${syncResult.queueSize} queued tracks.`
              : syncResult?.message ?? "Live Spotify mirror is on. It will sync when Spotify is available."
            : "Live Spotify mirror is off.",
        });
      },
      genericFailureContent: "Spotify live queue mirror could not be updated right now. Try again in a moment.",
    });
  }

  if (customId === FITNESS_SPOTIFY_QUEUE_PENDING_APPROVE_BUTTON_CUSTOM_ID || customId === FITNESS_SPOTIFY_QUEUE_PENDING_REJECT_BUTTON_CUSTOM_ID) {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-pending-action-button",
      fallback: async () => buildSpotifyControlHubResponseForUser({
        discordUserId,
        permissions,
        notice: "Spotify Club pending suggestion could not be updated right now. Try again in a moment.",
      }),
      process: async () => {
        const lobby = await getCurrentDiscordSpotifyLobbyForQueue();
        if (!lobby) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "Spotify Club lobby is Closed. Open a room before reviewing pending suggestions.",
          });
        }

        if (!spotifyQueueManagementAllowed({
          permissions,
          discordUserId,
          lobbyHostDiscordUserId: lobby.host_discord_user_id,
        })) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "You do not have permission to manage the Spotify Club queue.",
          });
        }

        const summary = await getDiscordSpotifyQueueSummary({ lobbyId: lobby.id });
        const nextPending = summary.pendingItems[0];
        if (!nextPending) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "No pending suggestions need review.",
          });
        }

        const item = customId === FITNESS_SPOTIFY_QUEUE_PENDING_APPROVE_BUTTON_CUSTOM_ID
          ? await approveDiscordSpotifyQueueItem({
            queueItemIdOrPrefix: nextPending.id,
            lobbyId: lobby.id,
            approvedByDiscordUserId: discordUserId,
          })
          : await rejectDiscordSpotifyQueueItem({
            queueItemIdOrPrefix: nextPending.id,
            lobbyId: lobby.id,
            rejectedByDiscordUserId: discordUserId,
            reason: "Rejected from Spotify Club controls.",
          });
        await syncDiscordSpotifyClubPanelFromState().catch(() => ({ ok: false as const }));

        return buildSpotifyControlHubEditBodyForUser({
          discordUserId,
          permissions,
          notice: buildDiscordSpotifyQueueActionSummary({
            action: customId === FITNESS_SPOTIFY_QUEUE_PENDING_APPROVE_BUTTON_CUSTOM_ID ? "approved" : "rejected",
            item,
            actorDiscordUserId: discordUserId,
          }),
        });
      },
      genericFailureContent: "Spotify Club pending suggestion could not be updated right now. Try again in a moment.",
    });
  }

  if (customId === FITNESS_SPOTIFY_QUEUE_PENDING_VIEW_BUTTON_CUSTOM_ID) {
    return buildDeferredDiscordEphemeralInteractionResponse({
      interaction,
      actionLabel: "spotify-pending-queue-button",
      fallback: async () => buildSpotifyControlHubResponseForUser({
        discordUserId,
        permissions,
        notice: "Spotify Club pending suggestions could not be loaded right now. Try again in a moment.",
      }),
      process: async () => {
        const openLobby = await loadOpenLobby();
        if (!openLobby) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "Spotify Club lobby is Closed. Open a room before reviewing pending suggestions.",
          });
        }

        if (!spotifyQueueManagementAllowed({
          permissions,
          discordUserId,
          lobbyHostDiscordUserId: openLobby.host_discord_user_id,
        })) {
          return buildSpotifyControlHubEditBodyForUser({
            discordUserId,
            permissions,
            notice: "You do not have permission to manage the Spotify Club queue.",
          });
        }

        return buildSpotifyControlHubEditBodyForUser({
          discordUserId,
          permissions,
          notice: buildDiscordSpotifyQueueSummaryTextForViewer(
            await getDiscordSpotifyQueueSummary({ lobbyId: openLobby.id }),
            discordUserId,
          ),
        });
      },
      genericFailureContent: "Spotify Club pending suggestions could not be loaded right now. Try again in a moment.",
    });
  }

  return buildSpotifyClubOutdatedPanelResponse();
}

async function handleVerifyModalSubmit(interaction: DiscordInteraction) {
  const requestId = randomUUID();

  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This verification flow is only available in the configured server.");
  }

  const token = extractDiscordModalTextInputValue(interaction.data?.components);
  const discordUser = resolveDiscordInteractionUser(interaction);

  if (!token || !discordUser.id) {
    return buildDiscordEphemeralMessageResponse("That token is invalid or expired. Generate a fresh token in Fitness and try again.");
  }

  const verificationResult = await consumeDiscordVerificationTokenForDiscordUser({
    token,
    discordUserId: discordUser.id,
    discordUsername: discordUser.username ?? discordUser.globalName,
  });

  if (!verificationResult.ok && (
    verificationResult.code === "DISCORD_VERIFICATION_INVALID_INPUT"
    || verificationResult.code === "DISCORD_VERIFICATION_INVALID_OR_EXPIRED"
  )) {
    return buildDiscordEphemeralMessageResponse("That token is invalid or expired. Generate a fresh token in Fitness and try again.");
  }

  if (!verificationResult.ok) {
    return buildDiscordEphemeralMessageResponse("Fitness could not verify that token right now. Try again in a moment.");
  }

  const verifiedRoleGrantedAt = new Date().toISOString();
  const addRoleResult = await addDiscordGuildMemberRole({
    guildId: DISCORD_GUILD_ID(),
    userId: verificationResult.discordUserId,
    roleId: DISCORD_VERIFIED_ROLE_ID(),
  });

  if (!addRoleResult.ok) {
    const assignmentDiagnosis = await diagnoseVerifiedRoleAssignmentFailure({
      targetDiscordUserId: verificationResult.discordUserId,
      addRoleResult,
    });

    console.error("[discord-interactions] role assignment failed", {
      requestId,
      code: addRoleResult.code,
      status: addRoleResult.status,
      message: addRoleResult.message,
      diagnostics: assignmentDiagnosis.diagnostics,
    });

    if (!assignmentDiagnosis.alreadyHasRole) {
      return buildDiscordEphemeralMessageResponse(
        assignmentDiagnosis.message
        ?? "Fitness verified your token, but Discord rejected the Verified role update. Try again in a moment.",
      );
    }
  }

  const unverifiedRoleId = DISCORD_UNVERIFIED_ROLE_ID();
  if (unverifiedRoleId) {
    const removeRoleResult = await removeDiscordGuildMemberRole({
      guildId: DISCORD_GUILD_ID(),
      userId: verificationResult.discordUserId,
      roleId: unverifiedRoleId,
    });

    if (!removeRoleResult.ok) {
      console.error("[discord-interactions] unverified role removal failed", {
        requestId,
        code: removeRoleResult.code,
        status: removeRoleResult.status,
        message: removeRoleResult.message,
      });
    }
  }

  const shouldDisplayMemberNumber = shouldDisplayDiscordMemberNumber({
    userKind: verificationResult.userKind,
    userNumber: verificationResult.userNumber,
  });

  let nicknameSyncStatus: "synced" | "failed" | "skipped" = shouldDisplayMemberNumber ? "failed" : "skipped";
  let nicknameSyncedAt: string | null = null;
  let lastErrorCode: string | null = null;

  if (shouldDisplayMemberNumber) {
    const nickname = formatDiscordMemberNickname({
      userNumber: verificationResult.userNumber as number,
      currentDisplayName: discordUser.currentDisplayName,
    });

    const nicknameResult = await updateDiscordGuildMemberNickname({
      guildId: DISCORD_GUILD_ID(),
      userId: verificationResult.discordUserId,
      nickname,
    });

    if (nicknameResult.ok) {
      nicknameSyncStatus = "synced";
      nicknameSyncedAt = new Date().toISOString();
    } else {
      nicknameSyncStatus = "failed";
      lastErrorCode = nicknameResult.code;

      console.error("[discord-interactions] nickname sync failed", {
        requestId,
        code: nicknameResult.code,
        status: nicknameResult.status,
        message: nicknameResult.message,
      });
    }
  }

  const memberLinkResult = await upsertDiscordMemberLink({
    fitnessUserId: verificationResult.fitnessUserId,
    discordUserId: verificationResult.discordUserId,
    discordUsername: verificationResult.discordUsername ?? discordUser.globalName,
    userNumber: verificationResult.userNumber,
    userKind: verificationResult.userKind ?? "unknown",
    verifiedRoleGrantedAt,
    nicknameSyncStatus,
    nicknameSyncedAt,
    lastErrorCode,
  });

  if (!memberLinkResult.ok) {
    console.error("[discord-interactions] member link upsert failed", {
      requestId,
      code: memberLinkResult.code,
      fitnessUserId: verificationResult.fitnessUserId,
      discordUserId: verificationResult.discordUserId,
    });
  }

  if (shouldDisplayMemberNumber && nicknameSyncStatus === "synced") {
    return buildDiscordEphemeralMessageResponse(`Verified as Member ${verificationResult.userNumber}. You now have access to the server.`);
  }

  if (shouldDisplayMemberNumber) {
    return buildDiscordEphemeralMessageResponse(`Verified as Member ${verificationResult.userNumber}. Your access is active, but Discord could not update your nickname.`);
  }

  return buildDiscordEphemeralMessageResponse("Verified. You now have access to the server.");
}

async function processFeedbackCreateModalSubmit(
  interaction: DiscordInteraction,
  reportTypeOverride?: "bug" | "feature" | null,
): Promise<string> {
  const reportType = reportTypeOverride
    ?? resolveDiscordFeedbackReportTypeFromModalCustomId(
      typeof interaction.data?.custom_id === "string" ? interaction.data.custom_id : null,
    )
    ?? normalizeDiscordFeedbackReportType(
      extractDiscordModalStringSelectValue(interaction.data?.components, FITNESS_FEEDBACK_PANEL_TYPE_INPUT_CUSTOM_ID)
      ?? extractDiscordModalTextInputValue(interaction.data?.components, FITNESS_FEEDBACK_PANEL_TYPE_INPUT_CUSTOM_ID),
    );

  if (!reportType) {
    return "Choose Bug or Feature for the feedback type.";
  }

  if (!interactionMatchesGuild(interaction)) {
    return "This feedback flow is only available in the configured server.";
  }

  const discordUser = resolveDiscordInteractionUser(interaction);
  if (!discordUser.id) {
    return "Could not save that feedback report right now. Try again in a moment.";
  }

  const attachmentResult = extractValidatedFeedbackAttachments(interaction);
  if (!attachmentResult.ok) {
    return attachmentResult.message;
  }

  await validateDiscordFeedbackEmojis();
  const creationResult = await createDiscordBugReport({
    interactionId: typeof interaction.id === "string" ? interaction.id : null,
    reporterDiscordUserId: discordUser.id,
    reporterDiscordUsername: discordUser.username ?? discordUser.globalName,
    reportType,
    modalFields: extractDiscordBugReportModalFields(interaction.data?.components, extractDiscordModalTextInputValue),
    attachments: attachmentResult.attachments,
  });

  if (!creationResult.ok) {
    if (creationResult.code === "DISCORD_BUG_REPORT_RATE_LIMITED") {
      return "You have submitted several reports recently. Please wait a few minutes before sending another.";
    }

    if (creationResult.code === "DISCORD_BUG_REPORT_INVALID_INPUT") {
      return attachmentResult.attachments.length > 0
        ? "Upload up to 3 PNG, JPG, WEBP, or GIF images under 8 MB each."
        : "Could not save that feedback report right now. Try again in a moment.";
    }

    return "Could not save that feedback report right now. Try again in a moment.";
  }

  const reporterLabel = buildDiscordBugReporterLabel({
    reporterDiscordUsername: discordUser.username ?? discordUser.globalName,
    reporterMemberNumber: creationResult.reporterLink.memberNumber,
  });
  const forumChannelId = DISCORD_BUG_REPORT_FORUM_CHANNEL_ID();
  let forumThreadCreationFailed = false;

  if (forumChannelId && creationResult.duplicate && creationResult.report.discord_forum_thread_id) {
    try {
      const duplicateReplyResult = await postFeedbackAuditComment({
        report: creationResult.report,
        action: "duplicate_signal",
        duplicateCount: creationResult.report.duplicate_count,
      });

      if (!duplicateReplyResult.ok) {
        logDiscordFeedbackSoftFailure({
          stage: "duplicate-reply",
          reportId: creationResult.report.id,
        });
      }
    } catch (error) {
      logDiscordFeedbackSoftFailure({
        stage: "duplicate-reply",
        reportId: creationResult.report.id,
        error,
      });
    }
  }

  if (forumChannelId && !creationResult.duplicate) {
    const forumTitle = buildDiscordBugForumThreadTitle({
      reportType: creationResult.report.report_type,
      area: creationResult.report.area,
      summary: creationResult.report.summary,
    });
    let matchedTagIds: string[] | null = null;
    try {
      const tagResolutionResult = await resolveDiscordForumTagIdsByName({
        channelId: forumChannelId,
        tagNames: buildDiscordBugForumTagNames({
          reportType: creationResult.report.report_type,
          status: creationResult.report.status,
          severity: creationResult.report.severity,
          includeBacklog: shouldApplyDiscordFeedbackBacklogTag(creationResult.report),
        }),
      });

      if (tagResolutionResult.ok) {
        matchedTagIds = tagResolutionResult.matchedTagIds;
        if (tagResolutionResult.missingTagNames.length > 0) {
          console.warn("[discord-interactions] feedback forum tags missing", {
            requestId: randomUUID(),
            reportId: creationResult.report.id,
            missingTagNames: tagResolutionResult.missingTagNames,
          });
        }
      } else {
        logDiscordFeedbackSoftFailure({
          stage: "tag-resolution",
          reportId: creationResult.report.id,
          code: tagResolutionResult.code,
          status: tagResolutionResult.status,
          message: tagResolutionResult.message,
        });
      }

      const createForumThread = async (appliedTagIds?: string[]) =>
        createDiscordForumThreadWithMessage({
          channelId: forumChannelId,
          threadName: forumTitle,
          messageContent: buildDiscordBugForumThreadBody({
            report: creationResult.report,
            reporterLabel,
          }),
          appliedTagIds,
          allowedMentions: buildDiscordAllowedMentions({
            reporterDiscordUserId: creationResult.report.reporter_discord_user_id,
            includeReporter: true,
          }),
        });

      let appliedTagIdsUsed = matchedTagIds;
      let forumThreadResult = await createForumThread(appliedTagIdsUsed ?? undefined);

      if (!forumThreadResult.ok && /<:/.test(buildDiscordBugForumThreadBody({
        report: creationResult.report,
        reporterLabel,
      }))) {
        logDiscordFeedbackSoftFailure({
          stage: "thread-create-with-emoji",
          reportId: creationResult.report.id,
          code: forumThreadResult.code,
          status: forumThreadResult.status,
          message: forumThreadResult.message,
        });
        forumThreadResult = await createDiscordForumThreadWithMessage({
          channelId: forumChannelId,
          threadName: forumTitle,
          messageContent: buildDiscordBugForumThreadBody({
            report: creationResult.report,
            reporterLabel,
          }).replace(/<:[A-Za-z0-9_]+:\d+>\s*/g, ""),
          appliedTagIds: appliedTagIdsUsed ?? undefined,
          allowedMentions: buildDiscordAllowedMentions({
            reporterDiscordUserId: creationResult.report.reporter_discord_user_id,
            includeReporter: true,
          }),
        });
      }

      if (!forumThreadResult.ok && matchedTagIds && matchedTagIds.length > 0) {
        logDiscordFeedbackSoftFailure({
          stage: "thread-create-with-tags",
          reportId: creationResult.report.id,
          code: forumThreadResult.code,
          status: forumThreadResult.status,
          message: forumThreadResult.message,
        });
        appliedTagIdsUsed = null;
        forumThreadResult = await createForumThread();
      }

      if (!forumThreadResult.ok) {
        forumThreadCreationFailed = true;
        logDiscordFeedbackSoftFailure({
          stage: "thread-create",
          reportId: creationResult.report.id,
          code: forumThreadResult.code,
          status: forumThreadResult.status,
          message: forumThreadResult.message,
        });
      } else if (!forumThreadResult.threadId) {
        forumThreadCreationFailed = true;
        logDiscordFeedbackSoftFailure({
          stage: "thread-create",
          reportId: creationResult.report.id,
          code: "DISCORD_CREATE_FORUM_THREAD_FAILED",
          message: "Discord did not return a forum thread id.",
        });
      } else {
        const forumUpdateResult = await recordDiscordBugReportForumThread({
          reportId: creationResult.report.id,
          forumChannelId,
          forumThreadId: forumThreadResult.threadId,
          forumMessageId: forumThreadResult.messageId,
          forumTitle,
          forumAppliedTagIds: appliedTagIdsUsed,
          reporterMentionedAt: new Date().toISOString(),
        });

        if (!forumUpdateResult.ok) {
          logDiscordFeedbackSoftFailure({
            stage: "thread-metadata-update",
            reportId: creationResult.report.id,
            code: forumUpdateResult.code,
          });
        }
      }
    } catch (error) {
      forumThreadCreationFailed = true;
      logDiscordFeedbackSoftFailure({
        stage: "thread-create",
        reportId: creationResult.report.id,
        error,
      });
    }
  }

  if (creationResult.duplicate) {
    return "Feedback received. It looks similar to an existing report, so we added your signal to that issue.";
  }

  if (forumThreadCreationFailed) {
    return "Feedback received, but Discord could not create the forum post yet. The team can still review it.";
  }

  return "Feedback received. Thanks for helping improve Fitness.";
}

async function handleFeedbackCreateModalSubmit(
  interaction: DiscordInteraction,
  reportTypeOverride?: "bug" | "feature" | null,
) {
  return buildDiscordEphemeralMessageResponse(
    await processFeedbackCreateModalSubmit(interaction, reportTypeOverride),
  );
}

async function handleDeferredFeedbackCreateModalSubmit(
  interaction: DiscordInteraction,
  reportTypeOverride?: "bug" | "feature" | null,
) {
  return buildDeferredDiscordEphemeralInteractionResponse({
    interaction,
    actionLabel: "feedback-submit",
    fallback: async () => handleFeedbackCreateModalSubmit(interaction, reportTypeOverride),
    genericFailureContent: "Could not save that feedback report right now. Try again in a moment.",
    process: async () => processFeedbackCreateModalSubmit(interaction, reportTypeOverride),
  });
}

async function handleBugStatusInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This feedback flow is only available in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasBugStatusPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to update feedback.");
  }

  const staffUser = resolveDiscordInteractionUser(interaction);
  const reportIdOrPrefix = extractDiscordCommandStringOption(interaction.data?.options, FITNESS_BUG_STATUS_REPORT_ID_OPTION_NAME);
  const status = normalizeDiscordBugReportStatus(
    extractDiscordCommandStringOption(interaction.data?.options, FITNESS_BUG_STATUS_STATUS_OPTION_NAME),
  );
  const note = extractDiscordCommandStringOption(interaction.data?.options, FITNESS_BUG_STATUS_NOTE_OPTION_NAME);

  if (!staffUser.id || !reportIdOrPrefix || !status) {
    return buildDiscordEphemeralMessageResponse("Could not update that feedback.");
  }

  const lookupResult = await findDiscordBugReportByIdOrPrefix({ reportIdOrPrefix });
  if (!lookupResult.ok) {
    if (lookupResult.code === "DISCORD_BUG_REPORT_AMBIGUOUS_ID") {
      return buildDiscordEphemeralMessageResponse("That report id matched multiple feedback reports. Copy the full Report ID from the forum post.");
    }

    return buildDiscordEphemeralMessageResponse("Could not find that feedback report. Copy the Report ID from the forum post and try again.");
  }

  const statusUpdateResult = await updateDiscordBugReportStatus({
    reportId: lookupResult.report.id,
    status,
    note,
    updatedByDiscordUserId: staffUser.id,
  });

  if (!statusUpdateResult.ok) {
    return buildDiscordEphemeralMessageResponse("Could not update that feedback right now.");
  }

  let updatedReport = statusUpdateResult.report;
  const completionReviewUpdate = deriveCompletionReviewUpdate({
    previousReport: lookupResult.report,
    nextStatus: updatedReport.status,
  });
  if (completionReviewUpdate) {
    const completionReviewResult = await updateDiscordFeedbackCompletionReview({
      reportId: updatedReport.id,
      completionReviewStatus: completionReviewUpdate.completionReviewStatus,
      reviewedByDiscordUserId: staffUser.id,
      note: completionReviewUpdate.completionReviewNote,
    });

    if (!completionReviewResult.ok) {
      return buildDiscordEphemeralMessageResponse("Could not update that feedback right now.");
    }

    updatedReport = completionReviewResult.report;
  }

  const includeReporterMention = status === "needs_info" || status === "fixed" || status === "closed";
  let forumSyncFailed = (await syncDiscordFeedbackForumThread({
    report: updatedReport,
  })).forumSyncFailed;

  if (updatedReport.discord_forum_thread_id && updatedReport.discord_forum_message_id) {
    const reporterLabel = buildDiscordBugReporterLabel({
      reporterDiscordUsername: updatedReport.reporter_discord_username,
      reporterMemberNumber: updatedReport.reporter_member_number,
    });
    const patchStarterMessageResult = await patchDiscordChannelMessage({
      channelId: updatedReport.discord_forum_thread_id,
      messageId: updatedReport.discord_forum_message_id,
      body: {
        content: buildDiscordBugForumThreadBody({
          report: updatedReport,
          reporterLabel,
        }),
        allowed_mentions: buildDiscordAllowedMentions({
          reporterDiscordUserId: updatedReport.reporter_discord_user_id,
          includeReporter: false,
        }),
      },
    });

    if (!patchStarterMessageResult.ok) {
      forumSyncFailed = true;
      console.error("[discord-interactions] feedback forum starter message patch failed", {
        requestId: randomUUID(),
        reportId: updatedReport.id,
        code: patchStarterMessageResult.code,
        status: patchStarterMessageResult.status,
        message: patchStarterMessageResult.message,
      });
    }
  }

  if (updatedReport.discord_forum_thread_id) {
    const auditCommentResult = await postFeedbackAuditComment({
      report: updatedReport,
      action: "status_update",
      actorLabel: "Fawx Security",
      includeReporterMention,
      statusBefore: lookupResult.report.status,
      statusAfter: updatedReport.status,
      completionReviewStatus: updatedReport.completion_review_status,
      note: updatedReport.status_note,
    });
    if (!auditCommentResult.ok) {
      forumSyncFailed = true;
    }
  }

  if (updatedReport.discord_forum_thread_id && shouldArchiveFeedbackThread(updatedReport.status)) {
    const archiveResult = await updateDiscordForumThreadArchiveState({
      threadId: updatedReport.discord_forum_thread_id,
      archived: true,
      locked: true,
    });

    if (!archiveResult.ok) {
      forumSyncFailed = true;
      console.error("[discord-interactions] feedback forum archive update failed", {
        requestId: randomUUID(),
        reportId: updatedReport.id,
        code: archiveResult.code,
        status: archiveResult.status,
        message: archiveResult.message,
      });
    }
  }

  const resolvedReactionResult = await ensureDiscordResolvedFeedbackReaction({
    report: updatedReport,
  });

  return buildDiscordEphemeralMessageResponse(appendDiscordFeedbackWarning(
    forumSyncFailed
      ? `Feedback updated, but the forum thread could not be fully synced. (${formatDiscordBugReportShortId(updatedReport.id)})`
      : "Feedback updated.",
    resolvedReactionResult.warning,
  ));
}

async function handleFeedbackCompletionReviewInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This feedback flow is only available in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasBugStatusPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to review completed feedback.");
  }

  const reviewer = resolveDiscordInteractionUser(interaction);
  const reportIdOrPrefix = extractDiscordCommandStringOption(interaction.data?.options, FITNESS_BUG_STATUS_REPORT_ID_OPTION_NAME);
  const decision = normalizeDiscordCompletionReviewStatus(
    extractDiscordCommandStringOption(interaction.data?.options, FITNESS_FEEDBACK_COMPLETION_REVIEW_DECISION_OPTION_NAME),
  );
  const note = extractDiscordCommandStringOption(interaction.data?.options, FITNESS_BUG_STATUS_NOTE_OPTION_NAME);

  if (!reviewer.id || !reportIdOrPrefix || (decision !== "approved" && decision !== "needs_followup")) {
    return buildDiscordEphemeralMessageResponse("Could not update that completion review.");
  }

  const lookupResult = await findDiscordBugReportByIdOrPrefix({ reportIdOrPrefix });
  if (!lookupResult.ok) {
    if (lookupResult.code === "DISCORD_BUG_REPORT_AMBIGUOUS_ID") {
      return buildDiscordEphemeralMessageResponse("That report id matched multiple feedback reports. Copy the full Report ID from the forum post.");
    }

    return buildDiscordEphemeralMessageResponse("Could not find that feedback report. Copy the Report ID from the forum post and try again.");
  }

  const reviewResult = await updateDiscordFeedbackCompletionReview({
    reportId: lookupResult.report.id,
    completionReviewStatus: decision,
    reviewedByDiscordUserId: reviewer.id,
    note,
  });
  if (!reviewResult.ok) {
    return buildDiscordEphemeralMessageResponse("Could not update that completion review right now.");
  }

  let forumSyncFailed = false;
  if (reviewResult.report.discord_forum_thread_id) {
    const auditCommentResult = await postFeedbackAuditComment({
      report: reviewResult.report,
      action: "completion_review",
      actorLabel: "Fawx Security",
      completionReviewStatus: decision,
      note: reviewResult.report.completion_review_note,
    });
    if (!auditCommentResult.ok) {
      forumSyncFailed = true;
    }
  }

  const resolvedReactionResult = decision === "approved"
    ? await ensureDiscordResolvedFeedbackReaction({
      report: reviewResult.report,
    })
    : { warning: null };

  const decisionLabel = formatDiscordCompletionReviewStatusLabel(decision);
  return buildDiscordEphemeralMessageResponse(appendDiscordFeedbackWarning(
    forumSyncFailed
      ? `Completion review updated, but the forum thread could not be fully synced. (${formatDiscordBugReportShortId(reviewResult.report.id)})`
      : `Completion review updated. Status: ${decisionLabel}.`,
    resolvedReactionResult.warning,
  ));
}

function summarizeFeedbackContentChanges(args: {
  before: DiscordBugReportRow;
  after: DiscordBugReportRow;
}) {
  const changedFields: string[] = [];
  if ((args.before.summary ?? "") !== (args.after.summary ?? "")) {
    changedFields.push("Title");
  }
  if ((args.before.area ?? "") !== (args.after.area ?? "")) {
    changedFields.push("Area");
  }
  if ((args.before.details ?? "") !== (args.after.details ?? "")) {
    changedFields.push("Description");
  }

  return changedFields.length > 0 ? `Edited fields: ${changedFields.join(", ")}.` : "Card content refreshed.";
}

async function buildFeedbackUpdatePickerOpenResponse(interaction: DiscordInteraction) {
  const requester = resolveDiscordInteractionUser(interaction);
  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  const recentReports = await loadRecentFeedbackReportOptions({
    reporterDiscordUserId: requester.id,
    includeAllReports: canAccessAnyFeedbackReport(permissions),
    excludedStatuses: ["duplicate", "spam", "withdrawn"],
  });

  if (!recentReports || recentReports.length === 0) {
    return buildDiscordEphemeralMessageResponse("No editable feedback cards are available right now.");
  }

  return buildDiscordFeedbackUpdatePickerResponse({
    recentReports,
  });
}

async function buildFeedbackManageCardSelectionResponse(args: {
  interaction: DiscordInteraction;
  reportIdOrPrefix: string | null;
}) {
  if (!interactionMatchesGuild(args.interaction)) {
    return buildDiscordEphemeralMessageResponse("This feedback flow is only available in the configured server.");
  }

  const requester = resolveDiscordInteractionUser(args.interaction);
  const permissions = typeof args.interaction.member?.permissions === "string" ? args.interaction.member.permissions : null;
  const isStaff = canAccessAnyFeedbackReport(permissions);

  if (!requester.id || !args.reportIdOrPrefix) {
    return buildDiscordEphemeralMessageResponse("Choose a feedback card to manage.");
  }

  const lookupResult = await findDiscordBugReportByIdOrPrefix({ reportIdOrPrefix: args.reportIdOrPrefix });
  if (!lookupResult.ok) {
    return buildDiscordFeedbackLookupFailureResponse(lookupResult.code);
  }

  const isReporter = lookupResult.report.reporter_discord_user_id === requester.id;
  if (!isReporter && !isStaff) {
    return buildDiscordEphemeralMessageResponse("You can only manage feedback you submitted.");
  }

  if (
    lookupResult.report.status === "duplicate"
    || lookupResult.report.status === "spam"
    || lookupResult.report.status === "withdrawn"
  ) {
    return buildDiscordEphemeralMessageResponse("That feedback can no longer accept user updates.");
  }

  return buildDiscordFeedbackManageCardResponse({
    reportId: lookupResult.report.id,
    summary: lookupResult.report.summary,
    area: lookupResult.report.area,
    statusLabel: DISCORD_BUG_REPORT_STATUS_TAG_LABELS[lookupResult.report.status],
    typeLabel: DISCORD_BUG_REPORT_TYPE_TAG_LABELS[lookupResult.report.report_type],
  });
}

async function handleFeedbackUpdatePickerSelection(interaction: DiscordInteraction) {
  const componentValues = (interaction.data as { values?: unknown } | null | undefined)?.values;
  const reportId = Array.isArray(componentValues) && typeof componentValues[0] === "string"
    ? componentValues[0]
    : null;

  return buildFeedbackManageCardSelectionResponse({
    interaction,
    reportIdOrPrefix: reportId,
  });
}

async function handleFeedbackUpdatePickerButton(interaction: DiscordInteraction) {
  return buildFeedbackManageCardSelectionResponse({
    interaction,
    reportIdOrPrefix: extractDiscordFeedbackUpdatePickerReportId(
      typeof interaction.data?.custom_id === "string" ? interaction.data.custom_id : null,
    ),
  });
}

async function handleFeedbackManageLookupModalSubmit(interaction: DiscordInteraction) {
  return buildFeedbackManageCardSelectionResponse({
    interaction,
    reportIdOrPrefix: extractDiscordModalTextInputValue(
      interaction.data?.components,
      FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_INPUT_CUSTOM_ID,
    ),
  });
}

async function handleFeedbackManageEditButton(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This feedback flow is only available in the configured server.");
  }

  const requester = resolveDiscordInteractionUser(interaction);
  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  const isStaff = canAccessAnyFeedbackReport(permissions);
  const reportId = extractDiscordFeedbackManageEditReportId(
    typeof interaction.data?.custom_id === "string" ? interaction.data.custom_id : null,
  );

  if (!requester.id || !reportId) {
    return buildDiscordEphemeralMessageResponse("Choose a feedback card to edit.");
  }

  const lookupResult = await findDiscordBugReportByIdOrPrefix({ reportIdOrPrefix: reportId });
  if (!lookupResult.ok) {
    return buildDiscordFeedbackLookupFailureResponse(lookupResult.code);
  }

  const isReporter = lookupResult.report.reporter_discord_user_id === requester.id;
  if (!isReporter && !isStaff) {
    return buildDiscordEphemeralMessageResponse("You can only update feedback you submitted.");
  }

  if (
    lookupResult.report.status === "duplicate"
    || lookupResult.report.status === "spam"
    || lookupResult.report.status === "withdrawn"
  ) {
    return buildDiscordEphemeralMessageResponse("That feedback can no longer accept user updates.");
  }

  return buildDiscordFeedbackUpdateModalResponse({
    reportId: lookupResult.report.id,
    summary: lookupResult.report.summary,
    area: lookupResult.report.area,
    details: lookupResult.report.details ?? "",
  });
}

async function handleFeedbackManageWithdrawButton(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This feedback flow is only available in the configured server.");
  }

  const requester = resolveDiscordInteractionUser(interaction);
  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  const isStaff = canAccessAnyFeedbackReport(permissions);
  const reportId = extractDiscordFeedbackManageWithdrawReportId(
    typeof interaction.data?.custom_id === "string" ? interaction.data.custom_id : null,
  );

  if (!requester.id || !reportId) {
    return buildDiscordEphemeralMessageResponse("Choose a feedback card to withdraw.");
  }

  const lookupResult = await findDiscordBugReportByIdOrPrefix({ reportIdOrPrefix: reportId });
  if (!lookupResult.ok) {
    return buildDiscordFeedbackLookupFailureResponse(lookupResult.code);
  }

  const isReporter = lookupResult.report.reporter_discord_user_id === requester.id;
  if (!isReporter && !isStaff) {
    return buildDiscordEphemeralMessageResponse("You can only withdraw feedback you submitted.");
  }

  if (
    lookupResult.report.status === "duplicate"
    || lookupResult.report.status === "spam"
    || lookupResult.report.status === "withdrawn"
  ) {
    return buildDiscordEphemeralMessageResponse("That feedback can no longer be withdrawn.");
  }

  return buildDiscordFeedbackWithdrawSelectedModalResponse({
    reportId: lookupResult.report.id,
    summary: lookupResult.report.summary,
  });
}

async function processFeedbackUpdateModalSubmit(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return "This feedback flow is only available in the configured server.";
  }

  const requester = resolveDiscordInteractionUser(interaction);
  const reportId = extractDiscordFeedbackUpdateReportIdFromModalCustomId(
    typeof interaction.data?.custom_id === "string" ? interaction.data.custom_id : null,
  );
  const summary = extractDiscordModalTextInputValue(
    interaction.data?.components,
    FITNESS_BUG_SUMMARY_INPUT_CUSTOM_ID,
  );
  const area = extractDiscordModalTextInputValue(
    interaction.data?.components,
    FITNESS_BUG_AREA_INPUT_CUSTOM_ID,
  );
  const details = extractDiscordModalTextInputValue(
    interaction.data?.components,
    FITNESS_BUG_DETAILS_INPUT_CUSTOM_ID,
  );

  if (!requester.id || !reportId || !summary || !details) {
    return "Could not update that feedback.";
  }

  const lookupResult = await findDiscordBugReportByIdOrPrefix({ reportIdOrPrefix: reportId });
  if (!lookupResult.ok) {
    return lookupResult.code === "DISCORD_BUG_REPORT_AMBIGUOUS_ID"
      ? "That report id matched multiple feedback reports. Copy the full Report ID from the forum post."
      : "Could not find that feedback report. Copy the Report ID from the forum post and try again.";
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  const isStaff = discordMemberHasBugStatusPermission(permissions);
  const isReporter = lookupResult.report.reporter_discord_user_id === requester.id;

  if (!isReporter && !isStaff) {
    return "You can only update feedback you submitted.";
  }

  if (
    lookupResult.report.status === "duplicate"
    || lookupResult.report.status === "spam"
    || lookupResult.report.status === "withdrawn"
  ) {
    return "That feedback can no longer accept user updates.";
  }

  const updateResult = await updateDiscordFeedbackReportContent({
    reportId: lookupResult.report.id,
    summary,
    area,
    details,
    updatedByDiscordUserId: requester.id,
  });

  if (!updateResult.ok) {
    return "Could not update that feedback right now.";
  }

  const updatedReport = updateResult.report;
  const syncResult = await syncDiscordFeedbackForumThread({
    report: updatedReport,
  });
  let forumSyncFailed = syncResult.forumSyncFailed;

  if (updatedReport.discord_forum_thread_id) {
    const starterSyncResult = await syncDiscordFeedbackStarterMessage({
      report: updatedReport,
    });
    if (!starterSyncResult.ok) {
      forumSyncFailed = true;
    }

    const auditCommentResult = await postFeedbackAuditComment({
      report: updatedReport,
      action: isReporter ? "reporter_update" : "staff_update",
      actorLabel: isReporter ? "reporter" : "staff",
      note: summarizeFeedbackContentChanges({
        before: lookupResult.report,
        after: updatedReport,
      }),
    });
    if (!auditCommentResult.ok) {
      forumSyncFailed = true;
    }
  }

  return (
    forumSyncFailed
      ? `Feedback updated, but the forum thread could not be fully synced. (${formatDiscordBugReportShortId(updatedReport.id)})`
      : "Feedback updated."
  );
}

async function handleFeedbackUpdateModalSubmit(interaction: DiscordInteraction) {
  return buildDeferredDiscordEphemeralInteractionResponse({
    interaction,
    actionLabel: "feedback update",
    genericFailureContent: "Could not update that feedback right now.",
    fallback: async () => buildDiscordEphemeralMessageResponse(await processFeedbackUpdateModalSubmit(interaction)),
    process: () => processFeedbackUpdateModalSubmit(interaction),
  });
}

async function handleFeedbackWithdrawRequest(args: {
  interaction: DiscordInteraction;
  reportIdOrPrefix: string | null;
  statusNote?: string | null;
}) {
  if (!interactionMatchesGuild(args.interaction)) {
    return "This feedback flow is only available in the configured server.";
  }

  const requester = resolveDiscordInteractionUser(args.interaction);
  if (!requester.id || !args.reportIdOrPrefix) {
    return "Could not withdraw that feedback.";
  }

  const lookupResult = await findDiscordBugReportByIdOrPrefix({ reportIdOrPrefix: args.reportIdOrPrefix });
  if (!lookupResult.ok) {
    return lookupResult.code === "DISCORD_BUG_REPORT_AMBIGUOUS_ID"
      ? "That report id matched multiple feedback reports. Copy the full Report ID from the forum post."
      : "Could not find that feedback report. Copy the Report ID from the forum post and try again.";
  }

  const permissions = typeof args.interaction.member?.permissions === "string" ? args.interaction.member.permissions : null;
  const isStaff = discordMemberHasBugStatusPermission(permissions);
  const isReporter = lookupResult.report.reporter_discord_user_id === requester.id;

  if (!isReporter && !isStaff) {
    return "You can only withdraw feedback you submitted.";
  }

  const withdrawResult = await withdrawDiscordFeedbackReport({
    reportId: lookupResult.report.id,
    withdrawnByDiscordUserId: requester.id,
    statusNote: args.statusNote?.trim() || (isReporter ? "Withdrawn by reporter" : "Withdrawn by staff"),
  });

  if (!withdrawResult.ok) {
    return "Could not withdraw that feedback right now.";
  }

  const updatedReport = withdrawResult.report;
  let forumSyncFailed = false;
  if (updatedReport.discord_forum_thread_id) {
    forumSyncFailed = (await syncDiscordFeedbackForumThread({
      report: updatedReport,
    })).forumSyncFailed;

    if (updatedReport.discord_forum_message_id) {
      const reporterLabel = buildDiscordBugReporterLabel({
        reporterDiscordUsername: updatedReport.reporter_discord_username,
        reporterMemberNumber: updatedReport.reporter_member_number,
      });
      const patchStarterMessageResult = await patchDiscordChannelMessage({
        channelId: updatedReport.discord_forum_thread_id,
        messageId: updatedReport.discord_forum_message_id,
        body: {
          content: buildDiscordBugForumThreadBody({
            report: updatedReport,
            reporterLabel,
          }),
          allowed_mentions: buildDiscordAllowedMentions({
            reporterDiscordUserId: updatedReport.reporter_discord_user_id,
            includeReporter: false,
          }),
        },
      });

      if (!patchStarterMessageResult.ok) {
        forumSyncFailed = true;
        console.error("[discord-interactions] feedback forum starter message patch failed during withdraw", {
          requestId: randomUUID(),
          reportId: updatedReport.id,
          code: patchStarterMessageResult.code,
          status: patchStarterMessageResult.status,
          message: patchStarterMessageResult.message,
        });
      }
    }

    const threadReplyResult = await postFeedbackAuditComment({
      report: updatedReport,
      action: "withdraw",
      actorLabel: isReporter ? "reporter" : "staff",
    });

    if (!threadReplyResult.ok) {
      forumSyncFailed = true;
    }

    const deleteThreadResult = await deleteDiscordChannel({
      channelId: updatedReport.discord_forum_thread_id,
    });

    if (!deleteThreadResult.ok) {
      forumSyncFailed = true;
      console.error("[discord-interactions] feedback forum delete failed", {
        requestId: randomUUID(),
        reportId: updatedReport.id,
        code: deleteThreadResult.code,
        status: deleteThreadResult.status,
        message: deleteThreadResult.message,
      });
    }
  }

  return (
    forumSyncFailed
      ? `Feedback withdrawn, but the forum thread could not be fully synced or deleted. (${formatDiscordBugReportShortId(updatedReport.id)})`
      : "Feedback withdrawn. The forum post was removed and we kept a small audit record."
  );
}

async function handleFeedbackWithdrawInteraction(interaction: DiscordInteraction) {
  return buildDiscordEphemeralMessageResponse(await handleFeedbackWithdrawRequest({
    interaction,
    reportIdOrPrefix: extractDiscordCommandStringOption(interaction.data?.options, FITNESS_BUG_STATUS_REPORT_ID_OPTION_NAME),
  }));
}

async function handleFeedbackWithdrawModalSubmit(interaction: DiscordInteraction) {
  return buildDeferredDiscordEphemeralInteractionResponse({
    interaction,
    actionLabel: "feedback withdraw",
    genericFailureContent: "Could not withdraw that feedback right now.",
    fallback: async () => buildDiscordEphemeralMessageResponse(await handleFeedbackWithdrawRequest({
      interaction,
      reportIdOrPrefix: resolveSelectedFeedbackReportId({
        components: interaction.data?.components,
        selectCustomId: FITNESS_FEEDBACK_WITHDRAW_REPORT_SELECT_CUSTOM_ID,
        textInputCustomId: FITNESS_FEEDBACK_WITHDRAW_REPORT_ID_INPUT_CUSTOM_ID,
      }),
      statusNote: extractDiscordModalTextInputValue(
        interaction.data?.components,
        FITNESS_FEEDBACK_WITHDRAW_NOTE_INPUT_CUSTOM_ID,
      ),
    })),
    process: () => handleFeedbackWithdrawRequest({
      interaction,
      reportIdOrPrefix: resolveSelectedFeedbackReportId({
        components: interaction.data?.components,
        selectCustomId: FITNESS_FEEDBACK_WITHDRAW_REPORT_SELECT_CUSTOM_ID,
        textInputCustomId: FITNESS_FEEDBACK_WITHDRAW_REPORT_ID_INPUT_CUSTOM_ID,
      }),
      statusNote: extractDiscordModalTextInputValue(
        interaction.data?.components,
        FITNESS_FEEDBACK_WITHDRAW_NOTE_INPUT_CUSTOM_ID,
      ),
    }),
  });
}

async function handleFeedbackWithdrawSelectedModalSubmit(interaction: DiscordInteraction) {
  return buildDeferredDiscordEphemeralInteractionResponse({
    interaction,
    actionLabel: "feedback withdraw",
    genericFailureContent: "Could not withdraw that feedback right now.",
    fallback: async () => buildDiscordEphemeralMessageResponse(await handleFeedbackWithdrawRequest({
      interaction,
      reportIdOrPrefix: extractDiscordFeedbackWithdrawSelectedReportId(
        typeof interaction.data?.custom_id === "string" ? interaction.data.custom_id : null,
      ),
      statusNote: extractDiscordModalTextInputValue(
        interaction.data?.components,
        FITNESS_FEEDBACK_WITHDRAW_NOTE_INPUT_CUSTOM_ID,
      ),
    })),
    process: () => handleFeedbackWithdrawRequest({
      interaction,
      reportIdOrPrefix: extractDiscordFeedbackWithdrawSelectedReportId(
        typeof interaction.data?.custom_id === "string" ? interaction.data.custom_id : null,
      ),
      statusNote: extractDiscordModalTextInputValue(
        interaction.data?.components,
        FITNESS_FEEDBACK_WITHDRAW_NOTE_INPUT_CUSTOM_ID,
      ),
    }),
  });
}

async function handleWarnInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This moderation flow is only available in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasModerationPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to log warnings.");
  }

  const moderator = resolveDiscordInteractionUser(interaction);
  const targetDiscordUserId = extractDiscordCommandUserOption(
    interaction.data?.options,
    FITNESS_PURGATORY_USER_OPTION_NAME,
  );
  const reason = extractDiscordCommandStringOption(
    interaction.data?.options,
    FITNESS_PURGATORY_REASON_OPTION_NAME,
  );
  const severityResult = parseDiscordModerationWarningSeverity(
    extractDiscordCommandStringOption(interaction.data?.options, FITNESS_WARNING_SEVERITY_OPTION_NAME),
  );

  if (!severityResult.ok) {
    return buildDiscordEphemeralMessageResponse(severityResult.message);
  }

  if (!moderator.id || !targetDiscordUserId || !reason) {
    return buildDiscordEphemeralMessageResponse("Could not log that warning.");
  }

  const warningResult = await createDiscordModerationWarning({
    guildId: DISCORD_GUILD_ID(),
    targetDiscordUserId,
    moderatorDiscordUserId: moderator.id,
    moderatorDiscordUsername: moderator.username,
    moderatorPermissions: permissions,
    severity: severityResult.severity,
    reason,
  });
  if (!warningResult.ok) {
    return buildDiscordEphemeralMessageResponse(warningResult.message);
  }

  const label = severityResult.severity === "critical"
    ? "Critical warning"
    : severityResult.severity === "warning"
      ? "Warning"
      : "Notice";
  return buildDiscordEphemeralMessageResponse(
    warningResult.warnings.length > 0
      ? `${label} logged. Case \`${formatDiscordModerationCaseShortId(warningResult.caseRow.id)}\` created. ${warningResult.warnings.join(" ")}`
      : `${label} logged. Case \`${formatDiscordModerationCaseShortId(warningResult.caseRow.id)}\` created.`,
  );
}

async function handleWarningsInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This moderation flow is only available in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasModerationPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to review warning history.");
  }

  const targetDiscordUserId = extractDiscordCommandUserOption(
    interaction.data?.options,
    FITNESS_PURGATORY_USER_OPTION_NAME,
  );
  if (!targetDiscordUserId) {
    return buildDiscordEphemeralMessageResponse("Choose a user to review.");
  }

  const limit = extractDiscordCommandIntegerOption(
    interaction.data?.options,
    FITNESS_MOD_LOG_LIMIT_OPTION_NAME,
  );

  return buildDiscordEphemeralMessageResponse(await getDiscordWarningsSummary({
    targetDiscordUserId,
    limit,
  }));
}

async function handleWarningClearInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This moderation flow is only available in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasModerationPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to resolve warnings.");
  }

  const moderator = resolveDiscordInteractionUser(interaction);
  const caseIdOrPrefix = extractDiscordCommandStringOption(
    interaction.data?.options,
    FITNESS_RELEASE_CASE_ID_OPTION_NAME,
  );
  const reason = extractDiscordCommandStringOption(
    interaction.data?.options,
    FITNESS_PURGATORY_REASON_OPTION_NAME,
  );
  if (!moderator.id || !caseIdOrPrefix) {
    return buildDiscordEphemeralMessageResponse("Choose a warning case id to resolve.");
  }

  const clearResult = await resolveDiscordModerationWarningCase({
    caseIdOrPrefix,
    resolvedByDiscordUserId: moderator.id,
    resolvedByDiscordUsername: moderator.username,
    reason,
  });
  if (!clearResult.ok) {
    return buildDiscordEphemeralMessageResponse(clearResult.message);
  }

  return buildDiscordEphemeralMessageResponse(
    clearResult.warnings.length > 0
      ? `Warning case \`${formatDiscordModerationCaseShortId(clearResult.caseRow.id)}\` resolved. ${clearResult.warnings.join(" ")}`
      : `Warning case \`${formatDiscordModerationCaseShortId(clearResult.caseRow.id)}\` resolved.`,
  );
}

async function handlePurgatorySetupInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This moderation flow is only available in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasModerationPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to setup Purgatory.");
  }

  const setupResult = await ensureDiscordPurgatoryInfrastructure({
    guildId: DISCORD_GUILD_ID(),
  });

  if (!setupResult.ok) {
    return buildDiscordEphemeralMessageResponse("Could not create or verify the Purgatory setup right now.");
  }

  return buildDiscordEphemeralMessageResponse(
    setupResult.warnings.length > 0
      ? `Purgatory setup verified with warnings. Role <@&${setupResult.roleId}> and channel <#${setupResult.channelId}> are ready. ${setupResult.warnings.join(" ")}`
      : `Purgatory setup verified. Role <@&${setupResult.roleId}> and channel <#${setupResult.channelId}> are ready.`,
  );
}

async function handlePurgatoryInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This moderation flow is only available in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasModerationPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to use Purgatory.");
  }

  const moderator = resolveDiscordInteractionUser(interaction);
  const targetDiscordUserId = extractDiscordCommandUserOption(
    interaction.data?.options,
    FITNESS_PURGATORY_USER_OPTION_NAME,
  );
  const reason = extractDiscordCommandStringOption(
    interaction.data?.options,
    FITNESS_PURGATORY_REASON_OPTION_NAME,
  );
  const durationResult = parseDiscordModerationDuration(
    extractDiscordCommandStringOption(interaction.data?.options, FITNESS_PURGATORY_DURATION_OPTION_NAME),
  );

  if (!durationResult.ok) {
    return buildDiscordEphemeralMessageResponse(durationResult.message);
  }

  if (!moderator.id || !targetDiscordUserId || !reason) {
    return buildDiscordEphemeralMessageResponse("Could not move that user to Purgatory.");
  }

  const purgatoryResult = await moveDiscordUserToPurgatory({
    guildId: DISCORD_GUILD_ID(),
    targetDiscordUserId,
    moderatorDiscordUserId: moderator.id,
    moderatorDiscordUsername: moderator.username,
    moderatorPermissions: permissions,
    reason,
    durationSeconds: durationResult.durationSeconds,
  });

  if (!purgatoryResult.ok) {
    return buildDiscordEphemeralMessageResponse(purgatoryResult.message);
  }

  return buildDiscordEphemeralMessageResponse(
    purgatoryResult.warnings.length > 0
      ? `User moved to Purgatory. Case \`${formatDiscordModerationCaseShortId(purgatoryResult.caseRow.id)}\` created. ${purgatoryResult.warnings.join(" ")}`
      : `User moved to Purgatory. Case \`${formatDiscordModerationCaseShortId(purgatoryResult.caseRow.id)}\` created.`,
  );
}

async function handleReleaseInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This moderation flow is only available in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasModerationPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to release Purgatory cases.");
  }

  const moderator = resolveDiscordInteractionUser(interaction);
  const targetDiscordUserId = extractDiscordCommandUserOption(
    interaction.data?.options,
    FITNESS_PURGATORY_USER_OPTION_NAME,
  );
  const caseIdOrPrefix = extractDiscordCommandStringOption(
    interaction.data?.options,
    FITNESS_RELEASE_CASE_ID_OPTION_NAME,
  );
  const releaseNote = extractDiscordCommandStringOption(
    interaction.data?.options,
    FITNESS_RELEASE_NOTE_OPTION_NAME,
  );

  if (!moderator.id || (!targetDiscordUserId && !caseIdOrPrefix)) {
    return buildDiscordEphemeralMessageResponse("Choose a user or case id to release.");
  }

  const releaseResult = await releaseDiscordPurgatoryCase({
    guildId: DISCORD_GUILD_ID(),
    releasedByDiscordUserId: moderator.id,
    releasedByDiscordUsername: moderator.username,
    targetDiscordUserId,
    caseIdOrPrefix,
    releaseNote,
  });

  if (!releaseResult.ok) {
    return buildDiscordEphemeralMessageResponse(releaseResult.message);
  }

  return buildDiscordEphemeralMessageResponse(
    releaseResult.warnings.length > 0
      ? `User released from Purgatory. Case \`${formatDiscordModerationCaseShortId(releaseResult.caseRow.id)}\` closed. ${releaseResult.warnings.join(" ")}`
      : `User released from Purgatory. Case \`${formatDiscordModerationCaseShortId(releaseResult.caseRow.id)}\` closed.`,
  );
}

async function handleModLogInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This moderation flow is only available in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasModerationPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to view the mod log.");
  }

  const targetDiscordUserId = extractDiscordCommandUserOption(
    interaction.data?.options,
    FITNESS_PURGATORY_USER_OPTION_NAME,
  );
  const limit = extractDiscordCommandIntegerOption(
    interaction.data?.options,
    FITNESS_MOD_LOG_LIMIT_OPTION_NAME,
  );

  return buildDiscordEphemeralMessageResponse(await getDiscordModerationLogSummary({
    targetDiscordUserId,
    limit,
  }));
}

async function handleServerInventoryInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This inventory flow is only available in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasModerationPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to view server inventory.");
  }

  return buildDiscordEphemeralMessageResponse(await buildDiscordServerInventorySummary({
    guildId: DISCORD_GUILD_ID(),
  }));
}

async function handleUpdateLatestInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This update flow is only available in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasBugStatusPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to review update drafts.");
  }

  const latestDraftsResult = await listLatestDiscordUpdateDrafts({ limit: 5 });
  if (!latestDraftsResult.ok) {
    return buildDiscordEphemeralMessageResponse("Could not load update drafts right now.");
  }

  return buildDiscordEphemeralMessageResponse(buildDiscordUpdateLatestSummary(latestDraftsResult.drafts));
}

async function handleUpdatePublishInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This update flow is only available in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasBugStatusPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to publish updates.");
  }

  const draftIdOrPrefix = extractDiscordCommandStringOption(interaction.data?.options, FITNESS_UPDATE_DRAFT_ID_OPTION_NAME);
  if (!draftIdOrPrefix) {
    return buildDiscordEphemeralMessageResponse("Choose a draft id from /update-latest first.");
  }

  const lookupResult = await findDiscordUpdateDraftByIdOrPrefix({ draftIdOrPrefix });
  if (!lookupResult.ok) {
    return buildDiscordUpdateDraftLookupFailureResponse(lookupResult.code);
  }

  if (lookupResult.draft.status === "published") {
    return buildDiscordEphemeralMessageResponse(
      `That update draft was already published. (${formatDiscordUpdateDraftShortId(lookupResult.draft.id)})`,
    );
  }

  return buildDiscordUpdatePublishModalResponse(lookupResult.draft.id);
}

async function handleUpdatePublishModalSubmit(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This update flow is only available in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasBugStatusPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to publish updates.");
  }

  const publisher = resolveDiscordInteractionUser(interaction);
  const draftId = extractDiscordUpdateDraftIdFromPublishModalCustomId(
    typeof interaction.data?.custom_id === "string" ? interaction.data.custom_id : null,
  );

  if (!publisher.id || !draftId) {
    return buildDiscordEphemeralMessageResponse("Could not publish that update draft.");
  }

  const publishResult = await publishDiscordUpdateDraft({
    draftIdOrPrefix: draftId,
    title: extractDiscordModalTextInputValue(interaction.data?.components, FITNESS_UPDATE_TITLE_INPUT_CUSTOM_ID) ?? "",
    whatChanged: extractDiscordModalTextInputValue(interaction.data?.components, FITNESS_UPDATE_WHAT_CHANGED_INPUT_CUSTOM_ID) ?? "",
    whyItMatters: extractDiscordModalTextInputValue(interaction.data?.components, FITNESS_UPDATE_WHY_IT_MATTERS_INPUT_CUSTOM_ID) ?? "",
    publishedByDiscordUserId: publisher.id,
    discordChannelId: DISCORD_UPDATES_CHANNEL_ID(),
  });

  if (!publishResult.ok) {
    if (
      publishResult.code === "DISCORD_UPDATE_DRAFT_NOT_FOUND"
      || publishResult.code === "DISCORD_UPDATE_DRAFT_AMBIGUOUS_ID"
      || publishResult.code === "DISCORD_UPDATE_DRAFT_LOOKUP_FAILED"
    ) {
      return buildDiscordUpdateDraftLookupFailureResponse(publishResult.code);
    }

    if (publishResult.code === "DISCORD_UPDATE_CHANNEL_NOT_CONFIGURED") {
      return buildDiscordEphemeralMessageResponse("Discord updates channel is not configured.");
    }

    if (publishResult.code === "DISCORD_UPDATE_DRAFT_ALREADY_PUBLISHED") {
      return buildDiscordEphemeralMessageResponse("That update draft was already published.");
    }

    if (publishResult.code === "DISCORD_UPDATE_DRAFT_INVALID_INPUT") {
      return buildDiscordEphemeralMessageResponse("Title, What changed, and Why it matters are all required.");
    }

    return buildDiscordEphemeralMessageResponse("Could not publish that update right now.");
  }

  return buildDiscordEphemeralMessageResponse("Update posted.");
}

async function handleUpdateSkipInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This update flow is only available in the configured server.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  if (!discordMemberHasBugStatusPermission(permissions)) {
    return buildDiscordEphemeralMessageResponse("You do not have permission to skip updates.");
  }

  const skipper = resolveDiscordInteractionUser(interaction);
  const draftIdOrPrefix = extractDiscordCommandStringOption(interaction.data?.options, FITNESS_UPDATE_DRAFT_ID_OPTION_NAME);
  if (!skipper.id || !draftIdOrPrefix) {
    return buildDiscordEphemeralMessageResponse("Could not skip that update draft.");
  }

  const skipResult = await skipDiscordUpdateDraft({
    draftIdOrPrefix,
    skippedByDiscordUserId: skipper.id,
    reason: extractDiscordCommandStringOption(interaction.data?.options, FITNESS_UPDATE_SKIP_REASON_OPTION_NAME),
  });

  if (!skipResult.ok) {
    if (
      skipResult.code === "DISCORD_UPDATE_DRAFT_NOT_FOUND"
      || skipResult.code === "DISCORD_UPDATE_DRAFT_AMBIGUOUS_ID"
      || skipResult.code === "DISCORD_UPDATE_DRAFT_LOOKUP_FAILED"
    ) {
      return buildDiscordUpdateDraftLookupFailureResponse(skipResult.code);
    }

    return buildDiscordEphemeralMessageResponse("Could not skip that update draft right now.");
  }

  return buildDiscordEphemeralMessageResponse("Update draft skipped.");
}

export async function GET(request: Request) {
  const authorization = validateDiscordMessageCommandPollRequest(request);
  if (!authorization.ok) {
    return jsonResponse(
      { ok: false, message: authorization.message },
      { status: authorization.status },
    );
  }

  const result = await pollDiscordMessageCommands();
  return jsonResponse(result, { status: result.ok ? 200 : 500 });
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  let rawBody = "";
  let signature: string | null = null;
  let timestamp: string | null = null;

  try {
    rawBody = await request.text();
    signature = request.headers.get("x-signature-ed25519");
    timestamp = request.headers.get("x-signature-timestamp");

    if (!signature || !timestamp || !verifyDiscordInteractionSignature({ rawBody, signature, timestamp })) {
      return jsonResponse({ error: "Invalid request signature." }, { status: 401 });
    }
  } catch (error) {
    console.error("[discord-interactions] signature verification failed", {
      requestId,
      hasSignature: Boolean(signature),
      hasTimestamp: Boolean(timestamp),
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "Invalid request signature." }, { status: 401 });
  }

  let interaction: DiscordInteraction;

  try {
    interaction = JSON.parse(rawBody) as DiscordInteraction;
  } catch {
    return jsonResponse({ error: "Invalid interaction payload." }, { status: 400 });
  }

  try {
    if (interaction.type === DISCORD_INTERACTION_TYPE.PING) {
      return jsonResponse(buildDiscordPongResponse());
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_FEEDBACK_COMMAND_NAME
    ) {
      return jsonResponse(buildDiscordFeedbackPanelSubmitModalResponse());
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_FEEDBACK_STATUS_COMMAND_NAME
    ) {
      return jsonResponse(await handleBugStatusInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_FEEDBACK_COMPLETION_REVIEW_COMMAND_NAME
    ) {
      return jsonResponse(await handleFeedbackCompletionReviewInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_FEEDBACK_WITHDRAW_COMMAND_NAME
    ) {
      return jsonResponse(await handleFeedbackWithdrawInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_SPOTIFY_CLUB_SETUP_COMMAND_NAME
    ) {
      return jsonResponse(await handleSetupSpotifyClubInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_SPOTIFY_COMMAND_NAME
    ) {
      const response = await handleSpotifyInteraction(interaction);
      return response instanceof Response ? response : jsonResponse(response);
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_JAM_LOBBY_COMMAND_NAME
    ) {
      return jsonResponse(await handleJamLobbyInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_JAM_QUEUE_COMMAND_NAME
    ) {
      return jsonResponse(await handleJamQueueInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_VERIFY_COMMAND_NAME
    ) {
      return jsonResponse(await handleSetupVerifyInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_VERIFY_CLEANUP_COMMAND_NAME
    ) {
      return jsonResponse(await handleVerifyCleanupInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_VERIFY_LOCKDOWN_COMMAND_NAME
    ) {
      return jsonResponse(await handleVerifyLockdownInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_FEEDBACK_SETUP_COMMAND_NAME
    ) {
      return jsonResponse(await handleSetupFeedbackInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_PURGATORY_SETUP_COMMAND_NAME
    ) {
      return jsonResponse(await handlePurgatorySetupInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_WARN_COMMAND_NAME
    ) {
      return jsonResponse(await handleWarnInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_WARNINGS_COMMAND_NAME
    ) {
      return jsonResponse(await handleWarningsInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_WARNING_CLEAR_COMMAND_NAME
    ) {
      return jsonResponse(await handleWarningClearInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_PURGATORY_COMMAND_NAME
    ) {
      return jsonResponse(await handlePurgatoryInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_RELEASE_COMMAND_NAME
    ) {
      return jsonResponse(await handleReleaseInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_MOD_LOG_COMMAND_NAME
    ) {
      return jsonResponse(await handleModLogInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_SERVER_INVENTORY_COMMAND_NAME
    ) {
      return jsonResponse(await handleServerInventoryInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_UPDATE_LATEST_COMMAND_NAME
    ) {
      return jsonResponse(await handleUpdateLatestInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_UPDATE_PUBLISH_COMMAND_NAME
    ) {
      return jsonResponse(await handleUpdatePublishInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_UPDATE_SKIP_COMMAND_NAME
    ) {
      return jsonResponse(await handleUpdateSkipInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
      && interaction.data?.custom_id === FITNESS_VERIFY_BUTTON_CUSTOM_ID
    ) {
      return jsonResponse(buildDiscordVerifyModalResponse());
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
      const response = await handleSpotifyClubButtonInteraction(interaction);
      return response instanceof Response ? response : jsonResponse(response);
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
      && interaction.data?.custom_id === FITNESS_FEEDBACK_PANEL_SUBMIT_BUTTON_CUSTOM_ID
    ) {
      return jsonResponse(buildDiscordFeedbackPanelSubmitModalResponse());
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
      && interaction.data?.custom_id === FITNESS_FEEDBACK_PANEL_UPDATE_BUTTON_CUSTOM_ID
    ) {
      return jsonResponse(await buildFeedbackUpdatePickerOpenResponse(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
      && typeof interaction.data?.custom_id === "string"
      && interaction.data.custom_id.startsWith(`${FITNESS_FEEDBACK_UPDATE_PICKER_BUTTON_CUSTOM_ID_PREFIX}:`)
    ) {
      return jsonResponse(await handleFeedbackUpdatePickerButton(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
      && interaction.data?.custom_id === FITNESS_FEEDBACK_UPDATE_PICKER_SELECT_CUSTOM_ID
    ) {
      return jsonResponse(await handleFeedbackUpdatePickerSelection(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
      && interaction.data?.custom_id === FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_BUTTON_CUSTOM_ID
    ) {
      return jsonResponse(buildDiscordFeedbackManageLookupModalResponse());
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
      && typeof interaction.data?.custom_id === "string"
      && extractDiscordFeedbackManageEditReportId(interaction.data.custom_id)
    ) {
      return jsonResponse(await handleFeedbackManageEditButton(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
      && typeof interaction.data?.custom_id === "string"
      && extractDiscordFeedbackManageWithdrawReportId(interaction.data.custom_id)
    ) {
      return jsonResponse(await handleFeedbackManageWithdrawButton(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
      && interaction.data?.custom_id === FITNESS_FEEDBACK_MANAGE_CANCEL_BUTTON_CUSTOM_ID
    ) {
      return jsonResponse(buildDiscordEphemeralMessageResponse("Feedback action cancelled."));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && typeof interaction.data?.custom_id === "string"
      && interaction.data.custom_id.startsWith(`${FITNESS_FEEDBACK_REPORT_MODAL_CUSTOM_ID_PREFIX}:`)
    ) {
      return handleDeferredFeedbackCreateModalSubmit(interaction);
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && interaction.data?.custom_id === FITNESS_FEEDBACK_PANEL_SUBMIT_MODAL_CUSTOM_ID
    ) {
      const reportType = normalizeDiscordFeedbackReportType(
        extractDiscordModalStringSelectValue(interaction.data?.components, FITNESS_FEEDBACK_PANEL_TYPE_INPUT_CUSTOM_ID)
        ?? extractDiscordModalTextInputValue(interaction.data?.components, FITNESS_FEEDBACK_PANEL_TYPE_INPUT_CUSTOM_ID),
      );

      if (reportType !== "bug" && reportType !== "feature") {
        return jsonResponse(buildDiscordEphemeralMessageResponse("Choose Bug or Feature for the feedback type."), { status: 400 });
      }

      return handleDeferredFeedbackCreateModalSubmit(interaction, reportType);
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && interaction.data?.custom_id === FITNESS_SPOTIFY_QUEUE_SUGGEST_MODAL_CUSTOM_ID
    ) {
      return jsonResponse(await handleSpotifyQueueSuggestModalSubmit(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && interaction.data?.custom_id === FITNESS_SPOTIFY_QUEUE_SEARCH_MODAL_CUSTOM_ID
    ) {
      return jsonResponse(await handleSpotifyQueueSearchModalSubmit(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && interaction.data?.custom_id === FITNESS_FEEDBACK_UPDATE_PICKER_LOOKUP_MODAL_CUSTOM_ID
    ) {
      return jsonResponse(await handleFeedbackManageLookupModalSubmit(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && typeof interaction.data?.custom_id === "string"
      && extractDiscordFeedbackUpdateReportIdFromModalCustomId(interaction.data.custom_id)
    ) {
      return handleFeedbackUpdateModalSubmit(interaction);
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && interaction.data?.custom_id === FITNESS_FEEDBACK_WITHDRAW_MODAL_CUSTOM_ID
    ) {
      return handleFeedbackWithdrawModalSubmit(interaction);
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && typeof interaction.data?.custom_id === "string"
      && extractDiscordFeedbackWithdrawSelectedReportId(interaction.data.custom_id)
    ) {
      return handleFeedbackWithdrawSelectedModalSubmit(interaction);
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && typeof interaction.data?.custom_id === "string"
      && interaction.data.custom_id.startsWith(`${FITNESS_UPDATE_PUBLISH_MODAL_CUSTOM_ID_PREFIX}:`)
    ) {
      return jsonResponse(await handleUpdatePublishModalSubmit(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && interaction.data?.custom_id === FITNESS_VERIFY_MODAL_CUSTOM_ID
    ) {
      return jsonResponse(await handleVerifyModalSubmit(interaction));
    }

    return jsonResponse(buildDiscordEphemeralMessageResponse("Unsupported Discord interaction."), { status: 400 });
  } catch (error) {
    console.error("[discord-interactions] unhandled failure", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return jsonResponse(buildDiscordEphemeralMessageResponse("Discord interactions are temporarily unavailable."), { status: 500 });
  }
}
