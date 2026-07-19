import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionCandidates = [".ts", ".tsx", ".js", ".mjs", ".cjs"];
const require = createRequire(import.meta.url);
const typescript = require("typescript");

export function transpileTypeScriptForTest(source, fileName) {
  return typescript.transpileModule(source, {
    compilerOptions: {
      jsx: typescript.JsxEmit.ReactJSX,
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2022,
    },
    fileName,
    reportDiagnostics: true,
  }).outputText;
}

function resolveCandidatePath(basePath) {
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }

  for (const extension of extensionCandidates) {
    const candidate = `${basePath}${extension}`;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  for (const extension of extensionCandidates) {
    const indexCandidate = path.join(basePath, `index${extension}`);
    if (fs.existsSync(indexCandidate)) {
      return indexCandidate;
    }
  }

  return null;
}

function resolveAliasPath(specifier) {
  const basePath = path.join(repoRoot, "src", specifier.slice(2));
  return resolveCandidatePath(basePath);
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier === "server-only") {
    return {
      url: "data:text/javascript,export%20default%20undefined%3B",
      shortCircuit: true,
    };
  }

  if (specifier.startsWith("@/")) {
    const resolvedPath = resolveAliasPath(specifier);
    if (!resolvedPath) {
      throw new Error(`Unable to resolve test alias: ${specifier}`);
    }

    return {
      url: pathToFileURL(resolvedPath).href,
      shortCircuit: true,
    };
  }

  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const parentPath = fileURLToPath(context.parentURL);
    const basePath = path.resolve(path.dirname(parentPath), specifier);
    const resolvedPath = resolveCandidatePath(basePath);

    if (resolvedPath) {
      return {
        url: pathToFileURL(resolvedPath).href,
        shortCircuit: true,
      };
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  if (url.startsWith("file:") && /\.tsx?$/u.test(fileURLToPath(url))) {
    return {
      format: "module",
      source: transpileTypeScriptForTest(fs.readFileSync(fileURLToPath(url), "utf8"), fileURLToPath(url)),
      shortCircuit: true,
    };
  }

  return defaultLoad(url, context, defaultLoad);
}
