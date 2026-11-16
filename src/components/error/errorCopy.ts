// User-facing copy for error and not-found screens (DESIGN-CONTRACT 8.3).
// Plain words only: no error class names, component/route names, ids or env flags.
// The words are the shared Fawxzzy copy matrix (FawxzzyWeb src/lib/auth/status-copy.ts, Auth Surface v2, 2026-11-15):
// the crash screen is "Could not load" + the `page.crash` notice + "Try again"; the 404 is "Page not found" +
// "That page does not exist.". `homeLabel` is the Fitness way back (Today).
export const ERROR_COPY = {
  boundaryTitle: "Could not load",
  boundaryBody: "Check your connection and try again.",
  retryLabel: "Try again",
  homeLabel: "Go to Today",
  homeHref: "/today",
  notFoundTitle: "Page not found",
  notFoundBody: "That page does not exist.",
  notFoundAction: "Go to Today",
  notFoundHref: "/today",
} as const;
