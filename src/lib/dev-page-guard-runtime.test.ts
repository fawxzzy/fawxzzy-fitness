// Runtime proof that the async /dev page guard still fails closed on Next 16: with a production
// environment, a request with no Host header (or a non-loopback one) makes every guarded /dev page and
// the /dev layout reject with Next's notFound() (HTTP 404) before any props or fixture data are read.
// next/headers is replaced by a stub whose request headers this test controls.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

type HeaderMap = Record<string, string>;
const stubState = globalThis as typeof globalThis & { __devGuardTestHeaders?: HeaderMap };
stubState.__devGuardTestHeaders = {};

const headersStub = [
  "const read = () => globalThis.__devGuardTestHeaders ?? {};",
  "const wrap = (map) => ({ get: (name) => map[String(name).toLowerCase()] ?? null, has: (name) => String(name).toLowerCase() in map });",
  "export async function headers() { return wrap(read()); }",
  "export async function cookies() { return { get: () => undefined, getAll: () => [], has: () => false }; }",
  "export async function draftMode() { return { isEnabled: false }; }",
].join("\n");
const loaderSource = [
  `const stubUrl = ${JSON.stringify(`data:text/javascript,${encodeURIComponent(headersStub)}`)};`,
  "export async function resolve(specifier, context, next) {",
  "  if (specifier === 'next/headers' || specifier === 'next/headers.js') return { url: stubUrl, shortCircuit: true };",
  "  return next(specifier, context);",
  "}",
].join("\n");
register(`data:text/javascript,${encodeURIComponent(loaderSource)}`, pathToFileURL("./"));

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const devRoot = path.join(repoRoot, "src", "app", "dev");

function listGuardedDevEntries(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listGuardedDevEntries(full));
    } else if ((entry === "page.tsx" || entry === "layout.tsx") && /assertDev(?:ServiceRole)?PageAvailable\(/.test(readFileSync(full, "utf8"))) {
      out.push(full);
    }
  }
  return out.sort();
}

const savedEnv = { NODE_ENV: process.env.NODE_ENV, VERCEL_ENV: process.env.VERCEL_ENV, HISTORY_QA_PREVIEW_ENABLED: process.env.HISTORY_QA_PREVIEW_ENABLED };
function setEnv(env: Partial<typeof savedEnv>) {
  for (const key of Object.keys(savedEnv) as Array<keyof typeof savedEnv>) {
    if (env[key] === undefined) delete process.env[key];
    else (process.env as Record<string, string | undefined>)[key] = env[key];
  }
}
test.after(() => setEnv(savedEnv));

const { isNotFoundError } = await import("@/lib/next-navigation-errors");
const { assertDevPageAvailable, assertDevServiceRolePageAvailable } = await import("@/lib/dev-route-guard-page");
const isNotFound = (error: unknown) => isNotFoundError(error);

const guardedEntries = listGuardedDevEntries(devRoot);

test("the scan finds the guarded /dev pages and the /dev layout", () => {
  assert.ok(guardedEntries.length >= 20, `expected the guarded /dev pages, found ${guardedEntries.length}`);
  assert.ok(guardedEntries.some((file) => file.endsWith(path.join("dev", "layout.tsx"))));
});

test("the async guards reject with notFound() for a production request with no Host header", async () => {
  setEnv({ NODE_ENV: "production" });
  stubState.__devGuardTestHeaders = {};
  await assert.rejects(assertDevPageAvailable(), isNotFound);
  await assert.rejects(assertDevServiceRolePageAvailable(), isNotFound);
});

test("the async guards reject with notFound() for a non-loopback Host even outside production NODE_ENV", async () => {
  setEnv({ NODE_ENV: "development", VERCEL_ENV: "production" });
  stubState.__devGuardTestHeaders = { host: "fitness.fawxzzy.com" };
  await assert.rejects(assertDevPageAvailable(), isNotFound);
  await assert.rejects(assertDevServiceRolePageAvailable(), isNotFound);
});

test("control: a local development request on loopback passes the guard", async () => {
  setEnv({ NODE_ENV: "development" });
  stubState.__devGuardTestHeaders = { host: "localhost:3022" };
  await assert.doesNotReject(assertDevPageAvailable());
});

test("every guarded /dev page and the /dev layout answer 404 (notFound) before reading props", async () => {
  setEnv({ NODE_ENV: "production" });
  stubState.__devGuardTestHeaders = {};
  const failures: string[] = [];
  for (const file of guardedEntries) {
    const name = path.relative(repoRoot, file).split(path.sep).join("/");
    const mod = (await import(pathToFileURL(file).href)) as { default: (props: unknown) => unknown };
    // Props that throw on access (params, searchParams, anything else): a guard that ran after reading
    // props would fail with this error instead. `children` is allowed: the layout destructures it in its
    // signature and it carries no request data.
    const props = new Proxy({}, {
      get(_target, key) {
        if (key === "children") return null;
        throw new Error(`${name} read props.${String(key)} before the guard`);
      },
    });
    try {
      await mod.default(props);
      failures.push(`${name}: resolved instead of 404`);
    } catch (error) {
      if (!isNotFoundError(error)) failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  assert.deepEqual(failures, []);
});
