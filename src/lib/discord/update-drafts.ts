import "server-only";

import {
  createDiscordChannelMessage,
  DISCORD_MESSAGE_FLAG_SUPPRESS_EMBEDS,
} from "@/lib/discord/rest";
import { DISCORD_UPDATES_CHANNEL_ID, VERCEL_PROJECT_ID } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

const FITNESS_LOGIN_URL = "https://fawxzzy-fitness-local.vercel.app/login";
const FITNESS_PROJECT_NAME = "fawxzzy-fitness";
const UPDATE_DRAFT_ID_PREFIX_MIN_LENGTH = 6;
const UPDATE_DRAFT_TITLE_MAX_LENGTH = 120;
const UPDATE_DRAFT_CHANGES_MAX_LENGTH = 1500;
const UPDATE_DRAFT_WHY_IT_MATTERS_MAX_LENGTH = 800;
const UPDATE_DRAFT_SKIP_REASON_MAX_LENGTH = 500;
const UPDATE_DRAFT_COMMIT_MESSAGE_MAX_LENGTH = 500;
const UPDATE_DRAFT_GIT_REF_MAX_LENGTH = 200;
const UPDATE_DRAFT_URL_MAX_LENGTH = 500;
const UPDATE_DRAFT_PROJECT_NAME_MAX_LENGTH = 120;
const UPDATE_DRAFT_TARGET_MAX_LENGTH = 40;
const UPDATE_DRAFT_DEPLOYMENT_ID_MAX_LENGTH = 120;
const UPDATE_DRAFT_PROJECT_ID_MAX_LENGTH = 120;
const UPDATE_DRAFT_SOURCE = "vercel";
const READY_EVENT_TYPES = new Set(["deployment.ready", "deployment.succeeded"]);
const DEFAULT_PUBLIC_UPDATE_TITLE = "Fitness App Update";

export type DiscordUpdateDraftStatus = "draft" | "published" | "skipped" | "ignored" | "failed";

export type DiscordUpdateDraftRow = {
  id: string;
  source: "vercel";
  status: DiscordUpdateDraftStatus;
  deployment_id: string;
  deployment_url: string | null;
  production_url: string | null;
  vercel_project_id: string | null;
  vercel_project_name: string | null;
  vercel_target: string | null;
  git_commit_sha: string | null;
  git_commit_ref: string | null;
  git_commit_message: string | null;
  user_facing_title: string | null;
  user_facing_changes: string | null;
  user_facing_why_it_matters: string | null;
  discord_channel_id: string | null;
  discord_message_id: string | null;
  published_by_discord_user_id: string | null;
  published_at: string | null;
  skipped_by_discord_user_id: string | null;
  skipped_at: string | null;
  skip_reason: string | null;
  webhook_received_at: string;
  created_at: string;
  updated_at: string;
};

type DiscordUpdateDraftsAdminClient = {
  from: (table: "discord_update_drafts") => any;
};

type VercelDeploymentWebhookEnvelope = {
  type?: unknown;
  createdAt?: unknown;
  payload?: unknown;
};

type NormalizedVercelDeploymentMetadata = {
  deploymentId: string;
  deploymentUrl: string | null;
  productionUrl: string | null;
  vercelProjectId: string | null;
  vercelProjectName: string | null;
  vercelTarget: string;
  gitCommitSha: string | null;
  gitCommitRef: string | null;
  gitCommitMessage: string | null;
  webhookReceivedAt: string;
};

type PublishUpdateDraftDependencies = {
  createMessage?: typeof createDiscordChannelMessage;
};

