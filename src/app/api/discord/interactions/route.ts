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
  buildDiscordFeedbackUpdateThreadReply,
  buildDiscordFeedbackWithdrawThreadReply,
  buildDiscordBugForumDuplicateReply,
  buildDiscordBugForumTagNames,
  buildDiscordBugForumThreadBody,
  buildDiscordBugForumThreadTitle,
  buildDiscordBugReporterLabel,
  buildDiscordBugStatusThreadReply,
  createDiscordBugReport,
  extractDiscordBugReportModalFields,
  findDiscordBugReportByIdOrPrefix,
  formatDiscordBugReportShortId,
  normalizeDiscordFeedbackReportType,
  normalizeDiscordBugReportStatus,
  recordDiscordBugReportForumThread,
  recordDiscordBugReportForumState,
  recordDiscordFeedbackReportUpdate,
  updateDiscordBugReportStatus,
  withdrawDiscordFeedbackReport,
} from "@/lib/discord/bug-reports";
import type { DiscordBugReportRow } from "@/lib/discord/bug-reports";
import {
  buildDiscordFeedbackPanelMessagePayload,
  buildDiscordFeedbackPanelSubmitModalResponse,
  buildDiscordFeedbackUpdateModalResponse,
  buildDiscordFeedbackWithdrawModalResponse,
  buildDiscordUpdatePublishModalResponse,
  buildDiscordEphemeralMessageResponse,
  buildDiscordPongResponse,
  buildDiscordVerifyMessagePayload,
  buildDiscordVerifyModalResponse,
  discordMemberHasBugStatusPermission,
  discordMessageHasFeedbackPanel,
  discordMemberHasSetupPermission,
  discordMessageHasVerifyButton,
  FITNESS_FEEDBACK_COMMAND_NAME,
  FITNESS_FEEDBACK_PANEL_SUBMIT_BUTTON_CUSTOM_ID,
  FITNESS_FEEDBACK_PANEL_SUBMIT_MODAL_CUSTOM_ID,
  FITNESS_FEEDBACK_PANEL_TYPE_INPUT_CUSTOM_ID,
  FITNESS_FEEDBACK_SETUP_COMMAND_NAME,
  FITNESS_FEEDBACK_UPDATE_DETAILS_INPUT_CUSTOM_ID,
  FITNESS_FEEDBACK_UPDATE_MODAL_CUSTOM_ID,
  FITNESS_FEEDBACK_UPDATE_REPORT_ID_INPUT_CUSTOM_ID,
  FITNESS_FEEDBACK_REPORT_MODAL_CUSTOM_ID_PREFIX,
  FITNESS_FEEDBACK_PANEL_UPDATE_BUTTON_CUSTOM_ID,
  FITNESS_FEEDBACK_PANEL_WITHDRAW_BUTTON_CUSTOM_ID,
  FITNESS_FEEDBACK_STATUS_COMMAND_NAME,
  FITNESS_FEEDBACK_WITHDRAW_MODAL_CUSTOM_ID,
  FITNESS_FEEDBACK_WITHDRAW_NOTE_INPUT_CUSTOM_ID,
  FITNESS_FEEDBACK_WITHDRAW_REPORT_ID_INPUT_CUSTOM_ID,
  FITNESS_FEEDBACK_WITHDRAW_COMMAND_NAME,
  FITNESS_BUG_STATUS_NOTE_OPTION_NAME,
  FITNESS_BUG_STATUS_REPORT_ID_OPTION_NAME,
  FITNESS_BUG_STATUS_STATUS_OPTION_NAME,
  FITNESS_UPDATE_DRAFT_ID_OPTION_NAME,
  FITNESS_UPDATE_LATEST_COMMAND_NAME,
  FITNESS_UPDATE_PUBLISH_COMMAND_NAME,
  FITNESS_UPDATE_PUBLISH_MODAL_CUSTOM_ID_PREFIX,
  FITNESS_UPDATE_SKIP_COMMAND_NAME,
  FITNESS_UPDATE_SKIP_REASON_OPTION_NAME,
  FITNESS_UPDATE_TITLE_INPUT_CUSTOM_ID,
  FITNESS_UPDATE_WHAT_CHANGED_INPUT_CUSTOM_ID,
  FITNESS_UPDATE_WHY_IT_MATTERS_INPUT_CUSTOM_ID,
  extractDiscordUpdateDraftIdFromPublishModalCustomId,
  resolveDiscordFeedbackReportTypeFromModalCustomId,
  DISCORD_INTERACTION_TYPE,
  FITNESS_VERIFY_BUTTON_CUSTOM_ID,
  FITNESS_VERIFY_COMMAND_NAME,
  FITNESS_VERIFY_MODAL_CUSTOM_ID,
  extractDiscordCommandStringOption,
  extractDiscordModalTextInputValue,
} from "@/lib/discord/interactions";
import {
  addDiscordGuildMemberRole,
  createDiscordChannelMessage,
  createDiscordForumThreadWithMessage,
  createDiscordThreadMessage,
  fetchDiscordChannel,
  fetchDiscordChannelMessages,
  fetchDiscordGuildActiveThreads,
  patchDiscordChannelMessage,
  resolveDiscordForumTagIdsByName,
  removeDiscordGuildMemberRole,
  updateDiscordForumThreadArchiveState,
  updateDiscordForumThreadTags,
  updateDiscordForumThreadTitle,
  updateDiscordGuildMemberNickname,
} from "@/lib/discord/rest";
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

