#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { atlasRoot, repoRoot } from "./fitness-qa-config.mjs";
import { runVisualFitnessSuites } from "./visual-fitness-runner.mjs";

const currentFilePath = fileURLToPath(import.meta.url);
const repoPathFromAtlas = path.relative(atlasRoot, repoRoot).replace(/\\/g, "/");
const readinessRoot = path.join(atlasRoot, "tmp", "captures", "fitness", "readiness");
const verificationScripts = [
  "lint:ci",
  "typecheck",
  "build",
  "verify",
  "release:preflight",
  "qa:dev:fresh",
  "visual:fitness:theme",
  "visual:fitness:app-theme-contract",
];
const protectedSuites = [
  "settings",
  "today",
  "session",
  "routines",
  "history",
  "history-exercises",
  "history-detail",
];
const seamSuites = [
  "settings-seam",
  "today-seam",
  "session-seam",
  "routines-seam",
  "history-seam",
  "history-exercises-seam",
  "history-detail-seam",
  "exercise-detail-seam",
  "exercise-detail-bottom-seam",
];
const laneOwnedSourceFiles = [
  "docs/VISUAL-CHANGE-WORKFLOW.md",
  "package.json",
  "scripts/qa/visual-fitness-readiness.mjs",
  "scripts/qa/visual-fitness-runner.mjs",
  "scripts/qa/visual-fitness-suites.mjs",
  "src/app/dev/mobile-regression/DevMobileRegressionRoute.tsx",
];

function toIso(value) {
  return new Date(value).toISOString();
}

function buildTimestampStamp(date = new Date()) {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[:T]/g, "-")
    .replace("Z", "");
}

function parseJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function quoteShellArg(value) {
  if (/[\s"]/u.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  return value;
}

function spawnCommand(command, args, { cwd = repoRoot } = {}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn([command, ...args].map((value) => quoteShellArg(String(value))).join(" "), {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: true,
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = String(chunk);
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = String(chunk);
      stderr += text;
      process.stderr.write(text);
    });
    child.on("close", (code) => {
      const endedAt = Date.now();
      resolve({
        command,
        args,
        cwd,
        exitCode: code ?? 1,
        startedAt: toIso(startedAt),
        endedAt: toIso(endedAt),
        durationMs: endedAt - startedAt,
        stdout,
        stderr,
      });
    });
  });
}

async function runNpmScript(scriptName, { silent = false, extraArgs = [] } = {}) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const args = ["run"];
  if (silent) {
    args.push("--silent");
  }
  args.push(scriptName);
  if (extraArgs.length > 0) {
    args.push("--", ...extraArgs);
  }
  return spawnCommand(npmCommand, args);
}

