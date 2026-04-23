import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const STACK_ROOT = path.resolve(REPO_ROOT, "..", "..");
const RUNNER_PATH = path.resolve(REPO_ROOT, "scripts", "qa", "cdp-edge.mjs");
const DEFAULT_INPUT_DIR = path.resolve(STACK_ROOT, "tmp", "scratch", "regen-captures");
const DEFAULT_OUTPUT_DIR = path.resolve(STACK_ROOT, "tmp", "fawxzzy-fitness-ui-pass");
const MANIFEST_NAME = "artifact-manifest.json";

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (!entry.startsWith("--")) {
      continue;
    }

    const body = entry.slice(2);
    const equalsIndex = body.indexOf("=");
    if (equalsIndex >= 0) {
      args[body.slice(0, equalsIndex)] = body.slice(equalsIndex + 1);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args[body] = next;
      index += 1;
      continue;
    }

    args[body] = true;
  }

  return args;
}

function toPortablePath(value) {
  return value.split(path.sep).join("/");
}

function relativeToStackRoot(absolutePath) {
  return toPortablePath(path.relative(STACK_ROOT, absolutePath));
}

async function ensureFreshDirectory(directoryPath) {
  await fs.rm(directoryPath, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  }).catch(() => {});
  await fs.mkdir(directoryPath, { recursive: true });
}

async function listCaptureConfigPaths(inputDir) {
  const entries = await fs.readdir(inputDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".capture.json"))
    .map((entry) => path.join(inputDir, entry.name))
    .sort((left, right) => path.basename(left).localeCompare(path.basename(right)));
}

async function resolveCommitSha() {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: REPO_ROOT,
      windowsHide: true,
    });
    const sha = stdout.trim();
    return sha.length > 0 ? sha : null;
  } catch {
    return null;
  }
}

function buildEffectiveConfig(rawConfig, outputDir) {
  const {
    outPath: _ignoredOutPath,
    profileDir: _ignoredProfileDir,
    ...baseConfig
  } = rawConfig;
  const screenshotName = rawConfig.outPath
    ? path.basename(rawConfig.outPath)
    : `${path.basename(rawConfig.url ?? "capture")}.png`;

  return {
    ...baseConfig,
    deviceScaleFactor: Number.isFinite(rawConfig.deviceScaleFactor) ? rawConfig.deviceScaleFactor : 1,
    outPath: path.join(outputDir, screenshotName),
  };
}

async function runCapture(effectiveConfig) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fitness-ui-pass-"));
  const tempConfigPath = path.join(tempDir, "capture.json");

  try {
    await fs.writeFile(tempConfigPath, `${JSON.stringify(effectiveConfig, null, 2)}\n`, "utf8");
    await execFileAsync(process.execPath, [RUNNER_PATH, tempConfigPath], {
      cwd: REPO_ROOT,
      windowsHide: true,
    });
  } finally {
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    }).catch(() => {});
  }
}

async function main() {
  const args = parseArgs();
  const inputDir = path.resolve(typeof args["input-dir"] === "string" ? args["input-dir"] : DEFAULT_INPUT_DIR);
  const outputDir = path.resolve(typeof args["output-dir"] === "string" ? args["output-dir"] : DEFAULT_OUTPUT_DIR);
  const generatedAt = new Date().toISOString();
  const commitSha = await resolveCommitSha();
  const configPaths = await listCaptureConfigPaths(inputDir);

  if (configPaths.length === 0) {
    throw new Error(`No *.capture.json files found in ${inputDir}`);
  }

  await ensureFreshDirectory(outputDir);

  const captures = [];

  for (const configPath of configPaths) {
    const rawConfig = JSON.parse(await fs.readFile(configPath, "utf8"));
    const effectiveConfig = buildEffectiveConfig(rawConfig, outputDir);
    const configName = path.basename(configPath);
    const copiedConfigPath = path.join(outputDir, configName);

    await runCapture(effectiveConfig);
    await fs.writeFile(copiedConfigPath, `${JSON.stringify(effectiveConfig, null, 2)}\n`, "utf8");

    captures.push({
      captureConfig: path.basename(copiedConfigPath),
      screenshot: path.basename(effectiveConfig.outPath),
      url: effectiveConfig.url,
      width: effectiveConfig.width,
      height: effectiveConfig.height,
      mobile: effectiveConfig.mobile ?? false,
      deviceScaleFactor: effectiveConfig.deviceScaleFactor,
      initialWaitMs: effectiveConfig.initialWaitMs ?? null,
      finalWaitMs: effectiveConfig.finalWaitMs ?? null,
      actionCount: Array.isArray(effectiveConfig.actions) ? effectiveConfig.actions.length : 0,
    });
  }

  const manifest = {
    generatedAt,
    commitSha,
    helper: relativeToStackRoot(SCRIPT_PATH),
    runner: relativeToStackRoot(RUNNER_PATH),
    inputDir: relativeToStackRoot(inputDir),
    outputDir: relativeToStackRoot(outputDir),
    captureCount: captures.length,
    freshness: {
      outputDirectoryReset: true,
      freshBrowserProfilePerCapture: true,
      browserStateClearedBeforeNavigate: true,
    },
    effectiveDefaults: {
      deviceScaleFactor: 1,
    },
    captures,
  };

  const manifestPath = path.join(outputDir, MANIFEST_NAME);
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  process.stdout.write(`${JSON.stringify({
    generatedAt,
    commitSha,
    outputDir,
    manifestPath,
    captureCount: captures.length,
  }, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
