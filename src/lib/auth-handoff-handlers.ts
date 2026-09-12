import { NextResponse } from "next/server";
import { clearSessionCookies, setSessionCookies } from "@/lib/auth-session";
import {
  clearFitnessHandoffBindingCookie,
  createHandoffSecret,
  digestHandoffBinding,
  FITNESS_HANDOFF_AUDIENCE,
  FITNESS_HANDOFF_BINDING_COOKIE,
  FITNESS_HANDOFF_ISSUER,
  FITNESS_HANDOFF_TTL_SECONDS,
  FITNESS_PORTAL_ORIGIN,
  getFitnessHandoffReadiness,
  getFitnessHandoffRuntime,
  isHandoffSecret,
  normalizeFitnessHandoffReturnTo,
  setFitnessHandoffBindingCookie,
  type FitnessHandoffRuntime,
  type FitnessHandoffReadiness,
} from "@/lib/auth-handoff";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { createFitnessSupabaseClient } from "@/lib/supabase/schema";

const CACHE_CONTROL = "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
const MAX_HANDOFF_BODY_BYTES = 8 * 1024;
const MAX_SESSION_TOKEN_LENGTH = 4 * 1024;

type BeginHandoffBody = {
  returnTo?: unknown;
};

type SessionSyncBody = {
  accessToken?: unknown;
  handoffId?: unknown;
  refreshToken?: unknown;
};

type SessionUser = {
  id?: string | null;
};

type SessionValidationClient = {
  auth: {
    getUser(accessToken: string): Promise<{
      data: { user: SessionUser | null };
      error: unknown;
    }>;
    refreshSession(session: { refresh_token: string }): Promise<{
      data: {
        session: {
          access_token?: string | null;
          refresh_token?: string | null;
          user?: SessionUser | null;
        } | null;
      };
      error: unknown;
    }>;
  };
};

export type SessionTokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type SessionHandoffDependencies = {
  getReadiness?: (runtime: FitnessHandoffRuntime | null) => FitnessHandoffReadiness | null;
  getRuntime: () => FitnessHandoffRuntime | null;
};

export type SessionSyncDependencies = {
  getHandoffRuntime: () => FitnessHandoffRuntime | null;
  getReadiness?: (runtime: FitnessHandoffRuntime | null) => FitnessHandoffReadiness | null;
  validateSession: (tokens: SessionTokenPair) => Promise<SessionTokenPair | null>;
};

type JsonBodyResult =
  | { ok: true; value: unknown }
  | { error: "Invalid session payload." | "Session payload is too large." | "Unsupported session payload."; ok: false; status: 400 | 413 | 415 };

function buildResponse(
  body: { ok: true; handoffId?: string; readiness?: FitnessHandoffReadiness; returnTo?: string; session?: SessionTokenPair } | { ok: false; error: string },
  status = 200,
  origin?: string,
) {
  const headers = new Headers({
    "Cache-Control": CACHE_CONTROL,
  });

  if (origin === FITNESS_PORTAL_ORIGIN) {
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }

  return NextResponse.json(body, { headers, status });
}

function isExactJsonContentType(value: string | null) {
  return value?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function hasDeclaredOversizeBody(request: Request) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength === null) {
    return false;
  }

  if (!/^(?:0|[1-9]\d*)$/.test(declaredLength)) {
    return false;
  }

  return Number(declaredLength) > MAX_HANDOFF_BODY_BYTES;
}

async function readBoundedJsonBody(request: Request): Promise<JsonBodyResult> {
  if (!isExactJsonContentType(request.headers.get("content-type"))) {
    return { ok: false, status: 415, error: "Unsupported session payload." };
  }

  if (hasDeclaredOversizeBody(request)) {
    return { ok: false, status: 413, error: "Session payload is too large." };
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return { ok: false, status: 400, error: "Invalid session payload." };
  }

  const decoder = new TextDecoder();
  let byteLength = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      byteLength += value.byteLength;
      if (byteLength > MAX_HANDOFF_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, status: 413, error: "Session payload is too large." };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    return { ok: false, status: 400, error: "Invalid session payload." };
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: "Invalid session payload." };
  }
}

