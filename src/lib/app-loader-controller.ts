/**
 * The one registry of "something is being waited on". Every <RouteLoading> (a route's loading.tsx, a Suspense
 * fallback, an entry gate) registers here while it is mounted and releases on unmount; none of them owns a timer.
 * The single <AppLoaderHost> in the root layout reads this registry and runs the show delay, minimum hold and fades
 * (src/lib/app-loader.ts), so a wait that moves between route segments is ONE wait to the loader.
 *
 * Module state, no React: subscribe/getSnapshot shaped for useSyncExternalStore and for tests.
 */

type LoaderWait = { readonly id: number; readonly label: string };

const waits = new Map<number, LoaderWait>();
const listeners = new Set<() => void>();
let nextId = 1;

function emit() {
  for (const listener of Array.from(listeners)) {
    listener();
  }
}

/** Registers a wait and returns its release. Releasing twice is a no-op. */
export function acquireLoaderWait(label: string): () => void {
  const id = nextId;
  nextId += 1;
  waits.set(id, { id, label });
  emit();

  return () => {
    if (waits.delete(id)) {
      emit();
    }
  };
}

export function getLoaderWaitCount(): number {
  return waits.size;
}

/** The label of the most recently registered wait still open, or "" when nothing is being waited on. */
export function getLoaderWaitLabel(): string {
  let latest: LoaderWait | null = null;
  for (const wait of waits.values()) {
    if (latest === null || wait.id > latest.id) {
      latest = wait;
    }
  }
  return latest?.label ?? "";
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
