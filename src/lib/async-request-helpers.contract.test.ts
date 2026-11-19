// Next 16 removed synchronous cookies()/headers(). The helpers that read the request are async, and a
// missed `await` is dangerous here: an un-awaited Promise is truthy, so a guard such as
// `if (isHistoryPreviewActiveForRequest())` or `assertDevPageAvailable()` without `await` fails OPEN.
// This contract scans every non-test source file and fails on any call of a request helper (or of
// cookies()/headers() in a file importing next/headers) that is not directly awaited.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const srcRoot = path.join(repoRoot, "src");

/** Every async helper that reads the current request, with the file that declares it. */
const ASYNC_REQUEST_HELPERS: ReadonlyArray<{ name: string; file: string }> = [
  { name: "assertDevPageAvailable", file: "src/lib/dev-route-guard-page.ts" },
  { name: "assertDevServiceRolePageAvailable", file: "src/lib/dev-route-guard-page.ts" },
  { name: "readRequestHostHeader", file: "src/lib/dev-route-guard-page.ts" },
  { name: "isHistoryPreviewAvailableForRequest", file: "src/lib/history-preview.server.ts" },
  { name: "isHistoryPreviewActiveForRequest", file: "src/lib/history-preview.server.ts" },
  { name: "getRequestHost", file: "src/lib/history-preview.server.ts" },
  { name: "isTrustedLocalDevRequest", file: "src/lib/local-dev-auto-entry.ts" },
  { name: "getLocalDevAutoLoginCredentials", file: "src/lib/local-dev-auto-entry.ts" },
  { name: "getRequestHostname", file: "src/lib/local-dev-auto-entry.ts" },
  { name: "supabaseServer", file: "src/lib/supabase/server.ts" },
  { name: "supabaseServerWithSession", file: "src/lib/supabase/server.ts" },
  { name: "getRequestAccessToken", file: "src/lib/supabase/server.ts" },
  { name: "getRequestAuthTokens", file: "src/lib/supabase/server.ts" },
  { name: "readCurrentRequestServerSessionTokens", file: "src/lib/auth/server-session.ts" },
  { name: "recoverCurrentRequestServerSession", file: "src/lib/auth/server-session.ts" },
  { name: "getOrigin", file: "src/app/auth/actions.ts" },
  { name: "getAppOrigin", file: "src/app/auth/actions.ts" },
];

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

function rel(file: string) {
  return path.relative(repoRoot, file).split(path.sep).join("/");
}

// A call is safe when the text right before it on the same line is `await` (optionally `await (`),
// or when it is the helper's own declaration.
const SAFE_PREFIX = /(?:\bawait\s*\(?\s*|\bfunction\s+)$/;

function findUnawaitedCalls(source: string, name: string): string[] {
  const offenders: string[] = [];
  const call = new RegExp(`(?<![\\w.$])${name}\\(`, "g");
  source.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      return;
    }
    for (const match of line.matchAll(call)) {
      const before = line.slice(0, match.index);
      if (!SAFE_PREFIX.test(before)) {
        offenders.push(`${index + 1}: ${trimmed}`);
      }
    }
  });
  return offenders;
}

const sourceFiles = listSourceFiles(srcRoot);

test("every async request helper is declared async (Next 16 has no sync cookies()/headers())", () => {
  for (const { name, file } of ASYNC_REQUEST_HELPERS) {
    const source = readFileSync(path.join(repoRoot, file), "utf8");
    assert.match(source, new RegExp(`\\basync function ${name}\\(`), `${file} must declare ${name} as async`);
  }
});

test("every call of an async request helper is awaited (an un-awaited guard would fail open)", () => {
  const offenders: string[] = [];
  for (const file of sourceFiles) {
    const source = readFileSync(file, "utf8");
    for (const { name } of ASYNC_REQUEST_HELPERS) {
      if (!source.includes(`${name}(`)) continue;
      for (const hit of findUnawaitedCalls(source, name)) {
        offenders.push(`${rel(file)}:${hit}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `un-awaited async request helper calls:\n${offenders.join("\n")}`);
});

test("every cookies()/headers() call from next/headers is awaited", () => {
  const offenders: string[] = [];
  for (const file of sourceFiles) {
    const source = readFileSync(file, "utf8");
    if (!/from "next\/headers"/.test(source)) continue;
    for (const name of ["cookies", "headers"]) {
      for (const hit of findUnawaitedCalls(source, name)) {
        offenders.push(`${rel(file)}:${hit}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `un-awaited next/headers calls:\n${offenders.join("\n")}`);
});

test("no UnsafeUnwrapped* cast is left in the source (removed in Next 16)", () => {
  const offenders = sourceFiles.filter((file) => readFileSync(file, "utf8").includes("UnsafeUnwrapped")).map(rel);
  assert.deepEqual(offenders, []);
});

test("the scanner itself flags an un-awaited guard and accepts awaited forms", () => {
  assert.deepEqual(findUnawaitedCalls("  assertDevPageAvailable();", "assertDevPageAvailable").length, 1);
  assert.deepEqual(findUnawaitedCalls("  if (isHistoryPreviewActiveForRequest()) {", "isHistoryPreviewActiveForRequest").length, 1);
  assert.deepEqual(findUnawaitedCalls("  const ok = !isTrustedLocalDevRequest();", "isTrustedLocalDevRequest").length, 1);
  assert.deepEqual(findUnawaitedCalls("  await assertDevPageAvailable();", "assertDevPageAvailable"), []);
  assert.deepEqual(findUnawaitedCalls("  if (!(await isTrustedLocalDevRequest())) {", "isTrustedLocalDevRequest"), []);
  assert.deepEqual(findUnawaitedCalls("export async function supabaseServer() {", "supabaseServer"), []);
  assert.deepEqual(findUnawaitedCalls("  const h = request.headers();", "headers"), []);
});
