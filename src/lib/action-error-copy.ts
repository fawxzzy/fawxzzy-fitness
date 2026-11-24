/**
 * Turns a server action's `error` string into copy a person can act on. Server actions sometimes return internal
 * codes ("session_expired", "not_found") or raw database text ("JWT expired", "violates foreign key constraint");
 * those must never reach the in-flow notice as is (History review item 2, 2026-11-23). Human sentences pass through.
 *
 * Scope: History flows only (ConfirmedServerFormButton and the History session editor call it explicitly).
 * The app-wide toastActionResult keeps showing the action's own message, so other lanes' copy is unchanged.
 */

type FriendlyActionErrorOptions = {
  /** True only when the caller really re-reads the screen (router.refresh()) after the failure. */
  refreshes?: boolean;
};

const SIGN_IN_COPY = "Your sign-in expired. Sign in again, then retry.";
const OFFLINE_COPY = "You look offline. Check your connection and try again.";

function notFoundCopy(refreshes: boolean) {
  return refreshes ? "That item is no longer there. The screen has been refreshed." : "That item is no longer there.";
}

/** Patterns tried against machine codes and raw internal text only, never against human sentences. */
function codeCopy(text: string, refreshes: boolean): string | null {
  if (/session[_\s-]?expired|jwt[_\s-]?expired|unauthori[sz]ed|not[_\s-]?authenticated|auth[_\s-]?required|no[_\s-]?session/i.test(text)) {
    return SIGN_IN_COPY;
  }
  if (/failed to fetch|network|offline|fetch[_\s-]?failed|timed?[_\s-]?out/i.test(text)) return OFFLINE_COPY;
  if (/not[_\s-]?found|no rows/i.test(text)) return notFoundCopy(refreshes);
  return null;
}

/** Exact raw provider/runtime phrases that read like sentences but are not copy. */
const PROVIDER_PHRASES: Array<{ pattern: RegExp; copy: string }> = [
  { pattern: /^jwt expired\.?$/i, copy: SIGN_IN_COPY },
  { pattern: /^(failed to fetch|fetch failed|load failed|network ?error|networkerror when attempting to fetch resource)\.?$/i, copy: OFFLINE_COPY },
];

const RAW_INTERNAL_TEXT = /violates|constraint|duplicate key|relation\s+"|PGRST|postgres|supabase|syntax error|undefined|null value|TypeError|ReferenceError|stack/i;

/** A machine code: no spaces and either snake_case, kebab-case, dotted or SCREAMING_CASE. */
function looksLikeCode(text: string) {
  if (/\s/.test(text)) return false;
  return /[_.-]/.test(text) || /^[A-Z0-9]+$/.test(text) || /^[a-z]+$/.test(text);
}

export function friendlyActionError(error: unknown, fallback: string, options: FriendlyActionErrorOptions = {}): string {
  const text = typeof error === "string" ? error.trim() : "";
  if (!text) return fallback;
  const refreshes = options.refreshes === true;

  if (looksLikeCode(text) || RAW_INTERNAL_TEXT.test(text)) {
    return codeCopy(text, refreshes) ?? fallback;
  }

  const phrase = PROVIDER_PHRASES.find((entry) => entry.pattern.test(text));
  if (phrase) return phrase.copy;

  return text;
}
