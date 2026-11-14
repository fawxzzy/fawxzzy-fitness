import test from "node:test";
import assert from "node:assert/strict";
import { isNextRedirectError, withSessionExpiredJson } from "@/lib/api-auth-redirect";
import { isSessionExpiredResponse, SESSION_EXPIRED_LOGIN_PATH } from "@/lib/session-expired-client";

test("a Next redirect thrown by requireUser becomes a 401 JSON session_expired response", async () => {
  const redirectError = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
  const response = await withSessionExpiredJson(async () => {
    throw redirectError;
  });

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.deepEqual(body, {
    ok: false,
    error: "Your session has expired. Sign in again.",
    code: "session_expired",
    loginPath: "/login?error=session_expired",
  });
});

test("non-redirect errors are rethrown and normal responses pass through", async () => {
  await assert.rejects(() => withSessionExpiredJson(async () => { throw new Error("boom"); }), /boom/);
  const ok = await withSessionExpiredJson(async () => new Response("fine", { status: 200 }));
  assert.equal(ok.status, 200);
  assert.equal(isNextRedirectError(new Error("plain")), false);
  assert.equal(isNextRedirectError(null), false);
});

test("the client treats only 401 as session expiry and logs in with the session_expired code", () => {
  assert.equal(isSessionExpiredResponse(401), true);
  assert.equal(isSessionExpiredResponse(400), false);
  assert.equal(SESSION_EXPIRED_LOGIN_PATH, "/login?error=session_expired");
});