type DiscordInteraction = {
  id?: unknown;
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

function resolveFeedbackPanelChannelId(): string | null {
  return DISCORD_FEEDBACK_PANEL_CHANNEL_ID() ?? DISCORD_BUG_REPORT_FORUM_CHANNEL_ID();
}

function isDiscordForumLikeChannel(type: unknown): boolean {
  return type === 15 || type === 16;
}

function isDiscordMissingPermissionsFailure(result: { status?: number; message?: string | null }): boolean {
  return result.status === 403 || /missing permissions/i.test(String(result.message ?? ""));
}

function buildDiscordPanelPermissionFailureResponse() {
  return buildDiscordEphemeralMessageResponse(
    "Discord could not create the feedback panel. The bot needs View Channel, Read Message History, and Send Messages. Embed Links and Use External Emojis are optional.",
  );
}

function buildDiscordFeedbackLookupFailureResponse(code: string) {
  if (code === "DISCORD_BUG_REPORT_AMBIGUOUS_ID") {
    return buildDiscordEphemeralMessageResponse("That report id matched multiple feedback reports. Copy the full Report ID from the forum post.");
  }

  return buildDiscordEphemeralMessageResponse("Could not find that feedback report. Copy the Report ID from the forum post and try again.");
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
  includeReporterMention: boolean;
  replyContent: string;
}): Promise<boolean> {
  const forumChannelId = args.report.discord_forum_channel_id ?? DISCORD_BUG_REPORT_FORUM_CHANNEL_ID();
  const forumTitle = buildDiscordBugForumThreadTitle({
    reportType: args.report.report_type,
    area: args.report.area,
    summary: args.report.summary,
  });

  let forumSyncFailed = false;
  if (!args.report.discord_forum_thread_id || !forumChannelId) {
    return false;
  }

  const archiveAfterSync = shouldArchiveFeedbackThread(args.report.status);
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

  const threadReplyResult = await createDiscordThreadMessage({
    threadId: args.report.discord_forum_thread_id,
    content: args.replyContent,
    allowedMentions: buildDiscordAllowedMentions({
      reporterDiscordUserId: args.report.reporter_discord_user_id,
      includeReporter: args.includeReporterMention,
    }),
  });

  if (!threadReplyResult.ok) {
    forumSyncFailed = true;
    console.error("[discord-interactions] feedback forum reply failed", {
      requestId: randomUUID(),
      reportId: args.report.id,
      code: threadReplyResult.code,
      status: threadReplyResult.status,
      message: threadReplyResult.message,
    });
  }

  if (archiveAfterSync) {
    const archiveResult = await updateDiscordForumThreadArchiveState({
      threadId: args.report.discord_forum_thread_id,
      archived: true,
      locked: true,
    });

    if (!archiveResult.ok) {
      forumSyncFailed = true;
      console.error("[discord-interactions] feedback forum archive update failed", {
        requestId: randomUUID(),
        reportId: args.report.id,
        code: archiveResult.code,
        status: archiveResult.status,
        message: archiveResult.message,
      });
    }
  }

  return forumSyncFailed;
}

