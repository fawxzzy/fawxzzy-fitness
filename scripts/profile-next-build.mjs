#!/usr/bin/env node
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import {
  evaluateBuildWorkspaceGuard,
  formatGuardFailureMessage,
} from "./next-workspace-guard.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, "..");
const NEXT_OUTPUT_DIR = path.join(repoRoot, ".next");
const RECEIPT_FILE_NAME = "next-build-profile.latest.json";
const ROUTE_LINE_PATTERN = new RegExp("^([\\u251C\\u250C\\u2514])\\s+([\\u25CB\\u0192])\\s+(.+?)\\s+([0-9.]+\\s+[kM]?B)\\s+([0-9.]+\\s+[kM]?B)\\s*$", "u");
const STALE_NEXT_FAILURE_PATTERNS = [
  /PageNotFoundError:\s+Cannot find module for page:\s+\/_document/u,
  /Cannot find module for page:\s+\/_document/u,
  /missing required error components/iu,
  /ENOENT: no such file or directory, .*\.next/iu,
  /Cannot find module '.*\.next/iu,
];
const TRACE_EVENT_NAMES = new Set([
  "worker-main-server",
  "worker-main-edge-server",
  "worker-main-client",
  "run-webpack-compiler",
  "webpack-compilation",
  "seal",
  "terser-webpack-plugin-optimize",
  "minify-js",
  "build-module",
  "build-module-js",
  "build-module-tsx",
]);

