#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envPath = resolveEnvFilePath(repoRoot);
const fileEnv = parseDotenvFile(envPath);
const explicitEnvFileOverride = Boolean(process.env.FITNESS_ENV_FILE?.trim());
const discordApiBaseUrl = "https://discord.com/api/v10";
const discordApiUserAgent = "fawxzzy-fitness-discord-community-doctor/1.0";
const expectedFeedbackPanelTitle = "Feedback Actions";
const legacyFeedbackPanelTitle = "Fawxzzy Feedback";
const expectedFeedbackPanelButtons = ["Submit", "Add Update", "Withdraw"];
const legacyFeedbackPanelButtons = ["Submit Feedback", "Update Feedback", "Withdraw Feedback"];
const expectedFeedbackPanelCustomIds = [
  "fitness_feedback_submit_open",
  "fitness_feedback_update_open",
  "fitness_feedback_withdraw_open",
];
const expectedVerifyButtonLabel = "Verify Fitness Account";
const expectedVerifyCopyNeedle = "By verifying, you agree to follow the server rules.";
const expectedFitnessLoginUrl = "https://fawxzzy-fitness-local.vercel.app/login";
const resolvedReactionEmojiName = "fawxzzy";
const resolvedReactionEmojiId = "1507384062166302851";
const resolvedReactionLabel = `${resolvedReactionEmojiName}:${resolvedReactionEmojiId}`;
const expectedCommands = [
  "setup-verify",
  "verify-cleanup",
  "verify-lockdown",
  "setup-feedback",
  "feedback",
  "feedback-status",
  "feedback-withdraw",
  "update-latest",
  "update-publish",
  "update-skip",
];
const forbiddenCommands = [
  "bug",
  "bug-status",
  "feature",
  "fix",
  "routine-share",
  "workout-share",
];
const requiredFeedbackTags = [
  "Bug",
  "Feature",
  "New",
  "Needs Info",
  "Confirmed",
  "Ready for Fawxzzy Review",
  "Backlog",
  "In Progress",
  "Fixed",
  "Closed",
  "Duplicate",
  "Spam",
  "Withdrawn",
  "Low",
  "Medium",
  "High",
  "Blocker",
];
const obsoleteFeedbackTags = ["Feat", "Fix"];
const requiredEnvNames = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_APPLICATION_ID",
  "DISCORD_GUILD_ID",
  "DISCORD_VERIFY_CHANNEL_ID",
  "DISCORD_BUG_REPORT_FORUM_CHANNEL_ID",
  "DISCORD_UPDATES_CHANNEL_ID",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const productionRequiredEnvNames = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_PUBLIC_KEY",
  "DISCORD_APPLICATION_ID",
  "DISCORD_GUILD_ID",
  "DISCORD_VERIFY_CHANNEL_ID",
  "DISCORD_VERIFIED_ROLE_ID",
  "DISCORD_BUG_REPORT_FORUM_CHANNEL_ID",
  "DISCORD_UPDATES_CHANNEL_ID",
  "DISCORD_MEMBER_SYNC_SECRET",
  "DISCORD_VERIFICATION_TOKEN_PEPPER",
  "DISCORD_VERIFICATION_BOT_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const requiredEitherEnvGroups = [
  ["VERCEL_DEPLOYMENT_WEBHOOK_SECRET", "VERCEL_WEBHOOK_SECRET"],
];
const recommendedEnvNames = [
  "VERCEL_PROJECT_ID",
  "DISCORD_UPDATE_BOT_ENABLED",
];
const optionalEnvNames = [
  "DISCORD_FEEDBACK_BUG_EMOJI_ID",
  "DISCORD_FEEDBACK_FEATURE_EMOJI_ID",
  "FITNESS_ZAC_EMAIL",
  "DISCORD_FEEDBACK_PANEL_CHANNEL_ID",
  "DISCORD_FEEDBACK_PANEL_THREAD_ID",
];
const automationSignalPattern = /(^|[^a-z0-9])(codex|test|qa|example|preview|local)([^a-z0-9]|$)/i;

for (const [key, value] of Object.entries(fileEnv)) {
  if (explicitEnvFileOverride || !process.env[key]) {
    process.env[key] = String(value ?? "")
      .replace(/\\r\\n/g, "")
      .replace(/\\n/g, "")
      .replace(/\r?\n/g, "")
      .trim();
  }
}

function parseArgs(argv) {
  return {
    json: argv.includes("--json"),
    debug: argv.includes("--debug"),
  };
}

function getEnv(name) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function getRequiredSupabaseClient() {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") ?? getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function buildCheck(id, status, summary, extras = {}) {
  return {
    id,
    status,
    summary,
    ...extras,
  };
}

