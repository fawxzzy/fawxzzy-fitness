# FF-PWA-002 MVP Doctrine

Date: 2026-06-30

Card:
- `FF-PWA-002`
- `Offline-Ready PWA + Persistent Session Restore`

Purpose:
- Capture the real Fitness MVP contract for PWA shell, persistent Supabase session restore, offline fallback behavior, stale-data rules, sync/conflict rules, and RLS safety.

## Source Of Truth

- Supabase remains the system of record.
- Browser persistence is a resilience layer, not a replacement truth layer.
- Offline browser state may:
  - restore a previously valid UI snapshot
  - preserve in-progress local session-entry intent
  - queue bounded mutations for later replay
- Offline browser state may not become a second authority for routine/session history truth.

## Auth / Session Restore Contract

### Browser session persistence

- The browser Supabase client persists session state locally.
- Browser auth events mirror access + refresh tokens into durable server cookies through `/auth/session-sync`.
- The cookie mirror exists so server-rendered routes and middleware can restore the same authenticated session truth.

Primary files:
- `src/lib/supabase/client.ts`
- `src/app/auth/session-sync/route.ts`

### Server-side recovery

- Protected routes do not trust stale cookie state blindly.
- Middleware recovers the session from the refresh token when the access token is stale or missing.
- If refresh recovery fails or returns no session, the app clears auth cookies and routes to login with `session_expired`.

Primary files:
- `src/lib/supabase/session-recovery.ts`
- `src/middleware.ts`
- `src/app/auth/session-recovery/route.ts`

### Launch keepalive

- On `/`, `/entry`, and standalone app launches, the app runs a keepalive refresh check.
- If recovery succeeds, durable cookies are rewritten silently.
- If auth is anonymous, the app stays unauthenticated.
- If auth is expired, the app clears the session and sends the member to login.

Primary files:
- `src/lib/session-keepalive.ts`
- `src/app/auth/session-keepalive/route.ts`
- `src/components/ServiceWorkerBootstrap.tsx`

## PWA Shell Contract

### Install / app-shell expectations

- The app exposes a standalone manifest with app icons, screenshots, and app-shell colors.
- A production service worker is registered globally.
- The install UX is platform-aware:
  - native prompt when available
  - iOS Safari add-to-home-screen guidance
  - iOS in-app-browser block/gate when install behavior is not viable there

Primary files:
- `src/app/manifest.ts`
- `src/components/ServiceWorkerBootstrap.tsx`
- `src/components/install/usePWAInstallPrompt.ts`
- `src/components/install/EarnedInstallPrompt.tsx`
- `src/lib/install/getInstallContext.ts`

### Offline fallback page

- When a navigation request fails offline, the service worker responds with an app-owned offline shell page.
- This is a navigation fallback only.
- It is not the same as route-level offline data recovery.

Primary file:
- `public/sw.js`

## Offline Route Contract

### Route classes

#### 1. Today

- Today is the primary read-only offline surface.
- After a successful live render, Today writes a compact snapshot to IndexedDB with localStorage fallback.
- If a later live fetch fails, Today may restore from that cached snapshot.
- The restored view must show stale/offline state clearly.
- Starting a new session from the offline Today snapshot is intentionally blocked.

Primary files:
- `src/lib/offline/today-cache.ts`
- `src/app/today/TodayOfflineBridge.tsx`
- `src/app/today/TodayClientShell.tsx`
- `src/app/today/page.tsx`

#### 2. Current Session

- Current Session is not yet a full offline-boot route in the same way Today is.
- However, it does preserve resilient local state for session logging:
  - queued unsynced set logs
  - local draft state for the current exercise logger
- This means session continuity is stronger than generic SSR failure, but weaker than a full cached-page offline boot contract.

Primary files:
- `src/components/SessionTimers.tsx`
- `src/lib/offline/set-log-queue.ts`
- `src/lib/offline/sync-engine.ts`
- `src/lib/offline/client-storage.ts`

#### 3. Routines / History / Other protected app routes

- These routes are currently online-first.
- They do benefit from durable session restore and app-shell install behavior.
- They do not yet have the same explicit read-only offline snapshot contract as Today.

