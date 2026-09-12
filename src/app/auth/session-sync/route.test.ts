import test from "node:test";
import assert from "node:assert/strict";
import {
  createSessionSyncHandlers,
  type SessionTokenPair,
  validateSubmittedSession,
} from "@/lib/auth-handoff-handlers";
import {
  digestHandoffBinding,
  FITNESS_HANDOFF_AUDIENCE,
  FITNESS_HANDOFF_BINDING_COOKIE,
  FITNESS_HANDOFF_ISSUER,
  FITNESS_PORTAL_ORIGIN,
} from "@/lib/auth-handoff";

const ORIGIN = "https://fitness.fawxzzy.com";
const URL = `${ORIGIN}/auth/session-sync`;
const cacheControl = "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";

function request(body: string, origin = ORIGIN) {
  return new Request(URL, {
    body,
    headers: {
      "content-type": "application/json",
      origin,
    },
    method: "POST",
  });
}

function handlers(
  validateSession: (tokens: SessionTokenPair) => Promise<SessionTokenPair | null> = async ({
    accessToken,
    refreshToken,
  }) => ({ accessToken, refreshToken }),
) {
  return createSessionSyncHandlers({
    getHandoffRuntime: () => null,
    validateSession,
  });
}

test("session validation requires the master access identity and refreshed identity to agree", async () => {
  const validated = await validateSubmittedSession({
    accessToken: "access-a",
    refreshToken: "refresh-a",
  }, {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-a" } }, error: null }),
      refreshSession: async () => ({
        data: {
          session: {
            access_token: "refreshed-access-a",
            refresh_token: "refreshed-refresh-a",
            user: { id: "user-a" },
          },
        },
        error: null,
      }),
    },
  });

  assert.deepEqual(validated, {
    accessToken: "refreshed-access-a",
    refreshToken: "refreshed-refresh-a",
  });
});

test("session validation rejects an invalid refresh token and cross-user token pairs", async () => {
  const accessUser = async () => ({ data: { user: { id: "user-a" } }, error: null });
  const invalidRefresh = await validateSubmittedSession({
    accessToken: "access-a",
    refreshToken: "invalid-refresh",
  }, {
    auth: {
      getUser: accessUser,
      refreshSession: async () => ({ data: { session: null }, error: new Error("invalid") }),
    },
  });
  assert.equal(invalidRefresh, null);

  const crossUser = await validateSubmittedSession({
    accessToken: "access-a",
    refreshToken: "refresh-b",
  }, {
    auth: {
      getUser: accessUser,
      refreshSession: async () => ({
        data: {
          session: {
            access_token: "refreshed-access-b",
            refresh_token: "refreshed-refresh-b",
            user: { id: "user-b" },
          },
        },
        error: null,
      }),
    },
  });
  assert.equal(crossUser, null);
});

test("session sync rejects invalid JSON payloads", async () => {
  const response = await handlers().POST(request("{not-json"));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "Invalid session payload.",
  });
  assert.equal(response.headers.get("cache-control"), cacheControl);
});

test("session sync rejects missing or empty tokens after trimming", async () => {
  const response = await handlers().POST(request(JSON.stringify({
    accessToken: "   ",
    refreshToken: "refresh-token",
  })));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "Missing session tokens.",
  });
  assert.equal(response.headers.get("set-cookie"), null);
});

test("session sync rejects missing or hostile origins before it reads credentials", async () => {
  let validationCalls = 0;
  const sync = handlers(async () => {
    validationCalls += 1;
    return { accessToken: "unused", refreshToken: "unused" };
  });

  for (const origin of ["https://hostile.example", "not-a-url", ""]) {
    const response = await sync.POST(request(JSON.stringify({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    }), origin));

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { ok: false, error: "Invalid session origin." });
    assert.equal(response.headers.get("set-cookie"), null);
  }

  assert.equal(validationCalls, 0);
});

