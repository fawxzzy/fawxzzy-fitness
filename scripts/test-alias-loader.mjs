import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionCandidates = [".ts", ".tsx", ".js", ".mjs", ".cjs"];

function resolveAliasPath(specifier) {
  const basePath = path.join(repoRoot, "src", specifier.slice(2));

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

  return defaultResolve(specifier, context, defaultResolve);
}
