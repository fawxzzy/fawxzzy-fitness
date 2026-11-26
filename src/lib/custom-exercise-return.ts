// Where a custom-exercise rename / delete returns to. The server action redirects to `returnTo?success=...` (or
// `?error=...`), so the path must keep the page's own query (returnTo, day, routine ids) and drop the one-shot
// feedback params a previous action left behind.

const FEEDBACK_PARAMS = ["success", "error", "exerciseId"];

export function buildCustomExerciseReturnTo(pathname: string, search: string | null | undefined): string {
  const params = new URLSearchParams(search ?? "");
  for (const key of FEEDBACK_PARAMS) params.delete(key);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Adds one query param to a path that may or may not already carry a query string. */
export function appendQueryParams(path: string, params: URLSearchParams): string {
  const query = params.toString();
  if (!query) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
}