async function sha256File(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function collectSourceAttribution(outputDir) {
  const diffResult = await spawnCommand("git", ["-C", atlasRoot, "diff", "--name-only", "--", repoPathFromAtlas], { cwd: atlasRoot });
  const untrackedResult = await spawnCommand("git", ["-C", atlasRoot, "ls-files", "--others", "--exclude-standard", "--", repoPathFromAtlas], { cwd: atlasRoot });
  const statusResult = await spawnCommand("git", ["-C", atlasRoot, "status", "--short", "--", repoPathFromAtlas], { cwd: atlasRoot });
  const headResult = await spawnCommand("git", ["-C", atlasRoot, "rev-parse", "HEAD"], { cwd: atlasRoot });
  const fileSet = new Set(
    [...diffResult.stdout.split(/\r?\n/), ...untrackedResult.stdout.split(/\r?\n/)]
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const manifestMode = fileSet.size > 0 ? "git-diff" : "explicit-lane-manifest-fallback";
  if (fileSet.size === 0) {
    for (const repoRelativePath of laneOwnedSourceFiles) {
      fileSet.add(`${repoPathFromAtlas}/${repoRelativePath}`);
    }
  }
  const files = [];

  for (const atlasRelativePath of [...fileSet].sort()) {
    const absolutePath = path.join(atlasRoot, atlasRelativePath);
    const repoRelativePath = path.relative(repoRoot, absolutePath).replace(/\\/g, "/");
    const stat = await fs.stat(absolutePath);
    files.push({
      atlasRelativePath,
      repoRelativePath,
      sha256: await sha256File(absolutePath),
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    });
  }

  const manifest = {
    generatedAt: toIso(Date.now()),
    atlasRoot,
    repoRoot,
    repoPathFromAtlas,
    manifestMode,
    nestedGitBoundaryPresent: false,
    atlasGitHead: headResult.stdout.trim() || null,
    statusLines: statusResult.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    fileCount: files.length,
    files,
  };
  const manifestPath = path.join(outputDir, "source-attribution-manifest.json");

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return {
    manifestPath,
    manifest,
  };
}

async function runVisualSuite(suiteName) {
  const result = await runVisualFitnessSuites(["--suite", suiteName]);
  return {
    suite: suiteName,
    status: result.status,
    blockedReason: result.blockedReason ?? null,
    authOutcome: result.authOutcome ?? null,
    proofLane: result.proofLane ?? null,
    seamKind: result.seamKind ?? null,
    route: result.route,
    screenshotPath: result.screenshotPath,
    manifestPath: result.manifestPath,
    qaSession: result.qaSession ?? null,
    coversProtectedRoutes: result.coversProtectedRoutes ?? [],
  };
}

function isAcceptedProtectedBlock(result) {
  return result.status === "blocked"
    && ["missing-env", "stale-session", "invalid-session"].includes(result.qaSession?.status ?? "");
}

async function main() {
  const startedAt = Date.now();
  const stamp = buildTimestampStamp();
  const outputDir = path.join(readinessRoot, stamp);
  await fs.mkdir(outputDir, { recursive: true });
  const buildGuardResult = await runNpmScript("build:guard", { extraArgs: ["--stop-dev"] });

  const verificationResults = [];
  for (const scriptName of verificationScripts) {
    verificationResults.push(await runNpmScript(scriptName));
  }

  const initialSessionCheck = await runNpmScript("qa:session:check", { silent: true });
  let qaSessionCheck = parseJsonObject(initialSessionCheck.stdout);
  const qaSessionFlow = {
    initialCheck: qaSessionCheck,
    refreshAttempted: false,
    refreshResult: null,
    finalCheck: qaSessionCheck,
  };

  if (qaSessionCheck && qaSessionCheck.status !== "missing-env") {
    qaSessionFlow.refreshAttempted = true;
    qaSessionFlow.refreshResult = await runNpmScript("qa:session:refresh", { silent: true });
    const refreshedCheck = await runNpmScript("qa:session:check", { silent: true });
    qaSessionCheck = parseJsonObject(refreshedCheck.stdout);
    qaSessionFlow.finalCheck = qaSessionCheck;
  }

  const protectedResults = [];
  for (const suiteName of protectedSuites) {
    protectedResults.push(await runVisualSuite(suiteName));
  }

  const seamResults = [];
  for (const suiteName of seamSuites) {
    seamResults.push(await runVisualSuite(suiteName));
  }

  const attribution = await collectSourceAttribution(outputDir);
  const endedAt = Date.now();
  const verificationOk = verificationResults.every((result) => result.exitCode === 0);
  const publicProofOk = verificationResults
    .filter((result) => result.args.includes("visual:fitness:theme") || result.args.includes("visual:fitness:app-theme-contract"))
    .every((result) => result.exitCode === 0);
  const seamProofOk = seamResults.every((result) => result.status === "captured");
  const protectedProofAccepted = protectedResults.every((result) => result.status === "captured" || isAcceptedProtectedBlock(result));
  const liveUiPassSafeToStart = buildGuardResult.exitCode === 0
    && verificationOk
    && publicProofOk
    && seamProofOk
    && protectedProofAccepted
    && attribution.manifest.fileCount > 0;

  const manifest = {
    generatedAt: toIso(endedAt),
    startedAt: toIso(startedAt),
    endedAt: toIso(endedAt),
    durationMs: endedAt - startedAt,
    repoRoot,
    atlasRoot,
    lane: "visual-readiness-proof-infrastructure",
    status: liveUiPassSafeToStart ? "ready-for-live-ui-pass" : "blocked",
    liveUiPassSafeToStart,
    userBrowserUsed: false,
    productionDeployTriggered: false,
    curatedEngineRuntimeFilesChanged: attribution.manifest.files.some((file) => file.repoRelativePath.startsWith("runtime/")),
    buildGuard: {
      exitCode: buildGuardResult.exitCode,
      durationMs: buildGuardResult.durationMs,
    },
    verification: verificationResults.map((result) => ({
      script: result.args[result.args.length - 1],
      exitCode: result.exitCode,
      durationMs: result.durationMs,
    })),
    qaSessionFlow,
    protectedProof: protectedResults,
    seamProof: seamResults,
    acceptedProtectedBlocks: protectedResults
      .filter((result) => isAcceptedProtectedBlock(result))
      .map((result) => ({
        suite: result.suite,
        route: result.route,
        qaSessionStatus: result.qaSession?.status ?? null,
        blockedReason: result.blockedReason,
      })),
    sourceAttributionManifestPath: attribution.manifestPath,
    sourceAttribution: {
      fileCount: attribution.manifest.fileCount,
      files: attribution.manifest.files,
    },
  };
  const manifestPath = path.join(outputDir, "visual-readiness-manifest.json");
  const latestPath = path.join(readinessRoot, "visual-readiness.latest.json");

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.writeFile(latestPath, `${JSON.stringify({
    ...manifest,
    manifestPath,
  }, null, 2)}\n`, "utf8");

  process.stdout.write(`${JSON.stringify({
    ...manifest,
    manifestPath,
    latestPath,
  }, null, 2)}\n`);

  if (!liveUiPassSafeToStart) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  main().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
