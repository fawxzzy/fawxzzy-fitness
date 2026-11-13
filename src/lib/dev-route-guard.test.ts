import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { NextRequest } from "next/server.js";
import { middleware } from "@/middleware";
import { assertDevPageAvailable } from "./dev-route-guard-page.ts";
import {
  devRouteUnavailableResponse,
  hostnameFromHostHeader,
  hostnamesOf,
  isDevOnlyPath,
  isDevRouteWithdrawn,
  isLoopbackHostname,
  isProductionDeployment,
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

const EXTERNAL_HOST = "fitness.fawxzzy.com";
const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]", "::1", "LOCALHOST"];

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
    for (const hostname of [EXTERNAL_HOST, "192.168.1.20", "10.0.0.2", "172.16.0.9", null, undefined, ""]) {
      assert.equal(isDevRouteWithdrawn({ hostnames: hostnamesFor(hostname), env }), true, `${VERCEL_ENV} ${hostname}`);
    }

    // Loopback is reachable.
    for (const hostname of LOOPBACK_HOSTS) {
      assert.equal(isDevRouteWithdrawn({ hostnames: hostnamesFor(hostname), env }), false, `${VERCEL_ENV} ${hostname}`);
    }

    // The opt-in admits any host, but only the exact value "1".
    assert.equal(isDevRouteWithdrawn({ hostnames: [EXTERNAL_HOST], env: { ...env, HISTORY_QA_PREVIEW_ENABLED: "1" } }), false);
    for (const optIn of ["0", "true", "", " 1"]) {
      assert.equal(isDevRouteWithdrawn({ hostnames: [EXTERNAL_HOST], env: { ...env, HISTORY_QA_PREVIEW_ENABLED: optIn } }), true, optIn);
    }
  }

  // `next dev` and tests are not production mode.
  for (const NODE_ENV of ["development", "test", undefined]) {
    assert.equal(isDevRouteWithdrawn({ hostnames: [EXTERNAL_HOST], env: { NODE_ENV } }), false, String(NODE_ENV));
  }
});

test("host helpers accept only loopback names and parse Host header values", () => {
  for (const hostname of LOOPBACK_HOSTS) {
    assert.equal(isLoopbackHostname(hostname), true, hostname);
  }
  for (const hostname of [EXTERNAL_HOST, "127.0.0.2", "0.0.0.0", "192.168.1.5", "localhost.example.com", "", null, undefined]) {
    assert.equal(isLoopbackHostname(hostname), false, String(hostname));
  }

  assert.equal(hostnameFromHostHeader("127.0.0.1:3000"), "127.0.0.1");
  assert.equal(hostnameFromHostHeader("[::1]:3000"), "[::1]");
  assert.equal(hostnameFromHostHeader("LocalHost"), "localhost");
  assert.equal(hostnameFromHostHeader(`${EXTERNAL_HOST}:443`), EXTERNAL_HOST);
  assert.equal(hostnameFromHostHeader(""), null);
  assert.equal(hostnameFromHostHeader(null), null);
  assert.equal(hostnameFromHostHeader("[::1"), null);
});

test("loopback needs every host signal the request carries to agree", () => {
  const env = { NODE_ENV: "production" };

  assert.deepEqual(hostnamesOf({ url: "http://127.0.0.1:3000/dev" }), ["127.0.0.1"]);
  assert.deepEqual(hostnamesOf(new Request("http://127.0.0.1:3000/dev", { headers: { host: "[::1]:3000" } })), ["127.0.0.1", "[::1]"]);
  assert.deepEqual(hostnamesOf({ url: "not a url" }), [""]);

  // Both the URL host and the Host header are loopback.
  assert.equal(isDevRouteWithdrawn({ hostnames: ["127.0.0.1", "localhost"], env }), false);
  // A self-hosted server's URL host is its bind address, so a non-loopback Host header decides.
  assert.equal(isDevRouteWithdrawn({ hostnames: ["127.0.0.1", EXTERNAL_HOST], env }), true);
  assert.equal(isDevRouteWithdrawn({ hostnames: [EXTERNAL_HOST, "localhost"], env }), true);
  // Nothing presented, or an unparsable URL, is not local.
  assert.equal(isDevRouteWithdrawn({ hostnames: [], env }), true);
  assert.equal(isDevRouteWithdrawn({ hostnames: [""], env }), true);
});

