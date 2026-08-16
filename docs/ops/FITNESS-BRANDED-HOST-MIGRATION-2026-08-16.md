# Fitness Branded Host Migration

## Current contract

- Canonical public origin: `https://fitness.fawxzzy.com`.
- The stable legacy browser host `https://fawxzzy-fitness-local.vercel.app` is a migration entrypoint only.
- `GET` and `HEAD` navigation requests on that exact legacy host receive a permanent redirect to the same path and query on the canonical origin.
- API requests on the legacy host remain served during the provider cutover so signed webhooks and OAuth callbacks are not broken by a browser-link migration.
- `/sw.js` remains a same-origin retirement worker for existing legacy installations. The current app worker is `/app-sw.js`.
- Preview and immutable Vercel deployment URLs are never redirected by this rule. They remain rollback and verification surfaces.

## User migration behavior

The host change does not transfer browser-local state across origins. Existing legacy `/sw.js` registrations update to a retirement worker that clears Fitness caches, unregisters itself, and navigates controlled windows to the branded origin with path and query preserved. Existing users may still need to sign in again and reinstall the PWA from the branded origin. Server-backed account data remains authoritative after sign-in.

## Provider boundary

Stripe webhook destinations, OAuth callback allowlists, Supabase redirect URLs, and other provider-managed settings must be moved to the branded origin under their own authenticated provider authority. After those readbacks are proven, a later source change may retire the legacy API exception.

Historical receipts may continue to name the old Vercel host as provenance. They are not current routing authority and must not be rewritten.
