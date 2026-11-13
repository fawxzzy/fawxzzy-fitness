import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { NextRequest } from "next/server.js";
import { middleware } from "@/middleware";
import { assertDevPageAvailable, assertDevServiceRolePageAvailable } from "./dev-route-guard-page.ts";
import {
  devRouteUnavailableResponse,
  devServiceRoleRouteUnavailableResponse,
  hostnameFromHostHeader,
  hostnamesOf,
  isDevOnlyPath,
  isDevRouteWithdrawn,
  isDevServiceRoleRouteWithdrawn,
  isLoopbackHostname,
  isProductionDeployment,
  isProductionHostname,
  readDevGuardEnv,
} from "./dev-route-guard.ts";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function listFiles(relativeDir: string): string[] {
  const absoluteDir = path.join(repoRoot, relativeDir);
  return readdirSync(absoluteDir).flatMap((name) => {
    const relativePath = path.posix.join(relativeDir, name);
    return statSync(path.join(repoRoot, relativePath)).isDirectory() ? listFiles(relativePath) : [relativePath];
  });
}

// Route handlers outside the dev tree that are dev-only too.
const guardedHandlerFiles = [
  ...listFiles("src/app/dev").filter((file) => /\/route\.ts$/.test(file)),
  ...listFiles("src/app/api/dev").filter((file) => /\/route\.ts$/.test(file)),
  "src/app/api/ecosystem/fitness/debug/route.ts",
];

// Dev pages that had no production check of their own before the shared guard.
const pagesWithSharedGuard = [
  "src/app/dev/env/page.tsx",
  "src/app/dev/flags/page.tsx",
  "src/app/dev/qa-shot/page.tsx",
  "src/app/dev/app-boundary-probe/page.tsx",
  "src/app/dev/stretch-card-pass/page.tsx",
  "src/app/dev/stretch-info-preview/page.tsx",
  "src/app/dev/stretch-session-preview/page.tsx",
  "src/app/dev/curated-onboarding/page.tsx",
  "src/app/dev/mobile-regression/page.tsx",
];

async function withEnv<T>(env: Record<string, string | undefined>, run: () => Promise<T>) {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function hostnamesFor(hostname: string | null | undefined) {
  return hostname == null ? [] : [hostname];
}

// A request whose Host header matches its URL, as a real server request does.
function nextRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers: { host: new URL(url).host, ...headers } });
}

// Production hostname (the canonical origin host) and a host that is not one.
const EXTERNAL_HOST = "fitness.fawxzzy.com";
const OTHER_HOST = "qa.example.test";
const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]", "::1", "LOCALHOST"];
const isNotFound = (error: unknown) => (error as { digest?: string }).digest === "NEXT_NOT_FOUND";

test("a production platform signal withdraws dev routes whatever else is set", () => {
  assert.equal(isProductionDeployment({ VERCEL_ENV: "production" }), true);

  for (const hostname of [EXTERNAL_HOST, "localhost", "127.0.0.1", null, undefined]) {
    for (const NODE_ENV of ["production", "development", "test", undefined]) {
      assert.equal(
        isDevRouteWithdrawn({
          hostnames: hostnamesFor(hostname),
          env: { VERCEL_ENV: "production", NODE_ENV, HISTORY_QA_PREVIEW_ENABLED: "1" },
        }),
        true,
        `${hostname} ${NODE_ENV}`,
      );
    }
  }
});

test("a preview or development platform signal keeps dev routes available in production mode", () => {
  for (const VERCEL_ENV of ["preview", "development"]) {
    assert.equal(isDevRouteWithdrawn({ hostnames: [EXTERNAL_HOST], env: { VERCEL_ENV, NODE_ENV: "production" } }), false, VERCEL_ENV);
  }
});

test("without a platform signal a production-mode server fails closed unless it opts in or is loopback", () => {
  for (const VERCEL_ENV of [undefined, "", "staging"]) {
    const env = { VERCEL_ENV, NODE_ENV: "production" };

    // Withdrawn: external, private-network and unknown hosts without the opt-in.
    for (const hostname of [EXTERNAL_HOST, OTHER_HOST, "192.168.1.20", "10.0.0.2", "172.16.0.9", null, undefined, ""]) {
      assert.equal(isDevRouteWithdrawn({ hostnames: hostnamesFor(hostname), env }), true, `${VERCEL_ENV} ${hostname}`);
    }

    // Loopback is reachable (a local-run convenience).
    for (const hostname of LOOPBACK_HOSTS) {
      assert.equal(isDevRouteWithdrawn({ hostnames: hostnamesFor(hostname), env }), false, `${VERCEL_ENV} ${hostname}`);
    }

    // The opt-in admits a non-production host, but only the exact value "1".
    assert.equal(isDevRouteWithdrawn({ hostnames: [OTHER_HOST], env: { ...env, HISTORY_QA_PREVIEW_ENABLED: "1" } }), false);
    for (const optIn of ["0", "true", "", " 1"]) {
      assert.equal(isDevRouteWithdrawn({ hostnames: [OTHER_HOST], env: { ...env, HISTORY_QA_PREVIEW_ENABLED: optIn } }), true, optIn);
    }
  }
});

