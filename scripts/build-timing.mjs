#!/usr/bin/env node
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, "..");
const phaseDefinitions = [
  {
    name: "gen:exercise-icons",
    command: process.execPath,
    args: [path.join(repoRoot, "scripts", "generate-exercise-icon-manifest.mjs")],
    receiptFileName: "gen-exercise-icons.latest.json",
  },
  {
    name: "gen:stretch-library-split",
    command: process.execPath,
    args: [path.join(repoRoot, "scripts", "generate-stretch-library-split.mjs")],
  },
  {
    name: "generate-icons",
    command: process.execPath,
    args: [path.join(repoRoot, "scripts", "generate-icons.mjs")],
  },
  {
    name: "generate-app-build-manifest",
    command: process.execPath,
    args: [path.join(repoRoot, "scripts", "generate-app-build-manifest.mjs")],
  },
  {
    name: "next build",
    command: process.execPath,
    args: [path.join(repoRoot, "scripts", "profile-next-build.mjs")],
    receiptFileName: "next-build-profile.latest.json",
  },
];

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
    const candidate = path.join(current, "stack.yaml");
    if (await pathExists(candidate)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function formatCommand(command, args) {
  return [command, ...args]
    .map((part) => (/\s/.test(part) ? JSON.stringify(part) : part))
    .join(" ");
}

function spawnPhase(phase) {
  return new Promise((resolve) => {
    const child = spawn(phase.command, phase.args, {
      cwd: repoRoot,
      stdio: "inherit",
      windowsHide: true,
      env: process.env,
    });

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

async function writeReceipt(receiptRoot, receipt) {
  await fs.mkdir(receiptRoot, { recursive: true });
  const timestamp = receipt.startedAt.replace(/[:.]/g, "-");
  const timestampedPath = path.join(receiptRoot, `build-timing-${timestamp}.json`);
  const latestPath = path.join(receiptRoot, "build-timing.latest.json");
  const payload = `${JSON.stringify(receipt, null, 2)}\n`;
  await fs.writeFile(timestampedPath, payload, "utf8");
  await fs.writeFile(latestPath, payload, "utf8");
  return { latestPath, timestampedPath };
}

async function readPhaseReceipt(receiptRoot, definition) {
  if (!definition.receiptFileName) {
    return null;
  }

  const receiptPath = path.join(receiptRoot, definition.receiptFileName);
  try {
    const payload = await fs.readFile(receiptPath, "utf8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function summarizeGeneratorReceipt(phaseReceipt) {
  if (!phaseReceipt) {
    return null;
  }

  const summary = {
    skipped: phaseReceipt.skipped ?? null,
    forced: phaseReceipt.forced ?? false,
    inputFingerprint: phaseReceipt.inputFingerprint ?? null,
    sourceCount: phaseReceipt.sourceCount ?? null,
    expectedCardCount: phaseReceipt.expectedCardCount ?? null,
    cardCount: phaseReceipt.cardCount ?? null,
    receiptGenerator: phaseReceipt.generator ?? null,
  };

  const hasMeaningfulValue = Object.values(summary).some((value) => value !== null && value !== false);
  return hasMeaningfulValue ? summary : null;
}

function printSummary(phases, latestPath) {
  console.log("");
  console.log("Build timing summary");
  console.log(`Receipt: ${latestPath}`);

  const longestDuration = Math.max(...phases.map((phase) => phase.durationMs), 1);
  for (const phase of phases) {
    const paddedName = phase.name.padEnd(29, " ");
    const duration = `${phase.durationMs}`.padStart(7, " ");
    const marker = phase.success ? "ok" : "fail";
    const cacheLabel = phase.generatorCache?.status ? `  cache:${phase.generatorCache.status}` : "";
    console.log(`- ${paddedName} ${duration} ms  ${marker}${cacheLabel}`);
  }

  const sorted = [...phases].sort((left, right) => right.durationMs - left.durationMs);
  const topSlowest = sorted.slice(0, Math.min(2, sorted.length));
  if (topSlowest.length > 0) {
    console.log("Slowest phases:");
    for (const phase of topSlowest) {
      const percentage = ((phase.durationMs / longestDuration) * 100).toFixed(1);
      console.log(`- ${phase.name}: ${phase.durationMs} ms (${percentage}% of slowest baseline)`);
    }
  }
}

async function main() {
  const atlasRoot = await findAtlasRoot(repoRoot);
  const receiptRoot = atlasRoot
    ? path.join(atlasRoot, "runtime", "receipts", "build")
    : path.join(repoRoot, "runtime", "receipts", "build");
  const git = await getGitMetadata();
  const pipelineStartedAt = Date.now();
  const phases = [];
  let overallSuccess = true;

  for (const definition of phaseDefinitions) {
    const startedAt = Date.now();
    console.log("");
    console.log(`==> ${definition.name}`);
    const result = await spawnPhase(definition);
    const endedAt = Date.now();
    const phaseReceipt = result.success ? await readPhaseReceipt(receiptRoot, definition) : null;
    const phaseRecord = {
      name: definition.name,
      command: formatCommand(definition.command, definition.args),
      cwd: repoRoot,
      startedAt: toIso(startedAt),
      endedAt: toIso(endedAt),
      durationMs: endedAt - startedAt,
      success: result.success,
      exitCode: result.exitCode,
      signal: result.signal,
      error: result.error,
      gitRef: git.ref,
      gitSha: git.sha,
      generatorCache: phaseReceipt?.cache ?? null,
      workspaceGuard: phaseReceipt?.workspaceGuard ?? null,
      failure: phaseReceipt?.failure ?? null,
      timingIsolation: phaseReceipt?.timingIsolation ?? null,
      generatorReceipt: summarizeGeneratorReceipt(phaseReceipt),
    };
    phases.push(phaseRecord);

    if (!result.success) {
      overallSuccess = false;
      break;
    }
  }

  const pipelineEndedAt = Date.now();
  const receipt = {
    schemaVersion: 1,
    startedAt: toIso(pipelineStartedAt),
    endedAt: toIso(pipelineEndedAt),
    durationMs: pipelineEndedAt - pipelineStartedAt,
    success: overallSuccess,
    repoRoot,
    atlasRoot,
    receiptRoot,
    hostname: os.hostname(),
    platform: process.platform,
    nodeVersion: process.version,
    git,
    phases,
  };

  const paths = await writeReceipt(receiptRoot, receipt);
  printSummary(phases, paths.latestPath);

  if (!overallSuccess) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Build timing failed:", error);
  process.exit(1);
});