function toIso(value) {
  return new Date(value).toISOString();
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findAtlasRoot(startDir) {
  let current = startDir;

  while (true) {
    if (await pathExists(path.join(current, "stack.yaml"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function toRepoRelative(targetPath) {
  return path.relative(repoRoot, targetPath).split(path.sep).join("/");
}

function parsePrintedSizeToBytes(value) {
  const match = /^([0-9.]+)\s+([kM]?B)$/u.exec(value.trim());
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(amount)) {
    return null;
  }

  if (unit === "B") {
    return amount;
  }
  if (unit === "kB") {
    return Math.round(amount * 1024);
  }
  if (unit === "MB") {
    return Math.round(amount * 1024 * 1024);
  }

  return null;
}

function formatCommand(command, args) {
  return [command, ...args]
    .map((part) => (/\s/.test(part) ? JSON.stringify(part) : part))
    .join(" ");
}

function parseArgs(argv = process.argv.slice(2)) {
  return {
    stopDev: argv.includes("--stop-dev"),
  };
}

function createPhaseTracker() {
  return {
    compile: { startLine: "Creating an optimized production build ...", endLine: "Compiled successfully" },
    lintTypecheck: { startLine: "Linting and checking validity of types ..." },
    collectPageData: { startLine: "Collecting page data ..." },
    generateStaticPages: { startPrefix: "Generating static pages (" },
    finalizePageOptimization: { startLine: "Finalizing page optimization ..." },
    collectBuildTraces: { startLine: "Collecting build traces ..." },
  };
}

function markPhaseStart(phases, phaseName, timestamp, line) {
  const phase = phases[phaseName];
  if (!phase || phase.startedAt) {
    return;
  }

  phase.startedAt = timestamp;
  phase.startLineSeen = line;
}

function markPhaseEnd(phases, phaseName, timestamp, line) {
  const phase = phases[phaseName];
  if (!phase) {
    return;
  }

  if (!phase.startedAt) {
    phase.startedAt = timestamp;
  }
  if (!phase.endedAt) {
    phase.endedAt = timestamp;
    phase.endLineSeen = line;
  }
}

function finalizePhases(phases, buildEndedAt) {
  const orderedNames = [
    "compile",
    "lintTypecheck",
    "collectPageData",
    "generateStaticPages",
    "finalizePageOptimization",
    "collectBuildTraces",
  ];

  for (let index = 0; index < orderedNames.length; index += 1) {
    const phaseName = orderedNames[index];
    const phase = phases[phaseName];
    if (!phase?.startedAt) {
      continue;
    }

    if (!phase.endedAt) {
      const nextPhase = orderedNames
        .slice(index + 1)
        .map((name) => phases[name])
        .find((candidate) => candidate?.startedAt);
      phase.endedAt = nextPhase?.startedAt ?? buildEndedAt;
    }

    phase.durationMs = phase.endedAt - phase.startedAt;
  }

  return orderedNames
    .filter((name) => phases[name]?.startedAt)
    .map((name) => ({
      name,
      startedAt: toIso(phases[name].startedAt),
      endedAt: toIso(phases[name].endedAt),
      durationMs: phases[name].durationMs,
      startLineSeen: phases[name].startLineSeen ?? null,
      endLineSeen: phases[name].endLineSeen ?? null,
      progressSamples: phases[name].progressSamples ?? [],
    }));
}

function createTimingIsolation(phaseSummary) {
  const byName = new Map(phaseSummary.map((phase) => [phase.name, phase]));
  const collectPageDataMs = byName.get("collectPageData")?.durationMs ?? null;
  const generateStaticPagesMs = byName.get("generateStaticPages")?.durationMs ?? null;
  const finalizePageOptimizationMs = byName.get("finalizePageOptimization")?.durationMs ?? null;
  const routePageDataMs = [collectPageDataMs, generateStaticPagesMs, finalizePageOptimizationMs]
    .filter(Number.isFinite)
    .reduce((sum, value) => sum + value, 0);

  return {
    compileMs: byName.get("compile")?.durationMs ?? null,
    lintTypecheckMs: byName.get("lintTypecheck")?.durationMs ?? null,
    collectPageDataMs,
    generateStaticPagesMs,
    finalizePageOptimizationMs,
    routePageDataMs: routePageDataMs > 0 ? routePageDataMs : null,
    traceMs: byName.get("collectBuildTraces")?.durationMs ?? null,
  };
}

function getRouteKind(symbol) {
  if (symbol === "\u25CB") {
    return "static";
  }
  if (symbol === "\u0192") {
    return "dynamic";
  }
  return "unknown";
}

function normalizeRoutePath(routePath) {
  if (routePath === "/") {
    return "/page";
  }
  return `${routePath}/page`;
}

async function getGitMetadata() {
  const { execFile } = await import("node:child_process");

  function runGit(args) {
    return new Promise((resolve) => {
      execFile("git", ["-C", repoRoot, ...args], { windowsHide: true }, (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }

        resolve(stdout.trim() || null);
      });
    });
  }

  const [ref, sha, topLevel, dirtyOutput] = await Promise.all([
    runGit(["rev-parse", "--abbrev-ref", "HEAD"]),
    runGit(["rev-parse", "HEAD"]),
    runGit(["rev-parse", "--show-toplevel"]),
    runGit(["status", "--short"]),
  ]);

  return {
    ref,
    sha,
    topLevel,
    dirty: Boolean(dirtyOutput),
  };
}

async function getReceiptRoot() {
  const atlasRoot = await findAtlasRoot(repoRoot);
  return atlasRoot
    ? path.join(atlasRoot, "runtime", "receipts", "build")
    : path.join(repoRoot, "runtime", "receipts", "build");
}

async function writeReceipt(receipt) {
  const receiptRoot = await getReceiptRoot();
  await fs.mkdir(receiptRoot, { recursive: true });
  const receiptPath = path.join(receiptRoot, RECEIPT_FILE_NAME);
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  return receiptPath;
}

async function parseJsonFile(targetPath) {
  const contents = await fs.readFile(targetPath, "utf8");
  return JSON.parse(contents);
}

async function getFileSizeIfExists(targetPath) {
  try {
    const stats = await fs.stat(targetPath);
    return stats.isFile() ? stats.size : null;
  } catch {
    return null;
  }
}

async function collectLargestFiles(rootDir, includePattern, limit, pathTransform = toRepoRelative) {
  const items = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!includePattern.test(absolutePath)) {
        continue;
      }

      const stats = await fs.stat(absolutePath);
      items.push({
        path: pathTransform(absolutePath),
        sizeBytes: stats.size,
      });
    }
  }

  if (!await pathExists(rootDir)) {
    return [];
  }

  await walk(rootDir);
  return items
    .sort((left, right) => right.sizeBytes - left.sizeBytes)
    .slice(0, limit);
}

async function collectAppRouteBundleSizes(routeTable) {
  const appBuildManifestPath = path.join(NEXT_OUTPUT_DIR, "app-build-manifest.json");
  if (!await pathExists(appBuildManifestPath)) {
    return [];
  }

  const appBuildManifest = await parseJsonFile(appBuildManifestPath);
  const pages = appBuildManifest.pages ?? {};
  const baseMainFiles = new Set([
    ...(pages["/layout"] ?? []),
    ...(pages["/template"] ?? []),
    ...(pages["/loading"] ?? []),
  ]);

  const entries = [];

  for (const routeRecord of routeTable) {
    const manifestKey = normalizeRoutePath(routeRecord.route);
    const files = pages[manifestKey];
    if (!Array.isArray(files)) {
      continue;
    }

    const chunkFiles = files.filter((file) => file.startsWith("static/"));
    const uniqueFiles = [...new Set(chunkFiles)];
    let totalBytes = 0;
    let exclusiveBytes = 0;

    for (const file of uniqueFiles) {
      const absolutePath = path.join(NEXT_OUTPUT_DIR, file.split("/").join(path.sep));
      const size = await getFileSizeIfExists(absolutePath);
      if (size == null) {
        continue;
      }
      totalBytes += size;
      if (!baseMainFiles.has(file)) {
        exclusiveBytes += size;
      }
    }

    entries.push({
      route: routeRecord.route,
      kind: routeRecord.kind,
      totalBytes,
      exclusiveBytes,
      fileCount: uniqueFiles.length,
      files: uniqueFiles,
    });
  }

  return entries
    .sort((left, right) => right.totalBytes - left.totalBytes)
    .slice(0, 10);
}

function getClientReferenceManifestPath(routePath) {
  const manifestRelativePath = routePath === "/"
    ? "page_client-reference-manifest.js"
    : path.join(...routePath.split("/").filter(Boolean), "page_client-reference-manifest.js");

  return path.join(NEXT_OUTPUT_DIR, "server", "app", manifestRelativePath);
}

async function parseClientReferenceManifest(routePath) {
  const manifestPath = getClientReferenceManifestPath(routePath);
  if (!await pathExists(manifestPath)) {
    return null;
  }

  const source = await fs.readFile(manifestPath, "utf8");
  const sandbox = { globalThis: {} };
  vm.runInNewContext(source, sandbox);
  const manifestKey = normalizeRoutePath(routePath);

  return {
    manifestPath,
    manifest: sandbox.globalThis.__RSC_MANIFEST?.[manifestKey] ?? null,
  };
}

async function collectRouteClientReferenceOwnership(routeBundles) {
  const entries = [];

  for (const routeBundle of routeBundles) {
    const routePageChunk = routeBundle.files.find((file) => file.startsWith("static/chunks/app/") && file.includes("/page-"));
    if (!routePageChunk) {
      continue;
    }

    const parsedManifest = await parseClientReferenceManifest(routeBundle.route);
    const clientModules = parsedManifest?.manifest?.clientModules;
    if (!clientModules || typeof clientModules !== "object") {
      continue;
    }

    const routeOwnedProjectClientModules = Object.entries(clientModules)
      .filter(([modulePath, metadata]) => {
        if (!isProjectSourceModule(modulePath)) {
          return false;
        }

        return Array.isArray(metadata?.chunks) && metadata.chunks.includes(routePageChunk);
      })
      .map(([modulePath]) => toRepoRelative(modulePath))
      .sort();

    if (routeOwnedProjectClientModules.length === 0) {
      continue;
    }

    entries.push({
      route: routeBundle.route,
      pageChunk: routePageChunk,
      clientReferenceManifest: toRepoRelative(parsedManifest.manifestPath),
      routeOwnedProjectClientModuleCount: routeOwnedProjectClientModules.length,
      routeOwnedProjectClientModules,
    });
  }

  return entries
    .sort((left, right) => right.routeOwnedProjectClientModuleCount - left.routeOwnedProjectClientModuleCount)
    .slice(0, 10);
}

async function collectServerRouteArtifactSizes() {
  const serverAppDir = path.join(NEXT_OUTPUT_DIR, "server", "app");
  const files = await collectLargestFiles(
    serverAppDir,
    /[\\/]page\.js$/u,
    10,
    (absolutePath) => toRepoRelative(absolutePath).replace(/^\.next\/server\/app\//u, ""),
  );

  return files.map((file) => ({
    routeArtifact: file.path,
    sizeBytes: file.sizeBytes,
  }));
}

async function parseTraceEvents() {
  const tracePath = path.join(NEXT_OUTPUT_DIR, "trace");
  if (!await pathExists(tracePath)) {
    return [];
  }

  const raw = await fs.readFile(tracePath, "utf8");
  const events = [];

  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        events.push(...parsed);
      } else if (parsed && typeof parsed === "object") {
        events.push(parsed);
      }
    } catch {
      // Ignore malformed trace lines; the receipt should still be produced.
    }
  }

  return events;
}

