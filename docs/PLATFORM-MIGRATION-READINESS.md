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
- `xlsx` (^0.18.5): used only in `src/lib/account-workout-export.ts` (write path, `XLSX.write`) and its test, for the user-facing Excel export option. The npm-published 0.18.5 carries known high advisories (prototype pollution and ReDoS, parse side; this app only writes). Replacing it means choosing a new library (for example exceljs) and re-pinning the workbook shape; that is a behaviour and bundle-size decision, not a safe mechanical swap, so it was skipped. Options: vendor SheetJS from its own CDN tarball, switch to exceljs, or drop xlsx as a format (owner decision).
- Billing `any` casts: none found. A scan of `src/lib/billing`, `src/app/api/billing` and billing components for `as any`, `: any`, `any[]` and `<any>` returned zero hits. Remaining `any` in src (not billing, left untouched): `discord/member-numbers/sync/route.ts`, `app/manifest.ts` (x2), `account-workout-export.ts` (x2 supabase), `history-session-detail-loader.ts`, `local-dev-auto-entry.ts`, `routine-copy-rollback.ts`, one test file.

## Suggested order
Next 15.5 + React 19 in one PR behind its own card with the codemod, then Next 16 (proxy rename, Turbopack, eslint 9) as a second PR. Do not combine with feature work.
