"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * The browser's online flag, live. Used to hide actions that only work online (Remove from workout) instead of letting
 * them fail after a confirm. The server render assumes online; `navigator.onLine === false` is the only offline signal.
 */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine !== false,
    () => true,
  );
}
