export type DiscordInteraction = {
  id?: unknown;
  application_id?: unknown;
  token?: unknown;
  type?: unknown;
  guild_id?: unknown;
  channel_id?: unknown;
  message?: {
    id?: unknown;
    flags?: unknown;
  } | null;
  member?: {
    permissions?: unknown;
    roles?: unknown;
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
