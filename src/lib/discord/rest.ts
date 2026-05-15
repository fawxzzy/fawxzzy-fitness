import "server-only";

import { DISCORD_BOT_TOKEN } from "@/lib/env";

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DISCORD_API_USER_AGENT = "fawxzzy-fitness-discord-interactions/1.0";

export type DiscordChannelMessage = {
  id: string;
  author?: {
    id?: string;
  };
  components?: unknown[];
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
  messageContent: string;
  appliedTags?: string[];
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
        message: {
          content: args.messageContent,
        },
        applied_tags: Array.isArray(args.appliedTags) && args.appliedTags.length > 0 ? args.appliedTags : undefined,
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
}): Promise<{ ok: true; messageId: string | null } | { ok: false; code: string; status: number; message: string | null }> {
  return createDiscordChannelMessage({
    channelId: args.threadId,
    body: {
      content: args.content,
    },
  });
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
