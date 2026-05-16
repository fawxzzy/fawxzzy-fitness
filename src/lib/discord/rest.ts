import "server-only";

import { DISCORD_BOT_TOKEN } from "@/lib/env";

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_API_USER_AGENT = "fawxzzy-fitness-discord-interactions/1.0";

export type DiscordAllowedMentions = {
  parse: string[];
  users?: string[];
  roles?: string[];
  replied_user?: boolean;
};

export type DiscordChannelMessage = {
  id: string;
  author?: {
    id?: string;
  };
  components?: unknown[];
};

export type DiscordForumTag = {
  id: string;
  name: string;
  moderated?: boolean;
};

export type DiscordChannel = {
  id: string;
  name?: string;
  type?: number;
  parent_id?: string;
  owner_id?: string;
  archived?: boolean;
  locked?: boolean;
  applied_tags?: string[];
  available_tags?: DiscordForumTag[];
};

export type DiscordActiveThreadsResponse = {
  threads?: DiscordChannel[];
};

type DiscordRequestInit = {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
};

async function parseDiscordJson(response: Response): Promise<unknown> {
  const responseText = await response.text();
  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return { message: responseText.slice(0, 200) };
  }
}

async function discordRequest<T>(path: string, init: DiscordRequestInit): Promise<{
  ok: boolean;
  status: number;
  data: T | null;
  errorMessage: string | null;
}> {
  const response = await fetch(`${DISCORD_API_BASE_URL}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN()}`,
      "Content-Type": "application/json",
      "User-Agent": DISCORD_API_USER_AGENT,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const data = await parseDiscordJson(response) as T | null;
  const errorMessage = !response.ok && data && typeof data === "object" && "message" in data
    ? String((data as { message?: unknown }).message ?? response.statusText)
    : !response.ok
      ? response.statusText
      : null;

  return {
    ok: response.ok,
    status: response.status,
    data,
    errorMessage,
  };
}

function normalizeAllowedMentions(allowedMentions?: DiscordAllowedMentions | null): DiscordAllowedMentions | undefined {
  if (!allowedMentions) {
    return undefined;
  }

  return {
    parse: Array.isArray(allowedMentions.parse) ? allowedMentions.parse : [],
    users: Array.isArray(allowedMentions.users) && allowedMentions.users.length > 0 ? allowedMentions.users : undefined,
    roles: Array.isArray(allowedMentions.roles) && allowedMentions.roles.length > 0 ? allowedMentions.roles : undefined,
    replied_user: allowedMentions.replied_user ?? false,
  };
}

export async function addDiscordGuildMemberRole(args: {
  guildId: string;
  userId: string;
  roleId: string;
}): Promise<{ ok: true } | { ok: false; code: string; status: number; message: string | null }> {
  const result = await discordRequest<null>(
    `/guilds/${args.guildId}/members/${args.userId}/roles/${args.roleId}`,
    { method: "PUT" },
  );

  if (result.ok && result.status === 204) {
    return { ok: true };
  }

  return {
    ok: false,
    code: result.status === 403 ? "DISCORD_ROLE_ASSIGNMENT_FORBIDDEN" : "DISCORD_ROLE_ASSIGNMENT_FAILED",
    status: result.status,
    message: result.errorMessage,
  };
}

export async function removeDiscordGuildMemberRole(args: {
  guildId: string;
  userId: string;
  roleId: string;
}): Promise<{ ok: true } | { ok: false; code: string; status: number; message: string | null }> {
  const result = await discordRequest<null>(
    `/guilds/${args.guildId}/members/${args.userId}/roles/${args.roleId}`,
    { method: "DELETE" },
  );

  if (result.ok && result.status === 204) {
    return { ok: true };
  }

  return {
    ok: false,
    code: result.status === 403 ? "DISCORD_ROLE_REMOVAL_FORBIDDEN" : "DISCORD_ROLE_REMOVAL_FAILED",
    status: result.status,
    message: result.errorMessage,
  };
}

export async function fetchDiscordChannelMessages(args: {
  channelId: string;
  limit?: number;
}): Promise<{ ok: true; messages: DiscordChannelMessage[] } | { ok: false; code: string; status: number; message: string | null }> {
  const limit = Math.max(1, Math.min(args.limit ?? 50, 100));
  const result = await discordRequest<DiscordChannelMessage[]>(
    `/channels/${args.channelId}/messages?limit=${limit}`,
    { method: "GET" },
  );

  if (result.ok && Array.isArray(result.data)) {
    return { ok: true, messages: result.data };
  }

  return {
    ok: false,
    code: "DISCORD_FETCH_MESSAGES_FAILED",
    status: result.status,
    message: result.errorMessage,
  };
}

export async function fetchDiscordChannel(args: {
  channelId: string;
}): Promise<{ ok: true; channel: DiscordChannel } | { ok: false; code: string; status: number; message: string | null }> {
  const result = await discordRequest<DiscordChannel>(
    `/channels/${args.channelId}`,
    { method: "GET" },
  );

  if (result.ok && result.data && typeof result.data.id === "string") {
    return { ok: true, channel: result.data };
  }

  return {
    ok: false,
    code: "DISCORD_FETCH_CHANNEL_FAILED",
    status: result.status,
    message: result.errorMessage,
  };
}

export async function fetchDiscordGuildActiveThreads(args: {
  guildId: string;
}): Promise<{ ok: true; threads: DiscordChannel[] } | { ok: false; code: string; status: number; message: string | null }> {
  const result = await discordRequest<DiscordActiveThreadsResponse>(
    `/guilds/${args.guildId}/threads/active`,
    { method: "GET" },
  );

  if (result.ok && Array.isArray(result.data?.threads)) {
    return { ok: true, threads: result.data.threads };
  }

  return {
    ok: false,
    code: "DISCORD_FETCH_ACTIVE_THREADS_FAILED",
    status: result.status,
    message: result.errorMessage,
  };
}

export async function resolveDiscordForumTagIdsByName(args: {
  channelId: string;
  tagNames: string[];
}): Promise<
  | { ok: true; matchedTagIds: string[]; missingTagNames: string[] }
  | { ok: false; code: string; status: number; message: string | null }
> {
  const channelResult = await fetchDiscordChannel({ channelId: args.channelId });
  if (!channelResult.ok) {
    return channelResult;
  }

  const availableTags = Array.isArray(channelResult.channel.available_tags)
    ? channelResult.channel.available_tags.filter((tag): tag is DiscordForumTag => Boolean(tag?.id && tag?.name))
    : [];

  const matchedTagIds: string[] = [];
  const missingTagNames: string[] = [];

  for (const tagName of args.tagNames) {
    const normalizedTagName = String(tagName ?? "").trim().toLowerCase();
    if (!normalizedTagName) {
      continue;
    }

    const match = availableTags.find((tag) => tag.name.trim().toLowerCase() === normalizedTagName);
    if (match) {
      matchedTagIds.push(match.id);
    } else {
      missingTagNames.push(tagName);
    }
  }

  return {
    ok: true,
    matchedTagIds: [...new Set(matchedTagIds)].slice(0, 3),
    missingTagNames,
  };
}

export async function patchDiscordChannelMessage(args: {
  channelId: string;
  messageId: string;
  body: unknown;
}): Promise<{ ok: true } | { ok: false; code: string; status: number; message: string | null }> {
  const result = await discordRequest<unknown>(
    `/channels/${args.channelId}/messages/${args.messageId}`,
    { method: "PATCH", body: args.body },
  );

  if (result.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    code: "DISCORD_PATCH_MESSAGE_FAILED",
    status: result.status,
    message: result.errorMessage,
  };
}

export async function createDiscordChannelMessage(args: {
  channelId: string;
  body: unknown;
}): Promise<{ ok: true; messageId: string | null } | { ok: false; code: string; status: number; message: string | null }> {
  const result = await discordRequest<{ id?: string }>(
    `/channels/${args.channelId}/messages`,
    { method: "POST", body: args.body },
  );

  if (result.ok) {
    return {
      ok: true,
      messageId: result.data && typeof result.data.id === "string" ? result.data.id : null,
    };
  }

  return {
    ok: false,
    code: "DISCORD_CREATE_MESSAGE_FAILED",
    status: result.status,
    message: result.errorMessage,
  };
}

export async function createDiscordForumThreadWithMessage(args: {
  channelId: string;
  threadName: string;
  messageContent?: string;
  messageBody?: Record<string, unknown>;
  appliedTagIds?: string[];
  allowedMentions?: DiscordAllowedMentions | null;
}): Promise<
  | { ok: true; threadId: string | null; messageId: string | null }
  | { ok: false; code: string; status: number; message: string | null }
> {
  const result = await discordRequest<{ id?: string; last_message_id?: string }>(
    `/channels/${args.channelId}/threads`,
    {
      method: "POST",
      body: {
        name: args.threadName,
        message: args.messageBody ?? {
          content: args.messageContent ?? "",
          allowed_mentions: normalizeAllowedMentions(args.allowedMentions),
        },
        applied_tags: Array.isArray(args.appliedTagIds) && args.appliedTagIds.length > 0 ? args.appliedTagIds.slice(0, 3) : undefined,
      },
    },
  );

  if (result.ok) {
    return {
      ok: true,
      threadId: result.data && typeof result.data.id === "string" ? result.data.id : null,
      messageId: result.data && typeof result.data.last_message_id === "string" ? result.data.last_message_id : null,
    };
  }

  return {
    ok: false,
    code: "DISCORD_CREATE_FORUM_THREAD_FAILED",
    status: result.status,
    message: result.errorMessage,
  };
}

export async function createDiscordThreadMessage(args: {
  threadId: string;
  content: string;
  allowedMentions?: DiscordAllowedMentions | null;
}): Promise<{ ok: true; messageId: string | null } | { ok: false; code: string; status: number; message: string | null }> {
  return createDiscordChannelMessage({
    channelId: args.threadId,
    body: {
      content: args.content,
      allowed_mentions: normalizeAllowedMentions(args.allowedMentions),
    },
  });
}

export async function updateDiscordForumThreadTags(args: {
  threadId: string;
  appliedTagIds: string[];
}): Promise<{ ok: true } | { ok: false; code: string; status: number; message: string | null }> {
  const result = await discordRequest<DiscordChannel>(
    `/channels/${args.threadId}`,
    {
      method: "PATCH",
      body: {
        applied_tags: args.appliedTagIds.slice(0, 3),
      },
    },
  );

  if (result.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    code: "DISCORD_UPDATE_FORUM_THREAD_TAGS_FAILED",
    status: result.status,
    message: result.errorMessage,
  };
}

export async function updateDiscordForumThreadTitle(args: {
  threadId: string;
  title: string;
}): Promise<{ ok: true } | { ok: false; code: string; status: number; message: string | null }> {
  const result = await discordRequest<DiscordChannel>(
    `/channels/${args.threadId}`,
    {
      method: "PATCH",
      body: {
        name: args.title,
      },
    },
  );

  if (result.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    code: "DISCORD_UPDATE_FORUM_THREAD_TITLE_FAILED",
    status: result.status,
    message: result.errorMessage,
  };
}

export async function updateDiscordForumThreadArchiveState(args: {
  threadId: string;
  archived: boolean;
  locked?: boolean;
}): Promise<{ ok: true } | { ok: false; code: string; status: number; message: string | null }> {
  const result = await discordRequest<DiscordChannel>(
    `/channels/${args.threadId}`,
    {
      method: "PATCH",
      body: {
        archived: args.archived,
        ...(typeof args.locked === "boolean" ? { locked: args.locked } : {}),
      },
    },
  );

  if (result.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    code: "DISCORD_UPDATE_FORUM_THREAD_ARCHIVE_STATE_FAILED",
    status: result.status,
    message: result.errorMessage,
  };
}

export async function updateDiscordGuildMemberNickname(args: {
  guildId: string;
  userId: string;
  nickname: string;
}): Promise<{ ok: true } | { ok: false; code: string; status: number; message: string | null }> {
  const result = await discordRequest<unknown>(
    `/guilds/${args.guildId}/members/${args.userId}`,
    {
      method: "PATCH",
      body: { nick: args.nickname },
    },
  );

  if (result.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    code:
      result.status === 403
        ? "DISCORD_NICKNAME_UPDATE_FORBIDDEN"
        : result.status === 404
          ? "DISCORD_NICKNAME_UPDATE_NOT_FOUND"
          : "DISCORD_NICKNAME_UPDATE_FAILED",
    status: result.status,
    message: result.errorMessage,
  };
}
