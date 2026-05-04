import { createClient } from "@supabase/supabase-js";
import {
  classifyAuthSessionFailure,
  decodeJwtExp,
  type AuthSessionFailure,
  type SessionCookiePayload,
} from "@/lib/auth-session";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

export type SessionRecoveryAuthState =
  | "authenticated"
  | "has-access-cookie"
  | "missing-access-cookie-recovered"
  | "no-cookies"
  | "refreshed-from-refresh-cookie";

type RefreshSessionResponse = {
  data: {
    session: {
      access_token?: string | null;
      refresh_token?: string | null;
    } | null;
  };
  error: unknown;
};

type RefreshSessionClient = {
  auth: {
    refreshSession(currentSession?: { refresh_token: string }): Promise<RefreshSessionResponse>;
  };
};

type SessionRecoveryArgs = {
  accessToken?: string | null;
  forceRefresh?: boolean;
  refreshToken?: string | null;
  refreshWindowSeconds?: number;
  client?: RefreshSessionClient;
};

export type SessionRecoveryResult =
  | {
      status: "anonymous";
      authState: "has-access-cookie" | "no-cookies";
    }
  | {
      status: "existing";
      authState: "authenticated";
      session: SessionCookiePayload;
    }
  | {
      status: "refreshed";
      authState: "missing-access-cookie-recovered" | "refreshed-from-refresh-cookie";
      session: SessionCookiePayload;
    }
  | {
      status: "failed";
      error: unknown;
      failure: NonNullable<AuthSessionFailure>;
    }
  | {
      status: "missing-session";
    }
  | {
      status: "unexpected-error";
      error: unknown;
    };

function normalizeCookieValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function isAccessTokenFresh(accessToken: string, refreshWindowSeconds = 60) {
  const exp = decodeJwtExp(accessToken);
  if (!exp) {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return exp > nowInSeconds + refreshWindowSeconds;
}

export function createSupabaseSessionRecoveryClient(): RefreshSessionClient {
  return createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function recoverSupabaseSessionFromCookies(args: SessionRecoveryArgs): Promise<SessionRecoveryResult> {
  const accessToken = normalizeCookieValue(args.accessToken);
  const refreshToken = normalizeCookieValue(args.refreshToken);
  const refreshWindowSeconds = args.refreshWindowSeconds ?? 60;

  if (!refreshToken) {
    return {
      status: "anonymous",
      authState: accessToken ? "has-access-cookie" : "no-cookies",
    };
  }

  if (!args.forceRefresh && accessToken && isAccessTokenFresh(accessToken, refreshWindowSeconds)) {
    return {
      status: "existing",
      authState: "authenticated",
      session: {
        accessToken,
        refreshToken,
      },
    };
  }

  const client = args.client ?? createSupabaseSessionRecoveryClient();
  const { data, error } = await client.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) {
    const failure = classifyAuthSessionFailure(error);
    if (failure) {
      return {
        status: "failed",
        error,
        failure,
      };
    }

    return {
      status: "unexpected-error",
      error,
    };
  }

  if (!data.session?.access_token || !data.session.refresh_token) {
    return {
      status: "missing-session",
    };
  }

  return {
    status: "refreshed",
    authState: accessToken ? "refreshed-from-refresh-cookie" : "missing-access-cookie-recovered",
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    },
  };
}
