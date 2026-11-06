import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { NextRequest } from "next/server.js";
import { DETAIL_NOT_FOUND_REWRITE_PATH, handleAuthSessionMiddleware } from "@/middleware";
import {
  HISTORY_STATIC_SEGMENTS,
  ROUTINES_STATIC_SEGMENTS,
  isDocumentNavigation,
  matchDetailRoute,
  shouldAnswerDetailRouteWithNotFound,
  type DetailRecordLookup,
} from "./detail-route-guard.ts";

const SESSION_ID = "d085d451-ff07-4bd6-acb6-d788684c3a41";
const ROUTINE_ID = "bdf34972-d47d-467f-b31b-b7cfd4e689e9";

test("detail routes resolve to the record that must be visible to the caller", () => {
  assert.deepEqual(matchDetailRoute(`/history/${SESSION_ID}`), { status: "check", target: { kind: "history-session", id: SESSION_ID } });
  for (const pathname of [
    `/routines/${ROUTINE_ID}`,
    `/routines/${ROUTINE_ID}/edit`,
    `/routines/${ROUTINE_ID}/edit/day/${SESSION_ID}`,
    `/routines/${ROUTINE_ID}/days/${SESSION_ID}`,
    `/routines/${ROUTINE_ID}/new-day`,
    `/routines/${ROUTINE_ID.toUpperCase()}/`,
  ]) {
    assert.deepEqual(matchDetailRoute(pathname), { status: "check", target: { kind: "routine", id: ROUTINE_ID } }, pathname);
  }
});

test("list pages, static siblings and unrelated routes are never guarded", () => {
  for (const pathname of [
    "/history",
    "/routines",
    "/today",
    `/session/${SESSION_ID}`,
    "/history/exercises",
    "/history/progression",
    "/routines/new",
    "/routines/workout-plans",
    "/history/exercises/abc",
    "/account",
  ]) {
    assert.deepEqual(matchDetailRoute(pathname), { status: "none" }, pathname);
  }
});

test("ids that cannot be records are a 404 without any lookup", async () => {
  assert.deepEqual(matchDetailRoute("/history/not-a-session"), { status: "malformed" });
  assert.deepEqual(matchDetailRoute("/routines/nonexistent/edit"), { status: "malformed" });
  let lookups = 0;
  const lookup: DetailRecordLookup = async () => {
    lookups++;
    return "found";
  };
  assert.equal(await shouldAnswerDetailRouteWithNotFound({ pathname: "/history/not-a-session", accessToken: "t", lookup }), true);
  assert.equal(lookups, 0);
});

test("only a confirmed-missing record is a 404; lookup errors fail open to the page", async () => {
  const outcome = (result: "found" | "missing" | "unknown") =>
    shouldAnswerDetailRouteWithNotFound({
      pathname: `/history/${SESSION_ID}`,
      accessToken: "t",
      lookup: async () => result,
    });
  assert.equal(await outcome("missing"), true);
  assert.equal(await outcome("found"), false);
  assert.equal(await outcome("unknown"), false);
});

test("another user's record and a nonexistent record are the same missing result", async () => {
  // The lookup runs with the caller's own token, so both cases come back as "missing" from the data layer.
  const seen: Array<{ kind: string; id: string; accessToken: string }> = [];
  const lookup: DetailRecordLookup = async ({ target, accessToken }) => {
    seen.push({ kind: target.kind, id: target.id, accessToken });
    return "missing";
  };
  const foreign = await shouldAnswerDetailRouteWithNotFound({ pathname: `/history/${SESSION_ID}`, accessToken: "user-b", lookup });
  const nonexistent = await shouldAnswerDetailRouteWithNotFound({ pathname: `/history/${ROUTINE_ID}`, accessToken: "user-b", lookup });
  assert.equal(foreign, nonexistent);
  assert.deepEqual(seen.map((entry) => entry.accessToken), ["user-b", "user-b"]);
});

test("only full document loads are guarded, not RSC transitions or prefetches", () => {
  assert.equal(isDocumentNavigation(new NextRequest("https://example.com/history/x")), true);
  assert.equal(isDocumentNavigation(new NextRequest("https://example.com/history/x", { method: "POST" })), false);
  assert.equal(isDocumentNavigation(new NextRequest("https://example.com/history/x", { headers: { rsc: "1" } })), false);
  assert.equal(isDocumentNavigation(new NextRequest("https://example.com/history/x", { headers: { "next-router-prefetch": "1" } })), false);
});

test("guarded static segments cover every static folder next to the dynamic id segment", () => {
  const appDir = path.resolve(import.meta.dirname, "../app");
  const staticFolders = (parent: string) =>
    readdirSync(path.join(appDir, parent), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("[") && !entry.name.startsWith("("))
      .map((entry) => entry.name)
      .sort();

  assert.deepEqual(staticFolders("history"), [...HISTORY_STATIC_SEGMENTS].sort());
  assert.deepEqual(staticFolders("routines"), [...ROUTINES_STATIC_SEGMENTS].sort());
});

function sessionRequest(pathname: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://example.com${pathname}`, {
    headers: { cookie: "sb-access-token=access-1; sb-refresh-token=refresh-1", ...headers },
  });
}

const existingSession = async () => ({
  status: "existing" as const,
  authState: "authenticated" as const,
  session: { accessToken: "access-1", refreshToken: "refresh-1" },
});

test("middleware answers a missing detail record with a real 404 rewrite", async () => {
  const response = await handleAuthSessionMiddleware(sessionRequest(`/history/${SESSION_ID}`), {
    recoverSession: existingSession,
    lookupDetailRecord: async () => "missing",
  });

  assert.equal(response.status, 404);
  assert.match(response.headers.get("x-middleware-rewrite") ?? "", new RegExp(`${DETAIL_NOT_FOUND_REWRITE_PATH}$`));
});

test("middleware keeps the refreshed session cookies on the 404 rewrite", async () => {
  const response = await handleAuthSessionMiddleware(sessionRequest(`/routines/${ROUTINE_ID}/edit`), {
    recoverSession: async () => ({
      status: "refreshed",
      authState: "refreshed-from-refresh-cookie",
      session: { accessToken: "access-2", refreshToken: "refresh-2" },
    }),
    lookupDetailRecord: async ({ accessToken }) => (accessToken === "access-2" ? "missing" : "found"),
  });

  assert.equal(response.status, 404);
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /sb-access-token=access-2/);
});

test("middleware renders the page when the record exists, the lookup is unsure, or it is not a document load", async () => {
  for (const [lookupResult, headers] of [
    ["found", {}],
    ["unknown", {}],
    ["missing", { rsc: "1" }],
  ] as const) {
    const response = await handleAuthSessionMiddleware(sessionRequest(`/history/${SESSION_ID}`, headers), {
      recoverSession: existingSession,
      lookupDetailRecord: async () => lookupResult,
    });
    assert.equal(response.status, 200, `${lookupResult} ${JSON.stringify(headers)}`);
    assert.equal(response.headers.get("x-middleware-rewrite"), null);
  }
});

test("middleware never looks up records for non-detail routes", async () => {
  let lookups = 0;
  const response = await handleAuthSessionMiddleware(sessionRequest("/history"), {
    recoverSession: existingSession,
    lookupDetailRecord: async () => {
      lookups++;
      return "missing";
    },
  });
  assert.equal(response.status, 200);
  assert.equal(lookups, 0);
});