function runCommand(command, args, cwd, options = {}) {
  const env = {
    ...process.env,
    ...(options.env ?? {}),
  };

  for (const key of options.unsetEnv ?? []) {
    delete env[key];
  }

  const result = spawnSync(
    process.platform === "win32" ? "cmd.exe" : command,
    process.platform === "win32"
      ? ["/d", "/s", "/c", command, ...args]
      : args,
    {
      cwd,
      encoding: "utf8",
      shell: false,
      env,
    },
  );

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    combined: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

function readVercelProjectMetadata() {
  const vercelProjectPath = path.join(repoRoot, ".vercel", "project.json");

  try {
    const parsed = JSON.parse(readFileSync(vercelProjectPath, "utf8"));
    return {
      path: vercelProjectPath,
      projectId: typeof parsed?.projectId === "string" && parsed.projectId.trim().length > 0
        ? parsed.projectId.trim()
        : null,
      orgId: typeof parsed?.orgId === "string" && parsed.orgId.trim().length > 0
        ? parsed.orgId.trim()
        : null,
    };
  } catch {
    return {
      path: vercelProjectPath,
      projectId: null,
      orgId: null,
    };
  }
}

function isCritical(check) {
  return check.status === "fail";
}

function isWarning(check) {
  return check.status === "warn";
}

function normalizeDiscordLabel(value) {
  return String(value ?? "").trim().toLowerCase();
}

function extractEmbedText(message) {
  if (!Array.isArray(message?.embeds)) {
    return "";
  }

  return message.embeds
    .flatMap((embed) => [
      typeof embed?.title === "string" ? embed.title : "",
      typeof embed?.description === "string" ? embed.description : "",
    ])
    .filter(Boolean)
    .join("\n");
}

function extractButtonLabels(message) {
  if (!Array.isArray(message?.components)) {
    return [];
  }

  return message.components.flatMap((row) => (
    Array.isArray(row?.components)
      ? row.components
        .map((component) => (typeof component?.label === "string" ? component.label.trim() : ""))
        .filter(Boolean)
      : []
  ));
}

function extractButtonCustomIds(message) {
  if (!Array.isArray(message?.components)) {
    return [];
  }

  return message.components.flatMap((row) => (
    Array.isArray(row?.components)
      ? row.components
        .map((component) => (typeof component?.custom_id === "string" ? component.custom_id.trim() : ""))
        .filter(Boolean)
      : []
  ));
}

function matchesFeedbackPanelMessage(message, applicationId) {
  const embedText = extractEmbedText(message);
  const buttonLabels = extractButtonLabels(message);
  const buttonCustomIds = extractButtonCustomIds(message);
  const authorId = typeof message?.author?.id === "string" ? message.author.id : null;
  const hasCurrentTitle = embedText.includes(expectedFeedbackPanelTitle);
  const hasLegacyTitle = embedText.includes(legacyFeedbackPanelTitle);
  const hasCurrentButtons = expectedFeedbackPanelButtons.every((label) => buttonLabels.includes(label));
  const hasLegacyButtons = legacyFeedbackPanelButtons.every((label) => buttonLabels.includes(label));
  const hasExpectedCustomIds = expectedFeedbackPanelCustomIds.every((customId) => buttonCustomIds.includes(customId));

  return authorId === applicationId
    && hasExpectedCustomIds
    && ((hasCurrentTitle && hasCurrentButtons) || (hasLegacyTitle && hasLegacyButtons) || hasCurrentButtons || hasLegacyButtons);
}

function compactPositiveGaps(numbers) {
  const positiveNumbers = [...new Set(numbers.filter((value) => Number.isInteger(value) && value >= 1))].sort((a, b) => a - b);
  if (positiveNumbers.length === 0) {
    return [];
  }

  const gaps = [];
  for (let value = 1; value <= positiveNumbers[positiveNumbers.length - 1]; value += 1) {
    if (!positiveNumbers.includes(value)) {
      gaps.push(value);
    }
  }

  return gaps;
}

function collectAutomationSignals(user) {
  const reasons = [];
  const email = String(user?.email ?? "").trim().toLowerCase();
  const metadataValues = [
    user?.user_metadata?.account_kind,
    user?.app_metadata?.account_kind,
    user?.user_metadata?.display_name,
    user?.user_metadata?.full_name,
    user?.user_metadata?.name,
    user?.app_metadata?.owner,
    user?.app_metadata?.purpose,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  if ((user?.user_metadata?.account_kind ?? "").toString().toLowerCase() === "automation") {
    reasons.push("user_metadata.account_kind=automation");
  }

  if ((user?.app_metadata?.account_kind ?? "").toString().toLowerCase() === "automation") {
    reasons.push("app_metadata.account_kind=automation");
  }

  if (automationSignalPattern.test(email)) {
    reasons.push("email matches automation/test pattern");
  }

  for (const value of metadataValues) {
    if (automationSignalPattern.test(value)) {
      reasons.push(`metadata matches automation/test pattern (${value})`);
    }
  }

  return Array.from(new Set(reasons));
}

async function discordRequest(pathname, { method = "GET", botToken, body } = {}) {
  const response = await fetch(`${discordApiBaseUrl}${pathname}`, {
    method,
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
      "User-Agent": discordApiUserAgent,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText.slice(0, 300) };
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    message: !response.ok && data && typeof data === "object" && "message" in data
      ? String(data.message ?? response.statusText)
      : !response.ok
        ? response.statusText
        : null,
  };
}

async function listAllAuthUsers(adminClient) {
  const users = [];
  let page = 1;

  while (page) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw new Error(`Unable to list auth users: ${error.message}`);
    }

    users.push(...(data?.users ?? []));
    page = data?.nextPage ?? 0;
  }

  return users;
}

async function checkEnvPresence() {
  const missingRequired = requiredEnvNames.filter((name) => !getEnv(name));
  const missingRecommended = recommendedEnvNames.filter((name) => !getEnv(name));
  const presentOptional = optionalEnvNames.filter((name) => Boolean(getEnv(name)));

  return buildCheck(
    "doctor-runtime-env",
    missingRequired.length > 0 ? "fail" : missingRecommended.length > 0 ? "warn" : "pass",
    missingRequired.length > 0
      ? "This doctor run is missing local runtime env needed to execute all live checks"
      : missingRecommended.length > 0
        ? "Doctor runtime env is usable, but some recommended local env names are missing"
        : "Doctor runtime env has the required local values for live checks",
    {
      requiredMissing: missingRequired,
      recommendedMissing: missingRecommended,
      optionalPresent: presentOptional,
      envFile: envPath,
    },
  );
}

function parseVercelEnvMetadata(output) {
  const names = new Set();

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s{2,}/);
    if (!match) {
      continue;
    }

    if (match[1] === "name") {
      continue;
    }

    names.add(match[1]);
  }

  return names;
}

