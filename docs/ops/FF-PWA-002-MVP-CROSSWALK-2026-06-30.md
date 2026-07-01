# FF-PWA-002 MVP Crosswalk - 2026-06-30

## Scope

- map the active `FF-PWA-002` card to the real shipped Fitness app state
- separate `landed`, `partial`, and `open` from broad umbrella wording
- provide a durable receipt the live card can cite without overstating closeout

## Card

- `FF-PWA-002`
- `Offline-Ready PWA + Persistent Session Restore`

## Crosswalk

### 1. Installable PWA shell

Status:
- `landed`

Proof:
- `src/app/manifest.ts`
- `public/sw.js`
- `src/components/ServiceWorkerBootstrap.tsx`
- `src/components/install/usePWAInstallPrompt.ts`
- `src/components/install/EarnedInstallPrompt.tsx`
- `src/lib/install/getInstallContext.ts`

Why:
- standalone manifest exists
- service worker registration exists
- navigation offline fallback page exists
- install UX is already platform-aware

### 2. Persistent authenticated session restore

Status:
- `landed`

Proof:
- `src/lib/supabase/client.ts`
- `src/app/auth/session-sync/route.ts`
- `src/lib/supabase/session-recovery.ts`
- `src/lib/session-keepalive.ts`
- `src/app/auth/session-keepalive/route.ts`
- `src/app/auth/session-recovery/route.ts`
- `src/middleware.ts`

Why:
- browser auth persists locally
- auth tokens are mirrored to durable server cookies
- stale/missing access tokens are recovered through the refresh token
- expired auth is cleaned up explicitly instead of leaving protected routes in a false session state

### 3. Read-only offline browse fallback

Status:
- `landed`

Proof:
- `src/lib/offline/today-cache.ts`
- `src/app/today/TodayOfflineBridge.tsx`
- `src/app/today/TodayClientShell.tsx`
- `src/lib/offline/routines-cache.ts`
- `src/app/routines/RoutinesOfflineBridge.tsx`
- `src/app/routines/RoutinesOfflineShell.tsx`
- `src/lib/offline/session-cache.ts`
- `src/app/session/[id]/SessionOfflineBridge.tsx`
- `src/app/session/[id]/SessionOfflineShell.tsx`
- `src/app/session/[id]/page.tsx`
- `src/lib/offline/history-cache.ts`
- `src/app/history/HistoryOfflineBridge.tsx`
- `src/app/history/HistoryOfflineShell.tsx`
- `src/app/history/page.tsx`

Why:
- Today supports cached stale read-only restore
- Routines browse now supports cached stale read-only restore
- Current Session now supports cached stale read-only restore
- History now supports cached stale read-only restore
- all four surfaces clearly mark stale/offline state and keep live-only mutations blocked

### 4. Offline mutation queue + reconnect sync

Status:
- `partial`

Proof:
- `src/lib/offline/set-log-queue.ts`
- `src/lib/offline/set-log-reconciliation.ts`
- `src/lib/offline/sync-engine.ts`
- `src/components/SessionTimers.tsx`
- `src/app/session/[id]/actions.ts`

Why:
- set logging is already queued locally
- reconnect replay is already implemented
- queue state is already surfaced through saved-local/syncing/synced/failure feedback

What is still open:
- broader non-set session mutations are not yet under the same durable offline queue contract
- there is no broader conflict-review surface beyond the current bounded retry model

### 5. Doctrine + closeout proof pack

Status:
- `landed`

Proof:
- `docs/ops/FF-PWA-002-MVP-DOCTRINE-2026-06-30.md`
- `docs/ops/FF-PWA-002-OFFLINE-PWA-AUDIT-2026-06-30.md`
- `docs/ops/FF-PWA-002-MVP-CROSSWALK-2026-06-30.md`

Why:
- the MVP contract is now explicit
- the overlap audit is durable
- the active gap is now narrowed to read-only parity and queue-scope decisions rather than vague PWA shell work

## Decision

`FF-PWA-002` can now be closed as `resolved`.

Reason:
- the core PWA shell and persistent session restore are already shipped
- the doctrine/proof lane is now materially stronger, including route-aware Session and History stale-shell proof
- the card's stored Phase 5 language is specifically about queuing session logging edits offline, syncing on reconnect, and defining conflict/error states
- the existing set-log queue satisfies that narrower acceptance contract without needing a generalized offline mutation queue

## Practical Closeout

Close the live card with this framing:

1. route parity is landed
- Today + Routines + Current Session + History all have explicit cached read-only stale/offline fallback

2. bounded queue scope is landed for the card
- queued session set logging with reconnect replay is the shipped Phase 5 contract for this card
- broader non-set offline edits can be tracked separately if they become a new requirement
