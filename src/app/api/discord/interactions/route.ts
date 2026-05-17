import { randomUUID } from "node:crypto";
import {
  DISCORD_APPLICATION_ID,
  DISCORD_BUG_REPORT_FORUM_CHANNEL_ID,
  DISCORD_FEEDBACK_PANEL_CHANNEL_ID,
  DISCORD_GUILD_ID,
  DISCORD_UPDATES_CHANNEL_ID,
  DISCORD_UNVERIFIED_ROLE_ID,
  DISCORD_VERIFY_CHANNEL_ID,
  DISCORD_VERIFY_MESSAGE_BODY,
  DISCORD_VERIFY_MESSAGE_TITLE,
  DISCORD_VERIFIED_ROLE_ID,
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
  extractDiscordBugReportModalFields,
  findDiscordBugReportByIdOrPrefix,
  formatDiscordBugReportShortId,
  listRecentDiscordFeedbackReports,
  normalizeDiscordFeedbackReportType,
  normalizeDiscordBugReportStatus,
  postFeedbackCardAuditComment,
  recordDiscordBugReportForumThread,
  recordDiscordBugReportForumState,
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
  buildDiscordFeedbackUpdatePickerResponse,
  buildDiscordFeedbackUpdateModalResponse,
  buildDiscordFeedbackWithdrawSelectedModalResponse,
  buildDiscordUpdatePublishModalResponse,
  buildDiscordEphemeralMessageResponse,
  buildDiscordPongResponse,
  buildDiscordVerifyMessagePayload,
  buildDiscordVerifyModalResponse,
  discordMemberHasBugStatusPermission,
  discordMemberHasModerationPermission,
  discordMessageHasFeedbackPanel,
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
  FITNESS_WARNING_SEVERITY_OPTION_NAME,
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
  FITNESS_VERIFY_COMMAND_NAME,
  FITNESS_VERIFY_MODAL_CUSTOM_ID,
  extractDiscordCommandIntegerOption,
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
  createDiscordGuildChannel,
  createDiscordChannelMessage,
  createDiscordForumThreadWithMessage,
  createDiscordMessageReaction,
  deleteDiscordChannel,
  deferDiscordInteractionEphemeral,
  editDiscordOriginalInteractionResponse,
  fetchDiscordChannel,
  fetchDiscordGuildChannels,
  fetchDiscordChannelMessages,
  fetchDiscordGuildActiveThreads,
  patchDiscordChannelMessage,
  resolveDiscordForumTagIdsByName,
  removeDiscordGuildMemberRole,
  updateDiscordChannel,
  updateDiscordForumThreadArchiveState,
  updateDiscordForumThreadTags,
  updateDiscordForumThreadTitle,
  updateDiscordGuildMemberNickname,
} from "@/lib/discord/rest";
import {
  validateDiscordFeedbackEmojis,
} from "@/lib/discord/feedback-emojis";
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