async function checkProductionEnvMetadata() {
  const vercelProjectMetadata = readVercelProjectMetadata();
  const vercelAvailable = runCommand("npx", ["vercel", "whoami"], repoRoot);
  if (vercelAvailable.status !== 0) {
    return buildCheck(
      "production-env-metadata",
      "warn",
      "Vercel CLI metadata check is unavailable; local env truth was checked, but production env names were not confirmed",
    );
  }

  const vercelEnvOverrides = {};

  if (!getEnv("VERCEL_PROJECT_ID") && vercelProjectMetadata.projectId) {
    vercelEnvOverrides.VERCEL_PROJECT_ID = vercelProjectMetadata.projectId;
  }

  if (!getEnv("VERCEL_ORG_ID") && vercelProjectMetadata.orgId) {
    vercelEnvOverrides.VERCEL_ORG_ID = vercelProjectMetadata.orgId;
  }

  const result = runCommand(
    "npx",
    ["vercel", "env", "ls", "production"],
    repoRoot,
    { env: vercelEnvOverrides },
  );
  if (result.status !== 0) {
    return buildCheck(
      "production-env-metadata",
      "warn",
      "Vercel CLI metadata check could not list production env names",
      {
        error: result.combined.trim() || null,
        remediation: [
          "refresh the local secret mirror",
          "run the doctor from a shell with the real Vercel env loaded",
          "or verify Vercel Production env metadata manually",
        ],
        vercelProjectMetadataPath: vercelProjectMetadata.path,
      },
    );
  }

  const envNames = parseVercelEnvMetadata(result.combined);
  const missingRequired = productionRequiredEnvNames.filter((name) => !envNames.has(name));
  const missingEitherGroups = requiredEitherEnvGroups.filter((group) => group.every((name) => !envNames.has(name)));
  const localMirrorMissing = productionRequiredEnvNames.filter((name) => !getEnv(name) && envNames.has(name))
    .concat(
      requiredEitherEnvGroups
        .flatMap((group) => group)
        .filter((name) => !getEnv(name) && envNames.has(name)),
    );
  const missingRecommended = recommendedEnvNames.filter((name) => !envNames.has(name));

  return buildCheck(
    "production-env-metadata",
    missingRequired.length > 0 || missingEitherGroups.length > 0 ? "fail" : localMirrorMissing.length > 0 || missingRecommended.length > 0 ? "warn" : "pass",
    missingRequired.length > 0 || missingEitherGroups.length > 0
      ? "Production env metadata is missing required Discord community env names"
      : localMirrorMissing.length > 0
        ? "Production env metadata is present, but the local doctor secret mirror is incomplete"
        : missingRecommended.length > 0
          ? "Production env metadata is present, with only recommended env names missing"
          : "Production env metadata includes the required Discord community env names",
    {
      requiredMissing: missingRequired,
      requiredEitherMissing: missingEitherGroups.map((group) => group.join(" | ")),
      recommendedMissing: missingRecommended,
      localMirrorMissing: [...new Set(localMirrorMissing)],
      vercelProjectMetadataPath: vercelProjectMetadata.path,
      vercelProjectIdSource: getEnv("VERCEL_PROJECT_ID") ? "runtime-env" : vercelProjectMetadata.projectId ? "project-json" : "unavailable",
      vercelOrgIdSource: getEnv("VERCEL_ORG_ID") ? "runtime-env" : vercelProjectMetadata.orgId ? "project-json" : "unavailable",
    },
  );
}

async function checkSupabaseSchema(adminClient) {
  if (!adminClient) {
    return buildCheck("supabase-schema", "fail", "Supabase service client unavailable", {
      missingTables: [
        "discord_verification_tokens",
        "discord_member_links",
        "discord_feedback_reports",
        "discord_update_drafts",
      ],
    });
  }

  const tableChecks = [
    {
      table: "discord_verification_tokens",
      columns: ["id", "token_hash", "discord_user_id"],
    },
    {
      table: "discord_member_links",
      columns: ["nickname_sync_status", "last_error_code", "user_number", "user_kind"],
    },
    {
      table: "discord_feedback_reports",
      columns: ["attachment_count", "attachment_metadata", "attachment_pruned", "report_type", "status", "discord_forum_thread_id"],
    },
    {
      table: "discord_update_drafts",
      columns: ["status", "deployment_id", "discord_message_id", "published_at"],
    },
  ];

  const missingTables = [];
  const missingColumns = [];

  for (const tableCheck of tableChecks) {
    const { error } = await adminClient
      .from(tableCheck.table)
      .select(tableCheck.columns.join(", "), { head: true, count: "exact" });

    if (!error) {
      continue;
    }

    if (/Could not find the table|does not exist|schema cache/i.test(error.message)) {
      missingTables.push(tableCheck.table);
      continue;
    }

    const missingColumnMatch = error.message.match(/column\s+([a-zA-Z0-9_]+)/i);
    if (missingColumnMatch) {
      missingColumns.push(`${tableCheck.table}.${missingColumnMatch[1]}`);
      continue;
    }

    missingColumns.push(`${tableCheck.table}: ${error.message}`);
  }

  return buildCheck(
    "supabase-schema",
    missingTables.length > 0 || missingColumns.length > 0 ? "fail" : "pass",
    missingTables.length > 0 || missingColumns.length > 0
      ? "Supabase Discord community schema is incomplete"
      : "Supabase Discord community tables and key columns are available",
    {
      missingTables,
      missingColumns,
    },
  );
}

