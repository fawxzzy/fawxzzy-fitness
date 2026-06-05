import "client-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { clearPersistedWorkoutClientState, pruneStaleSessionDrafts } from "@/lib/offline/client-storage";

let browserSupabase: ReturnType<typeof createClient> | null = null;
let hasAuthStateListener = false;
let lastSyncedSessionSignature: string | null = null;

async function syncSessionCookies(session: { access_token: string; refresh_token: string } | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session?.access_token || !session.refresh_token) {
    if (!lastSyncedSessionSignature) {
      return;
    }

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

    return;
  }

  const nextSignature = `${session.access_token}:${session.refresh_token}`;
  if (nextSignature === lastSyncedSessionSignature) {
    return;
  }

  lastSyncedSessionSignature = nextSignature;

  try {
    await fetch("/auth/session-sync", {
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
  } catch {
    // Ignore background sync failures and let the next auth event retry.
  }
}

export async function clearBrowserSupabaseSession() {
  if (typeof window === "undefined") {
    return;
  }

  const supabase = createBrowserSupabase();

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Ignore local session cleanup failures and still clear server-side cookie mirrors below.
  }

  lastSyncedSessionSignature = null;

  try {
    await fetch("/auth/session-sync", {
      method: "DELETE",
      credentials: "same-origin",
      keepalive: true,
    });
  } catch {
    // Ignore cookie sync cleanup failures; login can still continue with a fresh server action.
  }
}

export function createBrowserSupabase() {
  if (!browserSupabase) {
    browserSupabase = createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    });

    void browserSupabase.auth.getSession().then(({ data }) => {
      void syncSessionCookies(data.session ?? null);
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
        void syncSessionCookies(session);
        pruneStaleSessionDrafts();
      }
    });
  }

  return browserSupabase;
}
