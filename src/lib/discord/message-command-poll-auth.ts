const GITHUB_ACTIONS_OIDC_OPENID_CONFIGURATION_URL = "https://token.actions.githubusercontent.com/.well-known/openid-configuration";
const GITHUB_ACTIONS_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const DEFAULT_GITHUB_ACTIONS_AUDIENCE = "fawxzzy-fitness-discord-message-poll";
const DEFAULT_GITHUB_REPOSITORY_ID = "1212867511";
const DEFAULT_GITHUB_REPOSITORY_OWNER_ID = "276708364";
const DEFAULT_GITHUB_REF = "refs/heads/main";
const CLOCK_SKEW_SECONDS = 60;
const CACHE_TTL_MS = 10 * 60 * 1000;

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type JwtHeader = {
  alg?: JsonValue;
  kid?: JsonValue;
  typ?: JsonValue;
};

type JwtPayload = {
  aud?: JsonValue;
  event_name?: JsonValue;
  exp?: JsonValue;
  iat?: JsonValue;
  iss?: JsonValue;
  nbf?: JsonValue;
  ref?: JsonValue;
  repository?: JsonValue;
  repository_id?: JsonValue;
  repository_owner?: JsonValue;
  repository_owner_id?: JsonValue;
};

type OpenIdConfiguration = {
  issuer?: JsonValue;
  jwks_uri?: JsonValue;
};

type JsonWebKeySetPayload = {
  keys?: JsonValue;
};

type OidcJsonWebKey = {
  alg?: string;
  e?: string;
  kid?: string;
  kty?: string;
  n?: string;
  use?: string;
};

type CachedJson<T> = {
  expiresAt: number;
  value: T;
};

let openIdConfigurationCache: CachedJson<OpenIdConfiguration> | null = null;
let jsonWebKeySetCache: CachedJson<OidcJsonWebKey[]> | null = null;

function readOptionalEnv(name: string, env: NodeJS.ProcessEnv) {
  const value = env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function resolveGitHubActionsAudience(env: NodeJS.ProcessEnv) {
  return readOptionalEnv("DISCORD_MESSAGE_COMMAND_GITHUB_AUDIENCE", env) ?? DEFAULT_GITHUB_ACTIONS_AUDIENCE;
}

function resolveGitHubRepositoryId(env: NodeJS.ProcessEnv) {
  return readOptionalEnv("DISCORD_MESSAGE_COMMAND_GITHUB_REPOSITORY_ID", env) ?? DEFAULT_GITHUB_REPOSITORY_ID;
}

function resolveGitHubRepositoryOwnerId(env: NodeJS.ProcessEnv) {
  return readOptionalEnv("DISCORD_MESSAGE_COMMAND_GITHUB_REPOSITORY_OWNER_ID", env) ?? DEFAULT_GITHUB_REPOSITORY_OWNER_ID;
}

function resolveGitHubRef(env: NodeJS.ProcessEnv) {
  return readOptionalEnv("DISCORD_MESSAGE_COMMAND_GITHUB_REF", env) ?? DEFAULT_GITHUB_REF;
}

function resolveAuthorizationBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function base64UrlToBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = normalized.length % 4;
  if (remainder === 0) {
    return normalized;
  }

  return `${normalized}${"=".repeat(4 - remainder)}`;
}

function decodeBase64UrlText(value: string) {
  return Buffer.from(base64UrlToBase64(value), "base64").toString("utf8");
}

function decodeBase64UrlBytes(value: string) {
  return Uint8Array.from(Buffer.from(base64UrlToBase64(value), "base64"));
}

function parseJsonObject<T extends object>(value: string): T | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as T) : null;
  } catch {
    return null;
  }
}

function parseJwt(token: string) {
  const segments = token.split(".");
  if (segments.length !== 3 || segments.some((segment) => segment.length === 0)) {
    return null;
  }

  const [headerSegment, payloadSegment, signatureSegment] = segments;
  const header = parseJsonObject<JwtHeader>(decodeBase64UrlText(headerSegment));
  const payload = parseJsonObject<JwtPayload>(decodeBase64UrlText(payloadSegment));
  if (!header || !payload) {
    return null;
  }

  return {
    header,
    payload,
    signature: decodeBase64UrlBytes(signatureSegment),
    signingInput: new TextEncoder().encode(`${headerSegment}.${payloadSegment}`),
  };
}

function parseNumericClaim(value?: JsonValue) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseStringClaim(value?: JsonValue) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function matchesAudience(value: JsonValue | undefined, expectedAudience: string) {
  if (typeof value === "string") {
    return value === expectedAudience;
  }

  if (!Array.isArray(value)) {
    return false;
  }

  return value.some((entry) => entry === expectedAudience);
}