async function checkDiscordCommands(botToken, applicationId, guildId) {
  if (!botToken || !applicationId || !guildId) {
    return buildCheck("discord-commands", "fail", "Discord command audit unavailable because bot/application/guild env is missing");
  }

  const result = await discordRequest(`/applications/${applicationId}/guilds/${guildId}/commands`, { botToken });
  if (!result.ok || !Array.isArray(result.data)) {
    return buildCheck("discord-commands", "fail", `Unable to fetch guild commands (${result.status})`, {
      error: result.message,
    });
  }

  const liveCommands = result.data
    .map((command) => (typeof command?.name === "string" ? command.name.trim() : ""))
    .filter(Boolean)
    .sort();
  const missingExpected = expectedCommands.filter((name) => !liveCommands.includes(name));
  const presentForbidden = forbiddenCommands.filter((name) => liveCommands.includes(name));

  return buildCheck(
    "discord-commands",
    missingExpected.length > 0 || presentForbidden.length > 0 ? "fail" : "pass",
    missingExpected.length > 0 || presentForbidden.length > 0
      ? "Live guild command list does not match the Discord community contract"
      : "Live guild command list matches the expected Discord community command surface",
    {
      liveCommands,
      missingExpected,
      presentForbidden,
    },
  );
}

async function checkFeedbackForumTags(botToken, forumChannelId) {
  if (!botToken || !forumChannelId) {
    return buildCheck("feedback-tags", "fail", "Feedback forum tag audit unavailable because forum channel env is missing");
  }

  const result = await discordRequest(`/channels/${forumChannelId}`, { botToken });
  if (!result.ok || !result.data || typeof result.data !== "object") {
    return buildCheck("feedback-tags", "fail", `Unable to fetch feedback forum channel (${result.status})`, {
      error: result.message,
    });
  }

  const liveTags = Array.isArray(result.data.available_tags)
    ? result.data.available_tags
      .map((tag) => (typeof tag?.name === "string" ? tag.name.trim() : ""))
      .filter(Boolean)
    : [];
  const missingTags = requiredFeedbackTags.filter((name) => !liveTags.includes(name));
  const presentObsoleteTags = obsoleteFeedbackTags.filter((name) => liveTags.includes(name));

  return buildCheck(
    "feedback-tags",
    missingTags.length > 0 ? "fail" : presentObsoleteTags.length > 0 ? "warn" : "pass",
    missingTags.length > 0
      ? "Feedback forum is missing required tags"
      : presentObsoleteTags.length > 0
        ? "Feedback forum still contains obsolete tags"
        : "Feedback forum tags match the production contract",
    {
      liveTags,
      missingTags,
      presentObsoleteTags,
    },
  );
}

async function checkEmojiValidation(botToken, guildId, applicationId) {
  const bugEmojiId = getEnv("DISCORD_FEEDBACK_BUG_EMOJI_ID");
  const featureEmojiId = getEnv("DISCORD_FEEDBACK_FEATURE_EMOJI_ID");

  if (!bugEmojiId && !featureEmojiId) {
    return buildCheck("feedback-emojis", "warn", "Optional feedback emoji env vars are not set");
  }

  if (!botToken || (!guildId && !applicationId)) {
    return buildCheck("feedback-emojis", "warn", "Optional feedback emoji validation unavailable because bot/app-or-guild env is missing");
  }

  const mismatches = [];
  const sources = {};
  const emojiLookup = new Map();

  if (applicationId) {
    const applicationResult = await discordRequest(`/applications/${applicationId}/emojis`, { botToken });
    if (applicationResult.ok && Array.isArray(applicationResult.data?.items)) {
      for (const emoji of applicationResult.data.items) {
        if (emoji?.id) {
          emojiLookup.set(emoji.id, { ...emoji, source: "application" });
        }
      }
    }
  }

  if (guildId) {
    const guildResult = await discordRequest(`/guilds/${guildId}/emojis`, { botToken });
    if (guildResult.ok && Array.isArray(guildResult.data)) {
      for (const emoji of guildResult.data) {
        if (emoji?.id && !emojiLookup.has(emoji.id)) {
          emojiLookup.set(emoji.id, { ...emoji, source: "guild" });
        }
      }
    }
  }

  if (emojiLookup.size === 0) {
    return buildCheck("feedback-emojis", "warn", "Unable to fetch application or guild emojis for optional validation");
  }

  const bugEmoji = bugEmojiId ? emojiLookup.get(bugEmojiId) : null;
  const featureEmoji = featureEmojiId ? emojiLookup.get(featureEmojiId) : null;

  if (bugEmojiId && (!bugEmoji || normalizeDiscordLabel(bugEmoji.name) !== "bug" || bugEmoji.available === false)) {
    mismatches.push("Bug");
  } else if (bugEmoji?.source) {
    sources.bug = bugEmoji.source;
  }
  if (featureEmojiId && (!featureEmoji || normalizeDiscordLabel(featureEmoji.name) !== "feature" || featureEmoji.available === false)) {
    mismatches.push("Feature");
  } else if (featureEmoji?.source) {
    sources.feature = featureEmoji.source;
  }

  return buildCheck(
    "feedback-emojis",
    mismatches.length > 0 ? "warn" : "pass",
    mismatches.length > 0
      ? "Optional feedback emoji config is set but not fully valid in the application/guild sources"
      : "Optional feedback emoji config matches live application/guild emojis",
    {
      configured: {
        bug: bugEmojiId,
        feature: featureEmojiId,
      },
      sources,
      mismatches,
    },
  );
}

