## 2026-11-15 - Branded not-found page and plain-words error boundaries

- Type: UI copy and structure (card FF-DESIGN-004, lane errors; DESIGN-CONTRACT 8.3, audit E1/E2/E4)
- WHAT changed: New `src/app/not-found.tsx` + `NotFoundScreen` (server-safe card, `We can't find that page.`, one `Back to Today` action). Route boundary, soft boundary and `global-error` share `errorCopy.ts`: `Something went wrong` / `This did not sign you out.` with Retry (primary) and Reload app (secondary) using existing `SurfaceCard` and `getAppButtonClassName`. Removed `app-shell`, `data service` and `safe shell` wording; the dev-only `(Error)` suffix stays dev-only. `global-error` now imports `globals.css` so its tokens exist.
- WHY it changed: Unknown URLs showed the bare framework 404; boundaries showed an internal area id and developer wording.
- Rule: Error and not-found copy comes from `errorCopy.ts`; no component names, error class names, ids or provider text.
- Failure Mode: A boundary that interpolates `area` or `error.name` leaks internals; a not-found that reads auth or data can itself fail.
- Evidence: `src/components/error/errorScreens.contract.test.tsx` (added to the ci.yml contract step); phone-emulated screenshots against a placeholder Supabase URL.
- Status: Source only; reset-link-expired action and other lanes' copy untouched.
