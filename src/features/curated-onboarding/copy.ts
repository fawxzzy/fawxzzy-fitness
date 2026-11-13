/**
 * Fixed member-facing copy for curated generation and handoff outcomes. Kept dependency-free so the browser
 * bundle can import it without pulling in the generator. Raw exception or database text is never shown.
 */
export const CURATED_DISABLED_MESSAGE =
  "Guided routine setup is not available right now. You can build a routine manually.";

export const CURATED_UNAVAILABLE_MESSAGE =
  "The routine could not be generated right now. Try again, or build a routine manually.";

export const CURATED_CREATE_FAILED_MESSAGE =
  "Your routine could not be created. Nothing was saved. Try again, or build a routine manually.";

export const CURATED_CREATE_PARTIAL_MESSAGE =
  "Your routine was only partly created. Open Routines to check it, then try again or build a routine manually.";

export const CURATED_PLAN_CHANGED_MESSAGE =
  "Your recent workouts changed what fits. Review the updated routine before creating it.";

/** The request may have succeeded on the server; a retry reuses an identical routine instead of duplicating it. */
export const CURATED_LOST_RESPONSE_MESSAGE =
  "We could not confirm your routine was created. Try again; if it was created, it will be reused instead of duplicated.";
