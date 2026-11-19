// Single home for the Next.js control-flow error checks the app needs (redirect() and notFound()
// throw special errors that a page/action `try/catch` must rethrow). Next does not export these
// predicates publicly, so the internal paths are pinned here once: a framework upgrade that moves
// them breaks one file instead of every caller. Paths match Next 15.5.
import {
  getAccessFallbackHTTPStatus,
  isHTTPAccessFallbackError,
} from "next/dist/client/components/http-access-fallback/http-access-fallback.js";
import { isRedirectError } from "next/dist/client/components/redirect-error.js";

export { isRedirectError };

/** True for the error thrown by `notFound()` (HTTP 404 fallback), same meaning as Next 14's `isNotFoundError`. */
export function isNotFoundError(error: unknown): boolean {
  return isHTTPAccessFallbackError(error) && getAccessFallbackHTTPStatus(error) === 404;
}
