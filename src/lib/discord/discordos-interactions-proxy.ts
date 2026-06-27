const DEFAULT_DISCORDOS_INTERACTIONS_URL = "https://fawxzzy-discordos.vercel.app/api/discord-interactions";

type DiscordOsInteractionsEnv = Partial<Pick<NodeJS.ProcessEnv, "DISCORDOS_INTERACTIONS_PROXY_URL">>;

export function resolveDiscordOsInteractionsUrl(env: DiscordOsInteractionsEnv = process.env as DiscordOsInteractionsEnv) {
  const configured = env.DISCORDOS_INTERACTIONS_PROXY_URL?.trim();
  return configured && configured.length > 0
    ? configured
    : DEFAULT_DISCORDOS_INTERACTIONS_URL;
}

export async function proxyDiscordOsInteractionRequest(
  request: Request,
  rawBody: string,
  {
    env = process.env as DiscordOsInteractionsEnv,
    fetchImpl = fetch,
  }: {
    env?: DiscordOsInteractionsEnv;
    fetchImpl?: typeof fetch;
  } = {},
) {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    headers.set(key, value);
  });
  headers.set("content-type", request.headers.get("content-type") || "application/json");
  headers.set("cache-control", "no-cache");

  try {
    const upstream = await fetchImpl(resolveDiscordOsInteractionsUrl(env), {
      method: request.method || "POST",
      headers,
      body: rawBody,
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
      message: "DiscordOS interaction proxy failed.",
      error: error instanceof Error ? error.message : String(error),
    }, {
      status: 502,
      headers: {
        "cache-control": "no-store",
      },
    });
  }
}
