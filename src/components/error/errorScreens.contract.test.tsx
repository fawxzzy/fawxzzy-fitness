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
  assert.match(html, /Page not found/);
  assert.match(html, /Fitness/);
  assert.equal((html.match(/<a /g) ?? []).length, 1);
  assert.match(html, /href="\/today"/);
  assert.match(html, />Go to Today</);
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
  // Shared copy matrix words (FawxzzyWeb status-copy.ts): never the retired "Something went wrong".
  assert.equal(ERROR_COPY.boundaryTitle, "Could not load");
  assert.equal(ERROR_COPY.boundaryBody, "Check your connection and try again.");
  assert.equal(ERROR_COPY.retryLabel, "Try again");
  assert.equal(ERROR_COPY.notFoundTitle, "Page not found");
  assert.equal(ERROR_COPY.notFoundBody, "That page does not exist.");
  for (const value of Object.values(ERROR_COPY)) {
    assert.doesNotMatch(value, /something went wrong/i);
  }
});

test("boundaries and global-error use the shared copy and keep Try again plus a way out", async () => {
  const recovery = await read("./AppRecoveryScreen.tsx");
  const soft = await read("./AppSoftErrorBoundary.tsx");
  const globalError = await read("../../app/global-error.tsx");
  for (const source of [recovery, soft, globalError]) {
    assert.doesNotMatch(source, /app-shell|data service|safe shell/i);
  }
  for (const source of [recovery, soft]) {
    assert.match(source, /ERROR_COPY\.retryLabel/);
  }
  // One action only (Mazer parity): no second "Reload app" button.
  assert.doesNotMatch(soft, /reloadLabel|Reload app/);
  assert.match(recovery, /ERROR_COPY\.homeLabel/);
  assert.match(globalError, /<AppRecoveryScreen/);
});

test("no error detail reaches user text", async () => {
  const soft = await read("./AppSoftErrorBoundary.tsx");
  assert.doesNotMatch(soft, /\{error\.(name|message)\}|\(\$\{error\./);
  assert.doesNotMatch(soft, /NODE_ENV/);
  assert.match(soft, /ERROR_COPY\.boundaryTitle/);
  assert.match(soft, /ERROR_COPY\.boundaryBody/);
  const recovery = await read("./AppRecoveryScreen.tsx");
  assert.doesNotMatch(recovery, /\{errorName\}|error\.name\}/);
});

test("not-found, app-error and global-error render in the Auth Surface v2 status shell", async () => {
  const html = renderToStaticMarkup(createElement(NotFoundScreen));
  assert.match(html, /data-testid="not-found-screen"/);
  assert.match(html, /class="fx-auth[^"]*"/);
  assert.match(html, /class="fx-mark"/);
  assert.match(html, /<h1 class="fx-ttl">Page not found<\/h1>/);
  assert.match(html, /<p class="fx-lead">That page does not exist\.<\/p>/);
  assert.match(html, /class="fx-dock"[^>]*>Go to Today</);

  const recovery = await read("./AppRecoveryScreen.tsx");
  assert.match(recovery, /<AuthStatusScreen/);
  // One notice in the reserved slot (no lead), Try again in the dock, a plain link back to Today.
  assert.match(recovery, /notice=\{authNotice\("page\.crash"\)\}/);
  assert.doesNotMatch(recovery, /lead=/);
  assert.match(recovery, /<AuthDockButton[^>]*onClick=\{\(\) => \(onReopen \? onReopen\(\) : window\.location\.reload\(\)\)\}/);
  assert.match(recovery, /<a className="fx-link" href=\{ERROR_COPY\.homeHref\}>\{ERROR_COPY\.homeLabel\}<\/a>/);
  assert.doesNotMatch(recovery, /SurfaceCard|fixed inset-0/);

  for (const route of ["../../app/error.tsx", "../../app/global-error.tsx"]) {
    assert.match(await read(route), /<AppRecoveryScreen/);
  }
});
