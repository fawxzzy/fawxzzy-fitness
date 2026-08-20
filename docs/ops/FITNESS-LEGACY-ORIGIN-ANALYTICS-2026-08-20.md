# Fitness legacy-origin analytics

The exact stable legacy browser host remains a compatibility entrypoint. Its `GET` and `HEAD`
redirects preserve the requested path and query and add the one-use
`compatibility=fitness_legacy_origin` marker. The branded app removes that marker immediately and,
only when `NEXT_PUBLIC_FAWXZZY_ANALYTICS_URL` is configured, submits one closed anonymous
`compatibility_visit` event.

No cookie, account identity, referrer, user agent, free-form URL, or arbitrary event text is sent.
API routes, previews, immutable deployments, and spoofed forwarded-host requests remain outside
the redirect. Source presence does not activate the collector or authorize provider configuration
or production deployment.

The legacy host may be retired only after a declared observation window records zero matching
events, rollback evidence is preserved, and a separate retirement decision is approved.