function isProjectSourceModule(name) {
  return name.startsWith(repoRoot) && !name.includes(`${path.sep}node_modules${path.sep}`);
}

function summarizeTraceEvents(events) {
  const relevant = events.filter((event) => TRACE_EVENT_NAMES.has(event.name) && typeof event.duration === "number");
  const normalized = relevant.map((event) => ({
    name: event.name,
    durationMs: Math.round(event.duration / 1000),
    module: typeof event.tags?.name === "string" ? event.tags.name : null,
    cache: typeof event.tags?.cache === "string" ? event.tags.cache : null,
    compilationName: typeof event.tags?.compilationName === "string" ? event.tags.compilationName : null,
  }));

  const topOverall = normalized
    .slice()
    .sort((left, right) => right.durationMs - left.durationMs)
    .slice(0, 15);

  const topProjectModules = normalized
    .filter((event) => event.module && isProjectSourceModule(event.module))
    .sort((left, right) => right.durationMs - left.durationMs)
    .slice(0, 10)
    .map((event) => ({
      ...event,
      module: toRepoRelative(event.module),
    }));

  const topMinifyEvents = normalized
    .filter((event) => event.name === "minify-js")
    .sort((left, right) => right.durationMs - left.durationMs)
    .slice(0, 10);

  const compilationEvents = normalized
    .filter((event) => event.name === "worker-main-server" || event.name === "worker-main-edge-server" || event.name === "worker-main-client" || event.name === "webpack-compilation")
    .sort((left, right) => right.durationMs - left.durationMs)
    .slice(0, 12);

  return {
    eventCount: events.length,
    analyzedEventCount: normalized.length,
    topOverall,
    topProjectModules,
    topMinifyEvents,
    compilationEvents,
  };
}