async function upsertDiscordFeedbackPanel() {
  const channelId = resolveFeedbackPanelChannelId();
  if (!channelId) {
    return { ok: false as const, code: "DISCORD_FEEDBACK_PANEL_CHANNEL_NOT_CONFIGURED", message: "Missing feedback panel channel." };
  }

  const payload = buildDiscordFeedbackPanelMessagePayload();
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
        ? { ok: true as const, action: "created" as const }
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
      return { ok: true as const, action: "updated" as const };
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
      ? { ok: true as const, action: "created" as const }
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
    return { ok: true as const, action: "updated" as const };
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
      ? "Feedback panel updated in the configured channel."
      : "Feedback panel created in the configured channel.",
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

async function handleFeedbackCreateModalSubmit(
  interaction: DiscordInteraction,
  reportTypeOverride?: "bug" | "feature" | null,
) {
  const reportType = reportTypeOverride
    ?? resolveDiscordFeedbackReportTypeFromModalCustomId(
      typeof interaction.data?.custom_id === "string" ? interaction.data.custom_id : null,
    );

  if (!reportType) {
    return buildDiscordEphemeralMessageResponse("Choose Bug or Feature for the feedback type.");
  }

  const typeLabel = reportType === "bug" ? "bug report" : "feedback";

  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This feedback flow is only available in the configured server.");
  }

  const discordUser = resolveDiscordInteractionUser(interaction);
  if (!discordUser.id) {
    return buildDiscordEphemeralMessageResponse(`Could not save that ${typeLabel}. Make sure the summary and details are filled in.`);
  }

  const creationResult = await createDiscordBugReport({
    interactionId: typeof interaction.id === "string" ? interaction.id : null,
    reporterDiscordUserId: discordUser.id,
    reporterDiscordUsername: discordUser.username ?? discordUser.globalName,
    reportType,
    modalFields: extractDiscordBugReportModalFields(interaction.data?.components, extractDiscordModalTextInputValue),
  });

  if (!creationResult.ok) {
    if (creationResult.code === "DISCORD_BUG_REPORT_RATE_LIMITED") {
      return buildDiscordEphemeralMessageResponse("You have submitted several reports recently. Please wait a few minutes before sending another.");
    }

    if (creationResult.code === "DISCORD_BUG_REPORT_INVALID_INPUT") {
      return buildDiscordEphemeralMessageResponse(`Could not save that ${typeLabel}. Make sure the summary and details are filled in.`);
    }

    return buildDiscordEphemeralMessageResponse(`Could not save that ${typeLabel} right now. Please try again in a moment.`);
  }

  const reporterLabel = buildDiscordBugReporterLabel({
    reporterDiscordUsername: discordUser.username ?? discordUser.globalName,
    reporterMemberNumber: creationResult.reporterLink.memberNumber,
  });
  const forumChannelId = DISCORD_BUG_REPORT_FORUM_CHANNEL_ID();
  let forumThreadCreationFailed = false;

  if (forumChannelId && creationResult.duplicate && creationResult.report.discord_forum_thread_id) {
    try {
      const duplicateReplyResult = await createDiscordThreadMessage({
        threadId: creationResult.report.discord_forum_thread_id,
        content: buildDiscordBugForumDuplicateReply({
          reportType: creationResult.report.report_type,
          reporterLabel,
          duplicateCount: creationResult.report.duplicate_count,
        }),
        allowedMentions: buildDiscordAllowedMentions({
          reporterDiscordUserId: creationResult.report.reporter_discord_user_id,
          includeReporter: false,
        }),
      });

      if (!duplicateReplyResult.ok) {
        logDiscordFeedbackSoftFailure({
          stage: "duplicate-reply",
          reportId: creationResult.report.id,
          code: duplicateReplyResult.code,
          status: duplicateReplyResult.status,
          message: duplicateReplyResult.message,
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
    return buildDiscordEphemeralMessageResponse(
      "Feedback received. It looks similar to an existing report, so we added your signal to that issue.",
    );
  }

  if (forumThreadCreationFailed) {
    return buildDiscordEphemeralMessageResponse(
      "Feedback received, but Discord could not create the forum post yet. The team can still review it.",
    );
  }

  if (creationResult.reporterLink.memberNumber !== null) {
    return buildDiscordEphemeralMessageResponse(
      `Feedback received from Member #${creationResult.reporterLink.memberNumber}. Thanks for helping improve Fitness.`,
    );
  }

  return buildDiscordEphemeralMessageResponse("Feedback received. Thanks for helping improve Fitness.");
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
  const forumSyncFailed = await syncDiscordFeedbackForumThread({
    report: updatedReport,
    includeReporterMention,
    replyContent: buildDiscordBugStatusThreadReply({
      reportType: updatedReport.report_type,
      status: updatedReport.status,
      note: updatedReport.status_note,
      reporterDiscordUserId: updatedReport.reporter_discord_user_id,
      includeReporterMention,
    }),
  });

  return buildDiscordEphemeralMessageResponse(
    forumSyncFailed
      ? `Feedback updated, but the forum thread could not be fully synced. (${formatDiscordBugReportShortId(updatedReport.id)})`
      : "Feedback updated.",
  );
}

async function handleFeedbackUpdateModalSubmit(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This feedback flow is only available in the configured server.");
  }

  const requester = resolveDiscordInteractionUser(interaction);
  const reportIdOrPrefix = extractDiscordModalTextInputValue(
    interaction.data?.components,
    FITNESS_FEEDBACK_UPDATE_REPORT_ID_INPUT_CUSTOM_ID,
  );
  const updateDetails = extractDiscordModalTextInputValue(
    interaction.data?.components,
    FITNESS_FEEDBACK_UPDATE_DETAILS_INPUT_CUSTOM_ID,
  );

  if (!requester.id || !reportIdOrPrefix || !updateDetails) {
    return buildDiscordEphemeralMessageResponse("Could not update that feedback.");
  }

  const lookupResult = await findDiscordBugReportByIdOrPrefix({ reportIdOrPrefix });
  if (!lookupResult.ok) {
    return buildDiscordFeedbackLookupFailureResponse(lookupResult.code);
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  const isStaff = discordMemberHasBugStatusPermission(permissions);
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

  const updateResult = await recordDiscordFeedbackReportUpdate({
    reportId: lookupResult.report.id,
    updateDetails,
    updatedByDiscordUserId: requester.id,
  });

  if (!updateResult.ok) {
    return buildDiscordEphemeralMessageResponse("Could not update that feedback right now.");
  }

  const updatedReport = updateResult.report;
  const updaterLabel = buildDiscordBugReporterLabel({
    reporterDiscordUsername: requester.username ?? requester.globalName,
    reporterMemberNumber: isReporter ? updatedReport.reporter_member_number : null,
  });
  const forumSyncFailed = await syncDiscordFeedbackForumThread({
    report: updatedReport,
    includeReporterMention: false,
    replyContent: buildDiscordFeedbackUpdateThreadReply({
      reportType: updatedReport.report_type,
      updateDetails,
      updaterLabel,
    }),
  });

  return buildDiscordEphemeralMessageResponse(
    forumSyncFailed
      ? `Feedback updated, but the forum thread could not be fully synced. (${formatDiscordBugReportShortId(updatedReport.id)})`
      : "Feedback updated.",
  );
}

async function handleFeedbackWithdrawRequest(args: {
  interaction: DiscordInteraction;
  reportIdOrPrefix: string | null;
  statusNote?: string | null;
}) {
  if (!interactionMatchesGuild(args.interaction)) {
    return buildDiscordEphemeralMessageResponse("This feedback flow is only available in the configured server.");
  }

  const requester = resolveDiscordInteractionUser(args.interaction);
  if (!requester.id || !args.reportIdOrPrefix) {
    return buildDiscordEphemeralMessageResponse("Could not withdraw that feedback.");
  }

  const lookupResult = await findDiscordBugReportByIdOrPrefix({ reportIdOrPrefix: args.reportIdOrPrefix });
  if (!lookupResult.ok) {
    return buildDiscordFeedbackLookupFailureResponse(lookupResult.code);
  }

  const permissions = typeof args.interaction.member?.permissions === "string" ? args.interaction.member.permissions : null;
  const isStaff = discordMemberHasBugStatusPermission(permissions);
  const isReporter = lookupResult.report.reporter_discord_user_id === requester.id;

  if (!isReporter && !isStaff) {
    return buildDiscordEphemeralMessageResponse("You can only withdraw feedback you submitted.");
  }

  const withdrawResult = await withdrawDiscordFeedbackReport({
    reportId: lookupResult.report.id,
    withdrawnByDiscordUserId: requester.id,
    statusNote: args.statusNote?.trim() || (isReporter ? "Withdrawn by reporter" : "Withdrawn by staff"),
  });

  if (!withdrawResult.ok) {
    return buildDiscordEphemeralMessageResponse("Could not withdraw that feedback right now.");
  }

  const updatedReport = withdrawResult.report;
  const reporterLabel = buildDiscordBugReporterLabel({
    reporterDiscordUsername: updatedReport.reporter_discord_username,
    reporterMemberNumber: updatedReport.reporter_member_number,
  });
  let forumSyncFailed = false;
  const forumChannelId = updatedReport.discord_forum_channel_id ?? DISCORD_BUG_REPORT_FORUM_CHANNEL_ID();

  if (updatedReport.discord_forum_thread_id && forumChannelId) {
    let matchedTagIds: string[] | null = null;
    const tagResolutionResult = await resolveDiscordForumTagIdsByName({
      channelId: forumChannelId,
      tagNames: buildDiscordBugForumTagNames({
        reportType: updatedReport.report_type,
        status: updatedReport.status,
        severity: updatedReport.severity,
      }),
    });

    if (tagResolutionResult.ok) {
      matchedTagIds = tagResolutionResult.matchedTagIds;
    } else {
      forumSyncFailed = true;
    }

    if (matchedTagIds) {
      const tagUpdateResult = await updateDiscordForumThreadTags({
        threadId: updatedReport.discord_forum_thread_id,
        appliedTagIds: matchedTagIds,
      });

      if (!tagUpdateResult.ok) {
        forumSyncFailed = true;
      }
    }

    if (updatedReport.discord_forum_message_id) {
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
      }
    }

    const recordStateResult = await recordDiscordBugReportForumState({
      reportId: updatedReport.id,
      forumTitle: updatedReport.discord_forum_title ?? buildDiscordBugForumThreadTitle({
        reportType: updatedReport.report_type,
        area: updatedReport.area,
        summary: updatedReport.summary,
      }),
      forumAppliedTagIds: matchedTagIds,
    });

    if (!recordStateResult.ok) {
      forumSyncFailed = true;
    }

    const threadReplyResult = await createDiscordThreadMessage({
      threadId: updatedReport.discord_forum_thread_id,
      content: buildDiscordFeedbackWithdrawThreadReply(updatedReport.report_type),
      allowedMentions: buildDiscordAllowedMentions({
        reporterDiscordUserId: updatedReport.reporter_discord_user_id,
        includeReporter: false,
      }),
    });

    if (!threadReplyResult.ok) {
      forumSyncFailed = true;
    }

    const archiveResult = await updateDiscordForumThreadArchiveState({
      threadId: updatedReport.discord_forum_thread_id,
      archived: true,
      locked: true,
    });

    if (!archiveResult.ok) {
      forumSyncFailed = true;
    }
  }

  return buildDiscordEphemeralMessageResponse(
    forumSyncFailed
      ? `Feedback withdrawn, but the forum thread could not be fully synced. (${formatDiscordBugReportShortId(updatedReport.id)})`
      : "Feedback withdrawn. We removed the detailed text and kept a small audit record.",
  );
}

async function handleFeedbackWithdrawInteraction(interaction: DiscordInteraction) {
  return handleFeedbackWithdrawRequest({
    interaction,
    reportIdOrPrefix: extractDiscordCommandStringOption(interaction.data?.options, FITNESS_BUG_STATUS_REPORT_ID_OPTION_NAME),
  });
}

async function handleFeedbackWithdrawModalSubmit(interaction: DiscordInteraction) {
  return handleFeedbackWithdrawRequest({
    interaction,
    reportIdOrPrefix: extractDiscordModalTextInputValue(
      interaction.data?.components,
      FITNESS_FEEDBACK_WITHDRAW_REPORT_ID_INPUT_CUSTOM_ID,
    ),
    statusNote: extractDiscordModalTextInputValue(
      interaction.data?.components,
      FITNESS_FEEDBACK_WITHDRAW_NOTE_INPUT_CUSTOM_ID,
    ),
  });
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
      return jsonResponse(buildDiscordFeedbackPanelSubmitModalResponse());
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
      && interaction.data?.custom_id === FITNESS_FEEDBACK_PANEL_UPDATE_BUTTON_CUSTOM_ID
    ) {
      return jsonResponse(buildDiscordFeedbackUpdateModalResponse());
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
      && interaction.data?.custom_id === FITNESS_FEEDBACK_PANEL_WITHDRAW_BUTTON_CUSTOM_ID
    ) {
      return jsonResponse(buildDiscordFeedbackWithdrawModalResponse());
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && typeof interaction.data?.custom_id === "string"
      && interaction.data.custom_id.startsWith(`${FITNESS_FEEDBACK_REPORT_MODAL_CUSTOM_ID_PREFIX}:`)
    ) {
      return jsonResponse(await handleFeedbackCreateModalSubmit(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && interaction.data?.custom_id === FITNESS_FEEDBACK_PANEL_SUBMIT_MODAL_CUSTOM_ID
    ) {
      const reportType = normalizeDiscordFeedbackReportType(
        extractDiscordModalTextInputValue(interaction.data?.components, FITNESS_FEEDBACK_PANEL_TYPE_INPUT_CUSTOM_ID),
      );

      if (reportType !== "bug" && reportType !== "feature") {
        return jsonResponse(buildDiscordEphemeralMessageResponse("Choose Bug or Feature for the feedback type."), { status: 400 });
      }

      return jsonResponse(await handleFeedbackCreateModalSubmit(interaction, reportType));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && interaction.data?.custom_id === FITNESS_FEEDBACK_UPDATE_MODAL_CUSTOM_ID
    ) {
      return jsonResponse(await handleFeedbackUpdateModalSubmit(interaction));
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && interaction.data?.custom_id === FITNESS_FEEDBACK_WITHDRAW_MODAL_CUSTOM_ID
    ) {
      return jsonResponse(await handleFeedbackWithdrawModalSubmit(interaction));
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
