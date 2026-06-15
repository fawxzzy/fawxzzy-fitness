#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFile, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { ensureRepoDependencies } from "../ensure-repo-deps.mjs";
import {
  buildCookiesFromArtifactSession,
  ensureFreshSessionArtifactFile,
} from "./fitness-auth-artifact.mjs";

const DEFAULT_TIMEOUT_MS = 20000;
const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, "..", "..");
await ensureRepoDependencies({
  repoRoot,
  reason: "cdp edge QA helper",
});
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const atlasRoot = path.resolve(repoRoot, "..", "..");
const runtimeRoot = path.join(atlasRoot, "runtime", "fitness");
const DEFAULT_EDGE_PATHS = [
  process.env.QA_EDGE_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter((value) => typeof value === "string" && value.length > 0);
const DEFAULT_CHROME_PATHS = [
  process.env.QA_CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Users\\zjhre\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
].filter((value) => typeof value === "string" && value.length > 0);

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readConfig(configPath) {
  const raw = await fs.readFile(configPath, "utf8");
  return JSON.parse(raw);
}

async function resolveBrowserPath(candidatePath) {
  const candidates = candidatePath
    ? [candidatePath]
    : [...DEFAULT_EDGE_PATHS, ...DEFAULT_CHROME_PATHS];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error("Unable to locate a Chromium browser. Set QA_EDGE_PATH to a valid executable path.");
}

function isInterimNextErrorMarkup(markup) {
  return typeof markup === "string" && markup.toLowerCase().includes("missing required error components");
}

function isRecoverableLocalUrl(url) {
  try {
    const parsed = new URL(String(url));
    return parsed.protocol === "http:" && (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");
  } catch {
    return false;
  }
}

function resolveLocalPort(url) {
  const parsed = new URL(String(url));
  return Number(parsed.port || 80);
}

async function readListeningPids(port) {
  if (process.platform !== "win32") {
    return [];
  }

  const { stdout } = await execFileAsync("cmd.exe", ["/c", "netstat -ano -p tcp"], {
    windowsHide: true,
    timeout: 10000,
  });
  const lines = stdout.split(/\r?\n/);
  const needle = `:${port}`;
  const pids = new Set();

  for (const line of lines) {
    if (!line.includes("LISTENING") || !line.includes(needle)) {
      continue;
    }

    const match = line.trim().match(/\s+(\d+)$/);
    if (match) {
      pids.add(Number(match[1]));
    }
  }

  return [...pids];
}

async function waitForPortToClose(port, timeoutMs = 15000) {
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    const pids = await readListeningPids(port);
    if (pids.length === 0) {
      return;
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for port ${port} to close before restarting the local dev server.`);
}

async function waitForHealthyServer(baseUrl, timeoutMs = 30000) {
  const loginUrl = `${String(baseUrl).replace(/\/+$/, "")}/login`;
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    try {
      const response = await fetch(loginUrl, { redirect: "manual" });
      const body = await response.text();
      if (response.status >= 200 && response.status < 400 && !isInterimNextErrorMarkup(body)) {
        return;
      }
    } catch {
      // Keep polling until the local server is ready again.
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for local dev server recovery at ${loginUrl}`);
}

async function waitForHealthyRoute(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    try {
      const response = await fetch(String(url), { redirect: "manual" });
      const body = await response.text();
      if (response.status >= 200 && response.status < 400 && !isInterimNextErrorMarkup(body)) {
        return;
      }
    } catch {
      // Keep polling until the route compiles cleanly.
    }

    await delay(750);
  }

  throw new Error(`Timed out waiting for route recovery at ${url}`);
}

async function recoverLocalDevServer(url) {
  if (process.platform !== "win32") {
    return;
  }

  const port = resolveLocalPort(url);
  const pids = await readListeningPids(port);
  for (const pid of pids) {
    await execFileAsync("powershell.exe", ["-NoProfile", "-Command", `Stop-Process -Id ${pid} -Force`], {
      windowsHide: true,
      timeout: 10000,
    }).catch(() => {});
  }
  await waitForPortToClose(port);

  await fs.rm(path.join(repoRoot, ".next"), {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  }).catch(() => {});

  await fs.mkdir(runtimeRoot, { recursive: true });
  const outHandle = await fs.open(path.join(runtimeRoot, `app-${port}.out.log`), "w");
  const errHandle = await fs.open(path.join(runtimeRoot, `app-${port}.err.log`), "w");

  try {
    const child = spawn(process.execPath, ["scripts/dev.mjs", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: repoRoot,
      detached: true,
      windowsHide: true,
      stdio: ["ignore", outHandle.fd, errHandle.fd],
    });
    child.unref();
  } finally {
    await outHandle.close();
    await errHandle.close();
  }

  await waitForHealthyServer(new URL(String(url)).origin);
  await waitForHealthyRoute(url);
}

function normalizeSameSite(value) {
  if (value === "Strict" || value === "Lax" || value === "None") {
    return value;
  }

  return undefined;
}

function isLocalHostUrl(url) {
  try {
    const parsed = new URL(String(url));
    return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

function mergeCookies(existingCookies, nextCookies) {
  const merged = Array.isArray(existingCookies) ? [...existingCookies] : [];

  for (const nextCookie of nextCookies) {
    const index = merged.findIndex((cookie) => cookie?.name === nextCookie.name);
    if (index >= 0) {
      merged[index] = nextCookie;
      continue;
    }

    merged.push(nextCookie);
  }

  return merged;
}

async function resolveAuthArtifactConfig(config) {
  const artifactPath = typeof config.authArtifactPath === "string" && config.authArtifactPath.length > 0
    ? path.resolve(config.authArtifactPath)
    : null;
  if (!artifactPath) {
    return config;
  }

  const url = String(config.url);
  const origin = new URL(url).origin;
  const artifactState = await ensureFreshSessionArtifactFile(artifactPath, {
    minTtlSeconds: Number(config.authArtifactMinTtlSeconds ?? 90),
  });
  const nextConfig = {
    ...config,
  };

  if (config.useAuthArtifactCookies !== false) {
    nextConfig.cookies = mergeCookies(
      Array.isArray(config.cookies) ? config.cookies : [],
      buildCookiesFromArtifactSession(artifactState.session, origin),
    );
  }

  if (config.useAuthArtifactHeader !== false && isLocalHostUrl(url)) {
    nextConfig.headers = {
      ...(config.headers && typeof config.headers === "object" ? config.headers : {}),
      "x-atlas-access-token": artifactState.session.accessToken,
    };
  }

  return nextConfig;
}

function buildContextOptions(config, windowWidth, windowHeight, deviceScaleFactor) {
  return {
    viewport: { width: windowWidth, height: windowHeight },
    deviceScaleFactor,
    isMobile: Boolean(config.mobile),
    hasTouch: Boolean(config.mobile),
    javaScriptEnabled: !config.disableJavaScript,
    extraHTTPHeaders: config.headers && typeof config.headers === "object" ? config.headers : undefined,
  };
}

async function waitForText(page, text, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const normalizedText = String(text).toLowerCase();
  await page.waitForFunction(
    (wantedText) => (document.body?.innerText?.toLowerCase() ?? "").includes(wantedText),
    normalizedText,
    { timeout: timeoutMs },
  );
}

async function evaluateExpression(page, expression) {
  return page.evaluate((source) => {
    // eslint-disable-next-line no-eval
    return (0, eval)(source);
  }, String(expression));
}

async function runAction(page, action) {
  switch (action.type) {
    case "navigate": {
      await page.goto(String(action.url), {
        waitUntil: "domcontentloaded",
        timeout: Number(action.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
      return;
    }
    case "sleep":
      await page.waitForTimeout(Number(action.ms ?? 0));
      return;
    case "scrollToBottom":
      await page.evaluate(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
      });
      return;
    case "scrollTo":
      await page.evaluate((top) => {
        window.scrollTo({ top, behavior: "instant" });
      }, Number(action.top ?? 0));
      return;
    case "waitForSelector":
      await page.waitForSelector(String(action.selector), {
        timeout: Number(action.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
      return;
    case "waitForText":
      await waitForText(page, action.text, Number(action.timeoutMs ?? DEFAULT_TIMEOUT_MS));
      return;
    case "assertExpression": {
      const passed = await evaluateExpression(page, String(action.expression));
      if (!passed) {
        throw new Error(String(action.message ?? `Render assertion failed: ${action.expression}`));
      }
      return;
    }
    case "click":
      await page.locator(String(action.selector)).click({ timeout: Number(action.timeoutMs ?? DEFAULT_TIMEOUT_MS) });
      return;
    case "setInputValue":
      await page.locator(String(action.selector)).fill(String(action.value ?? ""), {
        timeout: Number(action.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
      return;
    case "evaluate":
      await evaluateExpression(page, String(action.expression ?? ""));
      return;
    default:
      throw new Error(`Unsupported capture action type: ${action.type}`);
  }
}

async function applyCookies(context, cookies) {
  const normalizedCookies = [];

  for (const cookie of cookies) {
    if (!cookie || typeof cookie !== "object") {
      continue;
    }

    const name = String(cookie.name ?? "");
    const value = String(cookie.value ?? "");
    if (!name || !value) {
      throw new Error("Each configured cookie must include a non-empty name and value.");
    }

    const payload = {
      name,
      value,
      url: typeof cookie.url === "string" && cookie.url.length > 0 ? cookie.url : undefined,
      domain: typeof cookie.domain === "string" && cookie.domain.length > 0 ? cookie.domain : undefined,
      path: typeof cookie.url === "string" && cookie.url.length > 0
        ? undefined
        : (typeof cookie.path === "string" && cookie.path.length > 0 ? cookie.path : undefined),
      httpOnly: typeof cookie.httpOnly === "boolean" ? cookie.httpOnly : undefined,
      secure: typeof cookie.secure === "boolean" ? cookie.secure : undefined,
      sameSite: normalizeSameSite(cookie.sameSite),
      expires: typeof cookie.expires === "number" && Number.isFinite(cookie.expires) ? cookie.expires : undefined,
    };

    normalizedCookies.push(payload);
  }

  if (normalizedCookies.length > 0) {
    await context.addCookies(normalizedCookies);
  }
}

async function launchCaptureSession(config, browserPath, contextOptions, profileDir) {
  const args = ["--disable-background-networking", "--disable-sync", "--disable-extensions", "--disable-default-apps", "--no-first-run", "--no-default-browser-check"];
  if (typeof config.profileDirectory === "string" && config.profileDirectory.length > 0) {
    args.push(`--profile-directory=${config.profileDirectory}`);
  }

  const persistentContext = await chromium.launchPersistentContext(profileDir, {
    ...contextOptions,
    headless: true,
    executablePath: browserPath,
    args,
  });

  const page = persistentContext.pages()[0] ?? await persistentContext.newPage();
  return { context: persistentContext, page };
}

async function captureOnce(config) {
  const browserPath = await resolveBrowserPath(
    typeof config.browserPath === "string" && config.browserPath.length > 0 ? config.browserPath : undefined,
  );
  const windowWidth = Number(config.width ?? 430);
  const windowHeight = Number(config.height ?? 932);
  const deviceScaleFactor = Number(config.deviceScaleFactor ?? 1);
  const providedUserDataDir = typeof config.userDataDir === "string" && config.userDataDir.length > 0
    ? path.resolve(config.userDataDir)
    : null;
  const profileDir = providedUserDataDir ?? await fs.mkdtemp(path.join(os.tmpdir(), "fitness-playwright-"));
  const contextOptions = buildContextOptions(config, windowWidth, windowHeight, deviceScaleFactor);

  let captureContext = null;

  try {
    captureContext = await launchCaptureSession(config, browserPath, contextOptions, profileDir);
    const { context, page } = captureContext;

    if (Array.isArray(config.cookies) && config.cookies.length > 0) {
      await applyCookies(context, config.cookies);
    }

    const navigationTimeoutMs = Number(config.navigationTimeoutMs ?? DEFAULT_TIMEOUT_MS);
    const navigationRetryCount = Number(config.navigationRetryCount ?? 3);
    const navigationRetryDelayMs = Number(config.navigationRetryDelayMs ?? 1200);
    let lastStatus = null;

    for (let attempt = 1; attempt <= navigationRetryCount; attempt += 1) {
      const response = await page.goto(String(config.url), {
        waitUntil: "domcontentloaded",
        timeout: navigationTimeoutMs,
      });
      lastStatus = response?.status() ?? null;

      if (lastStatus !== null && lastStatus < 400) {
        break;
      }

      if (attempt < navigationRetryCount) {
        await delay(navigationRetryDelayMs);
      }
    }

    if (lastStatus !== null && lastStatus >= 400) {
      throw new Error(`Navigation failed with ${lastStatus} for ${config.url}`);
    }

    if (Number(config.initialWaitMs ?? 0) > 0) {
      await delay(Number(config.initialWaitMs));
    }

    for (const action of Array.isArray(config.actions) ? config.actions : []) {
      await runAction(page, action);
    }

    if (Number(config.finalWaitMs ?? 0) > 0) {
      await delay(Number(config.finalWaitMs));
    }

    if (config.waitForNetworkIdle !== false) {
      await page.waitForLoadState("networkidle", {
        timeout: Number(config.networkIdleTimeoutMs ?? DEFAULT_TIMEOUT_MS),
      }).catch(() => {});
    }

    const outPath = path.resolve(String(config.outPath));
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await page.screenshot({
      path: outPath,
      fullPage: Boolean(config.captureBeyondViewport ?? config.fullPage ?? false),
      timeout: Number(config.screenshotTimeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } finally {
    await captureContext?.context?.close().catch(() => {});
    if (!providedUserDataDir) {
      await fs.rm(profileDir, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      }).catch(() => {});
    }
  }
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    throw new Error("Usage: node scripts/qa/cdp-edge.mjs <capture-config.json>");
  }

  const rawConfig = await readConfig(configPath);
  const config = await resolveAuthArtifactConfig(rawConfig);
  try {
    await captureOnce(config);
  } catch (error) {
    if (isRecoverableLocalUrl(config.url) && config.autoRecoverLocalDevServer !== false) {
      await recoverLocalDevServer(config.url);
      await captureOnce(config);
      return;
    }

    throw error;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