function parseRouteTable(lines) {
  const routes = [];

  for (const lineRecord of lines) {
    const match = ROUTE_LINE_PATTERN.exec(lineRecord.text);
    if (!match) {
      continue;
    }

    const route = match[3].trim();
    if (!route.startsWith("/")) {
      continue;
    }

    routes.push({
      route,
      kind: getRouteKind(match[2]),
      routeSize: match[4],
      routeSizeBytes: parsePrintedSizeToBytes(match[4]),
      firstLoadJs: match[5],
      firstLoadJsBytes: parsePrintedSizeToBytes(match[5]),
      observedAt: toIso(lineRecord.timestamp),
    });
  }

  return routes
    .sort((left, right) => (right.firstLoadJsBytes ?? 0) - (left.firstLoadJsBytes ?? 0));
}

function classifyBuildFailure({ result, phaseSummary, capturedLines, guard }) {
  if (guard?.blocked) {
    return {
      code: guard.code,
      message: formatGuardFailureMessage(guard),
    };
  }

  if (result.success) {
    return {
      code: null,
      message: null,
    };
  }

  const phaseByName = new Map(phaseSummary.map((phase) => [phase.name, phase]));
  const outputText = capturedLines.map((entry) => entry.text).join("\n");
  const staleNextSuspected = STALE_NEXT_FAILURE_PATTERNS.some((pattern) => pattern.test(outputText));
  if (staleNextSuspected) {
    return {
      code: "stale-next-lock-suspected",
      message: "Stale or concurrently-written .next state is suspected. Stop repo-local dev servers, clean .next if needed, and rerun the guarded build.",
    };
  }

  const compilePhase = phaseByName.get("compile");
  const lintTypecheckPhase = phaseByName.get("lintTypecheck");
  const collectPageDataPhase = phaseByName.get("collectPageData");

  if (compilePhase?.startedAt && !lintTypecheckPhase?.startedAt) {
    return {
      code: "next-compile-failed",
      message: "Next compile failed before lint/type-check began.",
    };
  }

  if (lintTypecheckPhase?.startedAt && !collectPageDataPhase?.startedAt) {
    return {
      code: "lint-typecheck-failed",
      message: "Lint/type-check failed before page-data collection began.",
    };
  }

  return {
    code: "next-build-failed",
    message: result.error ?? "Next build failed after the guard passed.",
  };
}

