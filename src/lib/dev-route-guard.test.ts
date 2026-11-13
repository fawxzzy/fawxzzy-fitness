import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { NextRequest } from "next/server.js";
import { middleware } from "@/middleware";
import { devRouteUnavailableResponse, isDevOnlyPath, isProductionDeployment } from "./dev-route-guard.ts";

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

test("only a production deployment withdraws dev routes", () => {
  assert.equal(isProductionDeployment({ VERCEL_ENV: "production" }), true);

  for (const env of [
    {},
    { VERCEL_ENV: "preview" },
    { VERCEL_ENV: "development" },
    { VERCEL_ENV: "" },
    // `next start` in CI and local verification runs in production mode without VERCEL_ENV.
    { NODE_ENV: "production" },
    { NODE_ENV: "production", VERCEL_ENV: "preview" },
  ]) {
    assert.equal(isProductionDeployment(env), false, JSON.stringify(env));
    assert.equal(devRouteUnavailableResponse(env), null, JSON.stringify(env));
  }
});

test("the production response is an uncached 404 that carries no route detail", async () => {
  const response = devRouteUnavailableResponse({ VERCEL_ENV: "production" });

  assert.ok(response);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { ok: false, error: "Not found." });
});

test("the dev layout withdraws the whole /dev tree from production deployments", () => {
  const source = read("src/app/dev/layout.tsx");

  assert.match(source, /from "@\/lib\/dev-route-guard"/);
  assert.match(source, /if \(isProductionDeployment\(\)\) \{\s*notFound\(\);\s*\}/);
  assert.match(source, /export const dynamic = "force-dynamic";/);
  assert.doesNotMatch(source, /NODE_ENV/);
});

test("every dev route handler returns the guard response before doing any work", () => {
  assert.ok(guardedHandlerFiles.length >= 6, guardedHandlerFiles.join(", "));

  for (const file of guardedHandlerFiles) {
    const source = read(file);
    const handlers = [...source.matchAll(/export (?:async )?function (GET|POST|PUT|PATCH|DELETE)\b[^{]*\{/g)];

    assert.ok(handlers.length > 0, `${file} exports no handler`);
    assert.match(source, /from "@\/lib\/dev-route-guard"/, file);

    for (const handler of handlers) {
      const body = source.slice(handler.index + handler[0].length);
      assert.match(
        body,
        /^\s*const unavailable = devRouteUnavailableResponse\(\);\s*if \(unavailable\) \{?\s*return unavailable;/,
        `${file} ${handler[1]} must start with the dev route guard`,
      );
    }
  }
});

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

const HANDLER_NAMES = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

test("a production deployment answers every dev route handler with 404 before any work", async () => {
  await withEnv({ VERCEL_ENV: "production" }, async () => {
    for (const file of guardedHandlerFiles) {
      const routeModule = (await import(pathToFileURL(path.join(repoRoot, file)).href)) as Record<string, unknown>;
      const names = HANDLER_NAMES.filter((name) => typeof routeModule[name] === "function");
      assert.ok(names.length > 0, file);

      for (const name of names) {
        const handler = routeModule[name] as (request: Request) => Promise<Response> | Response;
        const request = new Request("http://localhost:3000/dev?access_token=a&refresh_token=b&userId=u", {
          method: name,
          ...(name === "GET" ? {} : { body: "{}" }),
        });
        const response = await handler(request);

        assert.equal(response.status, 404, `${file} ${name}`);
        assert.equal(response.headers.get("set-cookie"), null, `${file} ${name}`);
      }
    }
  });
});

test("outside a production deployment the dev handlers still reach their own checks", async () => {
  await withEnv({ VERCEL_ENV: undefined }, async () => {
    const bootstrap = await import("../app/dev/auth/bootstrap/route.ts");
    const bootstrapClient = await import("../app/dev/auth/bootstrap-client/route.ts");
    const liveExercises = await import("../app/api/dev/history-exercises-live/route.ts");

    // No tokens or user id supplied, so each stops at its own validation (400), not at the guard (404).
    assert.equal((await bootstrap.GET(new Request("http://localhost:3000/dev/auth/bootstrap") as never)).status, 400);
    assert.equal((await bootstrapClient.GET(new Request("http://localhost:3000/dev/auth/bootstrap-client") as never)).status, 400);
    assert.equal((await liveExercises.GET(new Request("http://localhost:3000/api/dev/history-exercises-live"))).status, 400);
  });
});

test("the dev layout renders in preview and local runs and 404s only in production", async () => {
  const layout = await import("../app/dev/layout.tsx");

  await withEnv({ VERCEL_ENV: "production" }, async () => {
    assert.throws(
      () => layout.default({ children: "fixture" }),
      (error: unknown) => (error as { digest?: string }).digest === "NEXT_NOT_FOUND",
    );
  });

  for (const env of [{ VERCEL_ENV: undefined }, { VERCEL_ENV: "preview" }, { VERCEL_ENV: undefined, NODE_ENV: "production" }]) {
    await withEnv(env, async () => {
      assert.equal(layout.default({ children: "fixture" }), "fixture", JSON.stringify(env));
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

test("middleware answers dev-only paths with a real 404 on a production deployment before any page runs", async () => {
  await withEnv({ VERCEL_ENV: "production" }, async () => {
    for (const pathname of [
      "/dev/env",
      "/dev/history-sessions-live?userId=u",
      "/dev/auth/bootstrap?access_token=a&refresh_token=b",
      "/api/dev/history-exercises-live?userId=u",
      "/api/ecosystem/fitness/debug",
    ]) {
      const response = await middleware(new NextRequest(`https://fitness.fawxzzy.com${pathname}`));

      assert.equal(response.status, 404, pathname);
      assert.equal(response.headers.get("cache-control"), "no-store", pathname);
      assert.equal(response.headers.get("x-middleware-rewrite"), null, pathname);
      assert.equal(response.headers.get("set-cookie"), null, pathname);
      assert.deepEqual(await response.json(), { ok: false, error: "Not found." }, pathname);
    }
  });
});

test("middleware leaves dev-only paths alone outside a production deployment", async () => {
  for (const env of [{ VERCEL_ENV: undefined }, { VERCEL_ENV: "preview" }, { VERCEL_ENV: undefined, NODE_ENV: "production" }]) {
    await withEnv(env, async () => {
      const response = await middleware(new NextRequest("http://localhost:3000/dev/env"));

      assert.notEqual(response.status, 404, JSON.stringify(env));
    });
  }
});

test("the root middleware file is not left next to the compiled src middleware", () => {
  // Next compiles src/middleware.ts when the app lives under src/; a second file at the
  // repository root is ignored and only invites edits to the wrong copy.
  assert.throws(() => statSync(path.join(repoRoot, "middleware.ts")), /ENOENT/);
  assert.ok(statSync(path.join(repoRoot, "src", "middleware.ts")).isFile());
});
