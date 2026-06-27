const DEFAULT_DISCORDOS_MESSAGE_COMMAND_POLL_URL = "https://fawxzzy-discordos.vercel.app/api/discord-message-commands-poll";

export function resolveDiscordOsMessageCommandPollUrl(env: NodeJS.ProcessEnv = process.env) {
  const configured = env.DISCORDOS_MESSAGE_COMMAND_POLL_PROXY_URL?.trim();
  return configured && configured.length > 0
    ? configured
    : DEFAULT_DISCORDOS_MESSAGE_COMMAND_POLL_URL;
}

export async function proxyDiscordOsMessageCommandPoll(
  request: Request,
  {
    env = process.env,
    fetchImpl = fetch,
  }: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
  } = {},
) {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    headers.set(key, value);
  });
  headers.set("cache-control", "no-cache");

  try {
    const upstream = await fetchImpl(resolveDiscordOsMessageCommandPollUrl(env), {
      method: "GET",
      headers,
      redirect: "follow",
    });
    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return Response.json({
      ok: false,
      message: "DiscordOS message command proxy failed.",
      error: error instanceof Error ? error.message : String(error),
    }, {
      status: 502,
      headers: {
        "cache-control": "no-store",
      },
    });
  }
}
