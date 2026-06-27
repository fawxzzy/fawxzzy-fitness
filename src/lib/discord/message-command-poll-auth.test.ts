import assert from "node:assert/strict";
import test from "node:test";

import { authorizeDiscordMessageCommandPollRequest } from "@/lib/discord/message-command-poll-auth";

function toBase64Url(input: Uint8Array | string) {
  const buffer = typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createSignedToken(args: {
  audience: string;
  eventName?: string;
  exp?: number;
  iat?: number;
  keyId?: string;
  nbf?: number;
  ref?: string;
  repositoryId?: string;
  repositoryOwnerId?: string;
}) {
  type TestJsonWebKey = JsonWebKey & {
    alg?: string;
    kid?: string;
    use?: string;
  };

  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );

  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey) as TestJsonWebKey;
  publicJwk.use = "sig";
  publicJwk.alg = "RS256";
  publicJwk.kid = args.keyId ?? "test-key";

  const header = toBase64Url(JSON.stringify({
    alg: "RS256",
    kid: publicJwk.kid,
    typ: "JWT",
  }));
  const payload = toBase64Url(JSON.stringify({
    aud: args.audience,
    event_name: args.eventName ?? "schedule",
    exp: args.exp,
    iat: args.iat,
    iss: "https://token.actions.githubusercontent.com",
    nbf: args.nbf ?? args.iat,
    ref: args.ref ?? "refs/heads/main",
    repository_id: args.repositoryId ?? "1212867511",
    repository_owner_id: args.repositoryOwnerId ?? "276708364",
  }));
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyPair.privateKey,
    new TextEncoder().encode(signingInput),
  );

  return {
    token: `${signingInput}.${toBase64Url(new Uint8Array(signature))}`,
    publicJwk,
  };
}

function createOidcFetch(publicJwk: JsonWebKey): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/.well-known/openid-configuration")) {
      return new Response(JSON.stringify({
        issuer: "https://token.actions.githubusercontent.com",
        jwks_uri: "https://token.actions.githubusercontent.com/.well-known/jwks",
      }), {
        status: 200,
        headers: {
          "cache-control": "public, max-age=600",
          "content-type": "application/json",
        },
      });
    }

    if (url.endsWith("/.well-known/jwks")) {
      return new Response(JSON.stringify({
        keys: [publicJwk],
      }), {
        status: 200,
        headers: {
          "cache-control": "public, max-age=600",
          "content-type": "application/json",
        },
      });
    }

    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

test("poll auth accepts the configured bearer secret before GitHub OIDC verification", async () => {
  const request = new Request("https://example.com", {
    headers: {
      authorization: "Bearer local-secret",
    },
  });

  const result = await authorizeDiscordMessageCommandPollRequest(request, {
    env: {
      DISCORD_MESSAGE_COMMAND_POLL_SECRET: "local-secret",
      NODE_ENV: "test",
    } as NodeJS.ProcessEnv,
  });

  assert.deepEqual(result, { ok: true, mode: "secret" });
});

test("poll auth accepts a valid GitHub Actions OIDC token for the scheduled workflow", async () => {
  const nowMs = Date.UTC(2026, 5, 27, 17, 0, 0);
  const issuedAt = Math.floor(nowMs / 1000) - 30;
  const expiresAt = issuedAt + 300;
  const { token, publicJwk } = await createSignedToken({
    audience: "fawxzzy-fitness-discord-message-poll",
    exp: expiresAt,
    iat: issuedAt,
  });

  const request = new Request("https://example.com", {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  const result = await authorizeDiscordMessageCommandPollRequest(request, {
    fetchImpl: createOidcFetch(publicJwk),
    now: () => nowMs,
  });

  assert.deepEqual(result, { ok: true, mode: "github-actions" });
});

test("poll auth rejects GitHub Actions OIDC tokens for the wrong branch", async () => {
  const nowMs = Date.UTC(2026, 5, 27, 17, 0, 0);
  const issuedAt = Math.floor(nowMs / 1000) - 30;
  const expiresAt = issuedAt + 300;
  const { token, publicJwk } = await createSignedToken({
    audience: "fawxzzy-fitness-discord-message-poll",
    exp: expiresAt,
    iat: issuedAt,
    ref: "refs/heads/dev",
  });

  const request = new Request("https://example.com", {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  const result = await authorizeDiscordMessageCommandPollRequest(request, {
    fetchImpl: createOidcFetch(publicJwk),
    now: () => nowMs,
  });

  assert.deepEqual(result, {
    ok: false,
    status: 401,
    message: "Unauthorized.",
  });
});
