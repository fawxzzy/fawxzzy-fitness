import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ERROR_COPY } from "./errorCopy";
import { NotFoundScreen } from "./NotFoundScreen";

// Words a user must never see on an error screen (DESIGN-CONTRACT 8.3).
const DEVELOPER_TERMS = /app-shell|app-content|\bExceptions?\b|TypeError|stack trace|digest|undefined|NaN|supabase|data service|safe shell|ledger|mutation|NODE_ENV|Failed to fetch/i;

const read = (name: string) => readFile(new URL(name, import.meta.url), "utf8");

test("not-found renders a branded page with one primary action to Today", () => {
  const html = renderToStaticMarkup(createElement(NotFoundScreen));
  assert.match(html, /We can&#x27;t find that page\./);
  assert.match(html, /Fitness/);
  assert.equal((html.match(/<a /g) ?? []).length, 1);
  assert.match(html, /href="\/today"/);
  assert.match(html, />Back to Today</);
  assert.equal((html.match(/<button/g) ?? []).length, 0);
});

test("not-found carries no PII, ids, or request data", async () => {
  const html = renderToStaticMarkup(createElement(NotFoundScreen));
  assert.doesNotMatch(html, /@|uuid|user|email|session|token/i);
  const source = await read("./NotFoundScreen.tsx");
  assert.doesNotMatch(source, /supabase|cookies|headers|fetch\(|getUser|usePathname|searchParams/i);
  const route = await read("../../app/not-found.tsx");
  assert.doesNotMatch(route, /supabase|cookies|headers|fetch\(|getUser/i);
});

test("error copy has no developer terms", () => {
  for (const value of Object.values(ERROR_COPY)) {
    assert.doesNotMatch(value, DEVELOPER_TERMS);
  }
  assert.equal(ERROR_COPY.boundaryTitle, "Something went wrong");
  assert.equal(ERROR_COPY.boundaryBody, "This did not sign you out.");
});

test("boundaries and global-error use the shared copy and keep Retry and Reload app", async () => {
  const recovery = await read("./AppRecoveryScreen.tsx");
  const soft = await read("./AppSoftErrorBoundary.tsx");
  const globalError = await read("../../app/global-error.tsx");
  for (const source of [recovery, soft, globalError]) {
    assert.doesNotMatch(source, /app-shell|could not load|data service|safe shell/i);
  }
  for (const source of [recovery, soft]) {
    assert.match(source, /ERROR_COPY\.retryLabel/);
    assert.match(source, /ERROR_COPY\.reloadLabel/);
  }
  assert.match(globalError, /ERROR_COPY\.globalBody/);
});

test("the dev-only error name suffix stays behind the production check", async () => {
  const soft = await read("./AppSoftErrorBoundary.tsx");
  assert.match(soft, /process\.env\.NODE_ENV !== "production" \? ` \(\$\{error\.name\}\)` : ""/);
  const recovery = await read("./AppRecoveryScreen.tsx");
  assert.doesNotMatch(recovery, /\{errorName\}|error\.name\}/);
});

test("not-found, app-error and global-error render in the Auth Surface v2 status shell", async () => {
  const html = renderToStaticMarkup(createElement(NotFoundScreen));
  assert.match(html, /data-testid="not-found-screen"/);
  assert.match(html, /class="fx-auth[^"]*"/);
  assert.match(html, /class="fx-mark"/);
  assert.match(html, /<h1 class="fx-ttl">We can&#x27;t find that page\.<\/h1>/);
  assert.match(html, /<p class="fx-lead">It may have moved, or the link may be wrong\.<\/p>/);
  assert.match(html, /class="fx-dock"[^>]*>Back to Today</);

  const recovery = await read("./AppRecoveryScreen.tsx");
  assert.match(recovery, /<AuthStatusScreen/);
  assert.match(recovery, /lead=\{topMessage \?\? ERROR_COPY\.boundaryBody\}/);
  assert.match(recovery, /<AuthDockButton[^>]*onClick=\{\(\) => onReopen\?\.\(\)\}/);
  assert.match(recovery, /<AuthLinkButton onClick=\{\(\) => window\.location\.reload\(\)\}>\{ERROR_COPY\.reloadLabel\}/);
  assert.doesNotMatch(recovery, /SurfaceCard|fixed inset-0/);

  for (const route of ["../../app/error.tsx", "../../app/global-error.tsx"]) {
    assert.match(await read(route), /<AppRecoveryScreen/);
  }
});
