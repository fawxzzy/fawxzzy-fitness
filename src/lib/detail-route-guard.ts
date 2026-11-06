import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { createFitnessSupabaseClient } from "@/lib/supabase/schema";

/**
 * Real 404 status for owned-record detail routes.
 *
 * Why this lives in middleware: every app route renders under `loading.tsx` Suspense boundaries, so the HTTP
 * status line (200) is flushed with the loading shell before a page can finish its data fetch. A `notFound()`
 * thrown by the page, its layout, or `generateMetadata` afterwards only swaps the UI client-side, which makes
 * another user's id or a nonexistent id a soft-404 (HTTP 200 with a "404" body). The only place that runs
 * before the shell is middleware, so the existence check for the requested record runs here, on document
 * navigations only, and answers with the app's standard 404.
 *
 * Existence and "not yours" are indistinguishable by construction: the lookup runs with the caller's own
 * access token (row-level security) and is additionally pinned to the caller's user id.
 */

export const DETAIL_LOOKUP_TIMEOUT_MS = 1000;

export type DetailRouteTarget =
  | { kind: "history-session"; id: string }
  | { kind: "routine"; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Static child segments that live beside the dynamic id segment and must never be treated as ids. */
export const HISTORY_STATIC_SEGMENTS = ["exercises", "progression"] as const;
export const ROUTINES_STATIC_SEGMENTS = ["new", "workout-plans"] as const;

export type DetailRouteMatch =
  /** Not a guarded detail route. */
  | { status: "none" }
  /** The id segment cannot be a record id, so there is nothing to look up: always a 404. */
  | { status: "malformed" }
  /** The id segment is well formed; confirm the caller can see the record. */
  | { status: "check"; target: DetailRouteTarget };

function matchIdSegment(
  segment: string | undefined,
  staticSegments: readonly string[],
  kind: DetailRouteTarget["kind"],
): DetailRouteMatch {
  if (!segment || staticSegments.includes(segment)) {
    return { status: "none" };
  }
  return UUID.test(segment) ? { status: "check", target: { kind, id: segment.toLowerCase() } } : { status: "malformed" };
}

export function matchDetailRoute(pathname: string): DetailRouteMatch {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "history" && segments.length === 2) {
    return matchIdSegment(segments[1], HISTORY_STATIC_SEGMENTS, "history-session");
  }

  // /routines/<id> and every nested editor route under it are scoped by the routine id.
  if (segments[0] === "routines" && segments.length >= 2) {
    return matchIdSegment(segments[1], ROUTINES_STATIC_SEGMENTS, "routine");
  }

  return { status: "none" };
}

export function isDocumentNavigation(request: { method: string; headers: Headers }) {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return false;
  }

  // Client-side transitions and prefetches fetch RSC payloads; the document status only matters for full loads.
  if (request.headers.get("rsc") || request.headers.get("next-router-prefetch") || request.headers.get("next-router-state-tree")) {
    return false;
  }

  return true;
}

function decodeJwtSubject(token: string): string | null {
  const payloadPart = token.split(".")[1];
  if (!payloadPart) {
    return null;
  }

  try {
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
    const payload = JSON.parse(atob(padded)) as { sub?: unknown };
    return typeof payload.sub === "string" && UUID.test(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}

export type DetailRecordLookup = (args: {
  target: DetailRouteTarget;
  accessToken: string;
}) => Promise<"found" | "missing" | "unknown">;

/** Looks the record up with the caller's token. Any lookup error is "unknown" so the page decides (fail open). */
export const lookupDetailRecordForUser: DetailRecordLookup = async ({ target, accessToken }) => {
  try {
    const supabase = createFitnessSupabaseClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(DETAIL_LOOKUP_TIMEOUT_MS) }),
      },
    });
    const userId = decodeJwtSubject(accessToken);

    if (target.kind === "history-session") {
      let query = supabase.from("sessions").select("id").eq("id", target.id).eq("status", "completed");
      if (userId) {
        query = query.eq("user_id", userId);
      }
      const { data, error } = await query.limit(1);
      if (error) return "unknown";
      return Array.isArray(data) && data.length > 0 ? "found" : "missing";
    }

    let query = supabase.from("routines").select("id").eq("id", target.id);
    if (userId) {
      query = query.eq("user_id", userId);
    }
    const { data, error } = await query.limit(1);
    if (error) return "unknown";
    return Array.isArray(data) && data.length > 0 ? "found" : "missing";
  } catch {
    return "unknown";
  }
};

/** True when the request must be answered with a real 404 instead of rendering the page. */
export async function shouldAnswerDetailRouteWithNotFound(args: {
  pathname: string;
  accessToken: string;
  lookup?: DetailRecordLookup;
  timeoutMs?: number;
}): Promise<boolean> {
  const match = matchDetailRoute(args.pathname);
  if (match.status === "none") {
    return false;
  }
  if (match.status === "malformed") {
    return true;
  }

  const lookup = args.lookup ?? lookupDetailRecordForUser;
  // The lookup sits in front of the page's first byte, so a stalled database must not stall owned pages:
  // past the deadline the answer is "unknown" and the page is served (fail open).
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<"unknown">((resolve) => {
    timer = setTimeout(() => resolve("unknown"), args.timeoutMs ?? DETAIL_LOOKUP_TIMEOUT_MS);
  });
  try {
    const result = await Promise.race([
      lookup({ target: match.target, accessToken: args.accessToken }).catch(() => "unknown" as const),
      deadline,
    ]);
    return result === "missing";
  } finally {
    clearTimeout(timer);
  }
}