const DISCORD_UPDATE_DRAFT_SELECT_COLUMNS = [
  "id",
  "source",
  "status",
  "deployment_id",
  "deployment_url",
  "production_url",
  "vercel_project_id",
  "vercel_project_name",
  "vercel_target",
  "git_commit_sha",
  "git_commit_ref",
  "git_commit_message",
  "user_facing_title",
  "user_facing_changes",
  "user_facing_why_it_matters",
  "discord_channel_id",
  "discord_message_id",
  "published_by_discord_user_id",
  "published_at",
  "skipped_by_discord_user_id",
  "skipped_at",
  "skip_reason",
  "webhook_received_at",
  "created_at",
  "updated_at",
].join(", ");

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeTextInput(value: string | null | undefined, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function neutralizeDiscordMentions(value: string): string {
  return value
    .replace(/@everyone/gi, "@\u200beveryone")
    .replace(/@here/gi, "@\u200bhere")
    .replace(/<@&/g, "<@\u200b&")
    .replace(/<@/g, "<@\u200b");
}

function normalizePublicUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const url = normalized.startsWith("http://") || normalized.startsWith("https://")
    ? normalized
    : `https://${normalized}`;

  try {
    const parsed = new URL(url);
    return parsed.toString().slice(0, UPDATE_DRAFT_URL_MAX_LENGTH);
  } catch {
    return null;
  }
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function pickFirstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeDraftIdPrefix(prefix: string): string | null {
  const normalized = prefix.trim().toLowerCase();
  return /^[0-9a-f-]{6,36}$/i.test(normalized) ? normalized : null;
}

function formatUuidHex(hex: string): string {
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function buildUuidBoundsFromPrefix(prefix: string): { lower: string; upper: string } | null {
  const normalized = prefix.replace(/-/g, "").trim().toLowerCase();
  if (!/^[0-9a-f]{6,32}$/.test(normalized)) {
    return null;
  }

  const lowerHex = normalized.padEnd(32, "0").slice(0, 32);
  const upperHex = normalized.padEnd(32, "f").slice(0, 32);

  return {
    lower: formatUuidHex(lowerHex),
    upper: formatUuidHex(upperHex),
  };
}

function normalizeShortCommitSha(value: string | null): string | null {
  const normalized = normalizeTextInput(value, 64);
  return normalized ? normalized.slice(0, 12) : null;
}

function normalizeChangesLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => neutralizeDiscordMentions(line).replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeUpdateHeadingTitle(value: string | null | undefined): string {
  const normalized = normalizeTextInput(
    typeof value === "string" ? neutralizeDiscordMentions(value) : null,
    UPDATE_DRAFT_TITLE_MAX_LENGTH,
  );
  return normalized ?? DEFAULT_PUBLIC_UPDATE_TITLE;
}

function coerceStatus(value: unknown): DiscordUpdateDraftStatus | null {
  return value === "draft"
    || value === "published"
    || value === "skipped"
    || value === "ignored"
    || value === "failed"
    ? value
    : null;
}

function coerceDiscordUpdateDraftRow(data: Record<string, unknown> | null | undefined): DiscordUpdateDraftRow | null {
  if (!data || typeof data.id !== "string" || typeof data.deployment_id !== "string") {
    return null;
  }

  const status = coerceStatus(data.status);
  if (!status) {
    return null;
  }

  return {
    id: data.id,
    source: UPDATE_DRAFT_SOURCE,
    status,
    deployment_id: data.deployment_id,
    deployment_url: typeof data.deployment_url === "string" ? data.deployment_url : null,
    production_url: typeof data.production_url === "string" ? data.production_url : null,
    vercel_project_id: typeof data.vercel_project_id === "string" ? data.vercel_project_id : null,
    vercel_project_name: typeof data.vercel_project_name === "string" ? data.vercel_project_name : null,
    vercel_target: typeof data.vercel_target === "string" ? data.vercel_target : null,
    git_commit_sha: typeof data.git_commit_sha === "string" ? data.git_commit_sha : null,
    git_commit_ref: typeof data.git_commit_ref === "string" ? data.git_commit_ref : null,
    git_commit_message: typeof data.git_commit_message === "string" ? data.git_commit_message : null,
    user_facing_title: typeof data.user_facing_title === "string" ? data.user_facing_title : null,
    user_facing_changes: typeof data.user_facing_changes === "string" ? data.user_facing_changes : null,
    user_facing_why_it_matters: typeof data.user_facing_why_it_matters === "string" ? data.user_facing_why_it_matters : null,
    discord_channel_id: typeof data.discord_channel_id === "string" ? data.discord_channel_id : null,
    discord_message_id: typeof data.discord_message_id === "string" ? data.discord_message_id : null,
    published_by_discord_user_id: typeof data.published_by_discord_user_id === "string" ? data.published_by_discord_user_id : null,
    published_at: typeof data.published_at === "string" ? data.published_at : null,
    skipped_by_discord_user_id: typeof data.skipped_by_discord_user_id === "string" ? data.skipped_by_discord_user_id : null,
    skipped_at: typeof data.skipped_at === "string" ? data.skipped_at : null,
    skip_reason: typeof data.skip_reason === "string" ? data.skip_reason : null,
    webhook_received_at: typeof data.webhook_received_at === "string" ? data.webhook_received_at : new Date(0).toISOString(),
    created_at: typeof data.created_at === "string" ? data.created_at : new Date(0).toISOString(),
    updated_at: typeof data.updated_at === "string" ? data.updated_at : new Date(0).toISOString(),
  };
}

function normalizeProductionUrl(payload: Record<string, unknown>, deployment: Record<string, unknown>): string | null {
  const aliases = [
    ...normalizeStringArray(payload.alias),
    ...normalizeStringArray(deployment.alias),
  ];

  for (const alias of aliases) {
    const normalized = normalizePublicUrl(alias);
    if (normalized) {
      return normalized;
    }
  }

  const productionDomain = typeof payload.productionDomain === "string" ? payload.productionDomain : null;
  return normalizePublicUrl(productionDomain);
}

function normalizeVercelDeploymentMetadata(args: {
  event: VercelDeploymentWebhookEnvelope;
  configuredProjectId?: string | null;
  now?: Date;
}): (
  | { ok: true; ignored: true; reason: string }
  | { ok: true; ignored: false; metadata: NormalizedVercelDeploymentMetadata }
  | { ok: false; code: "DISCORD_UPDATE_DRAFT_INVALID_EVENT" }
) {
  const eventType = typeof args.event.type === "string" ? args.event.type.trim() : "";
  if (!READY_EVENT_TYPES.has(eventType)) {
    return {
      ok: true,
      ignored: true,
      reason: eventType ? `ignored event type: ${eventType}` : "missing event type",
    };
  }

  if (!isRecord(args.event.payload)) {
    return { ok: false, code: "DISCORD_UPDATE_DRAFT_INVALID_EVENT" };
  }

  const payload = args.event.payload;
  const deployment = isRecord(payload.deployment) ? payload.deployment : null;
  if (!deployment) {
    return { ok: false, code: "DISCORD_UPDATE_DRAFT_INVALID_EVENT" };
  }

  const target = normalizeTextInput(
    (typeof payload.target === "string" ? payload.target : typeof deployment.target === "string" ? deployment.target : null),
    UPDATE_DRAFT_TARGET_MAX_LENGTH,
  );
  if (target !== "production") {
    return {
      ok: true,
      ignored: true,
      reason: target ? `ignored non-production target: ${target}` : "ignored preview deployment",
    };
  }

  const project = isRecord(payload.project) ? payload.project : null;
  const projectId = normalizeTextInput(
    (typeof payload.projectId === "string" ? payload.projectId : typeof project?.id === "string" ? project.id : null),
    UPDATE_DRAFT_PROJECT_ID_MAX_LENGTH,
  );
  const projectName = normalizeTextInput(
    (typeof project?.name === "string" ? project.name : typeof deployment.name === "string" ? deployment.name : null),
    UPDATE_DRAFT_PROJECT_NAME_MAX_LENGTH,
  );

  if (args.configuredProjectId && projectId && projectId !== args.configuredProjectId) {
    return { ok: true, ignored: true, reason: `ignored non-Fitness project: ${projectId}` };
  }

  if (!args.configuredProjectId && projectName && projectName !== FITNESS_PROJECT_NAME) {
    return { ok: true, ignored: true, reason: `ignored non-Fitness project: ${projectName}` };
  }

  if (args.configuredProjectId && !projectId) {
    console.warn("[vercel-deployment-webhook] production deployment payload missing project id; relying on production target filter");
  }

  const deploymentId = normalizeTextInput(
    typeof deployment.id === "string" ? deployment.id : null,
    UPDATE_DRAFT_DEPLOYMENT_ID_MAX_LENGTH,
  );
  if (!deploymentId) {
    return { ok: false, code: "DISCORD_UPDATE_DRAFT_INVALID_EVENT" };
  }

  const deploymentMeta = isRecord(deployment.meta) ? deployment.meta : {};
  const deploymentUrl = normalizePublicUrl(deployment.url);
  const productionUrl = normalizeProductionUrl(payload, deployment) ?? deploymentUrl;
  const webhookReceivedAt = (args.now ?? new Date()).toISOString();

  return {
    ok: true,
    ignored: false,
    metadata: {
      deploymentId,
      deploymentUrl,
      productionUrl,
      vercelProjectId: projectId,
      vercelProjectName: projectName,
      vercelTarget: target,
      gitCommitSha: normalizeTextInput(
        pickFirstString(deploymentMeta, [
          "githubCommitSha",
          "gitlabCommitSha",
          "bitbucketCommitSha",
          "commitSha",
        ]),
        64,
      ),
      gitCommitRef: normalizeTextInput(
        pickFirstString(deploymentMeta, [
          "githubCommitRef",
          "gitlabCommitRef",
          "bitbucketCommitRef",
          "commitRef",
        ]),
        UPDATE_DRAFT_GIT_REF_MAX_LENGTH,
      ),
      gitCommitMessage: normalizeTextInput(
        pickFirstString(deploymentMeta, [
          "githubCommitMessage",
          "gitlabCommitMessage",
          "bitbucketCommitMessage",
          "commitMessage",
        ]),
        UPDATE_DRAFT_COMMIT_MESSAGE_MAX_LENGTH,
      ),
      webhookReceivedAt,
    },
  };
}

async function findDiscordUpdateDraftByDeploymentId(
  admin: DiscordUpdateDraftsAdminClient,
  deploymentId: string,
): Promise<DiscordUpdateDraftRow | null> {
  const { data, error } = await admin
    .from("discord_update_drafts")
    .select(DISCORD_UPDATE_DRAFT_SELECT_COLUMNS)
    .eq("deployment_id", deploymentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load discord update draft by deployment id: ${error.message}`);
  }

  return coerceDiscordUpdateDraftRow(data);
}

async function findDiscordUpdateDraftById(
  admin: DiscordUpdateDraftsAdminClient,
  draftId: string,
): Promise<DiscordUpdateDraftRow | null> {
  const { data, error } = await admin
    .from("discord_update_drafts")
    .select(DISCORD_UPDATE_DRAFT_SELECT_COLUMNS)
    .eq("id", draftId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load discord update draft by id: ${error.message}`);
  }

  return coerceDiscordUpdateDraftRow(data);
}

async function findDiscordUpdateDraftByPrefix(
  admin: DiscordUpdateDraftsAdminClient,
  draftIdPrefix: string,
): Promise<DiscordUpdateDraftRow | null> {
  const bounds = buildUuidBoundsFromPrefix(draftIdPrefix);
  if (!bounds) {
    return null;
  }

  const { data, error } = await admin
    .from("discord_update_drafts")
    .select(DISCORD_UPDATE_DRAFT_SELECT_COLUMNS)
    .gte("id", bounds.lower)
    .lte("id", bounds.upper)
    .limit(2);

  if (error) {
    throw new Error(`Failed to load discord update draft by prefix: ${error.message}`);
  }

  const rows = Array.isArray(data)
    ? data
      .map((row) => coerceDiscordUpdateDraftRow(row))
      .filter((row): row is DiscordUpdateDraftRow => Boolean(row))
    : [];

  if (rows.length > 1) {
    throw new Error("Discord update draft prefix matched multiple rows.");
  }

  return rows[0] ?? null;
}

function buildDiscordUpdateDraftUpsertValues(
  metadata: NormalizedVercelDeploymentMetadata,
  nowIso: string,
): Record<string, unknown> {
  return {
    source: UPDATE_DRAFT_SOURCE,
    status: "draft",
    deployment_id: metadata.deploymentId,
    deployment_url: metadata.deploymentUrl,
    production_url: metadata.productionUrl,
    vercel_project_id: metadata.vercelProjectId,
    vercel_project_name: metadata.vercelProjectName,
    vercel_target: metadata.vercelTarget,
    git_commit_sha: metadata.gitCommitSha,
    git_commit_ref: metadata.gitCommitRef,
    git_commit_message: metadata.gitCommitMessage,
    webhook_received_at: metadata.webhookReceivedAt,
    updated_at: nowIso,
  };
}

export function formatDiscordUpdateDraftShortId(id: string): string {
  return id.slice(0, 8);
}

export function buildDiscordUpdateLatestSummary(drafts: DiscordUpdateDraftRow[]): string {
  if (drafts.length === 0) {
    return "No update drafts yet. The Vercel production webhook has not created any drafts.";
  }

  const lines = ["Latest production update drafts:"];
  for (const draft of drafts) {
    const commitSha = normalizeShortCommitSha(draft.git_commit_sha) ?? "no-commit";
    lines.push(
      `- \`${formatDiscordUpdateDraftShortId(draft.id)}\` ${draft.status} ${commitSha} ${draft.created_at}`,
    );

    if (draft.production_url) {
      lines.push(`  Production: ${draft.production_url}`);
    } else if (draft.deployment_url) {
      lines.push(`  Deployment: ${draft.deployment_url}`);
    }

    if (draft.user_facing_title) {
      lines.push(`  Title: ${draft.user_facing_title}`);
    }
  }

  lines.push("");
  lines.push("Use /update-publish with a draft id to post curated copy.");
  return lines.join("\n");
}

export function formatDiscordUpdatePublishMessage(args: {
  title: string;
  whatChanged: string;
  whyItMatters: string;
}): string {
  const title = normalizeUpdateHeadingTitle(args.title);
  const whatChangedLines = normalizeChangesLines(args.whatChanged);
  const whyItMatters = neutralizeDiscordMentions(args.whyItMatters.trim());

  return [
    `## ${title}`,
    "",
    "A new update is live.",
    "",
    "**What changed**",
    ...whatChangedLines.map((line) => `- ${line}`),
    "",
    "**Why it matters**",
    whyItMatters,
    "",
    "Open Fitness:",
    `<${FITNESS_LOGIN_URL}>`,
  ].join("\n");
}

function validatePublishFields(args: {
  title: string;
  whatChanged: string;
  whyItMatters: string;
}): {
  title: string;
  storedChanges: string;
  whyItMatters: string;
} | null {
  const title = normalizeUpdateHeadingTitle(args.title);
  const changeLines = normalizeChangesLines(normalizeTextInput(args.whatChanged, UPDATE_DRAFT_CHANGES_MAX_LENGTH) ?? "");
  const whyItMatters = normalizeTextInput(
    neutralizeDiscordMentions(args.whyItMatters),
    UPDATE_DRAFT_WHY_IT_MATTERS_MAX_LENGTH,
  );

  if (changeLines.length === 0 || !whyItMatters) {
    return null;
  }

  return {
    title,
    storedChanges: changeLines.join("\n"),
    whyItMatters,
  };
}

export async function findDiscordUpdateDraftByIdOrPrefix(args: {
  draftIdOrPrefix: string;
  adminClient?: DiscordUpdateDraftsAdminClient;
}): Promise<
  | { ok: true; draft: DiscordUpdateDraftRow }
  | { ok: false; code: "DISCORD_UPDATE_DRAFT_NOT_FOUND" | "DISCORD_UPDATE_DRAFT_AMBIGUOUS_ID" | "DISCORD_UPDATE_DRAFT_LOOKUP_FAILED" }
> {
  const normalized = normalizeDraftIdPrefix(String(args.draftIdOrPrefix ?? ""));
  if (!normalized) {
    return { ok: false, code: "DISCORD_UPDATE_DRAFT_NOT_FOUND" };
  }

  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordUpdateDraftsAdminClient);

  try {
    const fullIdDraft = normalized.length >= 32 ? await findDiscordUpdateDraftById(admin, normalized) : null;
    if (fullIdDraft) {
      return { ok: true, draft: fullIdDraft };
    }

    if (normalized.replace(/-/g, "").length >= UPDATE_DRAFT_ID_PREFIX_MIN_LENGTH) {
      const prefixDraft = await findDiscordUpdateDraftByPrefix(admin, normalized);
      if (prefixDraft) {
        return { ok: true, draft: prefixDraft };
      }
    }

    return { ok: false, code: "DISCORD_UPDATE_DRAFT_NOT_FOUND" };
  } catch (error) {
    if (error instanceof Error && error.message === "Discord update draft prefix matched multiple rows.") {
      return { ok: false, code: "DISCORD_UPDATE_DRAFT_AMBIGUOUS_ID" };
    }

    return { ok: false, code: "DISCORD_UPDATE_DRAFT_LOOKUP_FAILED" };
  }
}

