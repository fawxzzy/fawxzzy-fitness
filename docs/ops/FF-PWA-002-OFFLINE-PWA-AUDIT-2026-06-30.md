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
- `src/lib/offline/routines-cache.ts`
- `src/app/routines/RoutinesOfflineBridge.tsx`
- `src/app/routines/RoutinesOfflineShell.tsx`
- `src/app/routines/page.tsx`
- `src/components/OfflineSyncBadge.tsx`

Proof:
- `today-cache.ts` stores Today snapshots in IndexedDB with localStorage fallback.
- `TodayOfflineBridge.tsx` writes the latest Today snapshot after successful Today loads.
- `TodayClientShell.tsx` restores a stale Today snapshot when live fetch fails.
- Offline UI already marks stale state with:
  - `Offline snapshot - stale data from ...`
  - `Start session requires a live connection.`
- `routines-cache.ts` stores routines browse snapshots in IndexedDB with localStorage fallback.
- `RoutinesOfflineBridge.tsx` writes the latest routines browse snapshot after successful `/routines` loads.
- `RoutinesOfflineShell.tsx` restores cached routines browse state when the live routines fetch fails and keeps the surface read-only.
- Offline Routines UI already marks stale state with:
  - `Offline snapshot - stale data from ...`
  - `Editing routines requires a live connection. Cached browse state stays available here.`
- `OfflineSyncBadge` already reflects offline / syncing / saved-local / synced states.

Scope limit:
- The strongest route-level offline read contract is now:
  - Today
  - Routines browse
  - Current Session
  - History

Additional proof:
- `src/lib/offline/session-cache.ts` stores compact Current Session snapshots.
- `src/app/session/[id]/SessionOfflineBridge.tsx` writes the latest session snapshot after successful live session loads.
- `src/app/session/[id]/SessionOfflineShell.tsx` restores cached session state into a stale read-only shell.
- `src/app/session/[id]/page.tsx` now falls back to that stale shell when the live session fetch fails.
- A deterministic dev proof hook (`?offlineSnapshot=1`) exists so the stale Session shell can be visually verified on the real 3002 app without relying on an actual network outage.
- `src/lib/offline/history-cache.ts` stores compact History browse snapshots.
- `src/app/history/HistoryOfflineBridge.tsx` writes the latest History snapshot after successful live History loads.
- `src/app/history/HistoryOfflineShell.tsx` restores cached History state into a stale read-only shell.
- `src/app/history/page.tsx` now falls back to that stale shell when the live History fetch fails.
- A deterministic dev proof hook (`?offlineSnapshot=1`) exists so the stale History shell can be visually verified on the real 3002 app without relying on an actual network outage.

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
- clearer offline fallback contract for routes outside Today

Current state:
- Today, Routines browse, Current Session, and History now have explicit cached read-only fallback.
- Remaining protected routes outside that family are still online-first.

### 3. Broader offline mutation queue

Not required for this card closeout:
- the stored acceptance criteria only require queuing session logging edits offline, syncing on reconnect, and defining conflict/error states

Current state:
- set logging is queued
- reconnect replay is shipped
- failure/sync states are surfaced through the existing bounded retry/toast contract
- broader mutation types can be split into a follow-up card if product scope expands

### 4. Closeout proof against the card acceptance criteria

Missing:
- one acceptance-criteria crosswalk showing landed vs partial vs open
- one explicit closeout proof path if this card is later marked fixed

## Recommended Re-scope

Treat `FF-PWA-002` as:
- `in_progress`
- a gap-closure card, not a future concept card

Recommended closeout reading:
1. explicit offline/PWA/session-restore doctrine proof is landed
2. Today + Routines + Current Session + History are the proven offline read-only baseline
3. the existing set-log queue is sufficient for the stored Phase 5 acceptance contract
4. broader non-set offline edits should be tracked as a follow-up only if product scope expands

## Suggested Card Note

Suggested live note text:

`Audit confirmed FF-PWA-002 is now closeable from shipped proof. Landed: standalone manifest + SW registration/offline navigation fallback, earned install prompt + platform-specific install gating, durable Supabase session cookie mirror/recovery/keepalive, Today + Routines + Current Session + History read-only stale snapshot fallbacks with offline UI, and IndexedDB-backed offline session set-log queue with reconnect sync/error states. Broader non-set offline edits are follow-up scope, not part of this card’s stored acceptance contract.`
