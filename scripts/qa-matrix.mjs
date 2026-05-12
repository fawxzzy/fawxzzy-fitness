#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const qaRoot = path.join(repoRoot, ".codex", "qa");
const edgePath = process.env.QA_EDGE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outputRoot = path.join(qaRoot, "mobile-regression");
const baseUrl = (process.env.QA_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const viewportHeight = Number(process.env.QA_HEIGHT ?? "852");
const captureDelayMs = Number(process.env.QA_CAPTURE_DELAY_MS ?? "5000");
const widths = (process.env.QA_WIDTHS ?? "375,393,430")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value > 0);
const manifestPath = path.join(outputRoot, "manifest.json");

async function loadScenarios() {
  const moduleUrl = pathToFileURL(path.join(repoRoot, "src", "features", "mobile-regression", "fixtures.ts")).href;
  const fixtureModule = await import(moduleUrl);
  return {
    scenarios: fixtureModule.mobileRegressionScenarios,
    reviewFamilies: fixtureModule.mobileRegressionBoardFamilies,
  };
}

function resolveScenarioSelection(allScenarios, args) {
  if (args.length === 0) {
    return allScenarios;
  }

  const wanted = new Set(args);
  return allScenarios.filter((scenario) =>
    wanted.has(scenario.id)
    || wanted.has(`${scenario.screen}:${scenario.fixture}`),
  );
}

async function runScreenshot({ url, width, outPath }) {
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "fawxzzy-qa-edge-"));
  const args = [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--user-data-dir=${profileDir}`,
    `--window-size=${width},${viewportHeight}`,
    `--virtual-time-budget=${captureDelayMs}`,
    `--screenshot=${outPath}`,
    url,
  ];

  try {
    await new Promise((resolve, reject) => {
      const child = spawn(edgePath, args, {
        cwd: repoRoot,
        stdio: "pipe",
        windowsHide: true,
      });

      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });

      child.once("error", reject);
      child.once("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`Screenshot run failed for ${path.basename(outPath)} with exit code ${code ?? "unknown"}${stderr ? `\n${stderr.trim()}` : ""}`));
      });
    });
  } finally {
    await fs.rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function assertScreenshotWritten(outPath) {
  const screenshot = await fs.stat(outPath).catch(() => null);
  if (!screenshot || screenshot.size === 0) {
    throw new Error(`Screenshot file was not written for ${path.basename(outPath)}`);
  }
}

function buildManifest({ scenarios, reviewFamilies }) {
  return {
    generatedAt: new Date().toISOString(),
    baseUrl,
    viewportHeight,
    widths,
    reviewFamilies: reviewFamilies.map((reviewFamily) => ({
      family: reviewFamily.family,
      boardFile: reviewFamily.boardFile,
    })),
    scenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      family: scenario.family,
      route: scenario.route,
      screen: scenario.screen,
      fixture: scenario.fixture,
      captures: widths.map((width) => ({
        width,
        file: `${scenario.id}-${width}.png`,
      })),
    })),
  };
}

async function main() {
  const scenarioArgs = process.argv.slice(2);
  const { scenarios: allScenarios, reviewFamilies } = await loadScenarios();
  const scenarios = resolveScenarioSelection(allScenarios, scenarioArgs);

  if (scenarios.length === 0) {
    throw new Error(`No mobile regression scenarios matched: ${scenarioArgs.join(", ")}`);
  }

  await fs.mkdir(outputRoot, { recursive: true });

  for (const scenario of scenarios) {
    for (const width of widths) {
      const outPath = path.join(outputRoot, `${scenario.id}-${width}.png`);
      const url = `${baseUrl}/dev/mobile-regression?scenario=${encodeURIComponent(scenario.id)}`;
      console.log(`Running mobile regression capture: ${scenario.id} @ ${width}px`);
      await runScreenshot({ url, width, outPath });
      await assertScreenshotWritten(outPath);
    }
  }

  const manifest = buildManifest({ scenarios, reviewFamilies });
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote mobile regression manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