export async function listLatestDiscordUpdateDrafts(args?: {
  limit?: number;
  adminClient?: DiscordUpdateDraftsAdminClient;
}): Promise<
  | { ok: true; drafts: DiscordUpdateDraftRow[] }
  | { ok: false; code: "DISCORD_UPDATE_DRAFT_LIST_FAILED" }
> {
  const limit = Math.max(1, Math.min(args?.limit ?? 5, 10));
  const admin = args?.adminClient ?? (supabaseAdmin() as unknown as DiscordUpdateDraftsAdminClient);

  try {
    const { data, error } = await admin
      .from("discord_update_drafts")
      .select(DISCORD_UPDATE_DRAFT_SELECT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !Array.isArray(data)) {
      return { ok: false, code: "DISCORD_UPDATE_DRAFT_LIST_FAILED" };
    }

    return {
      ok: true,
      drafts: data
        .map((row) => coerceDiscordUpdateDraftRow(row))
        .filter((row): row is DiscordUpdateDraftRow => Boolean(row)),
    };
  } catch {
    return { ok: false, code: "DISCORD_UPDATE_DRAFT_LIST_FAILED" };
  }
}

export async function upsertDiscordUpdateDraftFromVercelEvent(args: {
  event: VercelDeploymentWebhookEnvelope;
  adminClient?: DiscordUpdateDraftsAdminClient;
  now?: Date;
  configuredProjectId?: string | null;
}): Promise<
  | { ok: true; ignored: true; reason: string }
  | { ok: true; ignored: false; created: boolean; draft: DiscordUpdateDraftRow }
  | { ok: false; code: "DISCORD_UPDATE_DRAFT_INVALID_EVENT" | "DISCORD_UPDATE_DRAFT_SAVE_FAILED" }