function collectSuspects({ phaseSummary, routeTable, routeBundles, routeClientReferenceOwnership, serverArtifacts, traceSummary }) {
  const suspects = [];

  const compilePhase = phaseSummary.find((phase) => phase.name === "compile");
  if (compilePhase) {
    suspects.push({
      category: "phase",
      signal: "compile",
      detail: `Compile phase consumed ${compilePhase.durationMs} ms.`,
    });
  }

  const topRoute = routeTable[0];
  if (topRoute) {
    suspects.push({
      category: "route-first-load",
      signal: topRoute.route,
      detail: `${topRoute.route} printed the largest First Load JS at ${topRoute.firstLoadJs}.`,
    });
  }

  const topRouteBundle = routeBundles[0];
  if (topRouteBundle) {
    suspects.push({
      category: "route-bundle",
      signal: topRouteBundle.route,
      detail: `${topRouteBundle.route} has the largest measured route bundle footprint at ${topRouteBundle.totalBytes} bytes across ${topRouteBundle.fileCount} files.`,
    });
  }

  const topRouteClientOwnership = routeClientReferenceOwnership[0];
  if (topRouteClientOwnership) {
    suspects.push({
      category: "route-client-ownership",
      signal: topRouteClientOwnership.route,
      detail: `${topRouteClientOwnership.route} directly owns ${topRouteClientOwnership.routeOwnedProjectClientModuleCount} project client modules in its page chunk.`,
    });
  }

  const topServerArtifact = serverArtifacts[0];
  if (topServerArtifact) {
    suspects.push({
      category: "server-artifact",
      signal: topServerArtifact.routeArtifact,
      detail: `${topServerArtifact.routeArtifact} is the largest server route artifact at ${topServerArtifact.sizeBytes} bytes.`,
    });
  }

  const topProjectModule = traceSummary.topProjectModules[0];
  if (topProjectModule) {
    suspects.push({
      category: "project-module-trace",
      signal: topProjectModule.module,
      detail: `${topProjectModule.module} was the slowest project module event in the trace at ${topProjectModule.durationMs} ms.`,
    });
  }

  const topMinifyEvent = traceSummary.topMinifyEvents[0];
  if (topMinifyEvent) {
    suspects.push({
      category: "minify",
      signal: topMinifyEvent.module ?? topMinifyEvent.compilationName ?? topMinifyEvent.name,
      detail: `Minification hotspots are present; the largest recorded minify event took ${topMinifyEvent.durationMs} ms.`,
    });
  }

  return suspects;
}

async function runBuild() {
  const command = process.execPath;
  const args = [path.join(repoRoot, "scripts", "next-cli.mjs"), "build"];
  const phases = createPhaseTracker();
  const capturedLines = [];
  const startedAt = Date.now();

  const child = spawn(command, args, {
    cwd: repoRoot,
    windowsHide: true,
    stdio: ["inherit", "pipe", "pipe"],
    env: process.env,
  });

  function handleLine(line, target) {
    const timestamp = Date.now();
    target.write(`${line}\n`);
    capturedLines.push({ text: line, timestamp });
    const normalizedLine = line.trim();

    if (normalizedLine.includes(phases.compile.startLine)) {
      markPhaseStart(phases, "compile", timestamp, normalizedLine);
      return;
    }
    if (normalizedLine.includes(phases.compile.endLine)) {
      markPhaseEnd(phases, "compile", timestamp, normalizedLine);
      return;
    }
    if (normalizedLine.includes(phases.lintTypecheck.startLine)) {
      markPhaseStart(phases, "lintTypecheck", timestamp, normalizedLine);
      return;
    }
    if (normalizedLine.includes(phases.collectPageData.startLine)) {
      markPhaseEnd(phases, "lintTypecheck", timestamp, normalizedLine);
      markPhaseStart(phases, "collectPageData", timestamp, normalizedLine);
      return;
    }
    if (normalizedLine.startsWith(phases.generateStaticPages.startPrefix)) {
      markPhaseEnd(phases, "collectPageData", timestamp, normalizedLine);
      markPhaseStart(phases, "generateStaticPages", timestamp, normalizedLine);
      phases.generateStaticPages.progressSamples ??= [];
      phases.generateStaticPages.progressSamples.push({
        observedAt: toIso(timestamp),
        line: normalizedLine,
      });
      return;
    }
    if (normalizedLine.includes(phases.finalizePageOptimization.startLine)) {
      markPhaseEnd(phases, "generateStaticPages", timestamp, normalizedLine);
      markPhaseStart(phases, "finalizePageOptimization", timestamp, normalizedLine);
      return;
    }
    if (normalizedLine.includes(phases.collectBuildTraces.startLine)) {
      markPhaseEnd(phases, "finalizePageOptimization", timestamp, normalizedLine);
      markPhaseStart(phases, "collectBuildTraces", timestamp, normalizedLine);
    }
  }

  const stdoutReader = readline.createInterface({ input: child.stdout });
  const stdoutClosed = new Promise((resolve) => stdoutReader.once("close", resolve));
  stdoutReader.on("line", (line) => handleLine(line, process.stdout));

  const stderrReader = readline.createInterface({ input: child.stderr });
  const stderrClosed = new Promise((resolve) => stderrReader.once("close", resolve));
  stderrReader.on("line", (line) => handleLine(line, process.stderr));

  const result = await new Promise((resolve) => {
    child.on("error", (error) => {
      resolve({
        success: false,
        exitCode: null,
        signal: null,
        error: error.message,
      });
    });

    child.on("exit", (code, signal) => {
      resolve({
        success: code === 0,
        exitCode: code,
        signal,
        error: null,
      });
    });
  });

  await Promise.all([
    stdoutClosed,
    stderrClosed,
  ]);

  const endedAt = Date.now();
  return {
    result,
    command,
    args,
    startedAt,
    endedAt,
    phaseSummary: finalizePhases(phases, endedAt),
    routeTable: parseRouteTable(capturedLines),
    capturedLineCount: capturedLines.length,
    capturedLines,
  };
}