test("only an explicit development or test NODE_ENV is exempt; every other value fails closed", () => {
  for (const NODE_ENV of ["development", "test"]) {
    assert.equal(isDevRouteWithdrawn({ hostnames: [OTHER_HOST], env: { NODE_ENV } }), false, NODE_ENV);
  }

  for (const NODE_ENV of [undefined, "", "production", "Production", "PRODUCTION", "staging", "prod", "Development", "dev", " test"]) {
    assert.equal(isDevRouteWithdrawn({ hostnames: [OTHER_HOST], env: { NODE_ENV } }), true, String(NODE_ENV));
    assert.equal(isDevRouteWithdrawn({ hostnames: [OTHER_HOST], env: { NODE_ENV, VERCEL_ENV: "staging" } }), true, `staging ${NODE_ENV}`);
    // Loopback and the opt-in (off production hostnames) still admit a local run.
    assert.equal(isDevRouteWithdrawn({ hostnames: ["127.0.0.1"], env: { NODE_ENV } }), false, `loopback ${NODE_ENV}`);
    assert.equal(isDevRouteWithdrawn({ hostnames: [OTHER_HOST], env: { NODE_ENV, HISTORY_QA_PREVIEW_ENABLED: "1" } }), false, `opt-in ${NODE_ENV}`);
  }
});

test("the opt-in is refused when any host signal is a production hostname", () => {
  const env = { NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: "1" };

  for (const hostname of [EXTERNAL_HOST, "FITNESS.fawxzzy.com", `${EXTERNAL_HOST}.`, "fawxzzy-fitness-local.vercel.app", "fawxzzy-fitness-abc123-fawxzzy.vercel.app", "anything.vercel.app"]) {
    assert.equal(isProductionHostname(hostname), true, hostname);
    assert.equal(isDevRouteWithdrawn({ hostnames: [hostname], env }), true, hostname);
    // Either signal is enough: a loopback bind address with a production Host header.
    assert.equal(isDevRouteWithdrawn({ hostnames: ["127.0.0.1", hostname], env }), true, `both ${hostname}`);
    assert.equal(isDevRouteWithdrawn({ hostnames: [hostname, "127.0.0.1"], env }), true, `both ${hostname}`);
  }

  for (const hostname of [OTHER_HOST, "localhost", "127.0.0.1", "192.168.1.20", "vercel.app.example.test", "", null, undefined]) {
    assert.equal(isProductionHostname(hostname), false, String(hostname));
  }
  assert.equal(isDevRouteWithdrawn({ hostnames: [OTHER_HOST, "127.0.0.1"], env }), false);
});

test("host helpers accept only loopback names and parse Host header values strictly", () => {
  for (const hostname of LOOPBACK_HOSTS) {
    assert.equal(isLoopbackHostname(hostname), true, hostname);
  }
  for (const hostname of [EXTERNAL_HOST, "127.0.0.2", "0.0.0.0", "192.168.1.5", "localhost.example.com", "", null, undefined]) {
    assert.equal(isLoopbackHostname(hostname), false, String(hostname));
  }

  assert.equal(hostnameFromHostHeader("127.0.0.1:3000"), "127.0.0.1");
  assert.equal(hostnameFromHostHeader("[::1]:3000"), "[::1]");
  assert.equal(hostnameFromHostHeader("[::1]"), "[::1]");
  assert.equal(hostnameFromHostHeader("LocalHost"), "localhost");
  assert.equal(hostnameFromHostHeader("LOCALHOST:8080"), "localhost");
  assert.equal(hostnameFromHostHeader(`${EXTERNAL_HOST}:443`), EXTERNAL_HOST);
  assert.equal(hostnameFromHostHeader("  localhost:3000  "), "localhost");

  // Present but unparsable, or missing: no hostname.
  for (const host of ["", "   ", null, undefined, "[::1", "localhost:", "localhost:abc", "localhost:123456", "local host", "localhost/evil", "localhost:3000/evil", "a,b", "user@localhost", "localhost:3000:4000", "[::1]x", "[zz]:3000", "http://localhost"]) {
    assert.equal(hostnameFromHostHeader(host), null, String(host));
  }
});

