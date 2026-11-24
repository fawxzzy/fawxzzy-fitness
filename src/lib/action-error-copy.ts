/**
 * Turns a server action's `error` string into copy a person can act on. Server actions sometimes return internal
 * codes ("session_expired", "not_found") or raw database text ("JWT expired", "violates foreign key constraint");
 * those must never reach the in-flow notice as is (History review item 2, 2026-11-23). Human sentences pass through.
 */

const KNOWN_CODE_COPY: Array<{ pattern: RegExp; copy: string }> = [
  { pattern: /session[_\s-]?expired|jwt[_\s-]?expired|unauthori[sz]ed|not[_\s-]?authenticated|auth[_\s-]?required|no[_\s-]?session/i, copy: "Your sign-in expired. Sign in again, then retry." },
  { pattern: /failed to fetch|network|offline|fetch[_\s-]?failed|timed?[_\s-]?out/i, copy: "You look offline. Check your connection and try again." },
  { pattern: /not[_\s-]?found|no rows/i, copy: "That item is no longer there. The screen has been refreshed." },
];

const RAW_INTERNAL_TEXT = /violates|constraint|duplicate key|relation\s+"|PGRST|postgres|supabase|syntax error|undefined|null value|TypeError|ReferenceError|stack/i;

/** A machine code: no spaces and either snake_case, kebab-case, dotted or SCREAMING_CASE. */
function looksLikeCode(text: string) {
  if (/\s/.test(text)) return false;
  return /[_.-]/.test(text) || /^[A-Z0-9]+$/.test(text) || /^[a-z]+$/.test(text);
}

export function friendlyActionError(error: unknown, fallback: string): string {
  const text = typeof error === "string" ? error.trim() : "";
  if (!text) return fallback;

  const isCode = looksLikeCode(text);
  if (isCode || RAW_INTERNAL_TEXT.test(text)) {
    const known = KNOWN_CODE_COPY.find((entry) => entry.pattern.test(text));
    return known ? known.copy : fallback;
  }

  // Short raw provider messages such as "JWT expired" or "Failed to fetch" read like sentences but are not copy.
  const known = KNOWN_CODE_COPY.find((entry) => entry.pattern.test(text));
  if (known && text.split(/\s+/).length <= 3) return known.copy;

  return text;
}