> {
  const normalized = normalizeVercelDeploymentMetadata({
    event: args.event,
    configuredProjectId: args.configuredProjectId ?? VERCEL_PROJECT_ID(),
    now: args.now,
  });

  if (!normalized.ok || normalized.ignored) {
    return normalized;
  }

  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordUpdateDraftsAdminClient);
  const nowIso = (args.now ?? new Date()).toISOString();

  try {
    const existing = await findDiscordUpdateDraftByDeploymentId(admin, normalized.metadata.deploymentId);
    if (!existing) {
      const { data, error } = await admin
        .from("discord_update_drafts")
        .insert({
          ...buildDiscordUpdateDraftUpsertValues(normalized.metadata, nowIso),
          created_at: nowIso,
        })
        .select(DISCORD_UPDATE_DRAFT_SELECT_COLUMNS)
        .single();

      const draft = coerceDiscordUpdateDraftRow(data);
      if (error || !draft) {
        return { ok: false, code: "DISCORD_UPDATE_DRAFT_SAVE_FAILED" };
      }

      return { ok: true, ignored: false, created: true, draft };
    }

    const { data, error } = await admin
      .from("discord_update_drafts")
      .update(buildDiscordUpdateDraftUpsertValues(normalized.metadata, nowIso))
      .eq("id", existing.id)
      .select(DISCORD_UPDATE_DRAFT_SELECT_COLUMNS)
      .single();

    const draft = coerceDiscordUpdateDraftRow(data);
    if (error || !draft) {
      return { ok: false, code: "DISCORD_UPDATE_DRAFT_SAVE_FAILED" };
    }

    return { ok: true, ignored: false, created: false, draft };
  } catch {
    return { ok: false, code: "DISCORD_UPDATE_DRAFT_SAVE_FAILED" };
  }
}

