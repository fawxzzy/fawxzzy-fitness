# Platform migration readiness (FF-PLATFORM-001 prep)

Read-only audit at main c6396fc02 (2026-11-14). Source evidence only; no migration was attempted. Target: Next 15.5 / 16 and React 19. Current: next 14.2.35, react / react-dom 18.3.1, eslint 8, eslint-config-next 14.2.35, @types/react 18, node 22.

## Why move
`npm audit --omit=dev` reports 1 critical (next, fixed only on newer majors; the 14.x line is end-of-patch) and 2 high (xlsx, plus one transitive). The critical advisories are Next 14 line issues, so the framework upgrade is the real fix.

## Blockers and work items
1. Async request APIs (Next 15): `cookies()`, `headers()`, `params` and `searchParams` become Promises. Counts at this sha: 19 files call `cookies()`/`headers()`/`draftMode()`; 10 `params` usages in `src/app`; 34 `page.tsx` files read `searchParams`. Run the official codemod (`@next/codemod next-async-request-api`) and review every diff by hand; Supabase SSR cookie handling in `src/lib/supabase` and `src/middleware.ts` is the highest risk.
2. Caching defaults (Next 15): `fetch` and GET route handlers are no longer cached by default. Check `unstable_cache` (`src/lib/exercises.ts`) and `unstable_noStore` (`exercise-stats.ts`, `exercises-browser.ts`) still behave; they remain available but confirm intent.
3. React 19: `forwardRef` still works (deprecated) in `src/components/ui/InlineHintInput.tsx`; `useFormState` is not used (rename to `useActionState` not needed). Needs `@types/react`/`@types/react-dom` 19 and a typecheck pass for the changed `ref`, `JSX` namespace and `ReactElement` props typing.
4. Testing stack: @testing-library/react 16 and jsdom 29 already support React 19; contract tests that grep source text may pin old patterns, expect churn.
5. Lint: eslint-config-next 15/16 needs eslint 9 (flat config) for 16; Next 15.5 still supports eslint 8. Prefer 15.5 first, then 16 separately.
6. Next 16 specifics: `middleware.ts` becomes `proxy.ts` (rename, Node runtime); Turbopack is the default bundler (check `next.config.mjs` headers/`/sw.js` handling and any webpack customisation); `next lint` is removed in favour of the eslint CLI (the `npm run lint` script and ci.yml would change, and ci.yml is outside this lane).
7. Runtime: Vercel build node version and `engines` should be confirmed at 20.9+ (Next 16 needs it); local is 22.
8. PWA / service worker: `public/sw.js` is hand-served via `next.config.mjs`; verify headers survive the config schema changes.
9. Verification plan: typecheck, lint, contract tests, `npm run build`, Playbook verify, headless standalone emulation of the dev fixture routes, then an unaliased deploy and the live checks in the Fitness profile. Real-phone check stays a separate item.

## Hygiene findings from this lane
- `xlsx` (^0.18.5): used only in `src/lib/account-workout-export.ts` (write path, `XLSX.write`) and its test, for the user-facing Excel export option. The npm-published 0.18.5 carries known high advisories (prototype pollution and ReDoS, parse side; this app only writes). (Replaced 2026-11-14 by `write-excel-file` 4.1.1; the sentence below is the original analysis.) Replacing it means choosing a new library (for example exceljs) and re-pinning the workbook shape; that is a behaviour and bundle-size decision, not a safe mechanical swap, so it was skipped. Options: vendor SheetJS from its own CDN tarball, switch to exceljs, or drop xlsx as a format (owner decision).
- Billing `any` casts: none found. A scan of `src/lib/billing`, `src/app/api/billing` and billing components for `as any`, `: any`, `any[]` and `<any>` returned zero hits. Remaining `any` in src (not billing, left untouched): `discord/member-numbers/sync/route.ts`, `app/manifest.ts` (x2), `account-workout-export.ts` (x2 supabase), `history-session-detail-loader.ts`, `local-dev-auto-entry.ts`, `routine-copy-rollback.ts`, one test file.

## Suggested order
Next 15.5 + React 19 in one PR behind its own card with the codemod, then Next 16 (proxy rename, Turbopack, eslint 9) as a second PR. Do not combine with feature work.

