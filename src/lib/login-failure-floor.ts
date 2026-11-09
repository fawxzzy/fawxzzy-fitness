// Minimum-latency floor for failed sign-ins. A failed attempt that resolves a username, a failed attempt that does
// not, and a provider rejection take different amounts of time; padding every failure to the same floor (plus a
// little jitter) removes the cheap timing signal without issuing any dummy sign-ins. Successes are unaffected.
export const LOGIN_FAILURE_MIN_MS = 700;
export const LOGIN_FAILURE_JITTER_MS = 150;

export type LoginFailureFloorDeps = {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
};

/** Waits until at least floor+jitter has elapsed since `startedAtMs`. Returns the milliseconds it waited. */
export async function enforceLoginFailureFloor(startedAtMs: number, deps: LoginFailureFloorDeps = {}): Promise<number> {
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = deps.random ?? Math.random;
  const target = LOGIN_FAILURE_MIN_MS + Math.min(Math.max(random(), 0), 1) * LOGIN_FAILURE_JITTER_MS;
  const remaining = Math.ceil(target - (now() - startedAtMs));
  if (remaining <= 0) return 0;
  await sleep(remaining);
  return remaining;
}
