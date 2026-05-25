import { randomUUID } from "node:crypto";
import type {
  DiscordBugReportRow,
  DiscordFeedbackCardAuditAction,
} from "@/lib/discord/bug-reports";
import { buildDiscordAllowedMentions } from "@/lib/discord/bug-reports";
import {
  isResolvedFeedbackStatus,
} from "@/lib/discord/runtime/feedback/helpers";

type FeedbackSoftFailureArgs = {
  stage: string;
  reportId: string;
  code?: string | null;
  status?: number | null;
  message?: string | null;
  error?: unknown;
};

type DiscordRestResult = {
  ok: boolean;
  code?: string | null;
  status?: number | null;
  message?: string | null;
};

type ForumTagResolutionResult =
  | {
    ok: true;
    matchedTagIds: string[];
    missingTagNames: string[];
  }
  | {
    ok: false;
    code?: string | null;
    status?: number | null;
    message?: string | null;
  };

type FeedbackAuditCommentResult = {
  ok: boolean;
  messageId?: string | null;
  code?: string | null;
  status?: number | null;
  message?: string | null;
};

export function logDiscordFeedbackSoftFailure(args: FeedbackSoftFailureArgs) {
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

export async function syncDiscordFeedbackStarterMessage(args: {
  report: DiscordBugReportRow;
  buildReporterLabel: (args: {
    reporterDiscordUsername: string | null;
    reporterMemberNumber: number | null;
  }) => string;
  buildForumThreadBody: (args: {
    report: DiscordBugReportRow;
    reporterLabel: string;
  }) => string;
  patchDiscordChannelMessage: (args: {
    channelId: string;
    messageId: string;
    body: {
      content: string;
      allowed_mentions: Record<string, unknown>;
    };
  }) => Promise<DiscordRestResult>;
}) {
  if (!args.report.discord_forum_thread_id || !args.report.discord_forum_message_id) {
    return { ok: true as const };
  }

  const reporterLabel = args.buildReporterLabel({
    reporterDiscordUsername: args.report.reporter_discord_username,
    reporterMemberNumber: args.report.reporter_member_number,
  });
  const patchStarterMessageResult = await args.patchDiscordChannelMessage({
    channelId: args.report.discord_forum_thread_id,
    messageId: args.report.discord_forum_message_id,
    body: {
      content: args.buildForumThreadBody({
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

export async function ensureDiscordResolvedFeedbackReaction(args: {
  report: DiscordBugReportRow;
  requiresCompletionReview: (report: DiscordBugReportRow) => boolean;
  createDiscordMessageReaction: (args: {
    channelId: string;
    messageId: string;
    emoji: string;
  }) => Promise<DiscordRestResult>;
  successReaction: string;
}): Promise<{ warning: string | null }> {
  if (!isResolvedFeedbackStatus(args.report.status) || !args.requiresCompletionReview(args.report)) {
    return { warning: null };
  }

  if (!args.report.discord_forum_thread_id || !args.report.discord_forum_message_id) {
    logDiscordFeedbackSoftFailure({
      stage: "resolved-reaction-missing-starter",
      reportId: args.report.id,
      message: "Missing forum thread id or starter message id for resolved reaction sync.",
    });
    return {
      warning: "Discord could not verify the resolved success reaction because the public starter post id is missing.",
    };
  }

  const reactionResult = await args.createDiscordMessageReaction({
    channelId: args.report.discord_forum_thread_id,
    messageId: args.report.discord_forum_message_id,
    emoji: args.successReaction,
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
    warning: "Discord could not apply the resolved success reaction on the public starter post.",
  };
}

export async function syncDiscordFeedbackForumThread(args: {
  report: DiscordBugReportRow;
  forumChannelId: string | null;
  validateDiscordFeedbackEmojis: () => Promise<unknown>;
  buildForumThreadTitle: (args: {
    reportType: DiscordBugReportRow["report_type"];
    area: string | null;
    summary: string;
  }) => string;
  resolveDiscordForumTagIdsByName: (args: {
    channelId: string;
    tagNames: string[];
  }) => Promise<ForumTagResolutionResult>;
  buildForumTagNames: (args: {
    reportType: DiscordBugReportRow["report_type"];
    status: DiscordBugReportRow["status"];
    severity: DiscordBugReportRow["severity"];
    includeBacklog: boolean;
  }) => string[];
  shouldApplyBacklogTag: (report: DiscordBugReportRow) => boolean;
  updateDiscordForumThreadTitle: (args: {
    threadId: string;
    title: string;
  }) => Promise<DiscordRestResult>;
  updateDiscordForumThreadTags: (args: {
    threadId: string;
    appliedTagIds: string[];
  }) => Promise<DiscordRestResult>;
  recordDiscordBugReportForumState: (args: {
    reportId: string;
    forumTitle: string;
    forumAppliedTagIds: string[] | null;
  }) => Promise<{ ok: boolean }>;
}): Promise<{ forumSyncFailed: boolean }> {
  await args.validateDiscordFeedbackEmojis();
  const forumTitle = args.buildForumThreadTitle({
    reportType: args.report.report_type,
    area: args.report.area,
    summary: args.report.summary,
  });

  let forumSyncFailed = false;
  if (!args.report.discord_forum_thread_id || !args.forumChannelId) {
    return {
      forumSyncFailed: false,
    };
  }

  let matchedTagIds: string[] | null = null;
  const tagResolutionResult = await args.resolveDiscordForumTagIdsByName({
    channelId: args.forumChannelId,
    tagNames: args.buildForumTagNames({
      reportType: args.report.report_type,
      status: args.report.status,
      severity: args.report.severity,
      includeBacklog: args.shouldApplyBacklogTag(args.report),
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

  const titleUpdateResult = await args.updateDiscordForumThreadTitle({
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
    const tagUpdateResult = await args.updateDiscordForumThreadTags({
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

  const recordStateResult = await args.recordDiscordBugReportForumState({
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

export async function postFeedbackAuditComment(args: {
  report: DiscordBugReportRow;
  action: DiscordFeedbackCardAuditAction;
  actorLabel?: string | null;
  includeReporterMention?: boolean;
  statusBefore?: DiscordBugReportRow["status"] | null;
  statusAfter?: DiscordBugReportRow["status"] | null;
  completionReviewStatus?: DiscordBugReportRow["completion_review_status"] | null;
  note?: string | null;
  duplicateCount?: number | null;
  postFeedbackCardAuditComment: (args: {
    threadId: string;
    action: DiscordFeedbackCardAuditAction;
    actorLabel?: string | null;
    reportType: DiscordBugReportRow["report_type"];
    reporterDiscordUserId: string;
    includeReporterMention: boolean;
    statusBefore: DiscordBugReportRow["status"] | null;
    statusAfter: DiscordBugReportRow["status"] | null;
    completionReviewStatus: DiscordBugReportRow["completion_review_status"] | null;
    note: string | null;
    reportId: string;
    duplicateCount: number | null;
  }) => Promise<FeedbackAuditCommentResult>;
}): Promise<{ ok: boolean; messageId: string | null }> {
  if (!args.report.discord_forum_thread_id) {
    return { ok: true, messageId: null };
  }

  const result = await args.postFeedbackCardAuditComment({
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

  return { ok: true, messageId: result.messageId ?? null };
}
