import { randomUUID } from "node:crypto";
import {
  DISCORD_APPLICATION_ID,
  DISCORD_BUG_REPORT_FORUM_CHANNEL_ID,
  DISCORD_GUILD_ID,
  DISCORD_UNVERIFIED_ROLE_ID,
  DISCORD_VERIFY_CHANNEL_ID,
  DISCORD_VERIFY_MESSAGE_BODY,
  DISCORD_VERIFY_MESSAGE_TITLE,
  DISCORD_VERIFIED_ROLE_ID,
} from "@/lib/env";
import { verifyDiscordInteractionSignature } from "@/lib/discord/interaction-signature";
import {
  buildDiscordAllowedMentions,
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
  updateDiscordBugReportStatus,
  withdrawDiscordFeedbackReport,
} from "@/lib/discord/bug-reports";
import {
  buildDiscordFeedbackReportModalResponse,
  buildDiscordEphemeralMessageResponse,
  buildDiscordPongResponse,
  buildDiscordVerifyMessagePayload,
  buildDiscordVerifyModalResponse,
  discordMemberHasBugStatusPermission,
  discordMemberHasSetupPermission,
  discordMessageHasVerifyButton,
  FITNESS_FEEDBACK_COMMAND_NAME,
  FITNESS_FEEDBACK_REPORT_MODAL_CUSTOM_ID_PREFIX,
  FITNESS_FEEDBACK_STATUS_COMMAND_NAME,
  FITNESS_FEEDBACK_TYPE_OPTION_NAME,
  FITNESS_FEEDBACK_WITHDRAW_COMMAND_NAME,
  FITNESS_BUG_STATUS_NOTE_OPTION_NAME,
  FITNESS_BUG_STATUS_REPORT_ID_OPTION_NAME,
  FITNESS_BUG_STATUS_STATUS_OPTION_NAME,
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
  fetchDiscordChannelMessages,
  patchDiscordChannelMessage,
  resolveDiscordForumTagIdsByName,
  removeDiscordGuildMemberRole,
  updateDiscordForumThreadTags,
  updateDiscordForumThreadTitle,
  updateDiscordGuildMemberNickname,
} from "@/lib/discord/rest";
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