test("session sync rejects non-JSON and oversized payloads before validation", async () => {
  let validationCalls = 0;
  const sync = handlers(async () => {
    validationCalls += 1;
    return { accessToken: "unused", refreshToken: "unused" };
  });
  const nonJson = await sync.POST(new Request(URL, {
    body: "not json",
    headers: { "content-type": "text/plain", origin: ORIGIN },
    method: "POST",
  }));
  assert.equal(nonJson.status, 415);
  assert.deepEqual(await nonJson.json(), { ok: false, error: "Unsupported session payload." });

  const declaredOversize = await sync.POST(new Request(URL, {
    body: "{}",
    headers: {
      "content-length": "8193",
      "content-type": "application/json",
      origin: ORIGIN,
    },
    method: "POST",
  }));
  assert.equal(declaredOversize.status, 413);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("x".repeat(8193)));
      controller.close();
    },
  });
  const streamedOversize = await sync.POST(new Request(URL, {
    body: stream,
    // Node requires this marker for a streaming Request; browsers ignore it.
    duplex: "half",
    headers: { "content-type": "application/json", origin: ORIGIN },
    method: "POST",
  } as RequestInit));
  assert.equal(streamedOversize.status, 413);
  assert.equal(validationCalls, 0);
});

test("session sync writes only the validated session cookies for a same-origin handoff", async () => {
  const sync = handlers(async ({ accessToken, refreshToken }) => {
    assert.equal(accessToken, "access-token");
    assert.equal(refreshToken, "refresh-token");
    return { accessToken: "validated-access", refreshToken: "validated-refresh" };
  });
  const response = await sync.POST(request(JSON.stringify({
    accessToken: "  access-token  ",
    refreshToken: " refresh-token ",
  })));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    session: {
      accessToken: "validated-access",
      refreshToken: "validated-refresh",
    },
  });
  assert.equal(response.headers.get("cache-control"), cacheControl);
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /sb-access-token=validated-access/);
  assert.match(setCookie, /sb-refresh-token=validated-refresh/);
});

test("session sync rejects invalid or expired credentials without setting cookies", async () => {
  const response = await handlers(async () => null).POST(request(JSON.stringify({
    accessToken: "invalid-access",
    refreshToken: "invalid-refresh",
  })));

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { ok: false, error: "Invalid session credentials." });
  assert.equal(response.headers.get("set-cookie"), null);
});

test("session sync delete clears auth cookies only for the same browser origin", async () => {
  const sync = handlers();
  const invalid = await sync.DELETE(new Request(URL, { headers: { origin: "https://account.fawxzzy.com" }, method: "DELETE" }));
  assert.equal(invalid.status, 403);
  assert.equal(invalid.headers.get("set-cookie"), null);

  const response = await sync.DELETE(new Request(URL, { headers: { origin: ORIGIN }, method: "DELETE" }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get("cache-control"), cacheControl);
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /sb-access-token=;/);
  assert.match(setCookie, /sb-refresh-token=;/);
});