function parseCacheTtlMs(cacheControlHeader: string | null) {
  const match = cacheControlHeader?.match(/max-age=(\d+)/i);
  const maxAgeSeconds = match ? Number.parseInt(match[1] ?? "", 10) : NaN;
  if (!Number.isFinite(maxAgeSeconds) || maxAgeSeconds <= 0) {
    return CACHE_TTL_MS;
  }

  return Math.max(60_000, Math.min(maxAgeSeconds * 1000, CACHE_TTL_MS));
}

async function fetchJson(
  url: string,
  fetchImpl: typeof fetch,
): Promise<{ ok: true; data: Record<string, JsonValue>; ttlMs: number } | { ok: false; message: string }> {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "cache-control": "no-cache",
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      message: `OIDC discovery request failed with status ${response.status}.`,
    };
  }

  const parsed = parseJsonObject<Record<string, JsonValue>>(await response.text());
  if (!parsed) {
    return {
      ok: false,
      message: "OIDC discovery returned invalid JSON.",
    };
  }

  return {
    ok: true,
    data: parsed,
    ttlMs: parseCacheTtlMs(response.headers.get("cache-control")),
  };
}

function isOidcJsonWebKey(value: unknown): value is OidcJsonWebKey {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.kid === "string"
    && typeof candidate.kty === "string"
    && typeof candidate.use === "string";
}

async function getOpenIdConfiguration(fetchImpl: typeof fetch, nowMs: number) {
  if (openIdConfigurationCache && openIdConfigurationCache.expiresAt > nowMs) {
    return { ok: true as const, data: openIdConfigurationCache.value };
  }

  const response = await fetchJson(GITHUB_ACTIONS_OIDC_OPENID_CONFIGURATION_URL, fetchImpl);
  if (!response.ok) {
    return response;
  }

  openIdConfigurationCache = {
    value: response.data,
    expiresAt: nowMs + response.ttlMs,
  };
  return { ok: true as const, data: response.data };
}

async function getJsonWebKeySet(fetchImpl: typeof fetch, nowMs: number) {
  if (jsonWebKeySetCache && jsonWebKeySetCache.expiresAt > nowMs) {
    return { ok: true as const, keys: jsonWebKeySetCache.value };
  }

  const openIdConfiguration = await getOpenIdConfiguration(fetchImpl, nowMs);
  if (!openIdConfiguration.ok) {
    return openIdConfiguration;
  }

  const jwksUrl = parseStringClaim(openIdConfiguration.data.jwks_uri);
  if (!jwksUrl) {
    return {
      ok: false as const,
      message: "OIDC discovery response is missing a JWKS URL.",
    };
  }

  const response = await fetchJson(jwksUrl, fetchImpl);
  if (!response.ok) {
    return response;
  }

  const keysValue = (response.data as JsonWebKeySetPayload).keys;
  const keys = Array.isArray(keysValue) ? keysValue.filter(isOidcJsonWebKey) : [];
  if (keys.length === 0) {
    return {
      ok: false as const,
      message: "OIDC JWKS response did not contain any keys.",
    };
  }

  jsonWebKeySetCache = {
    value: keys,
    expiresAt: nowMs + response.ttlMs,
  };
  return { ok: true as const, keys };
}

async function verifyJwtSignature(args: {
  token: ReturnType<typeof parseJwt>;
  fetchImpl: typeof fetch;
  nowMs: number;
}) {
  if (!args.token) {
    return {
      ok: false as const,
      message: "Malformed JWT.",
    };
  }

  const algorithm = parseStringClaim(args.token.header.alg);
  const keyId = parseStringClaim(args.token.header.kid);
  if (algorithm !== "RS256" || !keyId) {
    return {
      ok: false as const,
      message: "Unsupported GitHub Actions token header.",
    };
  }

  const jwks = await getJsonWebKeySet(args.fetchImpl, args.nowMs);
  if (!jwks.ok) {
    return jwks;
  }

  const matchingKey = jwks.keys.find((key) => key.kid === keyId && key.kty === "RSA" && key.use === "sig");
  if (!matchingKey) {
    return {
      ok: false as const,
      message: "OIDC signing key was not found.",
    };
  }

  const subtle = crypto.subtle as SubtleCrypto & {
    importKey(
      format: "jwk",
      keyData: JsonWebKey,
      algorithm: RsaHashedImportParams,
      extractable: boolean,
      keyUsages: readonly KeyUsage[],
    ): Promise<CryptoKey>;
  };
  const importedKey = await subtle.importKey(
    "jwk",
    matchingKey as JsonWebKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    importedKey,
    args.token.signature,
    args.token.signingInput,
  );
  if (!verified) {
    return {
      ok: false as const,
      message: "OIDC token signature verification failed.",
    };
  }

  return { ok: true as const };
}

