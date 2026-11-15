import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  revokeSessionBehindCookies,
  revokeSessionBehindCookiesWithin,
  SIGN_OUT_REVOCATION_SCOPE,
  type SignOutRevocationClient,
} from "@/lib/auth/sign-out-revocation";

const NOW = 1_800_000_000;

function jwtWithExp(exp: number) {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "HS256" })}.${part({ exp })}.sig`;
}

const LIVE_ACCESS = jwtWithExp(NOW + 3600);
const EXPIRED_ACCESS = jwtWithExp(NOW - 10);

type Calls = { logout: Array<{ jwt: string; scope: string }>; refresh: string[] };

function fakeClient(options: {
  logoutError?: unknown;
  refreshError?: unknown;
  refreshedAccess?: string | null;
} = {}): { client: SignOutRevocationClient; calls: Calls } {
  const calls: Calls = { logout: [], refresh: [] };
  const client: SignOutRevocationClient = {
    auth: {
      admin: {
        async signOut(jwt, scope) {
          calls.logout.push({ jwt, scope });
          return { error: options.logoutError ?? null };
        },
      },
      async refreshSession({ refresh_token }) {
        calls.refresh.push(refresh_token);
        return {
          data: { session: options.refreshedAccess === null ? null : { access_token: options.refreshedAccess ?? "fresh-access" } },
          error: options.refreshError ?? null,
        };
      },
    },
  };
  return { client, calls };
}

test("a live access token is revoked directly with the local scope and never refreshed", async () => {
  const { client, calls } = fakeClient();
  const outcome = await revokeSessionBehindCookies({ accessToken: LIVE_ACCESS, refreshToken: "r1", client, nowSeconds: NOW });

  assert.equal(outcome, "revoked");
  assert.deepEqual(calls.logout, [{ jwt: LIVE_ACCESS, scope: SIGN_OUT_REVOCATION_SCOPE }]);
  assert.equal(SIGN_OUT_REVOCATION_SCOPE, "local");
  assert.deepEqual(calls.refresh, []);
});

test("an expired or missing access token is renewed from the refresh token, then the session is revoked", async () => {
  for (const accessToken of [EXPIRED_ACCESS, "", null]) {
    const { client, calls } = fakeClient({ refreshedAccess: "fresh-access" });
    const outcome = await revokeSessionBehindCookies({ accessToken, refreshToken: "r1", client, nowSeconds: NOW });

    assert.equal(outcome, "revoked");
    assert.deepEqual(calls.refresh, ["r1"]);
    assert.deepEqual(calls.logout, [{ jwt: "fresh-access", scope: "local" }]);
  }
});

test("a session the auth server already dropped counts as already invalid, not as a failure", async () => {
  const gone = { name: "AuthApiError", status: 403, message: "session_not_found" };
  const direct = fakeClient({ logoutError: gone });
  assert.equal(
    await revokeSessionBehindCookies({ accessToken: LIVE_ACCESS, refreshToken: "", client: direct.client, nowSeconds: NOW }),
    "already-invalid",
  );

  const refreshRefused = fakeClient({ refreshError: { name: "AuthApiError", status: 400, message: "Invalid Refresh Token" } });
  assert.equal(
    await revokeSessionBehindCookies({ accessToken: "", refreshToken: "r1", client: refreshRefused.client, nowSeconds: NOW }),
    "already-invalid",
  );
  assert.deepEqual(refreshRefused.calls.logout, []);

  const expiredOnly = fakeClient();
  assert.equal(
    await revokeSessionBehindCookies({ accessToken: EXPIRED_ACCESS, refreshToken: "", client: expiredOnly.client, nowSeconds: NOW }),
    "already-invalid",
  );
  assert.deepEqual(expiredOnly.calls.logout, []);
});

test("no cookies means nothing to revoke and no auth call", async () => {
  const { client, calls } = fakeClient();
  assert.equal(await revokeSessionBehindCookies({ accessToken: "", refreshToken: " ", client, nowSeconds: NOW }), "no-session");
  assert.deepEqual(calls, { logout: [], refresh: [] });
});

test("an unconfirmed revocation (server error, network throw) is reported as failed, never as revoked", async () => {
  const server = fakeClient({ logoutError: { name: "AuthRetryableFetchError", status: 502 } });
  assert.equal(
    await revokeSessionBehindCookies({ accessToken: LIVE_ACCESS, refreshToken: "", client: server.client, nowSeconds: NOW }),
    "failed",
  );

  const throwing: SignOutRevocationClient = {
    auth: {
      admin: { signOut: async () => { throw new Error("network"); } },
      refreshSession: async () => ({ data: { session: null }, error: null }),
    },
  };
  assert.equal(
    await revokeSessionBehindCookies({ accessToken: LIVE_ACCESS, refreshToken: "r1", client: throwing, nowSeconds: NOW }),
    "failed",
  );

  const noSession = fakeClient({ refreshedAccess: null });
  assert.equal(
    await revokeSessionBehindCookies({ accessToken: "", refreshToken: "r1", client: noSession.client, nowSeconds: NOW }),
    "failed",
  );
});

test("a failed direct logout with a refresh token still tries the refresh path", async () => {
  const { client, calls } = fakeClient({ logoutError: { name: "AuthRetryableFetchError", status: 502 } });
  const outcome = await revokeSessionBehindCookies({ accessToken: LIVE_ACCESS, refreshToken: "r1", client, nowSeconds: NOW });
  assert.equal(outcome, "failed");
  assert.equal(calls.logout.length, 2);
  assert.deepEqual(calls.refresh, ["r1"]);
});

test("the timeout wrapper bounds a hung auth server and reports failed", async () => {
  const hung = await revokeSessionBehindCookiesWithin(() => new Promise(() => undefined), 20);
  assert.equal(hung, "failed");
  assert.equal(await revokeSessionBehindCookiesWithin(async () => "revoked", 20), "revoked");
  assert.equal(await revokeSessionBehindCookiesWithin(async () => { throw new Error("x"); }, 20), "failed");
});

test("wiring pin: the sign-out route revokes on the server, and the button reaches it before the local sign-out", () => {
  const handlers = readFileSync(new URL("../auth-handoff-handlers.ts", import.meta.url), "utf8");
  const button = readFileSync(new URL("../../components/SignOutButton.tsx", import.meta.url), "utf8");

  assert.match(handlers, /getHandoffRuntime: getFitnessHandoffRuntime,\s+revokeSession: revokeRequestSession,/);
  assert.match(handlers, /dependencies\.revokeSession\(/);
  assert.ok(
    button.indexOf('"/auth/session-sync"') < button.indexOf("signOut({ scope"),
    "the server revocation request must run before the browser-local signOut",
  );
});

test("server reads verify the live session with the auth server (getUser), not a cached identity", () => {
  const auth = readFileSync(new URL("../auth.ts", import.meta.url), "utf8");
  assert.match(auth, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(auth, /auth\.getSession\(|auth\.getClaims\(/);
});
