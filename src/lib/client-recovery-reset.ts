import {
  buildRouteLoadingRecoveryHref,
  clearRouteLoadingRecoveryAttempt,
} from "@/lib/route-loading-recovery";
import {
  clearAppLaunchRecoveryAttempt,
} from "@/lib/app-launch-recovery";

const APP_RECOVERY_LOGIN_REDIRECT_KEY_PREFIX = "fitness:app-recovery-login-redirect:";

export function clearClientRecoveryState(storage?: Storage | null) {
  clearAppLaunchRecoveryAttempt(storage);
  clearRouteLoadingRecoveryAttempt(storage);

  const resolvedStorage = storage ?? (typeof window !== "undefined" ? window.sessionStorage : null);
  if (!resolvedStorage) {
    return;
  }

  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < resolvedStorage.length; index += 1) {
      const key = resolvedStorage.key(index);
      if (key?.startsWith(APP_RECOVERY_LOGIN_REDIRECT_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      resolvedStorage.removeItem(key);
    }
  } catch {
    // Ignore storage failures and continue with the reset path.
  }
}

export function buildFreshRecoveryReloadHref(currentHref: string) {
  return buildRouteLoadingRecoveryHref(currentHref);
}