test("the handler response is an uncached 404 that carries no route detail and ignores forwarded hosts", async () => {
  const production = { VERCEL_ENV: "production" };
  const response = devRouteUnavailableResponse(new Request(`https://${EXTERNAL_HOST}/dev`), production);

  assert.ok(response);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { ok: false, error: "Not found." });

  assert.equal(devRouteUnavailableResponse(new Request("http://localhost:3000/dev"), { NODE_ENV: "production" }), null);

  // A forwarded-host header never makes an external request look local.
  const withForwardedHost = new Request(`https://${EXTERNAL_HOST}/dev`, { headers: { "x-forwarded-host": "localhost", host: "localhost" } });
  assert.ok(devRouteUnavailableResponse(withForwardedHost, { NODE_ENV: "production" }));

  // A loopback bind address with a public Host header is still withdrawn.
  const proxied = new Request("http://127.0.0.1:3000/dev", { headers: { host: EXTERNAL_HOST, "x-forwarded-host": "localhost" } });
  assert.ok(devRouteUnavailableResponse(proxied, { NODE_ENV: "production" }));
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
    assert.match(read(file), /assertDevPageAvailable\(\)|process\.env\.NODE_ENV === "production"/, `${file} has no production check`);
  }

  for (const file of pagesWithSharedGuard) {
    const source = read(file);

    assert.match(source, /from "@\/lib\/dev-route-guard-page"/, file);
    assert.match(source, /export default (?:async )?function \w+\([\s\S]*?\) \{\s*assertDevPageAvailable\(\);/, `${file} must call the guard first`);
  }
});

test("the shared page guard raises not-found only when the guard withdraws the route", () => {
  const isNotFound = (error: unknown) => (error as { digest?: string }).digest === "NEXT_NOT_FOUND";

  assert.throws(() => assertDevPageAvailable(EXTERNAL_HOST, { VERCEL_ENV: "production" }), isNotFound);
  assert.throws(() => assertDevPageAvailable("localhost:3000", { VERCEL_ENV: "production" }), isNotFound);
  assert.throws(() => assertDevPageAvailable(EXTERNAL_HOST, { NODE_ENV: "production" }), isNotFound);
  assert.throws(() => assertDevPageAvailable(null, { NODE_ENV: "production" }), isNotFound);

  assert.doesNotThrow(() => assertDevPageAvailable("127.0.0.1:3000", { NODE_ENV: "production" }));
  assert.doesNotThrow(() => assertDevPageAvailable(EXTERNAL_HOST, { NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: "1" }));
  assert.doesNotThrow(() => assertDevPageAvailable(EXTERNAL_HOST, { NODE_ENV: "production", VERCEL_ENV: "preview" }));
  assert.doesNotThrow(() => assertDevPageAvailable(EXTERNAL_HOST, { NODE_ENV: "development" }));
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
        /^\s*const unavailable = devRouteUnavailableResponse\(request\);\s*if \(unavailable\) \{?\s*return unavailable;/,
        `${file} ${handler[1]} must start with the dev route guard`,
      );
    }
  }
});