function normalizeToken(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isBoundedToken(value: string) {
  return value.length > 0 && value.length <= MAX_SESSION_TOKEN_LENGTH;
}

function isSameOriginBrowserRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function isPortalBrowserRequest(request: Request) {
  return request.headers.get("origin") === FITNESS_PORTAL_ORIGIN;
}

function getRequestCookie(request: Request, name: string) {
  const encodedPrefix = `${name}=`;
  const entry = request.headers.get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(encodedPrefix));

  return entry?.slice(encodedPrefix.length) ?? "";
}

function createSessionValidationClient(): SessionValidationClient {
  return createFitnessSupabaseClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function validateSubmittedSession(
  tokens: SessionTokenPair,
  client?: SessionValidationClient,
): Promise<SessionTokenPair | null> {
  try {
    const validationClient = client ?? createSessionValidationClient();
    const access = await validationClient.auth.getUser(tokens.accessToken);
    const accessSubject = access.data.user?.id;
    if (access.error || !accessSubject) {
      return null;
    }

    const refreshed = await validationClient.auth.refreshSession({ refresh_token: tokens.refreshToken });
    const refreshedSession = refreshed.data.session;
    const refreshedAccessToken = normalizeToken(refreshedSession?.access_token);
    const refreshedRefreshToken = normalizeToken(refreshedSession?.refresh_token);
    const refreshSubject = refreshedSession?.user?.id;
    if (
      refreshed.error
      || !refreshSubject
      || refreshSubject !== accessSubject
      || !isBoundedToken(refreshedAccessToken)
      || !isBoundedToken(refreshedRefreshToken)
    ) {
      return null;
    }

    return { accessToken: refreshedAccessToken, refreshToken: refreshedRefreshToken };
  } catch {
    return null;
  }
}

export function createSessionHandoffHandlers(dependencies: SessionHandoffDependencies = {
  getReadiness: getFitnessHandoffReadiness,
  getRuntime: getFitnessHandoffRuntime,
}) {
  async function OPTIONS(request: Request) {
    const runtime = dependencies.getRuntime();
    const readiness = (dependencies.getReadiness ?? getFitnessHandoffReadiness)(runtime);
    if (!runtime || !readiness || !isPortalBrowserRequest(request)) {
      return buildResponse({ ok: false, error: "Session handoff unavailable." }, 503);
    }

    return new NextResponse(null, {
      headers: {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Origin": FITNESS_PORTAL_ORIGIN,
        "Cache-Control": CACHE_CONTROL,
        Vary: "Origin",
      },
      status: 204,
    });
  }

  async function POST(request: Request) {
    const runtime = dependencies.getRuntime();
    const readiness = (dependencies.getReadiness ?? getFitnessHandoffReadiness)(runtime);
    if (!runtime || !readiness || !isPortalBrowserRequest(request)) {
      return buildResponse({ ok: false, error: "Session handoff unavailable." }, 503);
    }

    const parsed = await readBoundedJsonBody(request);
    if (!parsed.ok) {
      return buildResponse({ ok: false, error: parsed.error }, parsed.status, FITNESS_PORTAL_ORIGIN);
    }

    const body = parsed.value as BeginHandoffBody;
    const returnTo = normalizeFitnessHandoffReturnTo(body?.returnTo);
    const handoffId = createHandoffSecret();
    const binding = createHandoffSecret();
    let stored = false;
    try {
      stored = await runtime.store.begin({
        audience: FITNESS_HANDOFF_AUDIENCE,
        bindingDigest: digestHandoffBinding(binding),
        expiresAt: runtime.now() + FITNESS_HANDOFF_TTL_SECONDS,
        handoffId,
        issuer: FITNESS_HANDOFF_ISSUER,
        returnTo,
      });
    } catch {
      stored = false;
    }

    if (!stored) {
      return buildResponse({ ok: false, error: "Session handoff unavailable." }, 503, FITNESS_PORTAL_ORIGIN);
    }

    const response = buildResponse({ ok: true, handoffId, readiness, returnTo }, 200, FITNESS_PORTAL_ORIGIN);
    setFitnessHandoffBindingCookie(response.cookies, binding);
    return response;
  }

  return { OPTIONS, POST };
}

export function createSessionSyncHandlers(dependencies: SessionSyncDependencies = {
  getHandoffRuntime: getFitnessHandoffRuntime,
  validateSession: validateSubmittedSession,
}) {
  async function OPTIONS(request: Request) {
    const runtime = dependencies.getHandoffRuntime();
    const readiness = (dependencies.getReadiness ?? getFitnessHandoffReadiness)(runtime);
    if (!runtime || !readiness || !isPortalBrowserRequest(request)) {
      return buildResponse({ ok: false, error: "Session handoff unavailable." }, 503);
    }

    return new NextResponse(null, {
      headers: {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Origin": FITNESS_PORTAL_ORIGIN,
        "Cache-Control": CACHE_CONTROL,
        Vary: "Origin",
      },
      status: 204,
    });
  }

  async function POST(request: Request) {
    const portalRequest = isPortalBrowserRequest(request);
    if (!portalRequest && !isSameOriginBrowserRequest(request)) {
      return buildResponse({ ok: false, error: "Invalid session origin." }, 403);
    }

    const runtime = portalRequest ? dependencies.getHandoffRuntime() : null;
    const readiness = portalRequest
      ? (dependencies.getReadiness ?? getFitnessHandoffReadiness)(runtime)
      : null;
    if (portalRequest && (!runtime || !readiness)) {
      return buildResponse({ ok: false, error: "Session handoff unavailable." }, 503);
    }

    const parsed = await readBoundedJsonBody(request);
    if (!parsed.ok) {
      return buildResponse({ ok: false, error: parsed.error }, parsed.status, portalRequest ? FITNESS_PORTAL_ORIGIN : undefined);
    }

    const body = parsed.value as SessionSyncBody;
    const accessToken = normalizeToken(body?.accessToken);
    const refreshToken = normalizeToken(body?.refreshToken);
    if (!accessToken || !refreshToken) {
      return buildResponse({ ok: false, error: "Missing session tokens." }, 400, portalRequest ? FITNESS_PORTAL_ORIGIN : undefined);
    }
    if (!isBoundedToken(accessToken) || !isBoundedToken(refreshToken)) {
      return buildResponse({ ok: false, error: "Invalid session payload." }, 400, portalRequest ? FITNESS_PORTAL_ORIGIN : undefined);
    }

    let returnTo: string | null = null;
    if (portalRequest && runtime) {
      const handoffId = normalizeToken(body?.handoffId);
      const binding = getRequestCookie(request, FITNESS_HANDOFF_BINDING_COOKIE);
      if (!isHandoffSecret(handoffId) || !isHandoffSecret(binding)) {
        return buildResponse({ ok: false, error: "Invalid session handoff." }, 401, FITNESS_PORTAL_ORIGIN);
      }

      let consumed: { returnTo: string } | null = null;
      try {
        consumed = await runtime.store.consume({
          audience: FITNESS_HANDOFF_AUDIENCE,
          bindingDigest: digestHandoffBinding(binding),
          handoffId,
          issuer: FITNESS_HANDOFF_ISSUER,
          now: runtime.now(),
        });
      } catch {
        consumed = null;
      }
      if (!consumed) {
        return buildResponse({ ok: false, error: "Invalid session handoff." }, 401, FITNESS_PORTAL_ORIGIN);
      }

      returnTo = normalizeFitnessHandoffReturnTo(consumed.returnTo);
    }

    const session = await dependencies.validateSession({ accessToken, refreshToken });
    if (!session) {
      const response = buildResponse({ ok: false, error: "Invalid session credentials." }, 401, portalRequest ? FITNESS_PORTAL_ORIGIN : undefined);
      if (portalRequest) {
        clearFitnessHandoffBindingCookie(response.cookies);
      }
      return response;
    }

    // `refreshSession` intentionally rotates the submitted refresh token. Return
    // that validated pair only to the initiating, origin-checked caller so its
    // own persisted Supabase session can advance with the HttpOnly cookie mirror.
    // Leaving the caller on the submitted parent token would eventually trigger
    // refresh-token reuse detection after the server refreshes the cookie again.
    const response = buildResponse(
      returnTo ? { ok: true, returnTo, session } : { ok: true, session },
      200,
      portalRequest ? FITNESS_PORTAL_ORIGIN : undefined,
    );
    setSessionCookies(response.cookies, session);
    if (portalRequest) {
      clearFitnessHandoffBindingCookie(response.cookies);
    }
    return response;
  }

  async function DELETE(request: Request) {
    if (!isSameOriginBrowserRequest(request)) {
      return buildResponse({ ok: false, error: "Invalid session origin." }, 403);
    }

    const response = buildResponse({ ok: true });
    clearSessionCookies(response.cookies);
    return response;
  }

  return { DELETE, OPTIONS, POST };
}
