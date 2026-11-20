import { isSafeAppPath } from "@/lib/navigation-return";

export const AUTH_CONFIRM_DEFAULT_REDIRECT_PATH = "/entry";
export const AUTH_CONFIRM_RECOVERY_REDIRECT_PATH = "/reset-password";

/**
 * Where /auth/confirm sends a person after a verified email link. `next` comes from the link's query string,
 * so it is only honoured when it is a safe in-app path; anything else (//host, https://host, /\host) lands on /entry.
 */
export function resolveAuthConfirmRedirectPath(next: string | null | undefined, isRecoveryFlow: boolean) {
  if (isRecoveryFlow) {
    return AUTH_CONFIRM_RECOVERY_REDIRECT_PATH;
  }

  return isSafeAppPath(next) ? next : AUTH_CONFIRM_DEFAULT_REDIRECT_PATH;
}
