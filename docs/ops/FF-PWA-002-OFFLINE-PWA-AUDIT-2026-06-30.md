# FF-PWA-002 Audit

Date: 2026-06-30

Card:
- `FF-PWA-002`
- `Offline-Ready PWA + Persistent Session Restore`

Purpose:
- Re-scope the card against the real shipped Fitness app state.
- Separate already-landed PWA/offline/session-restore work from the still-missing MVP gaps.

## Verdict

`FF-PWA-002` is no longer greenfield future work.

Large parts of the PWA shell, install flow, session restore, Today offline snapshot, and offline set-log queue are already shipped. The card should be treated as an in-progress overlap audit / gap-closure lane rather than a net-new feature definition.

## Already Shipped

### Phase 2 overlap: manifest, service worker, app shell, install path

Files:
- `src/app/manifest.ts`
- `public/sw.js`
- `src/components/ServiceWorkerBootstrap.tsx`
- `src/components/install/usePWAInstallPrompt.ts`
- `src/components/install/EarnedInstallPrompt.tsx`
- `src/lib/install/getInstallContext.ts`
- `src/app/layout.tsx`

Proof:
- `manifest.ts` ships a standalone manifest with app icons, screenshots, theme color, background color, portrait orientation, and `/` app scope.
- `ServiceWorkerBootstrap.tsx` registers `"/sw.js"` in production and manages update application state.
- `public/sw.js` provides a navigation fallback page when document fetches fail offline.
- `usePWAInstallPrompt.ts` captures `beforeinstallprompt` and `appinstalled`.
- `EarnedInstallPrompt.tsx` surfaces install UX after a completed workout.
- `getInstallContext.ts` already handles iOS Safari vs iOS in-app browser vs standalone vs Android/desktop.
- `layout.tsx` already mounts the service-worker bootstrap globally.

### Phase 3 overlap: persisted Supabase session restore, silent refresh, expired-session fallback

Files:
- `src/lib/supabase/client.ts`
- `src/lib/supabase/session-recovery.ts`
- `src/app/auth/session-sync/route.ts`
- `src/lib/session-keepalive.ts`
- `src/app/auth/session-keepalive/route.ts`
- `src/app/auth/session-recovery/route.ts`
- `src/middleware.ts`
- `src/components/ServiceWorkerBootstrap.tsx`
- `src/components/auth/InitialExperienceGate.tsx`

Proof:
- Browser Supabase client persists session locally and mirrors tokens into durable server cookies through `/auth/session-sync`.
- `recoverSupabaseSessionFromCookies()` refreshes from the refresh token when access tokens are missing/stale.
- `middleware.ts` refreshes session cookies for guarded routes and redirects to login on expired/invalid refresh state.
- `session-keepalive` forces a refresh on launch/standalone boot and rewrites cookies when valid.
- `ServiceWorkerBootstrap.tsx` runs launch keepalive on `/`, `/entry`, and standalone boots.
- `session-recovery` provides the explicit expired-session cleanup redirect lane.

### Phase 4 partial overlap: read-only offline cache with stale UI

Files:
- `src/lib/offline/client-storage.ts`
- `src/lib/offline/today-cache.ts`
- `src/app/today/TodayOfflineBridge.tsx`
- `src/app/today/TodayClientShell.tsx`
- `src/app/today/page.tsx`
- `src/components/OfflineSyncBadge.tsx`

Proof:
- `today-cache.ts` stores Today snapshots in IndexedDB with localStorage fallback.
- `TodayOfflineBridge.tsx` writes the latest Today snapshot after successful Today loads.
- `TodayClientShell.tsx` restores a stale Today snapshot when live fetch fails.
- Offline UI already marks stale state with:
  - `Offline snapshot - stale data from ...`
  - `Start session requires a live connection.`
- `OfflineSyncBadge` already reflects offline / syncing / saved-local / synced states.

Scope limit:
- This cache is currently Today-focused.
- The repo does not yet show the same read-only offline snapshot contract for routines, history, or full session page boot.

### Phase 5 partial overlap: offline set-log queue and reconnect sync

Files:
- `src/lib/offline/set-log-queue.ts`
- `src/lib/offline/set-log-reconciliation.ts`
- `src/lib/offline/sync-engine.ts`
- `src/components/SessionTimers.tsx`
- `src/app/session/[id]/actions.ts`

Proof:
- Session set logs are queued locally in IndexedDB when offline or when server writes fail.
- `createSetLogSyncEngine()` retries queued items with backoff and reconnect handling.
- `SessionTimers.tsx` restores queued sets into the UI, marks them pending, and syncs them automatically on reconnect.
- `syncQueuedSetLogsAction()` replays queued set-log items through the same server insert contract.
- Queue state is surfaced with success/error copy like:
  - `Offline: set queued for sync.`
  - `Could not reach server. Set queued for sync.`
  - `Saved set synced.`

Scope limit:
- The queue currently covers set logging only.
- It does not yet cover the broader session mutation family or other offline edits.

## Still Missing For This Card

### 1. Explicit phase-one doctrine / MVP proof

Missing:
- one durable PWA/offline design note that explicitly captures:
  - auth flow
  - offline routes
  - minimum cached Today/session payload
  - stale-data rules
  - sync conflict assumptions
  - auth-expiration behavior
  - RLS safety assumptions

Current state:
- The behavior exists in code and tests, but the card’s required doctrine/proof is not yet centralized.

### 2. Broader read-only offline coverage

Missing:
- cached read-only routine/session/history surfaces beyond the Today snapshot fallback
- clearer offline fallback contract for routes outside Today

Current state:
- Today has the strongest offline read contract.
- Session has strong draft/queue resilience, but not a proven read-only offline boot contract equal to Today.

### 3. Broader offline mutation queue

Missing:
- queue/sync handling for non-set session edits and other meaningful offline mutations
- explicit conflict/error states beyond the current retry/toast pattern

Current state:
- set logging is queued
- broader mutation types are not yet under the same durable offline queue contract

### 4. Closeout proof against the card acceptance criteria

Missing:
- one acceptance-criteria crosswalk showing landed vs partial vs open
- one explicit closeout proof path if this card is later marked fixed

## Recommended Re-scope

Treat `FF-PWA-002` as:
- `in_progress`
- a gap-closure card, not a future concept card

Recommended remaining MVP scope:
1. write the explicit offline/PWA/session-restore doctrine proof
2. audit Today / Resume / Session / History for read-only offline behavior boundaries
3. decide whether session-page offline boot is in-scope now or should be split
4. decide whether the existing set-log queue is sufficient for MVP or whether broader session edits must join the queue before closeout
5. produce one acceptance-criteria closeout proof receipt

## Suggested Card Note

Suggested live note text:

`Audit confirmed FF-PWA-002 has major overlap already shipped. Landed today: standalone manifest + SW registration/offline navigation fallback, earned install prompt + platform-specific install gating, durable Supabase session cookie mirror/recovery/keepalive, Today IndexedDB snapshot fallback with stale/offline UI, and IndexedDB-backed offline set-log queue with reconnect sync. Remaining MVP gap is no longer core PWA shell/session restore; it is explicit doctrine + proof, broader read-only offline coverage beyond Today, and deciding whether broader non-set session mutations must join the offline queue before closeout.`