async function upsertDiscordVerifyMessage() {
  const messagesResult = await fetchDiscordChannelMessages({
    channelId: DISCORD_VERIFY_CHANNEL_ID(),
    limit: 50,
  });

  if (!messagesResult.ok) {
    return { ok: false, code: messagesResult.code, message: messagesResult.message };
  }

  const existingMessage = messagesResult.messages.find((message) => (
    message.author?.id === DISCORD_APPLICATION_ID() && discordMessageHasVerifyButton(message)
  )) ?? messagesResult.messages.find(discordMessageHasVerifyButton);

  const payload = buildDiscordVerifyMessagePayload({
    title: DISCORD_VERIFY_MESSAGE_TITLE(),
    body: DISCORD_VERIFY_MESSAGE_BODY(),
  });

  if (existingMessage) {
    const patchResult = await patchDiscordChannelMessage({
      channelId: DISCORD_VERIFY_CHANNEL_ID(),
      messageId: existingMessage.id,
      body: payload,
    });

    return patchResult.ok
      ? { ok: true, action: "updated" as const }
      : { ok: false, code: patchResult.code, message: patchResult.message };
  }

  const createResult = await createDiscordChannelMessage({
    channelId: DISCORD_VERIFY_CHANNEL_ID(),
    body: payload,
  });

  return createResult.ok
    ? { ok: true, action: "created" as const }
    : { ok: false, code: createResult.code, message: createResult.message };
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

async function handleBugReportModalSubmit(interaction: DiscordInteraction) {
  const reportType = resolveDiscordFeedbackReportTypeFromModalCustomId(
    typeof interaction.data?.custom_id === "string" ? interaction.data.custom_id : null,
  ) ?? "bug";
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

  if (forumChannelId && creationResult.duplicate && creationResult.report.discord_forum_thread_id) {
    const duplicateReplyResult = await createDiscordThreadMessage({
      threadId: creationResult.report.discord_forum_thread_id,
      content: buildDiscordBugForumDuplicateReply({
        reporterLabel,
        duplicateCount: creationResult.report.duplicate_count,
      }),
      allowedMentions: buildDiscordAllowedMentions({
        reporterDiscordUserId: creationResult.report.reporter_discord_user_id,
        includeReporter: false,
      }),
    });

    if (!duplicateReplyResult.ok) {
      console.error("[discord-interactions] feedback forum duplicate reply failed", {
        requestId: randomUUID(),
        reportId: creationResult.report.id,
        code: duplicateReplyResult.code,
        status: duplicateReplyResult.status,
        message: duplicateReplyResult.message,
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
      console.warn("[discord-interactions] feedback forum tag resolution failed", {
        requestId: randomUUID(),
        reportId: creationResult.report.id,
        code: tagResolutionResult.code,
        status: tagResolutionResult.status,
        message: tagResolutionResult.message,
      });
    }

    const forumThreadResult = await createDiscordForumThreadWithMessage({
      channelId: forumChannelId,
      threadName: forumTitle,
      messageContent: buildDiscordBugForumThreadBody({
        report: creationResult.report,
        reporterLabel,
      }),
      appliedTagIds: matchedTagIds ?? undefined,
      allowedMentions: buildDiscordAllowedMentions({
        reporterDiscordUserId: creationResult.report.reporter_discord_user_id,
        includeReporter: true,
      }),
    });

    if (!forumThreadResult.ok) {
      console.error("[discord-interactions] feedback forum thread creation failed", {
        requestId: randomUUID(),
        reportId: creationResult.report.id,
        code: forumThreadResult.code,
        status: forumThreadResult.status,
        message: forumThreadResult.message,
      });
    } else if (forumThreadResult.threadId) {
      const forumUpdateResult = await recordDiscordBugReportForumThread({
        reportId: creationResult.report.id,
        forumChannelId,
        forumThreadId: forumThreadResult.threadId,
        forumMessageId: forumThreadResult.messageId,
        forumTitle,
        forumAppliedTagIds: matchedTagIds,
        reporterMentionedAt: new Date().toISOString(),
      });

      if (!forumUpdateResult.ok) {
        console.error("[discord-interactions] feedback forum thread metadata update failed", {
          requestId: randomUUID(),
          reportId: creationResult.report.id,
        });
      }
    }
  }

  if (creationResult.duplicate) {
    return buildDiscordEphemeralMessageResponse(
      "Feedback received. It looks similar to an existing report, so we added your signal to that issue.",
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
  const forumChannelId = updatedReport.discord_forum_channel_id ?? DISCORD_BUG_REPORT_FORUM_CHANNEL_ID();
  const forumTitle = buildDiscordBugForumThreadTitle({
    reportType: updatedReport.report_type,
    area: updatedReport.area,
    summary: updatedReport.summary,
  });

  let forumSyncFailed = false;
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
      if (tagResolutionResult.missingTagNames.length > 0) {
        console.warn("[discord-interactions] bug status forum tags missing", {
          requestId: randomUUID(),
          reportId: updatedReport.id,
          missingTagNames: tagResolutionResult.missingTagNames,
        });
      }
    } else {
      forumSyncFailed = true;
      console.warn("[discord-interactions] bug status forum tag resolution failed", {
        requestId: randomUUID(),
        reportId: updatedReport.id,
        code: tagResolutionResult.code,
        status: tagResolutionResult.status,
        message: tagResolutionResult.message,
      });
    }

    const titleUpdateResult = await updateDiscordForumThreadTitle({
      threadId: updatedReport.discord_forum_thread_id,
      title: forumTitle,
    });

    if (!titleUpdateResult.ok) {
      forumSyncFailed = true;
      console.error("[discord-interactions] bug forum title update failed", {
        requestId: randomUUID(),
        reportId: updatedReport.id,
        code: titleUpdateResult.code,
        status: titleUpdateResult.status,
        message: titleUpdateResult.message,
      });
    }

    if (matchedTagIds) {
      const tagUpdateResult = await updateDiscordForumThreadTags({
        threadId: updatedReport.discord_forum_thread_id,
        appliedTagIds: matchedTagIds,
      });

      if (!tagUpdateResult.ok) {
        forumSyncFailed = true;
        console.error("[discord-interactions] bug forum tag update failed", {
          requestId: randomUUID(),
          reportId: updatedReport.id,
          code: tagUpdateResult.code,
          status: tagUpdateResult.status,
          message: tagUpdateResult.message,
        });
      }
    }

    const recordStateResult = await recordDiscordBugReportForumState({
      reportId: updatedReport.id,
      forumTitle,
      forumAppliedTagIds: matchedTagIds,
    });

    if (!recordStateResult.ok) {
      forumSyncFailed = true;
      console.error("[discord-interactions] bug forum state update failed", {
        requestId: randomUUID(),
        reportId: updatedReport.id,
      });
    }

    const threadReplyResult = await createDiscordThreadMessage({
      threadId: updatedReport.discord_forum_thread_id,
      content: buildDiscordBugStatusThreadReply({
        status: updatedReport.status,
        note: updatedReport.status_note,
        reporterDiscordUserId: updatedReport.reporter_discord_user_id,
        includeReporterMention,
      }),
      allowedMentions: buildDiscordAllowedMentions({
        reporterDiscordUserId: updatedReport.reporter_discord_user_id,
        includeReporter: includeReporterMention,
      }),
    });

    if (!threadReplyResult.ok) {
      forumSyncFailed = true;
      console.error("[discord-interactions] bug forum status reply failed", {
        requestId: randomUUID(),
        reportId: updatedReport.id,
        code: threadReplyResult.code,
        status: threadReplyResult.status,
        message: threadReplyResult.message,
      });
    }
  }

  return buildDiscordEphemeralMessageResponse(
    forumSyncFailed
      ? `Feedback updated, but the forum thread could not be fully synced. (${formatDiscordBugReportShortId(updatedReport.id)})`
      : "Feedback updated.",
  );
}

async function handleFeedbackWithdrawInteraction(interaction: DiscordInteraction) {
  if (!interactionMatchesGuild(interaction)) {
    return buildDiscordEphemeralMessageResponse("This feedback flow is only available in the configured server.");
  }

  const requester = resolveDiscordInteractionUser(interaction);
  const reportIdOrPrefix = extractDiscordCommandStringOption(interaction.data?.options, FITNESS_BUG_STATUS_REPORT_ID_OPTION_NAME);

  if (!requester.id || !reportIdOrPrefix) {
    return buildDiscordEphemeralMessageResponse("Could not withdraw that feedback.");
  }

  const lookupResult = await findDiscordBugReportByIdOrPrefix({ reportIdOrPrefix });
  if (!lookupResult.ok) {
    if (lookupResult.code === "DISCORD_BUG_REPORT_AMBIGUOUS_ID") {
      return buildDiscordEphemeralMessageResponse("That report id matched multiple feedback reports. Copy the full Report ID from the forum post.");
    }

    return buildDiscordEphemeralMessageResponse("Could not find that feedback report. Copy the Report ID from the forum post and try again.");
  }

  const permissions = typeof interaction.member?.permissions === "string" ? interaction.member.permissions : null;
  const isStaff = discordMemberHasBugStatusPermission(permissions);
  const isReporter = lookupResult.report.reporter_discord_user_id === requester.id;

  if (!isReporter && !isStaff) {
    return buildDiscordEphemeralMessageResponse("You can only withdraw feedback you submitted.");
  }

  const withdrawResult = await withdrawDiscordFeedbackReport({
    reportId: lookupResult.report.id,
    withdrawnByDiscordUserId: requester.id,
    statusNote: isReporter ? "Withdrawn by reporter" : "Withdrawn by staff",
  });

  if (!withdrawResult.ok) {
    return buildDiscordEphemeralMessageResponse("Could not withdraw that feedback right now.");
  }

  const updatedReport = withdrawResult.report;
  const forumChannelId = updatedReport.discord_forum_channel_id ?? DISCORD_BUG_REPORT_FORUM_CHANNEL_ID();
  let forumSyncFailed = false;

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
      content: buildDiscordFeedbackWithdrawThreadReply(),
      allowedMentions: buildDiscordAllowedMentions({
        reporterDiscordUserId: updatedReport.reporter_discord_user_id,
        includeReporter: false,
      }),
    });

    if (!threadReplyResult.ok) {
      forumSyncFailed = true;
    }
  }

  return buildDiscordEphemeralMessageResponse(
    forumSyncFailed
      ? `Feedback withdrawn, but the forum thread could not be fully synced. (${formatDiscordBugReportShortId(updatedReport.id)})`
      : "Feedback withdrawn. We removed the detailed text and kept a small audit record.",
  );
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
      const reportType = normalizeDiscordFeedbackReportType(
        extractDiscordCommandStringOption(interaction.data?.options, FITNESS_FEEDBACK_TYPE_OPTION_NAME),
      );

      return reportType
        ? jsonResponse(buildDiscordFeedbackReportModalResponse(reportType))
        : jsonResponse(buildDiscordEphemeralMessageResponse("Choose a valid feedback type."), { status: 400 });
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
      interaction.type === DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT
      && interaction.data?.custom_id === FITNESS_VERIFY_BUTTON_CUSTOM_ID
    ) {
      return jsonResponse(buildDiscordVerifyModalResponse());
    }

    if (
      interaction.type === DISCORD_INTERACTION_TYPE.MODAL_SUBMIT
      && typeof interaction.data?.custom_id === "string"
      && interaction.data.custom_id.startsWith(`${FITNESS_FEEDBACK_REPORT_MODAL_CUSTOM_ID_PREFIX}:`)
    ) {
      return jsonResponse(await handleBugReportModalSubmit(interaction));
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