export async function publishDiscordUpdateDraft(args: {
  draftIdOrPrefix: string;
  title: string;
  whatChanged: string;
  whyItMatters: string;
  publishedByDiscordUserId: string;
  discordChannelId?: string | null;
  adminClient?: DiscordUpdateDraftsAdminClient;
  now?: Date;
  dependencies?: PublishUpdateDraftDependencies;
}): Promise<
  | { ok: true; draft: DiscordUpdateDraftRow; messageContent: string }
  | { ok: false; code: "DISCORD_UPDATE_DRAFT_NOT_FOUND" | "DISCORD_UPDATE_DRAFT_AMBIGUOUS_ID" | "DISCORD_UPDATE_DRAFT_LOOKUP_FAILED" | "DISCORD_UPDATE_DRAFT_INVALID_INPUT" | "DISCORD_UPDATE_DRAFT_ALREADY_PUBLISHED" | "DISCORD_UPDATE_DRAFT_POST_FAILED" | "DISCORD_UPDATE_DRAFT_SAVE_FAILED" | "DISCORD_UPDATE_CHANNEL_NOT_CONFIGURED" }
> {
  const curatedFields = validatePublishFields(args);
  if (!curatedFields) {
    return { ok: false, code: "DISCORD_UPDATE_DRAFT_INVALID_INPUT" };
  }

  const channelId = args.discordChannelId ?? DISCORD_UPDATES_CHANNEL_ID();
  if (!channelId) {
    return { ok: false, code: "DISCORD_UPDATE_CHANNEL_NOT_CONFIGURED" };
  }

  const lookupResult = await findDiscordUpdateDraftByIdOrPrefix({
    draftIdOrPrefix: args.draftIdOrPrefix,
    adminClient: args.adminClient,
  });

  if (!lookupResult.ok) {
    return lookupResult;
  }

  if (lookupResult.draft.status === "published") {
    return { ok: false, code: "DISCORD_UPDATE_DRAFT_ALREADY_PUBLISHED" };
  }

  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordUpdateDraftsAdminClient);
  const nowIso = (args.now ?? new Date()).toISOString();
  const messageContent = formatDiscordUpdatePublishMessage({
    title: curatedFields.title,
    whatChanged: curatedFields.storedChanges,
    whyItMatters: curatedFields.whyItMatters,
  });

  const createMessage = args.dependencies?.createMessage ?? createDiscordChannelMessage;
  const postResult = await createMessage({
    channelId,
    body: {
      content: messageContent,
      flags: DISCORD_MESSAGE_FLAG_SUPPRESS_EMBEDS,
      allowed_mentions: {
        parse: [],
        users: [],
        roles: [],
        replied_user: false,
      },
    },
  });

  if (!postResult.ok) {
    try {
      await admin
        .from("discord_update_drafts")
        .update({
          status: "failed",
          user_facing_title: curatedFields.title,
          user_facing_changes: curatedFields.storedChanges,
          user_facing_why_it_matters: curatedFields.whyItMatters,
          updated_at: nowIso,
        })
        .eq("id", lookupResult.draft.id);
    } catch {
      return { ok: false, code: "DISCORD_UPDATE_DRAFT_SAVE_FAILED" };
    }

    return { ok: false, code: "DISCORD_UPDATE_DRAFT_POST_FAILED" };
  }

  try {
    const { data, error } = await admin
      .from("discord_update_drafts")
      .update({
        status: "published",
        user_facing_title: curatedFields.title,
        user_facing_changes: curatedFields.storedChanges,
        user_facing_why_it_matters: curatedFields.whyItMatters,
        discord_channel_id: channelId,
        discord_message_id: postResult.messageId,
        published_by_discord_user_id: args.publishedByDiscordUserId,
        published_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", lookupResult.draft.id)
      .select(DISCORD_UPDATE_DRAFT_SELECT_COLUMNS)
      .single();

    const draft = coerceDiscordUpdateDraftRow(data);
    if (error || !draft) {
      return { ok: false, code: "DISCORD_UPDATE_DRAFT_SAVE_FAILED" };
    }

    return { ok: true, draft, messageContent };
  } catch {
    return { ok: false, code: "DISCORD_UPDATE_DRAFT_SAVE_FAILED" };
  }
}

export async function skipDiscordUpdateDraft(args: {
  draftIdOrPrefix: string;
  skippedByDiscordUserId: string;
  reason?: string | null;
  adminClient?: DiscordUpdateDraftsAdminClient;
  now?: Date;
}): Promise<
  | { ok: true; draft: DiscordUpdateDraftRow }
  | { ok: false; code: "DISCORD_UPDATE_DRAFT_NOT_FOUND" | "DISCORD_UPDATE_DRAFT_AMBIGUOUS_ID" | "DISCORD_UPDATE_DRAFT_LOOKUP_FAILED" | "DISCORD_UPDATE_DRAFT_SAVE_FAILED" }
> {
  const lookupResult = await findDiscordUpdateDraftByIdOrPrefix({
    draftIdOrPrefix: args.draftIdOrPrefix,
    adminClient: args.adminClient,
  });
  if (!lookupResult.ok) {
    return lookupResult;
  }

  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordUpdateDraftsAdminClient);
  const nowIso = (args.now ?? new Date()).toISOString();
  const skipReason = normalizeTextInput(
    args.reason ? neutralizeDiscordMentions(args.reason) : null,
    UPDATE_DRAFT_SKIP_REASON_MAX_LENGTH,
  );

  try {
    const { data, error } = await admin
      .from("discord_update_drafts")
      .update({
        status: "skipped",
        skipped_by_discord_user_id: args.skippedByDiscordUserId,
        skipped_at: nowIso,
        skip_reason: skipReason,
        updated_at: nowIso,
      })
      .eq("id", lookupResult.draft.id)
      .select(DISCORD_UPDATE_DRAFT_SELECT_COLUMNS)
      .single();

    const draft = coerceDiscordUpdateDraftRow(data);
    if (error || !draft) {
      return { ok: false, code: "DISCORD_UPDATE_DRAFT_SAVE_FAILED" };
    }

    return { ok: true, draft };
  } catch {
    return { ok: false, code: "DISCORD_UPDATE_DRAFT_SAVE_FAILED" };
  }
}