## Status 2026-11-19: Next 15.5 + React 19 done in one PR
- next 15.5.29, react / react-dom 19.2.9, eslint-config-next 15.5.29, @types/react 19.2 (all pinned). eslint stays 8; `next lint` still runs on 15.5 (prints a deprecation note).
- `@next/codemod@15.5.29 next-async-request-api ./src` changed 49 files (params, searchParams, `cookies()`, `headers()` awaited). Every diff was read by hand; no `@next-codemod` markers were left.
- Sync helpers that read the request (`src/lib/supabase/server.ts`, `src/lib/auth/server-session.ts`, `src/lib/dev-route-guard-page.ts`, `src/lib/history-preview.server.ts`, `src/lib/local-dev-auto-entry.ts`, `getOrigin` in `src/app/auth/actions.ts`) keep the codemod cast `UnsafeUnwrappedCookies` / `UnsafeUnwrappedHeaders`. Next 15 supports this (dev-only warning). Making them async touches about 150 call sites, and `assertDevPageAvailable` / `isHistoryPreviewActiveForRequest` would fail open if one `await` were missed, so it is a separate step. It MUST land before Next 16, which removes sync access.
- The internal `isRedirectError` / `isNotFoundError` imports moved in Next 15; they now come from one file, `src/lib/next-navigation-errors.ts`.
- React 19 typing: `JSX` is imported from react in `AppTabBar.tsx`; `useRef` needs an initial value in `bottom-actions.tsx`.
- `next.config.mjs` sets `experimental.staleTimes.dynamic: 30` to keep the Next 14 client router cache timing (the Next 15 default is 0).

## Next step: Next 16 (deadline)
Next 15 is in Maintenance LTS; its security releases run through 2027-01-31 (nextjs.org/support-policy, read 2026-11-19). Before then: make the sync request helpers above async, rename `middleware.ts` to `proxy.ts`, move lint to the ESLint CLI with eslint 9 flat config, and check the Turbopack production build.

## Status 2026-11-19: Next 16 done in one PR
- next / eslint-config-next 16.4.6 (pinned), eslint 9.39 (eslint 10 is out, but eslint-plugin-react / import / jsx-a11y peer only up to eslint 9). React stays 19.2.9.
- Request helpers are async: `supabaseServer`, `getRequestAccessToken`, `readCurrentRequestServerSessionTokens`, `assertDevPageAvailable`, `assertDevServiceRolePageAvailable`, `isHistoryPreviewAvailableForRequest`, `isHistoryPreviewActiveForRequest`, `isTrustedLocalDevRequest`, `getLocalDevAutoLoginCredentials`, and `getOrigin` / `getAppOrigin` in `src/app/auth/actions.ts`. No `UnsafeUnwrapped*` cast is left. Every dev page (and `src/app/dev/layout.tsx`) awaits its guard as the first statement.
- Missed-await proof: `src/lib/async-request-helpers.contract.test.ts` fails on any un-awaited call of those helpers or of `cookies()` / `headers()`; `src/lib/dev-page-guard-runtime.test.ts` imports every guarded `/dev` page and the layout with a stubbed `next/headers` and checks each one rejects with `notFound()` (404) for a production request with no Host, before it reads props. Both were mutation-checked (a `void assertDevPageAvailable()` fails both). Typecheck also rejects a Promise used as a Supabase client.
- `src/middleware.ts` is now `src/proxy.ts` (official `middleware-to-proxy` codemod; function `proxy`, Node runtime). The `/dev` 404 layer and the auth session refresh are unchanged.
- Lint runs through the ESLint CLI (`scripts/eslint-cli.mjs`, flat `eslint.config.mjs`); `next lint` and `.eslintrc.json` are gone. The React Compiler rules new in eslint-plugin-react-hooks 7 are off (153 existing sites); turning them on is a follow-up.
- `revalidateTag(tag)` with one argument no longer exists; `src/app/actions/exercises.ts` uses `updateTag(tag)` (Server Action, expires at once, same as before).
- Production build uses Turbopack (the Next 16 default); `next.config.mjs` has no webpack hook, and `experimental.staleTimes` and the `/sw.js` headers are unchanged.