test("loopback needs every host signal to agree, and a missing or unparsable Host counts as non-loopback", () => {
  const env = { NODE_ENV: "production" };

  assert.deepEqual(hostnamesOf(new Request("http://127.0.0.1:3000/dev", { headers: { host: "127.0.0.1:3000" } })), ["127.0.0.1", "127.0.0.1"]);
  assert.deepEqual(hostnamesOf(new Request("http://127.0.0.1:3000/dev", { headers: { host: "[::1]:3000" } })), ["127.0.0.1", "[::1]"]);
  // No Host header: the second signal is "", never loopback.
  assert.deepEqual(hostnamesOf(new Request("http://127.0.0.1:3000/dev")), ["127.0.0.1", ""]);
  // A Host header that is present but unparsable also contributes "".
  assert.deepEqual(hostnamesOf(new Request("http://127.0.0.1:3000/dev", { headers: { host: "localhost:abc" } })), ["127.0.0.1", ""]);
  assert.deepEqual(hostnamesOf({ url: "not a url", headers: new Headers({ host: "localhost" }) }), ["", "localhost"]);

  assert.equal(isDevRouteWithdrawn({ hostnames: ["127.0.0.1", "localhost"], env }), false);
  assert.equal(isDevRouteWithdrawn({ hostnames: ["127.0.0.1", ""], env }), true);
  assert.equal(isDevRouteWithdrawn({ hostnames: ["", "localhost"], env }), true);
  // A self-hosted server's URL host is its bind address, so a non-loopback Host header decides.
  assert.equal(isDevRouteWithdrawn({ hostnames: ["127.0.0.1", OTHER_HOST], env }), true);
  assert.equal(isDevRouteWithdrawn({ hostnames: [OTHER_HOST, "localhost"], env }), true);
  // Nothing presented is not local.
  assert.equal(isDevRouteWithdrawn({ hostnames: [], env }), true);
  assert.equal(isDevRouteWithdrawn({ hostnames: [""], env }), true);
});

test("the handler response is an uncached 404 that carries no route detail and ignores forwarded hosts", async () => {
  const production = { VERCEL_ENV: "production" };
  const response = devRouteUnavailableResponse(new Request(`https://${EXTERNAL_HOST}/dev`, { headers: { host: EXTERNAL_HOST } }), production);

  assert.ok(response);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { ok: false, error: "Not found." });

  const local = new Request("http://localhost:3000/dev", { headers: { host: "localhost:3000" } });
  assert.equal(devRouteUnavailableResponse(local, { NODE_ENV: "production" }), null);

  // A forwarded-host header never makes a non-loopback request look local.
  const withForwardedHost = new Request(`https://${OTHER_HOST}/dev`, { headers: { "x-forwarded-host": "localhost", host: OTHER_HOST } });
  assert.ok(devRouteUnavailableResponse(withForwardedHost, { NODE_ENV: "production" }));

  // A loopback bind address with a different Host header is still withdrawn.
  const proxied = new Request("http://127.0.0.1:3000/dev", { headers: { host: OTHER_HOST, "x-forwarded-host": "localhost" } });
  assert.ok(devRouteUnavailableResponse(proxied, { NODE_ENV: "production" }));

  // A missing or unparsable Host header is withdrawn too, even on a loopback URL.
  assert.ok(devRouteUnavailableResponse(new Request("http://127.0.0.1:3000/dev"), { NODE_ENV: "production" }));
  assert.ok(devRouteUnavailableResponse(new Request("http://127.0.0.1:3000/dev", { headers: { host: "localhost:abc" } }), { NODE_ENV: "production" }));
});

test("environment values are read through literal process.env expressions", () => {
  const guardSource = read("src/lib/dev-route-guard.ts");
  const pageGuardSource = read("src/lib/dev-route-guard-page.ts");
  const middlewareSource = read("src/middleware.ts");

  // Next inlines only the literal `process.env.NODE_ENV` expression, so no layer may alias the object.
  for (const source of [guardSource, pageGuardSource]) {
    assert.doesNotMatch(source, /=\s*process\.env\s*[,;)]/);
    assert.doesNotMatch(source, /\bprocess\.env\s*\)/);
  }
  assert.match(guardSource, /NODE_ENV: process\.env\.NODE_ENV,/);
  assert.match(guardSource, /VERCEL_ENV: process\.env\.VERCEL_ENV,/);
  assert.match(guardSource, /HISTORY_QA_PREVIEW_ENABLED: process\.env\.HISTORY_QA_PREVIEW_ENABLED,/);
  assert.match(middlewareSource, /NODE_ENV: process\.env\.NODE_ENV,/);
  assert.match(middlewareSource, /VERCEL_ENV: process\.env\.VERCEL_ENV,/);
  assert.match(middlewareSource, /HISTORY_QA_PREVIEW_ENABLED: process\.env\.HISTORY_QA_PREVIEW_ENABLED,/);

  const snapshot = readDevGuardEnv();
  assert.deepEqual(Object.keys(snapshot).sort(), ["HISTORY_QA_PREVIEW_ENABLED", "NODE_ENV", "VERCEL_ENV"]);
});