test("portal session sync stays disabled when no durable handoff runtime is installed", async () => {
  const response = await handlers().POST(new Request(URL, {
    body: JSON.stringify({
      accessToken: "access-token",
      handoffId: "handoff-id",
      refreshToken: "refresh-token",
    }),
    headers: {
      "content-type": "application/json",
      origin: FITNESS_PORTAL_ORIGIN,
    },
    method: "POST",
  }));

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: "Session handoff unavailable." });
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("portal session sync consumes the binding once before writing validated session cookies", async () => {
  const binding = "A".repeat(43);
  const handoffId = "B".repeat(43);
  let consumed = 0;
  const sync = createSessionSyncHandlers({
    getHandoffRuntime: () => ({
      now: () => 1_700_000_000,
      store: {
        begin: async () => true,
        consume: async (args) => {
          consumed += 1;
          assert.equal(args.audience, FITNESS_HANDOFF_AUDIENCE);
          assert.equal(args.bindingDigest, digestHandoffBinding(binding));
          assert.equal(args.handoffId, handoffId);
          assert.equal(args.issuer, FITNESS_HANDOFF_ISSUER);
          assert.equal(args.now, 1_700_000_000);
          return consumed === 1 ? { returnTo: "/today" } : null;
        },
      },
    }),
    validateSession: async () => ({
      accessToken: "validated-access",
      refreshToken: "validated-refresh",
    }),
  });
  const buildPortalRequest = () => new Request(URL, {
    body: JSON.stringify({
      accessToken: "access-token",
      handoffId,
      refreshToken: "refresh-token",
    }),
    headers: {
      "content-type": "application/json",
      cookie: `${FITNESS_HANDOFF_BINDING_COOKIE}=${binding}`,
      origin: FITNESS_PORTAL_ORIGIN,
    },
    method: "POST",
  });

  const response = await sync.POST(buildPortalRequest());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    returnTo: "/today",
    session: {
      accessToken: "validated-access",
      refreshToken: "validated-refresh",
    },
  });
  assert.equal(response.headers.get("access-control-allow-origin"), FITNESS_PORTAL_ORIGIN);
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /sb-access-token=validated-access/);
  assert.match(setCookie, /sb-refresh-token=validated-refresh/);
  assert.match(setCookie, /__Host-fitness-handoff=;/);

  const replay = await sync.POST(buildPortalRequest());
  assert.equal(replay.status, 401);
  assert.deepEqual(await replay.json(), { ok: false, error: "Invalid session handoff." });
  assert.equal(replay.headers.get("set-cookie"), null);
  assert.equal(consumed, 2);
});

test("portal session sync consumes the challenge before failed credential validation and never writes a session", async () => {
  let consumed = 0;
  const sync = createSessionSyncHandlers({
    getHandoffRuntime: () => ({
      now: () => 0,
      store: {
        begin: async () => true,
        consume: async () => {
          consumed += 1;
          return { returnTo: "/entry" };
        },
      },
    }),
    validateSession: async () => null,
  });
  const response = await sync.POST(new Request(URL, {
    body: JSON.stringify({ accessToken: "invalid", handoffId: "C".repeat(43), refreshToken: "invalid" }),
    headers: {
      "content-type": "application/json",
      cookie: `${FITNESS_HANDOFF_BINDING_COOKIE}=${"D".repeat(43)}`,
      origin: FITNESS_PORTAL_ORIGIN,
    },
    method: "POST",
  }));

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { ok: false, error: "Invalid session credentials." });
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.doesNotMatch(setCookie, /sb-access-token=/);
  assert.doesNotMatch(setCookie, /sb-refresh-token=/);
  assert.match(setCookie, /__Host-fitness-handoff=;/);
  assert.equal(consumed, 1);
});

test("portal session sync rejects malformed challenge values before it touches the store", async () => {
  let consumed = 0;
  const sync = createSessionSyncHandlers({
    getHandoffRuntime: () => ({
      now: () => 0,
      store: {
        begin: async () => true,
        consume: async () => {
          consumed += 1;
          return { returnTo: "/today" };
        },
      },
    }),
    validateSession: async () => ({ accessToken: "unused", refreshToken: "unused" }),
  });
  const response = await sync.POST(new Request(URL, {
    body: JSON.stringify({ accessToken: "access", handoffId: "not-a-handoff", refreshToken: "refresh" }),
    headers: {
      "content-type": "application/json",
      cookie: `${FITNESS_HANDOFF_BINDING_COOKIE}=binding`,
      origin: FITNESS_PORTAL_ORIGIN,
    },
    method: "POST",
  }));

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(consumed, 0);
});

test("portal session-sync preflight is unavailable without a durable runtime", async () => {
  const response = await handlers().OPTIONS(new Request(URL, {
    headers: { origin: FITNESS_PORTAL_ORIGIN },
    method: "OPTIONS",
  }));

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});
