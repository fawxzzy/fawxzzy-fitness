import fs from "node:fs";
import path from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Shared harness for server-action tests: loads the REAL action module (and every repo-local pure module it
// imports, transpiled on the fly) in a vm context, substituting only the external boundaries listed in
// `overrides` (Supabase, auth, revalidation, ordered inserts ...). Anything else that is not a repo module resolves
// to a no-op proxy so an unused import never breaks a test.
const root = process.cwd();

const sandboxGlobals = {
  process: { env: { NODE_ENV: "test" } },
  console: { log() {}, error() {}, warn() {} },
  Date, Promise, Object, Array, Number, String, Math, JSON, Error, Set, Map, RegExp, Symbol, URL, Intl,
  FormData, TypeError, RangeError, isNaN, parseInt, parseFloat, Boolean, WeakMap, WeakSet,
};

function resolveRepoFile(fromFile, specifier) {
  const base = specifier.startsWith("@/")
    ? path.join(root, "src", specifier.slice(2))
    : path.resolve(path.dirname(path.join(root, fromFile)), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.relative(root, candidate).replace(/\\/g, "/");
    }
  }
  return null;
}

export function loadActionModule(entryFile, overrides = {}) {
  const noop = new Proxy({}, { get: () => () => undefined });
  const cache = new Map();

  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const source = fs.readFileSync(path.join(root, file), "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const requireFor = (name) => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name.startsWith("@/") || name.startsWith("./") || name.startsWith("../")) {
        const resolved = resolveRepoFile(file, name);
        if (resolved && resolved.endsWith(".json")) {
          return { default: JSON.parse(fs.readFileSync(path.join(root, resolved), "utf8")) };
        }
        if (resolved && !/\.(css)$/u.test(resolved)) {
          const key = `file:${resolved}`;
          if (Object.hasOwn(overrides, key)) return overrides[key];
          return load(resolved);
        }
      }
      return noop;
    };
    runInNewContext(output, { exports, require: requireFor, ...sandboxGlobals }, { filename: file });
    return exports;
  }

  // Results are normalised to host-realm plain objects so assert.deepEqual is not tripped by cross-realm prototypes.
  const loaded = load(entryFile);
  return Object.fromEntries(Object.entries(loaded).map(([name, value]) => [
    name,
    typeof value === "function"
      ? async (...args) => {
        const result = await value(...args);
        return result === undefined ? result : JSON.parse(JSON.stringify(result));
      }
      : value,
  ]));
}

/**
 * Chainable Supabase stub. Every call is recorded in `calls`; `respond(call)` decides the result of the terminal
 * await/single/maybeSingle (default `{ data: null, error: null }`).
 */
export function createSupabaseRecorder(respond = () => undefined) {
  const calls = [];
  function builder(table) {
    const call = { table, op: "select", payload: null, filters: [] };
    const settle = async () => {
      calls.push(call);
      const result = await respond(call);
      return result ?? { data: null, error: null };
    };
    const node = new Proxy(function () {}, {
      get(_target, property) {
        if (property === "then") {
          return (resolve, reject) => settle().then(resolve, reject);
        }
        if (property === "insert" || property === "update" || property === "upsert") {
          return (payload) => { call.op = property; call.payload = payload; return node; };
        }
        if (property === "delete") {
          return () => { call.op = "delete"; return node; };
        }
        if (property === "single" || property === "maybeSingle") {
          return () => settle();
        }
        return (...args) => { call.filters.push([String(property), ...args]); return node; };
      },
    });
    return node;
  }
  return { client: { from: (table) => builder(table) }, calls };
}

export function formDataOf(fields) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) value.forEach((entry) => data.append(key, entry));
    else if (value !== undefined && value !== null) data.set(key, String(value));
  }
  return data;
}