async function checkVerifyMessage(botToken, verifyChannelId, applicationId) {
  if (!botToken || !verifyChannelId) {
    return buildCheck("verify-message", "fail", "Verify message audit unavailable because verify channel env is missing");
  }

  const result = await discordRequest(`/channels/${verifyChannelId}/messages?limit=25`, { botToken });
  if (!result.ok || !Array.isArray(result.data)) {
    return buildCheck("verify-message", "fail", `Unable to fetch verify channel messages (${result.status})`, {
      error: result.message,
    });
  }

  const verifyMessage = result.data.find((message) => {
    const embedText = extractEmbedText(message);
    const buttonLabels = extractButtonLabels(message);
    const authorId = typeof message?.author?.id === "string" ? message.author.id : null;

    return authorId === applicationId
      && embedText.includes(expectedVerifyCopyNeedle)
      && embedText.includes(expectedFitnessLoginUrl)
      && buttonLabels.includes(expectedVerifyButtonLabel);
  });

  return buildCheck(
    "verify-message",
    verifyMessage ? "pass" : "warn",
    verifyMessage
      ? "A bot-authored verify message with Discord Connector copy is present"
      : "Could not find a recent bot-authored verify message with Discord Connector copy and Verify button",
  );
}

async function checkFeedbackPanel(botToken, panelChannelId, applicationId) {
  if (!botToken || !applicationId) {
    return buildCheck("feedback-panel", "fail", "Feedback panel audit unavailable because bot/application env is missing");
  }

  const configuredPanelThreadId = getEnv("DISCORD_FEEDBACK_PANEL_THREAD_ID");
  const candidateChannels = [];
  const searched = [];
  const seen = new Set();

  function addCandidate(id, source) {
    const normalized = String(id ?? "").trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    candidateChannels.push({ id: normalized, source });
  }

  if (configuredPanelThreadId) {
    addCandidate(configuredPanelThreadId, "DISCORD_FEEDBACK_PANEL_THREAD_ID");
  }

  if (panelChannelId) {
    addCandidate(panelChannelId, "DISCORD_FEEDBACK_PANEL_CHANNEL_ID or forum fallback");
  }

  const forumChannelId = getEnv("DISCORD_BUG_REPORT_FORUM_CHANNEL_ID");
  const guildId = getEnv("DISCORD_GUILD_ID");

  if (forumChannelId && guildId) {
    const activeThreadsResult = await discordRequest(`/guilds/${guildId}/threads/active`, { botToken });
    if (activeThreadsResult.ok && Array.isArray(activeThreadsResult.data?.threads)) {
      for (const thread of activeThreadsResult.data.threads) {
        if (thread?.parent_id === forumChannelId && typeof thread?.id === "string") {
          addCandidate(thread.id, "active feedback forum thread");
        }
      }
    }

    const archivedThreadsResult = await discordRequest(`/channels/${forumChannelId}/threads/archived/public?limit=50`, { botToken });
    if (archivedThreadsResult.ok && Array.isArray(archivedThreadsResult.data?.threads)) {
      for (const thread of archivedThreadsResult.data.threads) {
        if (thread?.parent_id === forumChannelId && typeof thread?.id === "string") {
          addCandidate(thread.id, "archived feedback forum thread");
        }
      }
    }
  }

  for (const candidate of candidateChannels) {
    const result = await discordRequest(`/channels/${candidate.id}/messages?limit=25`, { botToken });
    searched.push(candidate.source === "active feedback forum thread" || candidate.source === "archived feedback forum thread"
      ? `${candidate.source}:${candidate.id}`
      : `${candidate.source}:${candidate.id}`);

    if (!result.ok || !Array.isArray(result.data)) {
      continue;
    }

    const panelMessage = result.data.find((message) => matchesFeedbackPanelMessage(message, applicationId));
    if (panelMessage) {
      return buildCheck(
        "feedback-panel",
        "pass",
        "A bot-authored feedback panel was found",
        {
          panelLocation: {
            source: candidate.source,
            channelId: candidate.id,
            messageId: typeof panelMessage.id === "string" ? panelMessage.id : null,
          },
        },
      );
    }
  }

  return buildCheck(
    "feedback-panel",
    "warn",
    "Could not find the feedback panel in the configured channel or recent forum thread scan",
    {
      searched,
      remediation: [
        "rerun /setup-feedback",
        "set DISCORD_FEEDBACK_PANEL_THREAD_ID if the panel lives in a specific forum thread",
        "move the panel into a dedicated text channel and set DISCORD_FEEDBACK_PANEL_CHANNEL_ID",
      ],
    },
  );
}

async function checkUpdatesChannel(botToken, updatesChannelId, applicationId) {
  if (!botToken || !updatesChannelId) {
    return buildCheck("updates-channel", "fail", "Updates channel audit unavailable because updates channel env is missing");
  }

  const channelResult = await discordRequest(`/channels/${updatesChannelId}`, { botToken });
  if (!channelResult.ok) {
    return buildCheck("updates-channel", "fail", `Unable to reach the updates channel (${channelResult.status})`, {
      error: channelResult.message,
    });
  }

  const messagesResult = await discordRequest(`/channels/${updatesChannelId}/messages?limit=25`, { botToken });
  if (!messagesResult.ok || !Array.isArray(messagesResult.data)) {
    return buildCheck("updates-channel", "warn", `Updates channel is reachable but recent messages could not be read (${messagesResult.status})`, {
      error: messagesResult.message,
    });
  }

  const latestBotUpdate = messagesResult.data.find((message) => {
    const authorId = typeof message?.author?.id === "string" ? message.author.id : null;
    return authorId === applicationId
      && Array.isArray(message?.embeds)
      && message.embeds.some((embed) => typeof embed?.title === "string" && embed.title.trim().length > 0);
  });

  const primaryEmbed = Array.isArray(latestBotUpdate?.embeds) ? latestBotUpdate.embeds[0] : null;
  const hasEmbedTitle = typeof primaryEmbed?.title === "string" && primaryEmbed.title.trim().length > 0;
  const hasEmbedDescription = typeof primaryEmbed?.description === "string" && primaryEmbed.description.trim().length > 0;
  const hasGreenStrip = typeof primaryEmbed?.color === "number" && primaryEmbed.color === 0x22c55e;

  return buildCheck(
    "updates-channel",
    !latestBotUpdate ? "warn" : hasEmbedTitle && hasEmbedDescription && hasGreenStrip ? "pass" : "warn",
    !latestBotUpdate
      ? "Updates channel is reachable, but no recent bot-authored curated update post was found"
      : hasEmbedTitle && hasEmbedDescription && hasGreenStrip
        ? "Updates channel is reachable and the latest curated update matches the green-strip embed-card standard"
        : "Updates channel is reachable, but the latest curated update is missing the expected embed-card formatting",
    {
      latestBotMessageId: typeof latestBotUpdate?.id === "string" ? latestBotUpdate.id : null,
      latestBotPostHasEmbedTitle: hasEmbedTitle,
      latestBotPostHasEmbedDescription: hasEmbedDescription,
      latestBotPostHasGreenStrip: hasGreenStrip,
    },
  );
}