async function main() {
  const flags = parseArgs();
  const git = await getGitMetadata();
  const guard = await evaluateBuildWorkspaceGuard({
    stopDev: flags.stopDev,
  });
  let build = null;

  if (guard.blocked) {
    const now = Date.now();
    build = {
      result: {
        success: false,
        exitCode: 1,
        signal: null,
        error: formatGuardFailureMessage(guard),
      },
      command: process.execPath,
      args: [path.join(repoRoot, "scripts", "next-cli.mjs"), "build"],
      startedAt: now,
      endedAt: now,
      phaseSummary: [],
      routeTable: [],
      capturedLineCount: 0,
      capturedLines: [],
    };
  } else {
    build = await runBuild();
  }

  const traceEvents = build.result.success ? await parseTraceEvents() : [];
  const traceSummary = summarizeTraceEvents(traceEvents);
  const routeBundles = build.result.success ? await collectAppRouteBundleSizes(build.routeTable) : [];
  const routeClientReferenceOwnership = build.result.success ? await collectRouteClientReferenceOwnership(routeBundles) : [];
  const serverArtifacts = build.result.success ? await collectServerRouteArtifactSizes() : [];
  const largestStaticChunks = build.result.success
    ? await collectLargestFiles(path.join(NEXT_OUTPUT_DIR, "static", "chunks"), /\.js$/u, 10)
    : [];
  const largestServerChunks = build.result.success
    ? await collectLargestFiles(path.join(NEXT_OUTPUT_DIR, "server", "chunks"), /\.js$/u, 10)
    : [];
  const failure = classifyBuildFailure({
    result: build.result,
    phaseSummary: build.phaseSummary,
    capturedLines: build.capturedLines,
    guard,
  });
  const timingIsolation = createTimingIsolation(build.phaseSummary);

  const receipt = {
    schemaVersion: 1,
    startedAt: toIso(build.startedAt),
    endedAt: toIso(build.endedAt),
    durationMs: build.endedAt - build.startedAt,
    success: build.result.success,
    command: formatCommand(build.command, build.args),
    repoRoot,
    atlasRoot: await findAtlasRoot(repoRoot),
    hostname: os.hostname(),
    platform: process.platform,
    nodeVersion: process.version,
    git,
    exitCode: build.result.exitCode,
    signal: build.result.signal,
    error: build.result.error,
    workspaceGuard: guard,
    failure,
    consolePhaseSummary: build.phaseSummary,
    timingIsolation,
    routeTable: build.routeTable,
    routeCounts: {
      total: build.routeTable.length,
      static: build.routeTable.filter((route) => route.kind === "static").length,
      dynamic: build.routeTable.filter((route) => route.kind === "dynamic").length,
    },
    artifactSummary: {
      largestStaticChunks,
      largestServerChunks,
      largestServerRouteArtifacts: serverArtifacts,
      largestAppRouteBundles: routeBundles,
      routeClientReferenceOwnership,
    },
    traceSummary,
    suspects: collectSuspects({
      phaseSummary: build.phaseSummary,
      routeTable: build.routeTable,
      routeBundles,
      routeClientReferenceOwnership,
      serverArtifacts,
      traceSummary,
    }),
    capturedLineCount: build.capturedLineCount,
  };

  const receiptPath = await writeReceipt(receipt);
  console.log("");
  console.log(`Next build profile receipt: ${receiptPath}`);

  if (!build.result.success) {
    if (failure.message) {
      console.error(failure.message);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Next build profiling failed:", error);
  process.exit(1);
});
