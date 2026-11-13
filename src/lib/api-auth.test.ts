import assert from "node:assert/strict";
import test from "node:test";

import { redirect } from "next/navigation";

import { API_SESSION_EXPIRED_MESSAGE, resolveApiUser } from "@/lib/api-auth";

type LoadUser = NonNullable<Parameters<typeof resolveApiUser>[0]>;

test("resolveApiUser returns the user when the session is valid", async () => {
  const user = { id: "user-1" } as Awaited<ReturnType<LoadUser>>;
  const result = await resolveApiUser(async () => user);

  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.user.id : null, "user-1");
});

test("resolveApiUser maps requireUser's login redirect to a 401 JSON response", async () => {
  const result = await resolveApiUser(async () => redirect("/login"));

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.equal(result.response.status, 401);
  assert.equal(result.response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await result.response.json(), { ok: false, error: API_SESSION_EXPIRED_MESSAGE });
});

test("resolveApiUser rethrows failures that are not an authentication redirect", async () => {
  const failure = new Error("supabase unavailable");

  await assert.rejects(
    resolveApiUser(async () => {
      throw failure;
    }),
    (error) => error === failure,
  );
});

test("JSON API routes authenticate with resolveApiUser before their try block", async () => {
  const { readFileSync } = await import("node:fs");
  const routes = [
    "src/app/api/history/sessions/route.ts",
    "src/app/api/account/export/route.ts",
    "src/app/api/account/export/preview/route.ts",
  ];

  for (const route of routes) {
    const source = readFileSync(route, "utf8");
    assert.doesNotMatch(source, /requireUser\(/u, `${route} must not call requireUser directly`);
    const authIndex = source.indexOf("await resolveApiUser()");
    const tryIndex = source.indexOf("try {");
    assert.ok(authIndex > -1, `${route} must call resolveApiUser`);
    assert.ok(authIndex < tryIndex, `${route} must authenticate before its first try block`);
  }
});