type DiscordInteraction = {
  id?: unknown;
  application_id?: unknown;
  token?: unknown;
  type?: unknown;
  guild_id?: unknown;
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

function shouldArchiveFeedbackThread(status: string): boolean {
  return status === "duplicate" || status === "withdrawn";
}

function isResolvedFeedbackStatus(status: string): boolean {
  return status === "fixed" || status === "closed";
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
  process: () => Promise<string>;
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

  let content = args.genericFailureContent;

  try {
    content = await args.process();
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
    content,
  });

  if (!editResult.ok) {
    console.error(`[discord-interactions] edit original ${args.actionLabel} interaction failed`, {
      requestId: randomUUID(),
      interactionId,
      code: editResult.code,
      status: editResult.status,
      message: editResult.message,
    });
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
  action: "status_update" | "withdraw" | "reporter_update" | "staff_update" | "duplicate_signal" | "sync_format";
  actorLabel?: string | null;
  includeReporterMention?: boolean;
  statusBefore?: DiscordBugReportRow["status"] | null;
  statusAfter?: DiscordBugReportRow["status"] | null;
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

async function upsertDiscordVerifyMessage() {
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
      ? { ok: true as const, action: "created" as const }
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
      return { ok: true, action: "updated" as const };
    }

    if (patchResult.status === 404) {
      return createVerifyMessage();
    }

    return { ok: false, code: patchResult.code, message: patchResult.message };
  }

  return createVerifyMessage();
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
    console.error("[discord-interactions] role assignment failed", {
      requestId,
      code: addRoleResult.code,
      status: addRoleResult.status,
      message: addRoleResult.message,
    });

    return buildDiscordEphemeralMessageResponse(
      "Fitness verified your token, but Discord could not assign the role. Ask an admin to check the bot role position and Manage Roles permission.",
    );
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
  const interactionId = typeof interaction.id === "string" ? interaction.id : null;
  const applicationId = typeof interaction.application_id === "string" ? interaction.application_id : null;
  const interactionToken = typeof interaction.token === "string" ? interaction.token : null;

  if (!interactionId || !applicationId || !interactionToken) {
    return jsonResponse(await handleFeedbackCreateModalSubmit(interaction, reportTypeOverride));
  }

  const deferResult = await deferDiscordInteractionEphemeral({
    interactionId,
    interactionToken,
  });

  if (!deferResult.ok) {
    console.warn("[discord-interactions] feedback defer failed", {
      requestId: randomUUID(),
      interactionId,
      code: deferResult.code,
      status: deferResult.status,
      message: deferResult.message,
    });
    return jsonResponse(await handleFeedbackCreateModalSubmit(interaction, reportTypeOverride));
  }

  let content = "Could not save that feedback report right now. Try again in a moment.";

  try {
    content = await processFeedbackCreateModalSubmit(interaction, reportTypeOverride);
  } catch (error) {
    console.error("[discord-interactions] deferred feedback submit failed", {
      requestId: randomUUID(),
      interactionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const editResult = await editDiscordOriginalInteractionResponse({
    applicationId,
    interactionToken,
    content,
  });

  if (!editResult.ok) {
    console.error("[discord-interactions] edit original feedback interaction failed", {
      requestId: randomUUID(),
      interactionId,
      code: editResult.code,
      status: editResult.status,
      message: editResult.message,
    });
  }

  return buildNoContentResponse();
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

  const updatedReport = statusUpdateResult.report;
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

  let auditCommentMessageId: string | null = null;
  if (updatedReport.discord_forum_thread_id) {
    const auditCommentResult = await postFeedbackAuditComment({
      report: updatedReport,
      action: "status_update",
      actorLabel: "Fawx Security",
      includeReporterMention,
      statusBefore: lookupResult.report.status,
      statusAfter: updatedReport.status,
      note: updatedReport.status_note,
    });
    if (!auditCommentResult.ok) {
      forumSyncFailed = true;
    } else {
      auditCommentMessageId = auditCommentResult.messageId;
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

  if (updatedReport.discord_forum_thread_id && isResolvedFeedbackStatus(updatedReport.status)) {
    const reactionMessageId = updatedReport.discord_forum_message_id ?? auditCommentMessageId;
    if (reactionMessageId) {
      const reactionResult = await createDiscordMessageReaction({
        channelId: updatedReport.discord_forum_thread_id,
        messageId: reactionMessageId,
        emoji: "✅",
      });

      if (!reactionResult.ok) {
        logDiscordFeedbackSoftFailure({
          stage: "resolved-reaction",
          reportId: updatedReport.id,
          code: reactionResult.code,
          status: reactionResult.status,
          message: reactionResult.message,
        });
      }
    }
  }

  return buildDiscordEphemeralMessageResponse(
    forumSyncFailed
      ? `Feedback updated, but the forum thread could not be fully synced. (${formatDiscordBugReportShortId(updatedReport.id)})`
      : "Feedback updated.",
  );
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
      return jsonResponse(buildDiscordFeedbackPanelSubmitModalResponse({
        emojis: await validateDiscordFeedbackEmojis(),
      }));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_FEEDBACK_STATUS_COMMAND_NAME
    ) {
      return jsonResponse(await handleBugStatusInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_FEEDBACK_WITHDRAW_COMMAND_NAME
    ) {
      return jsonResponse(await handleFeedbackWithdrawInteraction(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND
      && interaction.data?.name === FITNESS_VERIFY_COMMAND_NAME
    ) {
      return jsonResponse(await handleSetupVerifyInteraction(interaction));
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
      && interaction.data?.custom_id === FITNESS_FEEDBACK_PANEL_SUBMIT_BUTTON_CUSTOM_ID
    ) {
      return jsonResponse(buildDiscordFeedbackPanelSubmitModalResponse({
        emojis: await validateDiscordFeedbackEmojis(),
      }));
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
