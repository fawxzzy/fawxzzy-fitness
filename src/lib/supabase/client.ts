import "client-only";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { clearPersistedWorkoutClientState, pruneStaleSessionDrafts } from "@/lib/offline/client-storage";
import { createFitnessSupabaseClient } from "@/lib/supabase/schema";

let browserSupabase: ReturnType<typeof createFitnessSupabaseClient> | null = null;
let hasAuthStateListener = false;
let lastSyncedSessionSignature: string | null = null;
let latestRequestedSessionSignature: string | null = null;
let sessionSyncQueue: Promise<void> = Promise.resolve();

type SessionSyncTokenPair = {
  accessToken: string;
  refreshToken: string;
};

type SessionPersistenceResult = {
  error?: unknown;
} | void;

function readValidatedSessionPair(value: unknown): SessionSyncTokenPair | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const session = (value as { session?: unknown }).session;
  if (!session || typeof session !== "object") {
    return null;
  }

  const { accessToken, refreshToken } = session as Partial<SessionSyncTokenPair>;
  return typeof accessToken === "string" && accessToken && typeof refreshToken === "string" && refreshToken
    ? { accessToken, refreshToken }
    : null;
}

function enqueueSessionSync(task: () => Promise<void>) {
  const next = sessionSyncQueue.catch(() => undefined).then(task);
  sessionSyncQueue = next.catch(() => undefined);
  return next;
}

function hasPersistenceError(result: SessionPersistenceResult) {
  return Boolean(result && typeof result === "object" && "error" in result && result.error);
}

export async function syncSessionCookies(
  session: { access_token: string; refresh_token: string } | null,
  persistValidatedSession?: (tokens: SessionSyncTokenPair) => Promise<SessionPersistenceResult>,
) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session?.access_token || !session.refresh_token) {
    if (!lastSyncedSessionSignature && !latestRequestedSessionSignature) {
      return;
    }

    if (!latestRequestedSessionSignature) {
      return sessionSyncQueue;
    }

    latestRequestedSessionSignature = null;
    return enqueueSessionSync(async () => {
      lastSyncedSessionSignature = null;

      try {
        await fetch("/auth/session-sync", {
          method: "DELETE",
          credentials: "same-origin",
          keepalive: true,
        });
      } catch {
        // Ignore cookie sync cleanup failures; explicit sign-out still redirects.
      }
    });
  }

  const nextSignature = `${session.access_token}:${session.refresh_token}`;
  if (
    nextSignature === lastSyncedSessionSignature
    || nextSignature === latestRequestedSessionSignature
    || !persistValidatedSession
  ) {
    return;
  }

  latestRequestedSessionSignature = nextSignature;
  return enqueueSessionSync(async () => {
    if (latestRequestedSessionSignature !== nextSignature || nextSignature === lastSyncedSessionSignature) {
      return;
    }

    lastSyncedSessionSignature = nextSignature;

    try {
      const response = await fetch("/auth/session-sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        }),
      });

      if (!response.ok) {
        if (latestRequestedSessionSignature === nextSignature) {
          latestRequestedSessionSignature = null;
          lastSyncedSessionSignature = null;
        }
        return;
      }

      let validated: SessionSyncTokenPair | null = null;
      try {
        validated = readValidatedSessionPair(await response.json());
      } catch {
        if (latestRequestedSessionSignature === nextSignature) {
          latestRequestedSessionSignature = null;
          lastSyncedSessionSignature = null;
        }
        return;
      }

      if (!validated) {
        if (latestRequestedSessionSignature === nextSignature) {
          latestRequestedSessionSignature = null;
          lastSyncedSessionSignature = null;
        }
        return;
      }

      if (latestRequestedSessionSignature !== nextSignature) {
        return;
      }

      const validatedSignature = `${validated.accessToken}:${validated.refreshToken}`;
      if (validatedSignature === nextSignature) {
        return;
      }

      // Set the signature first because setSession emits an auth event. That event
      // observes the same rotated pair and must not submit it for another rotation.
      latestRequestedSessionSignature = validatedSignature;
      lastSyncedSessionSignature = validatedSignature;
      const persistence = await persistValidatedSession(validated);
      if (hasPersistenceError(persistence)) {
        throw new Error("Validated browser session persistence failed.");
      }
    } catch {
      // Allow a later auth event to retry if local persistence itself fails.
      if (latestRequestedSessionSignature === nextSignature) {
        latestRequestedSessionSignature = null;
      }
      lastSyncedSessionSignature = null;
    }
  });
}

async function persistValidatedBrowserSession(tokens: SessionSyncTokenPair) {
  if (!browserSupabase) {
    throw new Error("Browser Supabase client is unavailable.");
  }

  const { error } = await browserSupabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  if (error) {
    throw error;
  }
}

export async function clearBrowserSupabaseSession(localSignOut?: () => Promise<unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (localSignOut) {
      await localSignOut();
    } else {
      await createBrowserSupabase().auth.signOut({ scope: "local" });
    }
  } catch {
    // Ignore local session cleanup failures and still clear server-side cookie mirrors below.
  }

  await syncSessionCookies(null);
}

export function createBrowserSupabase() {
  if (!browserSupabase) {
    browserSupabase = createFitnessSupabaseClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    });

    void browserSupabase.auth.getSession().then(({ data }) => {
      void syncSessionCookies(data.session ?? null, persistValidatedBrowserSession);
      if (data.session) {
        pruneStaleSessionDrafts();
      }
    }).catch(() => {
      // Ignore bootstrap sync failures and let auth listeners retry.
    });
  }

  if (!hasAuthStateListener) {
    hasAuthStateListener = true;
    browserSupabase.auth.onAuthStateChange((event, session) => {
      if (process.env.NODE_ENV !== "production" && event === "TOKEN_REFRESHED") {
        console.debug("[supabase-auth] token refreshed", { hasSession: Boolean(session) });
      }

      if (event === "SIGNED_OUT") {
        clearPersistedWorkoutClientState();
        void syncSessionCookies(null);
        if (process.env.NODE_ENV !== "production") {
          console.warn("[supabase-auth] signed out", { hasSession: Boolean(session) });
        }
      }

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        void syncSessionCookies(session, persistValidatedBrowserSession);
        pruneStaleSessionDrafts();
      }
    });
  }

  return browserSupabase;
}
