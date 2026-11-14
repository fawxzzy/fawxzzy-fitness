/**
 * The one registry of "something is being waited on". Every <RouteLoading> (a route's loading.tsx, a Suspense
 * fallback, an entry gate) registers here while it is mounted and releases on unmount; none of them owns a timer.
 * The single <AppLoaderHost> in the root layout reads this registry and runs the show delay, minimum hold and fades
 * (src/lib/app-loader.ts), so a wait that moves between route segments is ONE wait to the loader.
 *
 * Waits have a maximum age (LOADER_WAIT_CEILING_MS, passed by the caller): a wait older than that stops counting as
 * active, so a gate that never resolves cannot keep the opaque cover up forever. The registry stays honest about it:
 * `takeStaleLoaderWaits` reports each such wait once so the host can log a diagnostic.
 *
 * Module state, no React: subscribe/getSnapshot shaped for useSyncExternalStore and for tests. Time is a parameter
 * (default: performance.now(), the same clock as requestAnimationFrame timestamps), so the logic is deterministic.
 */

type LoaderWait = { readonly id: number; readonly label: string; readonly startedAtMs: number; reported: boolean };

const waits = new Map<number, LoaderWait>();
const listeners = new Set<() => void>();
let nextId = 1;

function defaultNowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function emit() {
  for (const listener of Array.from(listeners)) {
    listener();
  }
}

/** Registers a wait and returns its release. Releasing twice is a no-op. */
export function acquireLoaderWait(label: string, nowMs: number = defaultNowMs()): () => void {
  const id = nextId;
  nextId += 1;
  waits.set(id, { id, label, startedAtMs: nowMs, reported: false });
  emit();

  return () => {
    if (waits.delete(id)) {
      emit();
    }
  };
}

/** Every registered wait, whatever its age. */
export function getLoaderWaitCount(): number {
  return waits.size;
}

function isLive(wait: LoaderWait, nowMs: number, ceilingMs: number): boolean {
  return nowMs - wait.startedAtMs < ceilingMs;
}

/** Waits younger than the ceiling: the ones that keep the loader up. */
export function getLiveLoaderWaitCount(nowMs: number, ceilingMs: number): number {
  let count = 0;
  for (const wait of waits.values()) {
    if (isLive(wait, nowMs, ceilingMs)) {
      count += 1;
    }
  }
  return count;
}

/** The label of the most recently registered live wait, or "" when nothing live is being waited on. */
export function getLiveLoaderWaitLabel(nowMs: number, ceilingMs: number): string {
  let latest: LoaderWait | null = null;
  for (const wait of waits.values()) {
    if (isLive(wait, nowMs, ceilingMs) && (latest === null || wait.id > latest.id)) {
      latest = wait;
    }
  }
  return latest?.label ?? "";
}

/** Waits that have outlived the ceiling, each returned exactly once (for a diagnostic). */
export function takeStaleLoaderWaits(nowMs: number, ceilingMs: number): Array<{ label: string; ageMs: number }> {
  const stale: Array<{ label: string; ageMs: number }> = [];
  for (const wait of waits.values()) {
    if (!wait.reported && !isLive(wait, nowMs, ceilingMs)) {
      wait.reported = true;
      stale.push({ label: wait.label, ageMs: Math.round(nowMs - wait.startedAtMs) });
    }
  }
  return stale;
}

export function subscribeLoaderWaits(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test seam: drops every wait and listener. */
export function resetLoaderWaitsForTests() {
  waits.clear();
  listeners.clear();
  nextId = 1;
}
