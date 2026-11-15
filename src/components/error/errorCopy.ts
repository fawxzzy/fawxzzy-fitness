// User-facing copy for error and not-found screens (DESIGN-CONTRACT 8.3).
// Plain words only: no error class names, component/route names, ids or env flags.
export const ERROR_COPY = {
  boundaryTitle: "Something went wrong",
  boundaryBody: "This did not sign you out.",
  globalBody: "The app could not finish loading. This did not sign you out.",
  retryLabel: "Retry",
  reloadLabel: "Reload app",
  notFoundTitle: "We can't find that page.",
  notFoundBody: "It may have moved, or the link may be wrong.",
  notFoundAction: "Back to Today",
  notFoundHref: "/today",
} as const;