async function checkMemberNumbers(adminClient) {
  if (!adminClient) {
    return buildCheck("member-numbers", "fail", "Member number audit unavailable because Supabase service client is missing");
  }

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, user_number, user_kind")
    .order("user_number", { ascending: true, nullsFirst: true });

  if (profilesError) {
    return buildCheck("member-numbers", "fail", "Unable to load profiles for member-number audit", {
      error: profilesError.message,
    });
  }

  const { data: links, error: linksError } = await adminClient
    .from("discord_member_links")
    .select("id, fitness_user_id, discord_user_id, user_number, user_kind, nickname_sync_status, last_error_code");

  if (linksError) {
    return buildCheck("member-numbers", "fail", "Unable to load discord_member_links for member-number audit", {
      error: linksError.message,
    });
  }

  let authUsers = [];
  let authUsersError = null;

  try {
    authUsers = await listAllAuthUsers(adminClient);
  } catch (error) {
    authUsersError = error instanceof Error ? error.message : String(error);
  }

  const authUsersById = new Map(authUsers.map((user) => [user.id, user]));
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const profileRows = profiles ?? [];
  const zeroCount = profileRows.filter((profile) => profile.user_number === 0).length;
  const automationProfilesWithNumbers = profileRows.filter((profile) => profile.user_kind === "automation" && profile.user_number !== null);
  const humanPositiveNumbers = profileRows
    .filter((profile) => profile.user_kind === "human" && typeof profile.user_number === "number" && profile.user_number >= 1)
    .map((profile) => profile.user_number);
  const positiveGaps = compactPositiveGaps(humanPositiveNumbers);
  const staleLinks = (links ?? []).filter((link) => {
    const profile = profilesById.get(link.fitness_user_id);
    return !profile || profile.user_number !== link.user_number || profile.user_kind !== link.user_kind;
  });
  const nicknameFailures = (links ?? []).filter((link) => String(link.nickname_sync_status ?? "").trim() !== "" && String(link.nickname_sync_status) !== "synced");
  const ownerZeroFailure = (links ?? []).find((link) => link.user_number === 0 && link.last_error_code);
  const suspiciousNumberedProfiles = authUsersError
    ? []
    : profileRows
      .filter((profile) => profile.user_kind === "human" && typeof profile.user_number === "number" && profile.user_number >= 1)
      .flatMap((profile) => {
        const authUser = authUsersById.get(profile.id);
        const reasons = collectAutomationSignals(authUser);
        return reasons.length > 0 ? [`${profile.id}: ${reasons.join("; ")}`] : [];
      });

  const status = zeroCount !== 1 || automationProfilesWithNumbers.length > 0 || positiveGaps.length > 0
    ? "fail"
    : staleLinks.length > 0 || nicknameFailures.length > 0 || suspiciousNumberedProfiles.length > 0 || authUsersError
      ? "warn"
      : "pass";

  return buildCheck(
    "member-numbers",
    status,
    status === "pass"
      ? "Member number compaction and sync rows look healthy"
      : status === "warn"
        ? "Member numbers are usable, but there are sync or stale-row warnings to review"
        : "Member number integrity checks failed",
    {
      zeroCount,
      positiveGapCount: positiveGaps.length,
      positiveGaps,
      automationProfilesWithNumbers: automationProfilesWithNumbers.length,
      staleDiscordLinkRows: staleLinks.length,
      nicknameFailureSummary: nicknameFailures.reduce((counts, link) => {
        const key = String(link.last_error_code ?? link.nickname_sync_status ?? "unknown");
        counts[key] = (counts[key] ?? 0) + 1;
        return counts;
      }, {}),
      ownerZeroFailure: ownerZeroFailure
        ? {
          nicknameSyncStatus: ownerZeroFailure.nickname_sync_status,
          lastErrorCode: ownerZeroFailure.last_error_code,
        }
        : null,
      suspiciousNumberedProfiles: suspiciousNumberedProfiles.length,
      authUsersAuditWarning: authUsersError,
    },
  );
}