test("the dev layout repeats the shared guard and does not claim to stop its page", () => {
  const source = read("src/app/dev/layout.tsx");

  assert.match(source, /from "@\/lib\/dev-route-guard-page"/);
  assert.match(source, /assertDevPageAvailable\(\);/);
  assert.match(source, /export const dynamic = "force-dynamic";/);
  assert.doesNotMatch(source, /NODE_ENV/);
  assert.match(source, /not stop the page under it/);
});

test("every dev page has a production check, and the unguarded pages call the shared guard first", () => {
  const pages = listFiles("src/app/dev").filter((file) => /\/page\.tsx$/.test(file));
  assert.ok(pages.length >= 20, String(pages.length));

  for (const file of pages) {
    assert.match(read(file), /assertDev(?:ServiceRole)?PageAvailable\(\)|process\.env\.NODE_ENV === "production"/, `${file} has no production check`);
  }

  for (const file of pagesWithSharedGuard) {
    const source = read(file);

    assert.match(source, /from "@\/lib\/dev-route-guard-page"/, file);
    assert.match(source, /export default (?:async )?function \w+\([\s\S]*?\) \{\s*assertDevPageAvailable\(\);/, `${file} must call the guard first`);
  }
});

const ADMIN_PATTERN = /\bsupabaseAdmin\b|@\/lib\/supabase\/admin/;

// Resolve the module specifiers a source file imports to repository paths (src only).
function importedSourceFiles(relativeFile: string): string[] {
  const source = read(relativeFile);
  const specifiers = [...source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((match) => match[1]);
  const resolved: string[] = [];

  for (const specifier of specifiers) {
    const base = specifier.startsWith("@/")
      ? path.posix.join("src", specifier.slice(2))
      : specifier.startsWith(".")
        ? path.posix.join(path.posix.dirname(relativeFile), specifier)
        : null;
    if (!base) continue;

    for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
      try {
        if (statSync(path.join(repoRoot, candidate)).isFile()) {
          resolved.push(candidate);
          break;
        }
      } catch {
        // not this candidate
      }
    }
  }

  return resolved;
}

test("any dev page or handler that reads with the service-role client, directly or through an import, calls the strict shared guard first", () => {
  const sourceFiles = [
    ...listFiles("src/app/dev"),
    ...listFiles("src/app/api/dev"),
    "src/app/api/ecosystem/fitness/debug/route.ts",
  ].filter((file) => /\.(?:ts|tsx)$/.test(file) && !/\.test\./.test(file));
  const direct = sourceFiles.filter((file) => ADMIN_PATTERN.test(read(file)));
  // One level of indirection: a dev file importing a module that itself imports the admin client.
  const indirect = sourceFiles.filter(
    (file) => !direct.includes(file) && importedSourceFiles(file).some((imported) => ADMIN_PATTERN.test(read(imported))),
  );

  // The five service-role dev pages and the dev history API route read with the admin client.
  assert.ok(direct.length >= 6, direct.join(", "));

  for (const file of [...direct, ...indirect]) {
    const source = read(file);

    if (/\/page\.tsx$/.test(file)) {
      assert.match(source, /from "@\/lib\/dev-route-guard-page"/, file);
      assert.match(
        source,
        /export default (?:async )?function \w+\([\s\S]*?\) \{\s*assertDevServiceRolePageAvailable\(\);/,
        `${file} must call the strict service-role page guard first`,
      );
      // A page-local copy of a spoofable gate must not come back.
      assert.doesNotMatch(source, /isLocalRequest|x-forwarded-host/, `${file} keeps its own host gate`);
    } else if (/\/route\.ts$/.test(file)) {
      assert.match(source, /const unavailable = devServiceRoleRouteUnavailableResponse\(request\);/, `${file} must call the strict service-role handler guard`);
    } else {
      assert.fail(`${file} reaches the service-role client but is neither a dev page nor a route handler`);
    }
  }
});

test("the strict service-role rule keeps previews and the opt-in away from admin-client reads", () => {
  const productionMode = { NODE_ENV: "production" };

  // Platform preview: general dev routes stay open, service-role routes need loopback.
  assert.equal(isDevRouteWithdrawn({ hostnames: [OTHER_HOST], env: { ...productionMode, VERCEL_ENV: "preview" } }), false);
  assert.equal(isDevServiceRoleRouteWithdrawn({ hostnames: [OTHER_HOST], env: { ...productionMode, VERCEL_ENV: "preview" } }), true);
  assert.equal(isDevServiceRoleRouteWithdrawn({ hostnames: ["abc.vercel.app", "abc.vercel.app"], env: { ...productionMode, VERCEL_ENV: "preview" } }), true);
  // The opt-in does not admit them either.
  assert.equal(isDevRouteWithdrawn({ hostnames: [OTHER_HOST], env: { ...productionMode, HISTORY_QA_PREVIEW_ENABLED: "1" } }), false);
  assert.equal(isDevServiceRoleRouteWithdrawn({ hostnames: [OTHER_HOST], env: { ...productionMode, HISTORY_QA_PREVIEW_ENABLED: "1" } }), true);
  // Loopback in production mode, and explicit development or test runs, are admitted.
  assert.equal(isDevServiceRoleRouteWithdrawn({ hostnames: ["127.0.0.1", "localhost"], env: productionMode }), false);
  assert.equal(isDevServiceRoleRouteWithdrawn({ hostnames: ["localhost"], env: { ...productionMode, VERCEL_ENV: "preview" } }), false);
  assert.equal(isDevServiceRoleRouteWithdrawn({ hostnames: [OTHER_HOST], env: { NODE_ENV: "development" } }), false);
  assert.equal(isDevServiceRoleRouteWithdrawn({ hostnames: [OTHER_HOST], env: { NODE_ENV: "test", VERCEL_ENV: "preview" } }), false);
  // Anything the general rule withdraws stays withdrawn; unknown NODE_ENV needs loopback.
  assert.equal(isDevServiceRoleRouteWithdrawn({ hostnames: ["localhost"], env: { VERCEL_ENV: "production", NODE_ENV: "development" } }), true);
  assert.equal(isDevServiceRoleRouteWithdrawn({ hostnames: [OTHER_HOST], env: { NODE_ENV: "Production", VERCEL_ENV: "preview" } }), true);
  assert.equal(isDevServiceRoleRouteWithdrawn({ hostnames: [], env: productionMode }), true);

  const preview = { VERCEL_ENV: "preview", NODE_ENV: "production" };
  assert.ok(devServiceRoleRouteUnavailableResponse(new Request(`https://${OTHER_HOST}/x`, { headers: { host: OTHER_HOST } }), preview));
  assert.equal(devServiceRoleRouteUnavailableResponse(new Request("http://localhost:3000/x", { headers: { host: "localhost:3000" } }), preview), null);

  assert.throws(() => assertDevServiceRolePageAvailable(OTHER_HOST, preview), isNotFound);
  assert.throws(() => assertDevServiceRolePageAvailable(OTHER_HOST, { NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: "1" }), isNotFound);
  assert.doesNotThrow(() => assertDevServiceRolePageAvailable(null, { NODE_ENV: "development" }));
  assert.doesNotThrow(() => assertDevServiceRolePageAvailable("localhost:3000", preview));
  assert.doesNotThrow(() => assertDevServiceRolePageAvailable(OTHER_HOST, { NODE_ENV: "development" }));
});

test("a production hostname is never exempt through a development or test NODE_ENV", () => {
  for (const NODE_ENV of ["development", "test"]) {
    for (const hostname of [EXTERNAL_HOST, "fawxzzy-fitness-local.vercel.app", "abc.vercel.app"]) {
      assert.equal(isDevRouteWithdrawn({ hostnames: [hostname], env: { NODE_ENV } }), true, `${NODE_ENV} ${hostname}`);
      assert.equal(isDevRouteWithdrawn({ hostnames: ["127.0.0.1", hostname], env: { NODE_ENV } }), true, `${NODE_ENV} bind ${hostname}`);
      assert.equal(isDevServiceRoleRouteWithdrawn({ hostnames: [hostname], env: { NODE_ENV } }), true, `service ${NODE_ENV} ${hostname}`);
    }
    assert.equal(isDevRouteWithdrawn({ hostnames: [OTHER_HOST], env: { NODE_ENV } }), false, NODE_ENV);
  }

  assert.throws(() => assertDevPageAvailable(EXTERNAL_HOST, { NODE_ENV: "development" }), isNotFound);
  assert.throws(() => assertDevPageAvailable(EXTERNAL_HOST, { NODE_ENV: "test" }), isNotFound);
  // A platform preview signal still wins over the hostname.
  assert.equal(isDevRouteWithdrawn({ hostnames: ["abc.vercel.app"], env: { NODE_ENV: "development", VERCEL_ENV: "preview" } }), false);
});

test("the shared page guard raises not-found only when the guard withdraws the route", () => {
  assert.throws(() => assertDevPageAvailable(EXTERNAL_HOST, { VERCEL_ENV: "production" }), isNotFound);
  assert.throws(() => assertDevPageAvailable("localhost:3000", { VERCEL_ENV: "production" }), isNotFound);
  assert.throws(() => assertDevPageAvailable(OTHER_HOST, { NODE_ENV: "production" }), isNotFound);
  assert.throws(() => assertDevPageAvailable(null, { NODE_ENV: "production" }), isNotFound);
  assert.throws(() => assertDevPageAvailable("localhost:abc", { NODE_ENV: "production" }), isNotFound);
  // The opt-in does not reopen a production hostname.
  assert.throws(() => assertDevPageAvailable(EXTERNAL_HOST, { NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: "1" }), isNotFound);
  assert.throws(() => assertDevPageAvailable("abc.vercel.app", { NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: "1" }), isNotFound);
  // NODE_ENV values that are not an explicit local mode fail closed.
  assert.throws(() => assertDevPageAvailable(OTHER_HOST, {}), isNotFound);
  assert.throws(() => assertDevPageAvailable(OTHER_HOST, { NODE_ENV: "Production" }), isNotFound);

  assert.doesNotThrow(() => assertDevPageAvailable("127.0.0.1:3000", { NODE_ENV: "production" }));
  assert.doesNotThrow(() => assertDevPageAvailable("LOCALHOST:3000", { NODE_ENV: "production" }));
  assert.doesNotThrow(() => assertDevPageAvailable(OTHER_HOST, { NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: "1" }));
  assert.doesNotThrow(() => assertDevPageAvailable(EXTERNAL_HOST, { NODE_ENV: "production", VERCEL_ENV: "preview" }));
  assert.doesNotThrow(() => assertDevPageAvailable(OTHER_HOST, { NODE_ENV: "development" }));
  assert.doesNotThrow(() => assertDevPageAvailable(OTHER_HOST, { NODE_ENV: "test" }));
});

test("every dev route handler returns the guard response before doing any work", () => {
  assert.ok(guardedHandlerFiles.length >= 6, guardedHandlerFiles.join(", "));

  for (const file of guardedHandlerFiles) {
    const source = read(file);
    const handlers = [...source.matchAll(/export (?:async )?function (GET|POST|PUT|PATCH|DELETE)\b[^{]*\{/g)];

    assert.ok(handlers.length > 0, `${file} exports no handler`);
    assert.match(source, /from "@\/lib\/dev-route-guard"/, file);

    for (const handler of handlers) {
      assert.match(handler[0], /request: (?:Next)?Request/, `${file} ${handler[1]} must take the request`);

      const body = source.slice(handler.index + handler[0].length);
      assert.match(
        body,
        /^\s*const unavailable = (?:devRouteUnavailableResponse|devServiceRoleRouteUnavailableResponse)\(request\);\s*if \(unavailable\) \{?\s*return unavailable;/,
        `${file} ${handler[1]} must start with the dev route guard`,
      );
    }
  }
});

test("dev route handlers answer 404 before any work when the guard withdraws the route", async () => {
  const cases: Array<{ label: string; env: Record<string, string | undefined>; host: string }> = [
    { label: "production deployment", env: { VERCEL_ENV: "production", NODE_ENV: "production" }, host: "localhost:3000" },
    { label: "production-mode server without a platform signal", env: { VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined }, host: OTHER_HOST },
    { label: "unknown NODE_ENV without a platform signal", env: { VERCEL_ENV: undefined, NODE_ENV: "Production", HISTORY_QA_PREVIEW_ENABLED: undefined }, host: OTHER_HOST },
    { label: "opt-in on a production hostname", env: { VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: "1" }, host: EXTERNAL_HOST },
  ];

  for (const { label, env, host } of cases) {
    await withEnv(env, async () => {
      for (const file of guardedHandlerFiles) {
        const routeModule = (await import(pathToFileURL(path.join(repoRoot, file)).href)) as Record<string, unknown>;
        const names = (["GET", "POST", "PUT", "PATCH", "DELETE"] as const).filter((name) => typeof routeModule[name] === "function");
        assert.ok(names.length > 0, file);

        for (const name of names) {
          const handler = routeModule[name] as (request: Request) => Promise<Response> | Response;
          const request = new Request(`http://${host}/dev?access_token=a&refresh_token=b&userId=u`, {
            method: name,
            headers: { host },
            ...(name === "GET" ? {} : { body: "{}" }),
          });
          const response = await handler(request);

          assert.equal(response.status, 404, `${label} ${file} ${name}`);
          assert.equal(response.headers.get("set-cookie"), null, `${label} ${file} ${name}`);
        }
      }
    });
  }
});

test("dev route handlers treat a missing Host header as withdrawn, like the page guard", async () => {
  await withEnv({ VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined }, async () => {
    for (const file of guardedHandlerFiles) {
      const routeModule = (await import(pathToFileURL(path.join(repoRoot, file)).href)) as Record<string, unknown>;
      const handler = routeModule.GET as ((request: Request) => Promise<Response> | Response) | undefined;
      if (!handler) continue;

      // Loopback URL, no Host header.
      const response = await handler(new Request("http://127.0.0.1:3000/dev?access_token=a&refresh_token=b&userId=u"));
      assert.equal(response.status, 404, file);
    }
  });
});

test("dev route handlers still reach their own checks on loopback, with the opt-in, or off the production path", async () => {
  const cases: Array<{ label: string; env: Record<string, string | undefined>; host: string }> = [
    { label: "no platform signal, development mode", env: { VERCEL_ENV: undefined, NODE_ENV: "development" }, host: "localhost:3000" },
    { label: "production mode on loopback", env: { VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined }, host: "127.0.0.1:3000" },
    { label: "production mode with the opt-in", env: { VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: "1" }, host: "localhost:3000" },
    { label: "preview deployment", env: { VERCEL_ENV: "preview", NODE_ENV: "development" }, host: "localhost:3000" },
  ];

  for (const { label, env, host } of cases) {
    await withEnv(env, async () => {
      const bootstrap = await import("../app/dev/auth/bootstrap/route.ts");
      const bootstrapClient = await import("../app/dev/auth/bootstrap-client/route.ts");
      const liveExercises = await import("../app/api/dev/history-exercises-live/route.ts");

      // No tokens or user id supplied, so each stops at its own validation (400), not at the guard (404).
      assert.equal((await bootstrap.GET(new Request(`http://${host}/dev/auth/bootstrap`, { headers: { host } }) as never)).status, 400, label);
      assert.equal((await bootstrapClient.GET(new Request(`http://${host}/dev/auth/bootstrap-client`, { headers: { host } }) as never)).status, 400, label);
      assert.equal(
        (await liveExercises.GET(new Request(`http://${host}/api/dev/history-exercises-live`, { headers: { host } }))).status,
        env.NODE_ENV === "production" ? 404 : 400,
        label,
      );
    });
  }
});

test("dev-only paths cover the dev tree, the dev API and the ecosystem debug endpoint, however they are written", () => {
  for (const pathname of [
    "/dev",
    "/dev/",
    "/dev//",
    "/dev/env",
    "/dev/auth/bootstrap",
    "/dev/history-sessions-live/",
    "//dev/env",
    "/./dev/env",
    "/x/../dev/env",
    "/DEV/env",
    "/%64ev/env",
    "/dev%2Fenv",
    "/dev/%2e%2e/dev/env",
    "/api/dev/history-exercises-live",
    "/api//dev/history-exercises-live",
    "/api/%64ev/history-exercises-live",
    "/api/ecosystem/fitness/debug",
    "/api/ecosystem/fitness/debug/",
    "/api/ecosystem/fitness/debug//",
    "/api/ecosystem/%66itness/debug",
  ]) {
    assert.equal(isDevOnlyPath(pathname), true, pathname);
  }

  for (const pathname of ["/", "", "/today", "/devices", "/developer", "/dev-tools", "/api/devices", "/api/ecosystem/fitness/pilot-shadow", "/api/ecosystem/fitness", "/history/dev", "/api/history/dev", "/%zz"]) {
    assert.equal(isDevOnlyPath(pathname), false, pathname);
  }
});

test("the dev-only path check has no regular-expression trim", () => {
  const source = read("src/lib/dev-route-guard.ts");

  assert.doesNotMatch(source, /replace\(\/\\\/\+\$\/|\\\/\+\$/);
});

const DEV_PATHS = [
  "/dev/env",
  "/dev/flags",
  "/dev/qa-shot",
  "/dev/history-sessions-live?userId=u",
  "/dev/auth/bootstrap?access_token=a&refresh_token=b",
  "/api/dev/history-exercises-live?userId=u",
  "/api/ecosystem/fitness/debug",
];
const NON_DEV_PATHS = ["/", "/login", "/today", "/devices", "/developer", "/api/app-version", "/privacy"];

async function assertGuardResponse(request: NextRequest, label: string) {
  const response = await middleware(request);

  assert.equal(response.status, 404, label);
  assert.equal(response.headers.get("cache-control"), "no-store", label);
  assert.equal(response.headers.get("x-middleware-rewrite"), null, label);
  assert.equal(response.headers.get("set-cookie"), null, label);
  assert.deepEqual(await response.json(), { ok: false, error: "Not found." }, label);
}

test("middleware answers dev-only paths with a real 404 on a production deployment before any page runs", async () => {
  await withEnv({ VERCEL_ENV: "production", NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: "1" }, async () => {
    for (const pathname of DEV_PATHS) {
      await assertGuardResponse(nextRequest(`https://${EXTERNAL_HOST}${pathname}`), pathname);
      // Even a local-looking host and the opt-in do not reopen a production deployment.
      await assertGuardResponse(nextRequest(`http://localhost:3000${pathname}`), `localhost ${pathname}`);
    }
  });
});

test("middleware fails closed for dev-only paths on a server with no platform signal", async () => {
  await withEnv({ VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined }, async () => {
    for (const pathname of DEV_PATHS) {
      await assertGuardResponse(nextRequest(`https://${EXTERNAL_HOST}${pathname}`), pathname);
      await assertGuardResponse(nextRequest(`http://192.168.1.20:3000${pathname}`), `lan ${pathname}`);
      // A forwarded-host header never makes a non-loopback request look local.
      await assertGuardResponse(
        nextRequest(`https://${OTHER_HOST}${pathname}`, { "x-forwarded-host": "localhost" }),
        `forwarded ${pathname}`,
      );
      // `next start` reports its bind address as the URL host; the Host header still decides.
      await assertGuardResponse(nextRequest(`http://127.0.0.1:3000${pathname}`, { host: OTHER_HOST }), `bind address ${pathname}`);
      // A missing or unparsable Host header is withdrawn too, even on a loopback URL.
      await assertGuardResponse(new NextRequest(`http://127.0.0.1:3000${pathname}`), `no host ${pathname}`);
      await assertGuardResponse(nextRequest(`http://127.0.0.1:3000${pathname}`, { host: "localhost:abc" }), `bad host ${pathname}`);
    }
  });

  // NODE_ENV values that are not an explicit local mode fail closed.
  for (const NODE_ENV of [undefined, "", "Production", "staging"]) {
    await withEnv({ VERCEL_ENV: undefined, NODE_ENV, HISTORY_QA_PREVIEW_ENABLED: undefined }, async () => {
      await assertGuardResponse(nextRequest(`https://${OTHER_HOST}/dev/env`), `NODE_ENV ${NODE_ENV}`);
    });
  }
});

test("middleware refuses the opt-in on production hostnames", async () => {
  await withEnv({ VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: "1" }, async () => {
    for (const host of [EXTERNAL_HOST, "fawxzzy-fitness-local.vercel.app", "fawxzzy-fitness-abc123-fawxzzy.vercel.app"]) {
      for (const pathname of DEV_PATHS) {
        await assertGuardResponse(nextRequest(`https://${host}${pathname}`), `${host} ${pathname}`);
        // A loopback URL host does not help when the Host header is a production hostname.
        await assertGuardResponse(nextRequest(`http://127.0.0.1:3000${pathname}`, { host }), `bind ${host} ${pathname}`);
      }
    }
  });
});

test("middleware leaves dev-only paths reachable on loopback, with the opt-in, and on preview", async () => {
  const noOptIn = { VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined };
  const reachable: Array<{ label: string; env: Record<string, string | undefined>; url: (pathname: string) => string }> = [
    { label: "loopback name", env: noOptIn, url: (p) => `http://localhost:3000${p}` },
    { label: "loopback v4", env: noOptIn, url: (p) => `http://127.0.0.1:3000${p}` },
    { label: "loopback v6", env: noOptIn, url: (p) => `http://[::1]:3000${p}` },
    { label: "opt-in", env: { ...noOptIn, HISTORY_QA_PREVIEW_ENABLED: "1" }, url: (p) => `https://${OTHER_HOST}${p}` },
    { label: "preview", env: { ...noOptIn, VERCEL_ENV: "preview" }, url: (p) => `https://${EXTERNAL_HOST}${p}` },
    { label: "development mode", env: { ...noOptIn, NODE_ENV: "development" }, url: (p) => `https://${OTHER_HOST}${p}` },
    { label: "test mode", env: { ...noOptIn, NODE_ENV: "test" }, url: (p) => `https://${OTHER_HOST}${p}` },
  ];

  for (const { label, env, url } of reachable) {
    await withEnv(env, async () => {
      for (const pathname of DEV_PATHS) {
        const response = await middleware(nextRequest(url(pathname)));

        assert.notEqual(response.status, 404, `${label} ${pathname}`);
      }
    });
  }
});

test("middleware leaves every non-dev path untouched whatever the guard decides", async () => {
  const environments: Array<Record<string, string | undefined>> = [
    { VERCEL_ENV: "production", NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined },
    { VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined },
    { VERCEL_ENV: undefined, NODE_ENV: undefined, HISTORY_QA_PREVIEW_ENABLED: undefined },
    { VERCEL_ENV: "preview", NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined },
  ];

  for (const env of environments) {
    await withEnv(env, async () => {
      for (const pathname of NON_DEV_PATHS) {
        for (const request of [nextRequest(`https://${EXTERNAL_HOST}${pathname}`), new NextRequest(`https://${EXTERNAL_HOST}${pathname}`)]) {
          const response = await middleware(request);
          const body = response.headers.get("content-type")?.includes("json") ? await response.clone().text() : "";

          assert.notEqual(response.status, 404, `${JSON.stringify(env)} ${pathname}`);
          assert.doesNotMatch(body, /"error":"Not found\."/, `${JSON.stringify(env)} ${pathname}`);
        }
      }
    });
  }
});

test("the root middleware file is not left next to the compiled src middleware", () => {
  // Next compiles src/middleware.ts when the app lives under src/; a second file at the
  // repository root is ignored and only invites edits to the wrong copy.
  assert.throws(() => statSync(path.join(repoRoot, "middleware.ts")), /ENOENT/);
  assert.ok(statSync(path.join(repoRoot, "src", "middleware.ts")).isFile());
});