function validateGitHubActionsClaims(payload: JwtPayload, env: NodeJS.ProcessEnv, nowMs: number) {
  const issuer = parseStringClaim(payload.iss);
  const repositoryId = parseStringClaim(payload.repository_id);
  const repositoryOwnerId = parseStringClaim(payload.repository_owner_id);
  const ref = parseStringClaim(payload.ref);
  const eventName = parseStringClaim(payload.event_name);
  const exp = parseNumericClaim(payload.exp);
  const nbf = parseNumericClaim(payload.nbf);
  const iat = parseNumericClaim(payload.iat);

  if (issuer !== GITHUB_ACTIONS_OIDC_ISSUER) {
    return { ok: false as const, message: "Unexpected OIDC issuer." };
  }

  if (!matchesAudience(payload.aud, resolveGitHubActionsAudience(env))) {
    return { ok: false as const, message: "Unexpected OIDC audience." };
  }

  if (repositoryId !== resolveGitHubRepositoryId(env)) {
    return { ok: false as const, message: "Unexpected GitHub repository id." };
  }

  if (repositoryOwnerId !== resolveGitHubRepositoryOwnerId(env)) {
    return { ok: false as const, message: "Unexpected GitHub owner id." };
  }

  if (ref !== resolveGitHubRef(env)) {
    return { ok: false as const, message: "Unexpected GitHub ref." };
  }

  if (eventName !== "schedule" && eventName !== "workflow_dispatch") {
    return { ok: false as const, message: "Unexpected GitHub event." };
  }

  const nowSeconds = Math.floor(nowMs / 1000);
  if (!exp || exp < nowSeconds - CLOCK_SKEW_SECONDS) {
    return { ok: false as const, message: "OIDC token has expired." };
  }

  if (nbf && nbf > nowSeconds + CLOCK_SKEW_SECONDS) {
    return { ok: false as const, message: "OIDC token is not active yet." };
  }

  if (iat && iat > nowSeconds + CLOCK_SKEW_SECONDS) {
    return { ok: false as const, message: "OIDC token issued-at is invalid." };
  }

  return { ok: true as const };
}

export async function authorizeDiscordMessageCommandPollRequest(
  request: Request,
  options?: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
    now?: () => number;
  },
): Promise<
  | { ok: true; mode: "secret" | "github-actions" }
  | { ok: false; status: number; message: string }
> {
  const env = options?.env ?? process.env;
  const fetchImpl = options?.fetchImpl ?? globalThis.fetch;
  const nowMs = options?.now?.() ?? Date.now();
  const secret = readOptionalEnv("DISCORD_MESSAGE_COMMAND_POLL_SECRET", env) ?? readOptionalEnv("CRON_SECRET", env);
  const bearerToken = resolveAuthorizationBearerToken(request);

  if (secret && bearerToken === secret) {
    return { ok: true, mode: "secret" };
  }

  if (!bearerToken) {
    return {
      ok: false,
      status: 401,
      message: "Unauthorized.",
    };
  }

  if (typeof fetchImpl !== "function") {
    return {
      ok: false,
      status: 503,
      message: "GitHub Actions OIDC verification is unavailable.",
    };
  }

  const token = parseJwt(bearerToken);
  if (!token) {
    return {
      ok: false,
      status: 401,
      message: "Unauthorized.",
    };
  }

  try {
    const signatureResult = await verifyJwtSignature({
      token,
      fetchImpl,
      nowMs,
    });
    if (!signatureResult.ok) {
      return {
        ok: false,
        status: signatureResult.message.startsWith("OIDC discovery") ? 503 : 401,
        message: signatureResult.message.startsWith("OIDC discovery")
          ? "GitHub Actions OIDC verification is unavailable."
          : "Unauthorized.",
      };
    }

    const claimsResult = validateGitHubActionsClaims(token.payload, env, nowMs);
    if (!claimsResult.ok) {
      return {
        ok: false,
        status: 401,
        message: "Unauthorized.",
      };
    }
  } catch (error) {
    console.error("[discord-message-command] github-actions auth failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      status: 503,
      message: "GitHub Actions OIDC verification is unavailable.",
    };
  }

  return { ok: true, mode: "github-actions" };
}