async function checkFeedbackHealth(adminClient, debug = false) {
  if (!adminClient) {
    return buildCheck("feedback-health", "fail", "Feedback health audit unavailable because Supabase service client is missing");
  }

  const { data, error } = await adminClient
    .from("discord_feedback_reports")
    .select("id, status, attachment_count, attachment_metadata, attachment_pruned, duplicate_count, created_at, updated_at, completion_review_status, discord_forum_channel_id, discord_forum_thread_id, discord_forum_message_id, area, summary, details")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return buildCheck("feedback-health", "fail", "Unable to load discord_feedback_reports for health summary", {
      error: error.message,
    });
  }

  const rows = data ?? [];
  const testingForumChannelId = process.env.DISCORD_FEEDBACK_TESTING_FORUM_CHANNEL_ID?.trim() || null;
  const isTestingCard = (row) => {
    if (testingForumChannelId && String(row.discord_forum_channel_id ?? "") === testingForumChannelId) {
      return true;
    }

    const area = String(row.area ?? "").trim().toLowerCase();
    const summary = String(row.summary ?? "").trim().toLowerCase();
    const details = String(row.details ?? "").trim().toLowerCase();
    const combined = `${area} ${summary} ${details}`;
    return area === "discord feedback qa"
      || area === "feedback testing"
      || combined.includes("feedback canary")
      || combined.includes("canonical discord feedback canary");
  };
  const countByStatus = rows.reduce((counts, row) => {
    const key = String(row.status ?? "unknown");
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const recentAttachmentRows = rows.filter((row) => Number(row.attachment_count ?? 0) > 0);
  const withdrawnRows = rows.filter((row) => row.status === "withdrawn");
  const withdrawnWithoutPrune = withdrawnRows.filter((row) => (
    (Number(row.attachment_count ?? 0) > 0 || row.attachment_metadata !== null)
    && !row.attachment_pruned
  ));
  const staleCompletionReviewRows = rows.filter((row) => {
    const status = String(row.status ?? "");
    const completionReviewStatus = String(row.completion_review_status ?? "");
    if (!(status === "fixed" || status === "closed") || completionReviewStatus !== "pending") {
      return false;
    }
    if (isTestingCard(row)) {
      return false;
    }

    const updatedAtMs = Date.parse(String(row.updated_at ?? row.created_at ?? ""));
    if (!Number.isFinite(updatedAtMs)) {
      return false;
    }

    return (Date.now() - updatedAtMs) > 7 * 24 * 60 * 60 * 1000;
  });
  const duplicateSummary = {
    totalRowsWithDuplicates: rows.filter((row) => Number(row.duplicate_count ?? 1) > 1).length,
    maxDuplicateCount: rows.reduce((max, row) => Math.max(max, Number(row.duplicate_count ?? 1)), 1),
  };
  const resolvedRows = rows.filter((row) => row.status === "fixed" && !isTestingCard(row));
  const resolvedRowsMissingStarterIds = resolvedRows.filter((row) => !row.discord_forum_thread_id || !row.discord_forum_message_id);
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim() || null;
  const resolvedRowsWithStarterIds = resolvedRows.filter((row) => row.discord_forum_thread_id && row.discord_forum_message_id);
  const resolvedRowsMissingReaction = [];

  if (botToken) {
    for (const row of resolvedRowsWithStarterIds.slice(0, 25)) {
      const messageResult = await discordRequest(
        `/channels/${row.discord_forum_thread_id}/messages/${row.discord_forum_message_id}`,
        { botToken },
      );

      if (!messageResult.ok) {
        resolvedRowsMissingReaction.push({
          id: row.id,
          issue: `starter-post-check-failed:${messageResult.status}`,
        });
        continue;
      }

      const reactions = Array.isArray(messageResult.data?.reactions) ? messageResult.data.reactions : [];
      const hasResolvedReaction = reactions.some((reaction) => String(reaction?.emoji?.id ?? "") === resolvedReactionEmojiId);
      if (!hasResolvedReaction) {
        resolvedRowsMissingReaction.push({
          id: row.id,
          issue: "missing-resolved-reaction",
        });
      }
    }
  }

  return buildCheck(
    "feedback-health",
    withdrawnWithoutPrune.length > 0
      || staleCompletionReviewRows.length > 0
      || resolvedRowsMissingStarterIds.length > 0
      || resolvedRowsMissingReaction.length > 0
      ? "warn"
      : "pass",
    withdrawnWithoutPrune.length > 0
      ? "Recent withdrawn feedback rows exist without attachment_pruned=true"
      : staleCompletionReviewRows.length > 0
        ? "Recent fixed/completed feedback cards are still pending completion review for more than 7 days"
        : resolvedRowsMissingReaction.length > 0
          ? `Recent fixed/completed public feedback cards are missing the resolved ${resolvedReactionLabel} reaction`
          : resolvedRowsMissingStarterIds.length > 0
            ? `Recent fixed/completed public feedback cards are missing starter post ids, so resolved ${resolvedReactionLabel} checks cannot be verified`
      : "Recent feedback health summary looks consistent with the production feedback contract",
    {
      countByStatus,
      recentAttachmentRows: recentAttachmentRows.length,
      recentWithdrawnRows: withdrawnRows.length,
      withdrawnWithoutPrune: withdrawnWithoutPrune.length,
      staleCompletionReviews: staleCompletionReviewRows.length,
      resolvedCardsMissingStarterIds: resolvedRowsMissingStarterIds.map((row) => row.id),
      resolvedCardsMissingReaction: resolvedRowsMissingReaction,
      duplicateSummary,
      resolvedReactionCheckSkipped: !botToken,
      ...(debug
        ? {
          recentAttachmentDebug: recentAttachmentRows.slice(0, 5).map((row) => ({
            id: row.id,
            attachment_count: row.attachment_count,
            attachment_metadata: row.attachment_metadata,
          })),
        }
        : {}),
    },
  );
}

async function checkUpdateDrafts(adminClient) {
  if (!adminClient) {
    return buildCheck("update-drafts", "fail", "Update draft audit unavailable because Supabase service client is missing");
  }

  const { data, error } = await adminClient
    .from("discord_update_drafts")
    .select("id, status, deployment_id, published_at, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return buildCheck("update-drafts", "fail", "Unable to load discord_update_drafts for summary", {
      error: error.message,
    });
  }

  const rows = data ?? [];
  const countByStatus = rows.reduce((counts, row) => {
    const key = String(row.status ?? "unknown");
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  return buildCheck(
    "update-drafts",
    rows.length === 0 ? "warn" : "pass",
    rows.length === 0
      ? "No recent Discord update drafts were found"
      : "Recent Discord update drafts are present",
    {
      countByStatus,
      latestDrafts: rows.slice(0, 5).map((row) => ({
        id: String(row.id).slice(0, 8),
        status: row.status,
        deploymentId: row.deployment_id,
        createdAt: row.created_at,
        publishedAt: row.published_at,
      })),
    },
  );
}

function printPlainReport(report) {
  console.log("Discord community systems doctor");
  console.log(`Env file: ${report.envFile}`);
  console.log("");

  for (const check of report.checks) {
    const prefix = check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL";
    console.log(`[${prefix}] ${check.id}: ${check.summary}`);

    if (Array.isArray(check.requiredMissing) && check.requiredMissing.length > 0) {
      console.log(`  missing required env: ${check.requiredMissing.join(", ")}`);
    }
    if (Array.isArray(check.requiredEitherMissing) && check.requiredEitherMissing.length > 0) {
      console.log(`  missing required env groups: ${check.requiredEitherMissing.join(", ")}`);
    }
    if (Array.isArray(check.recommendedMissing) && check.recommendedMissing.length > 0) {
      console.log(`  missing recommended env: ${check.recommendedMissing.join(", ")}`);
    }
    if (Array.isArray(check.localMirrorMissing) && check.localMirrorMissing.length > 0) {
      console.log(`  local doctor env missing: ${check.localMirrorMissing.join(", ")}`);
    }
    if (Array.isArray(check.missingTables) && check.missingTables.length > 0) {
      console.log(`  missing tables: ${check.missingTables.join(", ")}`);
    }
    if (Array.isArray(check.missingColumns) && check.missingColumns.length > 0) {
      console.log(`  missing columns: ${check.missingColumns.join(", ")}`);
    }
    if (Array.isArray(check.missingExpected) && check.missingExpected.length > 0) {
      console.log(`  missing commands: ${check.missingExpected.join(", ")}`);
    }
    if (Array.isArray(check.presentForbidden) && check.presentForbidden.length > 0) {
      console.log(`  forbidden commands still live: ${check.presentForbidden.join(", ")}`);
    }
    if (Array.isArray(check.missingTags) && check.missingTags.length > 0) {
      console.log(`  missing tags: ${check.missingTags.join(", ")}`);
    }
    if (Array.isArray(check.presentObsoleteTags) && check.presentObsoleteTags.length > 0) {
      console.log(`  obsolete tags still present: ${check.presentObsoleteTags.join(", ")}`);
    }
    if (Array.isArray(check.mismatches) && check.mismatches.length > 0) {
      console.log(`  emoji mismatches: ${check.mismatches.join(", ")}`);
    }
    if (check.zeroCount !== undefined) {
      console.log(`  #0 count: ${check.zeroCount}`);
      console.log(`  positive gaps: ${check.positiveGapCount}`);
      console.log(`  automation profiles with numbers: ${check.automationProfilesWithNumbers}`);
      console.log(`  stale discord_member_links rows: ${check.staleDiscordLinkRows}`);
      if (check.ownerZeroFailure) {
        console.log(`  owner #0 sync warning: ${check.ownerZeroFailure.lastErrorCode ?? check.ownerZeroFailure.nicknameSyncStatus}`);
      }
    }
    if (check.countByStatus && typeof check.countByStatus === "object") {
      console.log(`  counts by status: ${JSON.stringify(check.countByStatus)}`);
    }
    if (check.latestDrafts) {
      console.log(`  latest drafts: ${check.latestDrafts.map((draft) => `${draft.id}:${draft.status}`).join(", ")}`);
    }
    if (Array.isArray(check.remediation) && check.remediation.length > 0) {
      console.log(`  remediation: ${check.remediation.join(" | ")}`);
    }
    if (typeof check.error === "string" && check.error.length > 0) {
      console.log(`  error: ${check.error}`);
    }
  }

  console.log("");
  console.log(`Summary: ${report.summary.pass} pass, ${report.summary.warn} warn, ${report.summary.fail} fail`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const adminClient = getRequiredSupabaseClient();
  const botToken = getEnv("DISCORD_BOT_TOKEN");
  const applicationId = getEnv("DISCORD_APPLICATION_ID");
  const guildId = getEnv("DISCORD_GUILD_ID");
  const verifyChannelId = getEnv("DISCORD_VERIFY_CHANNEL_ID");
  const forumChannelId = getEnv("DISCORD_BUG_REPORT_FORUM_CHANNEL_ID");
  const feedbackPanelChannelId = getEnv("DISCORD_FEEDBACK_PANEL_CHANNEL_ID") ?? forumChannelId;
  const updatesChannelId = getEnv("DISCORD_UPDATES_CHANNEL_ID");

  const checks = [
    await checkEnvPresence(),
    await checkProductionEnvMetadata(),
    await checkSupabaseSchema(adminClient),
    await checkDiscordCommands(botToken, applicationId, guildId),
    await checkFeedbackForumTags(botToken, forumChannelId),
    await checkEmojiValidation(botToken, guildId, applicationId),
    await checkVerifyMessage(botToken, verifyChannelId, applicationId),
    await checkFeedbackPanel(botToken, feedbackPanelChannelId, applicationId),
    await checkUpdatesChannel(botToken, updatesChannelId, applicationId),
    await checkMemberNumbers(adminClient),
    await checkFeedbackHealth(adminClient, args.debug),
    await checkUpdateDrafts(adminClient),
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    envFile: envPath,
    checks,
    summary: {
      pass: checks.filter((check) => check.status === "pass").length,
      warn: checks.filter((check) => check.status === "warn").length,
      fail: checks.filter((check) => check.status === "fail").length,
    },
  };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printPlainReport(report);
  }

  process.exitCode = checks.some(isCritical) ? 1 : 0;
}

main().catch((error) => {
  console.error(`doctor-discord-community failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
