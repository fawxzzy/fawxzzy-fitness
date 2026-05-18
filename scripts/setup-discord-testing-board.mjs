#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envPath = resolveEnvFilePath(repoRoot);
const fileEnv = parseDotenvFile(envPath);

for (const [key, value] of Object.entries(fileEnv)) {
  process.env[key] = value.replace(/\\r\\n/g, "").replace(/\\n/g, "");
}

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_API_USER_AGENT = "fawxzzy-fitness-discord-testing-board/1.0";
const TESTING_CATEGORY_NAME = "Testing";
const TESTING_FORUM_NAME = "feedback-testing";
const TESTING_FORUM_TOPIC = "Private canary forum for internal Feedback Board QA. No public/community cards.";
const FEATURE_CANARY_THREAD_NAME = "Feature: Discord Feedback QA - Canonical feature canary";
const BUG_CANARY_THREAD_NAME = "Bug: Discord Feedback QA - Canonical bug canary";
const PERMISSION_VIEW_CHANNEL = BigInt(1) << BigInt(10);
const PERMISSION_SEND_MESSAGES = BigInt(1) << BigInt(11);
const PERMISSION_MANAGE_MESSAGES = BigInt(1) << BigInt(13);
const PERMISSION_MANAGE_THREADS = BigInt(1) << BigInt(34);
const PERMISSION_CREATE_PUBLIC_THREADS = BigInt(1) << BigInt(35);
const PERMISSION_CREATE_PRIVATE_THREADS = BigInt(1) << BigInt(36);
const PERMISSION_SEND_MESSAGES_IN_THREADS = BigInt(1) << BigInt(38);

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}. Set it in ${envPath} or the current shell.`);
  }

  return value;
}

function getOptionalEnv(name) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function buildSupabaseAdmin() {
  return createClient(getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function parseDiscordJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

async function discordRequest(pathname, { method = "GET", body } = {}) {
  const response = await fetch(`${DISCORD_API_BASE_URL}${pathname}`, {
    method,
    headers: {
      Authorization: `Bot ${getRequiredEnv("DISCORD_BOT_TOKEN")}`,
      "Content-Type": "application/json",
      "User-Agent": DISCORD_API_USER_AGENT,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await parseDiscordJson(response);
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

function readArgValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  const value = argv[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

function parseArgs(argv = process.argv.slice(2)) {
  return {
    apply: argv.includes("--apply"),
    debug: argv.includes("--debug"),
    moveReportId: readArgValue(argv, "--move-report-id"),
    createBugCanary: argv.includes("--create-bug-canary"),
  };
}

function formatPermissions(value) {
  return value.toString();
}

function normalizeThreadName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[—–?]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDenyPostingOverwrite() {
  return {
    allow: "0",
    deny: formatPermissions(
      PERMISSION_VIEW_CHANNEL
      | PERMISSION_SEND_MESSAGES
      | PERMISSION_CREATE_PUBLIC_THREADS
      | PERMISSION_CREATE_PRIVATE_THREADS
      | PERMISSION_SEND_MESSAGES_IN_THREADS,
    ),
    type: 0,
  };
}

function buildStaffAllowOverwrite() {
  return {
    allow: formatPermissions(
      PERMISSION_VIEW_CHANNEL
      | PERMISSION_SEND_MESSAGES
      | PERMISSION_CREATE_PUBLIC_THREADS
      | PERMISSION_CREATE_PRIVATE_THREADS
      | PERMISSION_SEND_MESSAGES_IN_THREADS
      | PERMISSION_MANAGE_THREADS
      | PERMISSION_MANAGE_MESSAGES,
    ),
    deny: "0",
    type: 0,
  };
}

async function fetchGuildChannels(guildId) {
  const result = await discordRequest(`/guilds/${guildId}/channels`);
  if (!result.ok || !Array.isArray(result.data)) {
    throw new Error(`Failed to fetch guild channels (${result.status}): ${result.message}`);
  }

  return result.data;
}

async function ensureTestingCategory({ guildId, apply, debug }) {
  const channels = await fetchGuildChannels(guildId);
  const existing = channels.find((channel) => channel?.type === 4 && channel?.name === TESTING_CATEGORY_NAME);
  if (existing?.id) {
    if (debug) {
      console.log(`Testing category already exists: ${existing.id}`);
    }
    return { categoryId: existing.id, created: false, pending: false };
  }

  if (!apply) {
    return { categoryId: null, created: false, pending: true };
  }

  const createResult = await discordRequest(`/guilds/${guildId}/channels`, {
    method: "POST",
    body: {
      name: TESTING_CATEGORY_NAME,
      type: 4,
    },
  });

  if (!createResult.ok || !createResult.data?.id) {
    throw new Error(`Failed to create testing category (${createResult.status}): ${createResult.message}`);
  }

  return { categoryId: createResult.data.id, created: true, pending: false };
}

async function ensureTestingForum({ guildId, categoryId, apply, debug }) {
  const channels = await fetchGuildChannels(guildId);
  const existing = channels.find((channel) => channel?.type === 15 && channel?.name === TESTING_FORUM_NAME);
  if (existing?.id) {
    if (debug) {
      console.log(`Testing forum already exists: ${existing.id}`);
    }
    return { forumId: existing.id, created: false, pending: false };
  }

  if (!apply) {
    return { forumId: null, created: false, pending: true };
  }

  const createResult = await discordRequest(`/guilds/${guildId}/channels`, {
    method: "POST",
    body: {
      name: TESTING_FORUM_NAME,
      type: 15,
      parent_id: categoryId,
      topic: TESTING_FORUM_TOPIC,
    },
  });

  if (!createResult.ok || !createResult.data?.id) {
    throw new Error(`Failed to create testing forum (${createResult.status}): ${createResult.message}`);
  }

  return { forumId: createResult.data.id, created: true, pending: false };
}

async function applyPrivacyOverwrites({ categoryId, forumId, apply, debug }) {
  const guildId = getRequiredEnv("DISCORD_GUILD_ID");
  const staffRoleId = getOptionalEnv("DISCORD_STAFF_ROLE_ID");
  const plans = [categoryId, forumId].filter(Boolean).flatMap((channelId) => ([
    { channelId, overwriteId: guildId, overwrite: buildDenyPostingOverwrite(), label: "@everyone deny" },
    ...(staffRoleId ? [{ channelId, overwriteId: staffRoleId, overwrite: buildStaffAllowOverwrite(), label: "staff allow" }] : []),
  ]));

  if (!apply) {
    return plans.map((plan) => `${plan.channelId}:${plan.label}`);
  }

  for (const plan of plans) {
    const result = await discordRequest(`/channels/${plan.channelId}/permissions/${plan.overwriteId}`, {
      method: "PUT",
      body: plan.overwrite,
    });
    if (!result.ok) {
      throw new Error(`Failed permission overwrite for ${plan.label} on ${plan.channelId} (${result.status}): ${result.message}`);
    }
    if (debug) {
      console.log(`Applied ${plan.label} overwrite on ${plan.channelId}`);
    }
  }

  return plans.map((plan) => `${plan.channelId}:${plan.label}`);
}

async function fetchFeedbackReport(admin, reportId) {
  const shortId = reportId.includes("-") ? reportId.slice(0, 8) : reportId;
  const { data, error } = await admin
    .from("discord_feedback_reports")
    .select("id,report_type,status,area,summary,discord_forum_thread_id,discord_forum_message_id")
    .limit(200);

  if (error) {
    throw new Error(`Unable to load report ${reportId}: ${error.message}`);
  }

  const match = Array.isArray(data)
    ? data.find((row) => typeof row?.id === "string" && row.id.toLowerCase().startsWith(shortId.toLowerCase()))
    : null;

  if (!match) {
    throw new Error(`Feedback report ${reportId} not found.`);
  }

  return match;
}

async function fetchDiscordMessage(channelId, messageId) {
  const result = await discordRequest(`/channels/${channelId}/messages/${messageId}`);
  if (!result.ok) {
    throw new Error(`Failed to load Discord message ${messageId} (${result.status}): ${result.message}`);
  }

  return result.data;
}

async function createForumThread({ forumId, threadName, content }) {
  const result = await discordRequest(`/channels/${forumId}/threads`, {
    method: "POST",
    body: {
      name: threadName,
      message: {
        content,
        allowed_mentions: {
          parse: [],
          users: [],
          roles: [],
          replied_user: false,
        },
      },
    },
  });

  if (!result.ok || !result.data?.id) {
    throw new Error(`Failed to create forum thread (${result.status}): ${result.message}`);
  }

  return {
    threadId: result.data.id ?? null,
    messageId: result.data.last_message_id ?? null,
  };
}

async function archiveThread(threadId, debug) {
  const result = await discordRequest(`/channels/${threadId}`, {
    method: "PATCH",
    body: {
      archived: true,
      locked: true,
    },
  });

  if (!result.ok) {
    throw new Error(`Failed to archive thread ${threadId} (${result.status}): ${result.message}`);
  }

  if (debug) {
    console.log(`Archived old thread ${threadId}`);
  }
}

async function moveCanaryReport({ admin, forumId, reportId, apply, debug }) {
  const report = await fetchFeedbackReport(admin, reportId);
  if (!report.discord_forum_thread_id || !report.discord_forum_message_id) {
    throw new Error(`Feedback report ${reportId} does not have an attached forum thread.`);
  }

  const oldMessage = await fetchDiscordMessage(report.discord_forum_thread_id, report.discord_forum_message_id);
  const content = typeof oldMessage?.content === "string" && oldMessage.content.trim().length > 0
    ? `${oldMessage.content}\n\n_Internal note: moved to the private testing board canary lane._`
    : `Canonical feature canary for private Feedback Board QA.\n\nReport ID: \`${report.id.slice(0, 8)}\``;
  const threadName = report.report_type === "feature" ? FEATURE_CANARY_THREAD_NAME : BUG_CANARY_THREAD_NAME;

  if (!apply) {
    return {
      reportId: report.id,
      fromThreadId: report.discord_forum_thread_id,
      toForumId: forumId,
      threadName,
      pending: true,
    };
  }

  const created = await createForumThread({
    forumId,
    threadName,
    content,
  });

  const { error } = await admin
    .from("discord_feedback_reports")
    .update({
      discord_forum_channel_id: forumId,
      discord_forum_thread_id: created.threadId,
      discord_forum_message_id: created.messageId,
      discord_forum_title: threadName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", report.id);

  if (error) {
    throw new Error(`Unable to update moved report ${report.id}: ${error.message}`);
  }

  await archiveThread(report.discord_forum_thread_id, debug);

  return {
    reportId: report.id,
    fromThreadId: report.discord_forum_thread_id,
    toThreadId: created.threadId,
    toMessageId: created.messageId,
  };
}

async function ensureBugCanaryThread({ forumId, apply, debug }) {
  const activeThreadsResult = await discordRequest(`/guilds/${getRequiredEnv("DISCORD_GUILD_ID")}/threads/active`);
  if (activeThreadsResult.ok && Array.isArray(activeThreadsResult.data?.threads)) {
    const existing = activeThreadsResult.data.threads.find((thread) => (
      thread?.parent_id === forumId && normalizeThreadName(thread?.name) === normalizeThreadName(BUG_CANARY_THREAD_NAME)
    ));
    if (existing?.id) {
      if (debug) {
        console.log(`Bug canary already exists: ${existing.id}`);
      }
      return { threadId: existing.id, created: false, pending: false };
    }
  }

  if (!apply) {
    return { threadId: null, created: false, pending: true };
  }

  const created = await createForumThread({
    forumId,
    threadName: BUG_CANARY_THREAD_NAME,
    content: [
      "**Testing Canary**",
      "Type: Bug",
      "Status: Withdrawn",
      "Area: Discord Feedback QA",
      "",
      "**Title**",
      "Canonical private bug canary",
      "",
      "**Problem**",
      "Use this thread to verify bug-card formatting and private testing-board workflows without polluting the public feedback forum.",
      "",
      "**Expected behavior**",
      "Testing-only bug cards stay in the private forum.",
      "",
      "**Actual behavior**",
      "Public board canaries create noise if they stay on the main feedback forum.",
      "",
      "**Steps to reproduce**",
      "1. Use this thread for QA only.",
      "2. Do not export it as real product feedback.",
    ].join("\n"),
  });

  return { threadId: created.threadId, messageId: created.messageId, created: true, pending: false };
}

function renderSummary(summary) {
  const lines = [
    `Mode: ${summary.apply ? "apply" : "dry-run"}`,
    `Testing category: ${summary.categoryId ?? "(would create)"}`,
    `Testing forum: ${summary.forumId ?? "(would create)"}`,
    `Permission plan entries: ${summary.permissionPlans.length}`,
  ];

  if (summary.movedReport) {
    lines.push(`Moved canary report: ${summary.movedReport.reportId}`);
  }

  if (summary.bugCanary) {
    lines.push(`Bug canary thread: ${summary.bugCanary.threadId ?? "(would create)"}`);
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs();
  const guildId = getRequiredEnv("DISCORD_GUILD_ID");
  const admin = buildSupabaseAdmin();

  const categoryResult = await ensureTestingCategory({ guildId, apply: args.apply, debug: args.debug });
  const categoryId = categoryResult.categoryId ?? getOptionalEnv("DISCORD_TESTING_CATEGORY_ID");

  const forumResult = await ensureTestingForum({ guildId, categoryId, apply: args.apply, debug: args.debug });
  const forumId = forumResult.forumId ?? getOptionalEnv("DISCORD_FEEDBACK_TESTING_FORUM_CHANNEL_ID");

  const permissionPlans = categoryId && forumId
    ? await applyPrivacyOverwrites({ categoryId, forumId, apply: args.apply, debug: args.debug })
    : [];

  const movedReport = args.moveReportId && forumId
    ? await moveCanaryReport({ admin, forumId, reportId: args.moveReportId, apply: args.apply, debug: args.debug })
    : null;

  const bugCanary = (args.createBugCanary || args.apply) && forumId
    ? await ensureBugCanaryThread({ forumId, apply: args.apply, debug: args.debug })
    : null;

  process.stdout.write(renderSummary({
    apply: args.apply,
    categoryId,
    forumId,
    permissionPlans,
    movedReport,
    bugCanary,
  }));
}

main().catch((error) => {
  console.error(`discord:testing-board:setup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