## Minimum Cached / Queued Data

### Today snapshot

Minimum cached Today data:
- routine identity
- day identity / day index / day name
- whether the day is rest
- compact exercise list
- compact target display string
- compact taxonomy fields used to render cards
- logged-set count / skip signal
- in-progress-session hint
- completed-today count
- capture timestamp
- schema version

Primary type:
- `TodayCacheSnapshot` in `src/lib/offline/today-cache.ts`

### Session offline queue

Current queued mutation scope:
- set logs only

Each queued set log carries:
- user scope
- session id
- session exercise id
- stable client log id
- dedupe key
- metric payload
- created/retry/sync metadata

Primary type:
- `SetLogQueueItem` in `src/lib/offline/set-log-queue.ts`

## Stale Data Rules

- Cached Today snapshots expire after `7 days`.
- Incompatible schema versions are ignored.
- Invalid or unreadable cached payloads are ignored.
- When a snapshot is used, the UI must indicate that it is stale/offline data.
- Offline snapshot restore is for visibility and continuity, not for unlocking new live-only actions.

Primary files:
- `src/lib/offline/client-storage.ts`
- `src/lib/offline/today-cache.ts`
- `src/app/today/TodayClientShell.tsx`

## Sync / Conflict Contract

### Current replay model

- Offline set logs are queued with a stable client log id.
- Replay uses the same authenticated server action path as live logging.
- The queue engine retries with backoff and reconnect handling.
- Deduplication is based on the stable client log id / dedupe key.

Primary files:
- `src/lib/offline/set-log-queue.ts`
- `src/lib/offline/set-log-reconciliation.ts`
- `src/lib/offline/sync-engine.ts`
- `src/app/session/[id]/actions.ts`

### Conflict model for MVP

Current conflict policy is intentionally narrow:
- server remains source of truth
- duplicate client log ids must not create duplicate sets
- failed sync stays queued with retry metadata
- UI surfaces local/save/sync/failure state through badges and toasts

Current non-goals:
- multi-surface offline conflict resolution UI
- arbitrary merge tooling for offline routine/session edits
- background mutation queue for all session/routine edits

## Auth Expiration Rules

- If the refresh token cannot restore a valid session, the app clears cookies and routes to login.
- The app must not continue pretending protected data is valid after refresh failure.
- Offline cached UI may remain visible where explicitly supported, but protected live actions still require a valid authenticated session.

Primary files:
- `src/middleware.ts`
- `src/lib/session-keepalive.ts`
- `src/app/auth/session-recovery/route.ts`

## RLS / Security Safety

- Offline browser storage never bypasses RLS.
- Browser storage does not write directly to Supabase tables.
- Replayed queued writes still go through authenticated app actions / server paths.
- Durable auth cookies remain bounded by the same Supabase auth model and route guards.
- Cached snapshots are only used for previously loaded member-owned surfaces.

## Explicit MVP Boundaries

### Already in MVP

- standalone manifest
- service-worker registration
- offline navigation fallback page
- install prompt / add-to-home-screen path
- durable session cookie mirror
- middleware session refresh / login fallback
- launch keepalive refresh
- Today offline snapshot restore
- stale/offline Today UI
- offline queued set logging with reconnect replay

### Still outside MVP closeout right now

- read-only offline cache parity for routines/history/full session boot
- generalized offline mutation queue beyond set logging
- richer sync conflict review surface
- full offline-first workout flow without a live session bootstrap boundary

## Recommended Remaining Slice Order

1. Keep this doctrine file as the explicit phase-one contract.
2. Audit whether the session route should gain a bounded read-only offline boot fallback or remain Today-only for MVP.
3. Decide whether broader session mutations beyond set logs must join the queue before this card can close.
4. Add one acceptance-criteria closeout proof receipt mapping:
   - landed
   - partial
   - deferred

## Practical Closeout Reading

If the card is kept as one umbrella card, it should now be interpreted as:
- mostly shipped PWA shell + session restore
- partially shipped offline cache + mutation queue
- still open on doctrine-proof completeness and scope boundaries for broader offline behavior
