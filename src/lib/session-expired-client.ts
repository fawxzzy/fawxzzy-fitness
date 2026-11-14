import { SESSION_EXPIRED_LOGIN_ERROR } from "@/lib/auth-session";

export const SESSION_EXPIRED_LOGIN_PATH = `/login?error=${SESSION_EXPIRED_LOGIN_ERROR}`;

// JSON endpoints answer an expired session with 401 JSON. The app still has to send the person to login.
export function isSessionExpiredResponse(status: number) {
  return status === 401;
}

export function redirectToLoginForExpiredSession() {
  if (typeof window !== "undefined") {
    window.location.assign(SESSION_EXPIRED_LOGIN_PATH);
  }
}
