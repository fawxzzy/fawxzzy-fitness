#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  ensureBrowserSupabaseStorageState,
  LLEL_OPEN_ROUTES,
  QA_LLEL_CAPTURE_ROOT,
  QA_LLEL_PROFILE_DIR,
  QA_STORAGE_STATE_PATH,
  resolveFitnessAppUrl,
} from "./fitness-auth-state.mjs";

const currentFilePath = fileURLToPath(import.meta.url);

function parseArgs(argv = process.argv.slice(2)) {
  return {
    capture: argv.includes("--capture"),
    headless: argv.includes("--headless") || argv.includes("--capture"),
  };
}

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function stamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[:T]/g, "-").replace("Z", "");
}

async function loadStorageState() {
  return ensureBrowserSupabaseStorageState(JSON.parse(await fs.readFile(QA_STORAGE_STATE_PATH, "utf8")));
}

async function waitForPageContent(page) {
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForFunction(() => {
    const text = document.body?.innerText?.trim() ?? "";
    return text.length > 0 && !text.includes("Loading your training space");
  }, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function run() {
  const args = parseArgs();
  const baseUrl = resolveFitnessAppUrl();
  const storageState = await loadStorageState();
  const browser = args.capture
    ? await chromium.launch({ headless: true })
    : null;
  const context = args.capture
    ? await browser.newContext({
        storageState,
        viewport: { width: 430, height: 932 },
      })
    : await chromium.launchPersistentContext(QA_LLEL_PROFILE_DIR, {
        headless: args.headless,
        viewport: { width: 430, height: 932 },
      });

  if (!args.capture) {
    await context.addCookies(storageState.cookies ?? []);
  }

  const outputDir = path.join(QA_LLEL_CAPTURE_ROOT, args.capture ? stamp() : "latest");
  if (args.capture) {
    await fs.mkdir(outputDir, { recursive: true });
  }

  const opened = [];
  for (const route of LLEL_OPEN_ROUTES) {
    const page = await context.newPage();
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForPageContent(page);
    const entry = {
      route,
      url: page.url(),
      title: await page.title(),
    };
    if (args.capture) {
      const fileName = `${route.replace(/^\//, "").replace(/[^\w-]+/g, "-") || "root"}.png`;
      const filePath = path.join(outputDir, fileName);
      await page.screenshot({ path: filePath, fullPage: true });
      entry.screenshot = filePath;
    }
    opened.push(entry);
  }

  printJson({
    command: args.capture ? "qa:llel:capture" : "qa:llel:open",
    baseUrl,
    storageStatePath: QA_STORAGE_STATE_PATH,
    profileDir: QA_LLEL_PROFILE_DIR,
    outputDir: args.capture ? outputDir : null,
    opened,
  });

  if (args.capture) {
    await context.close();
    await browser.close();
    return;
  }

  await new Promise((resolve) => {
    context.browser()?.on("disconnected", resolve);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  run().catch((error) => {
    process.stderr.write(
      `Unable to open Fitness LLEL browser. ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  });
}
