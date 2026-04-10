#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const qaRoot = path.join(repoRoot, ".codex", "qa");
const runnerPath = path.join(qaRoot, "cdp-edge.mjs");
const tmpConfigRoot = path.join(qaRoot, "tmp-mobile-regression");
const outputRoot = path.join(qaRoot, "mobile-regression");
const baseUrl = (process.env.QA_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const widths = (process.env.QA_WIDTHS ?? "375,393,430")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value > 0);

async function loadScenarios() {
  const moduleUrl = pathToFileURL(path.join(repoRoot, "src", "lib", "dev", "mobileRegressionFixtures.ts")).href;
  const fixtureModule = await import(moduleUrl);
  return fixtureModule.mobileRegressionScenarios;
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

function runScreenshot(configPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [runnerPath, configPath], {
      cwd: repoRoot,
      stdio: "inherit",
      windowsHide: true,
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Screenshot run failed for ${path.basename(configPath)} with exit code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  const scenarioArgs = process.argv.slice(2);
  const allScenarios = await loadScenarios();
  const scenarios = resolveScenarioSelection(allScenarios, scenarioArgs);

  if (scenarios.length === 0) {
    throw new Error(`No mobile regression scenarios matched: ${scenarioArgs.join(", ")}`);
  }

  await fs.mkdir(tmpConfigRoot, { recursive: true });
  await fs.mkdir(outputRoot, { recursive: true });

  const tempConfigPaths = [];

  try {
    for (const scenario of scenarios) {
      for (const width of widths) {
        const config = {
          url: `${baseUrl}/dev/mobile-regression?scenario=${encodeURIComponent(scenario.id)}`,
          width,
          height: 852,
          outPath: path.join(outputRoot, `${scenario.id}-${width}.png`),
          initialWaitMs: 1200,
          finalWaitMs: 700,
          actions: [
            {
              type: "waitForSelector",
              selector: `[data-mobile-regression-id="${scenario.id}"]`,
              timeoutMs: 15000,
            },
          ],
        };

        const configPath = path.join(tmpConfigRoot, `${scenario.id}-${width}.json`);
        tempConfigPaths.push(configPath);
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      }
    }

    for (const configPath of tempConfigPaths) {
      console.log(`Running QA screenshot config: ${path.relative(repoRoot, configPath)}`);
      await runScreenshot(configPath);
    }
  } finally {
    await Promise.all(tempConfigPaths.map((configPath) => fs.rm(configPath, { force: true })));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