test("dev route handlers answer 404 before any work when the guard withdraws the route", async () => {
  const cases: Array<{ label: string; env: Record<string, string | undefined>; host: string }> = [
    { label: "production deployment", env: { VERCEL_ENV: "production", NODE_ENV: "production" }, host: "localhost:3000" },
    { label: "production-mode server without a platform signal", env: { VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined }, host: EXTERNAL_HOST },
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

test("dev-only paths cover the dev tree, the dev API and the ecosystem debug endpoint", () => {
  for (const pathname of [
    "/dev",
    "/dev/",
    "/dev/env",
    "/dev/auth/bootstrap",
    "/dev/history-sessions-live/",
    "/api/dev/history-exercises-live",
    "/api/ecosystem/fitness/debug",
    "/api/ecosystem/fitness/debug/",
  ]) {
    assert.equal(isDevOnlyPath(pathname), true, pathname);
  }

  for (const pathname of ["/", "/today", "/devices", "/developer", "/api/devices", "/api/ecosystem/fitness/pilot-shadow", "/history/dev"]) {
    assert.equal(isDevOnlyPath(pathname), false, pathname);
  }
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
  await withEnv({ VERCEL_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: "1" }, async () => {
    for (const pathname of DEV_PATHS) {
      await assertGuardResponse(new NextRequest(`https://${EXTERNAL_HOST}${pathname}`), pathname);
      // Even a local-looking host and the opt-in do not reopen a production deployment.
      await assertGuardResponse(new NextRequest(`http://localhost:3000${pathname}`), `localhost ${pathname}`);
    }
  });
});

test("middleware fails closed for dev-only paths on a production-mode server without a platform signal", async () => {
  await withEnv({ VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined }, async () => {
    for (const pathname of DEV_PATHS) {
      await assertGuardResponse(new NextRequest(`https://${EXTERNAL_HOST}${pathname}`), pathname);
      await assertGuardResponse(new NextRequest(`http://192.168.1.20:3000${pathname}`), `lan ${pathname}`);
      // `next start` reports its bind address as the URL host; the Host header still decides.
      await assertGuardResponse(
        new NextRequest(`http://127.0.0.1:3000${pathname}`, { headers: { host: EXTERNAL_HOST } }),
        `bind address ${pathname}`,
      );
      // A forwarded-host header never makes an external request look local.
      await assertGuardResponse(
        new NextRequest(`https://${EXTERNAL_HOST}${pathname}`, { headers: { "x-forwarded-host": "localhost" } }),
        `forwarded ${pathname}`,
      );
    }
  });
});

test("middleware leaves dev-only paths reachable on loopback, with the opt-in, and on preview", async () => {
  const reachable: Array<{ label: string; env: Record<string, string | undefined>; url: (pathname: string) => string }> = [
    { label: "loopback name", env: { VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined }, url: (p) => `http://localhost:3000${p}` },
    { label: "loopback v4", env: { VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined }, url: (p) => `http://127.0.0.1:3000${p}` },
    { label: "loopback v6", env: { VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined }, url: (p) => `http://[::1]:3000${p}` },
    { label: "opt-in", env: { VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: "1" }, url: (p) => `https://${EXTERNAL_HOST}${p}` },
    { label: "preview", env: { VERCEL_ENV: "preview", NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined }, url: (p) => `https://${EXTERNAL_HOST}${p}` },
    { label: "development mode", env: { VERCEL_ENV: undefined, NODE_ENV: "development", HISTORY_QA_PREVIEW_ENABLED: undefined }, url: (p) => `https://${EXTERNAL_HOST}${p}` },
  ];

  for (const { label, env, url } of reachable) {
    await withEnv(env, async () => {
      for (const pathname of DEV_PATHS) {
        const response = await middleware(new NextRequest(url(pathname)));

        assert.notEqual(response.status, 404, `${label} ${pathname}`);
      }
    });
  }
});

test("middleware leaves every non-dev path untouched whatever the guard decides", async () => {
  const environments: Array<Record<string, string | undefined>> = [
    { VERCEL_ENV: "production", NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined },
    { VERCEL_ENV: undefined, NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined },
    { VERCEL_ENV: "preview", NODE_ENV: "production", HISTORY_QA_PREVIEW_ENABLED: undefined },
  ];

  for (const env of environments) {
    await withEnv(env, async () => {
      for (const pathname of NON_DEV_PATHS) {
        const response = await middleware(new NextRequest(`https://${EXTERNAL_HOST}${pathname}`));
        const body = response.headers.get("content-type")?.includes("json") ? await response.clone().text() : "";

        assert.notEqual(response.status, 404, `${JSON.stringify(env)} ${pathname}`);
        assert.doesNotMatch(body, /"error":"Not found\."/, `${JSON.stringify(env)} ${pathname}`);
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
