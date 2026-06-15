#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { ensureRepoDependencies } from "../ensure-repo-deps.mjs";
import {
  atlasRoot,
  buildSessionCookies,
  repoRoot,
  resolveBaseUrl,
  sessionArtifactPath,
} from "./fitness-qa-config.mjs";
import {
  ensureBrowserSupabaseStorageState,
  normalizeStorageCookie,
  QA_STORAGE_STATE_PATH,
} from "./fitness-auth-state.mjs";
import { inspectQaSession } from "./fitness-qa-user.mjs";
import {
  DEFAULT_VISUAL_VIEWPORT,
  getVisualFitnessSuite,
  listVisualFitnessSuites,
} from "./visual-fitness-suites.mjs";

const DEV_RECEIPT_PATH = path.join(atlasRoot, "runtime", "receipts", "dev", "dev-server.latest.json");
const LOADING_RECEIPT_DIR = path.join(atlasRoot, "runtime", "receipts", "loading");
const currentFilePath = fileURLToPath(import.meta.url);
await ensureRepoDependencies({
  repoRoot,
  reason: "visual fitness runner",
});
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const DEFAULT_EDGE_PATHS = [
  process.env.QA_EDGE_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter((value) => typeof value === "string" && value.trim().length > 0);

const TEST_THEME_STORAGE_VALUE = JSON.stringify({
  version: 2,
  theme: {
    preset: "test",
    primaryActionColor: "#7cc3ff",
    secondaryActionColor: "#ffbf67",
    accentDividerColor: "#8ce8d9",
    successCompleteColor: "#78e38f",
    selectionActiveColor: "#5fd4ff",
    loaderScanColor: "#87f1ff",
    warningColor: "#ff9f59",
    surfaceCardColor: "#1f3546",
    buttonRadius: 10,
    cardRadius: 32,
  },
});

function parseArgs(argv = process.argv.slice(2)) {
  const positionals = [];
  const flags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (!entry.startsWith("--")) {
      positionals.push(entry);
      continue;
    }

    const body = entry.slice(2);
    const equalsIndex = body.indexOf("=");
    if (equalsIndex >= 0) {
      flags[body.slice(0, equalsIndex)] = body.slice(equalsIndex + 1);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      flags[body] = next;
      index += 1;
      continue;
    }

    flags[body] = true;
  }

  return { flags, positionals };
}

function toIso(value) {
  return new Date(value).toISOString();
}

function normalizeBaseUrl(rawValue) {
  return String(rawValue).replace(/\/+$/, "");
}

function isLoopbackBaseUrl(baseUrl) {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(baseUrl);
}

function buildTimestampStamp(date = new Date()) {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[:T]/g, "-")
    .replace("Z", "");
}

function resolveViewport(rawValue, fallback = DEFAULT_VISUAL_VIEWPORT) {
  const raw = typeof rawValue === "string" && rawValue.trim().length > 0 ? rawValue.trim() : fallback.label;
  const match = raw.match(/^(\d+)x(\d+)$/i);
  if (!match) {
    throw new Error(`Invalid --viewport "${raw}". Expected <width>x<height>, for example 430x932.`);
  }

  return {
    label: raw,
    width: Number.parseInt(match[1], 10),
    height: Number.parseInt(match[2], 10),
  };
}

function buildReceiptFailureMessage() {
  return `Visual Operator requires a healthy fresh dev receipt at ${DEV_RECEIPT_PATH}. Run npm run qa:dev:fresh first.`;
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readFreshDevReceipt() {
  let receipt;
  try {
    receipt = await readJsonFile(DEV_RECEIPT_PATH);
  } catch (error) {
    throw new Error(`${buildReceiptFailureMessage()}${error instanceof Error ? ` ${error.message}` : ""}`);
  }

  const healthy = receipt?.healthStatus?.status === "healthy"
    && receipt?.healthStatus?.loginHealthy === true
    && receipt?.healthStatus?.chunkHealthy === true;

  if (!healthy || receipt?.repoRoot !== repoRoot || typeof receipt?.baseUrl !== "string" || receipt.baseUrl.trim().length === 0) {
    throw new Error(buildReceiptFailureMessage());
  }

  return {
    path: DEV_RECEIPT_PATH,
    value: receipt,
  };
}

async function resolveBaseUrlAndReceipt(flags) {
  const explicitBaseUrl = typeof flags["base-url"] === "string" && flags["base-url"].trim().length > 0
    ? normalizeBaseUrl(flags["base-url"].trim())
    : null;
  if (explicitBaseUrl) {
    return {
      baseUrl: explicitBaseUrl,
      receipt: null,
    };
  }

  const configuredBaseUrl = normalizeBaseUrl(resolveBaseUrl());
  if (configuredBaseUrl && !isLoopbackBaseUrl(configuredBaseUrl)) {
    return {
      baseUrl: configuredBaseUrl,
      receipt: null,
    };
  }

  const receipt = await readFreshDevReceipt();
  return {
    baseUrl: normalizeBaseUrl(receipt.value.baseUrl),
    receipt,
  };
}

async function resolveBrowserExecutablePath() {
  for (const candidate of DEFAULT_EDGE_PATHS) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Keep trying candidates and fall back to Playwright-managed Chromium.
    }
  }

  return undefined;
}

function buildOutputDir({ suiteName, explicitOutputDir }) {
  if (typeof explicitOutputDir === "string" && explicitOutputDir.trim().length > 0) {
    return path.resolve(explicitOutputDir);
  }

  return path.join(
    atlasRoot,
    "tmp",
    "captures",
    "fitness",
    suiteName,
    buildTimestampStamp(),
  );
}

function resolveProofLane(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return null;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "public" || normalized === "protected" || normalized === "seam") {
    return normalized;
  }

  throw new Error(`Unsupported --lane "${rawValue}". Expected public, protected, or seam.`);
}

async function resolveQaSession(baseUrl) {
  const inspection = await inspectQaSession({
    expectedBaseUrl: baseUrl,
    requireCredentials: false,
    liveVerify: true,
  });
  if (inspection.status !== "valid-session") {
    return {
      ...inspection,
      available: false,
      path: sessionArtifactPath,
      cookies: [],
    };
  }

  return {
    ...inspection,
    available: true,
    path: sessionArtifactPath,
    cookies: buildSessionCookies({
      access_token: inspection.accessToken,
      refresh_token: inspection.refreshToken,
      expires_at: inspection.expiresAtEpochSeconds,
    }, baseUrl),
  };
}

async function loadQaStorageState(baseUrl) {
  try {
    const storageState = JSON.parse(await fs.readFile(QA_STORAGE_STATE_PATH, "utf8"));
    if (hasUsableQaStorageState(storageState)) {
      return ensureBrowserSupabaseStorageState(storageState, { baseUrl });
    }
  } catch {
    // Fall through to the fresh session-cookie bootstrap path below.
  }

  return null;
}

function getAuthCookie(storageState, name) {
  return (storageState?.cookies ?? []).find((cookie) => cookie?.name === name) ?? null;
}

function hasFreshCookie(cookie, minimumRemainingSeconds = 60) {
  if (!cookie) {
    return false;
  }

  if (!Number.isFinite(cookie.expires)) {
    return true;
  }

  return cookie.expires > (Math.floor(Date.now() / 1000) + minimumRemainingSeconds);
}

export function hasUsableQaStorageState(storageState) {
  return hasFreshCookie(getAuthCookie(storageState, "sb-access-token"))
    && hasFreshCookie(getAuthCookie(storageState, "sb-refresh-token"));
}

export function buildQaBrowserStorageStateFromSessionCookies(sessionCookies, baseUrl) {
  if (!Array.isArray(sessionCookies) || sessionCookies.length === 0) {
    return null;
  }

  const storageState = ensureBrowserSupabaseStorageState({
    cookies: sessionCookies
      .map((cookie) => normalizeStorageCookie(cookie, baseUrl))
      .filter(Boolean),
    origins: [],
  }, { baseUrl });

  return hasUsableQaStorageState(storageState) ? storageState : null;
}

function normalizePlaywrightCookies(cookies, fallbackBaseUrl) {
  return cookies
    .map((cookie) => {
      if (!cookie || typeof cookie !== "object") {
        return null;
      }

      const name = typeof cookie.name === "string" ? cookie.name.trim() : "";
      const value = typeof cookie.value === "string" ? cookie.value : "";
      if (!name || !value) {
        return null;
      }

      const normalized = {
        name,
        value,
        httpOnly: Boolean(cookie.httpOnly),
        secure: typeof cookie.secure === "boolean" ? cookie.secure : fallbackBaseUrl.startsWith("https://"),
        sameSite: cookie.sameSite ?? "Lax",
      };

      if (Number.isFinite(cookie.expires)) {
        normalized.expires = cookie.expires;
      }

      const domain = typeof cookie.domain === "string" ? cookie.domain.trim() : "";
      if (domain) {
        normalized.domain = domain;
        normalized.path = typeof cookie.path === "string" && cookie.path.trim().length > 0 ? cookie.path : "/";
        return normalized;
      }

      normalized.url = normalizeBaseUrl(
        typeof cookie.url === "string" && cookie.url.trim().length > 0 ? cookie.url : fallbackBaseUrl,
      );
      return normalized;
    })
    .filter(Boolean);
}

async function runSuiteInteraction(page, suite) {
  const interaction = suite.interaction;
  if (!interaction) {
    return {
      performed: false,
      bodyText: null,
      missingExpectedText: [],
    };
  }

  if (interaction.type === "open-settings-panel") {
    const trigger = page.getByRole("button", { name: new RegExp(interaction.triggerLabel, "i") }).first();
    const visible = await trigger.isVisible().catch(() => false);
    if (!visible) {
      return {
        performed: false,
        bodyText: null,
        missingExpectedText: interaction.expectedText ?? [],
        blockedReason: `Unable to find the "${interaction.triggerLabel}" settings panel trigger.`,
      };
    }

    await trigger.click();
    await page.waitForTimeout(1000);
    if (typeof interaction.selectThemeSlotLabel === "string" && interaction.selectThemeSlotLabel.trim().length > 0) {
      const slotTrigger = page.getByRole("button", { name: new RegExp(interaction.selectThemeSlotLabel, "i") }).first();
      const slotVisible = await slotTrigger.isVisible().catch(() => false);
      if (!slotVisible) {
        return {
          performed: true,
          bodyText: ((await page.textContent("body")) ?? "").replace(/\s+/g, " ").trim(),
          missingExpectedText: interaction.expectedText ?? [],
          blockedReason: `Unable to find the "${interaction.selectThemeSlotLabel}" theme slot trigger.`,
        };
      }

      await slotTrigger.click();
      await page.waitForTimeout(750);
    }

    const bodyText = ((await page.textContent("body")) ?? "").replace(/\s+/g, " ").trim();
    const normalizedBodyText = bodyText.toLowerCase();
    const missingExpectedText = (interaction.expectedText ?? []).filter((text) => !normalizedBodyText.includes(text.toLowerCase()));
    return {
      performed: true,
      bodyText,
      missingExpectedText,
      blockedReason: missingExpectedText.length > 0
        ? `Missing expected App Theme text: ${missingExpectedText.join(", ")}.`
        : null,
    };
  }

  return {
    performed: false,
    bodyText: null,
    missingExpectedText: [],
  };
}

async function applyThemePreset(context, themePreset) {
  await context.addInitScript(({ key, preset, value }) => {
    window.localStorage.setItem("fawxzzy:loading-diagnostics", "1");
    if (preset === "default") {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, value);
  }, {
    key: "fawxzzy:app-theme",
    preset: themePreset,
    value: TEST_THEME_STORAGE_VALUE,
  });
}

function isAuthRedirect(finalUrl, baseUrl) {
  return typeof finalUrl === "string" && finalUrl.startsWith(`${baseUrl}/login`);
}

function resolveExpectedPathname(route, baseUrl) {
  try {
    return new URL(route, `${baseUrl}/`).pathname;
  } catch {
    return null;
  }
}

function resolveUnexpectedFinalPathReason({ finalUrl, suite, baseUrl }) {
  try {
    const expectedPathname = resolveExpectedPathname(suite.route, baseUrl);
    const actualUrl = new URL(finalUrl);
    if (!expectedPathname || actualUrl.pathname === expectedPathname) {
      return null;
    }

    return `Route resolved to ${actualUrl.pathname} instead of ${expectedPathname}.`;
  } catch {
    return null;
  }
}

async function captureSuite({ suite, flags, receipt, browserExecutablePath }) {
  const baseUrl = normalizeBaseUrl(flags.__resolvedBaseUrl ?? receipt?.value?.baseUrl ?? resolveBaseUrl());
  const viewport = resolveViewport(flags.viewport, suite.viewport);
  const outputDir = buildOutputDir({
    suiteName: suite.name,
    explicitOutputDir: typeof flags["output-dir"] === "string" ? flags["output-dir"] : null,
  });
  const screenshotPath = path.join(outputDir, suite.expectedOutputFilename);
  const manifestPath = path.join(outputDir, "capture-manifest.json");
  const startedAt = Date.now();
  const qaSession = suite.authRequired
    ? await resolveQaSession(baseUrl)
    : {
        status: "not-required",
        summary: "public suite",
        available: false,
        path: sessionArtifactPath,
        cookies: [],
      };
  const qaStorageStateFromFile = suite.authRequired && qaSession.available
    ? await loadQaStorageState(baseUrl)
    : null;
  const qaStorageState = qaStorageStateFromFile ?? (
    suite.authRequired && qaSession.available
      ? buildQaBrowserStorageStateFromSessionCookies(qaSession.cookies, baseUrl)
      : null
  );

  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: browserExecutablePath,
    args: [
      "--disable-background-networking",
      "--disable-sync",
      "--disable-extensions",
      "--disable-default-apps",
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  const context = await browser.newContext({
    viewport: {
      width: viewport.width,
      height: viewport.height,
    },
    isMobile: viewport.width <= 430,
    hasTouch: viewport.width <= 430,
    ...(qaStorageState ? { storageState: qaStorageState } : {}),
  });
  await applyThemePreset(context, suite.themePreset);
  const page = await context.newPage();
  const consoleMessages = [];
  page.on("console", (message) => {
    const text = message.text();
    if (
      text.includes("[loading-diagnostics]")
      || message.type() === "warning"
      || message.type() === "error"
    ) {
      consoleMessages.push({
        type: message.type(),
        text,
      });
    }
  });

  let manifest = null;

  try {
    if (suite.authRequired && qaSession.available && !qaStorageState) {
      await context.addCookies(normalizePlaywrightCookies(qaSession.cookies, baseUrl));
    }

    const response = await page.goto(`${baseUrl}${suite.route}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(suite.waitMs ?? 1600);
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const interactionResult = await runSuiteInteraction(page, suite);
    await page.screenshot({
      path: screenshotPath,
      fullPage: suite.fullPage ?? false,
    });

    const finalUrl = page.url();
    const responseStatus = response?.status() ?? null;
    const sessionMissingForProtectedRoute = suite.authRequired && qaSession.status !== "valid-session";
    const authBlockedReason = suite.authRequired
      ? (
        sessionMissingForProtectedRoute
          ? qaSession.summary
          : (isAuthRedirect(finalUrl, baseUrl)
            ? "blocked: auth redirect"
            : null)
      )
      : null;
    const unexpectedFinalPathReason = resolveUnexpectedFinalPathReason({
      finalUrl,
      suite,
      baseUrl,
    });
    const blockedReason = sessionMissingForProtectedRoute
      ? (qaSession.reason ?? qaSession.summary)
      : authBlockedReason === "blocked: auth redirect"
        ? "Protected route redirected to /login despite a valid QA session."
        : interactionResult.blockedReason
          ? interactionResult.blockedReason
          : unexpectedFinalPathReason
            ? unexpectedFinalPathReason
            : (responseStatus !== null && responseStatus >= 400
              ? `Route returned HTTP ${responseStatus}.`
              : null);
    const authOutcome = suite.authRequired
      ? (blockedReason
        ? authBlockedReason ?? "blocked: route HTTP failure"
        : "passed: authenticated route rendered")
      : "passed: public route rendered";
    const loadingDiagnostics = await page.evaluate(() => {
      return Array.isArray(window.__FAWXZZY_LOADING_DIAGNOSTICS__?.entries)
        ? window.__FAWXZZY_LOADING_DIAGNOSTICS__.entries
        : [];
    }).catch(() => []);
    const bodyText = ((await page.textContent("body")) ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 320);
    const endedAt = Date.now();

    manifest = {
      generatedAt: toIso(endedAt),
      startedAt: toIso(startedAt),
      endedAt: toIso(endedAt),
      durationMs: endedAt - startedAt,
      suite: suite.name,
      suiteState: suite.stateLabel,
      proofLane: suite.proofLane ?? null,
      seamKind: suite.seamKind ?? null,
      coversProtectedRoutes: suite.coversProtectedRoutes ?? [],
      baseUrl,
      devReceiptPath: receipt?.path ?? null,
      browserProfileMode: "codex-isolated-ephemeral",
      route: suite.route,
      viewport: viewport.label,
      screenshotPath,
      outputDir,
      status: blockedReason ? "blocked" : "captured",
      blockedReason,
      authOutcome,
      authRequired: suite.authRequired,
      allowAuthGatedFallback: suite.allowAuthGatedFallback,
      setupRequirements: suite.setupRequirements,
      expectedOutputFilename: suite.expectedOutputFilename,
      themePreset: suite.themePreset,
      httpStatus: responseStatus,
      finalUrl,
      expectedPathname: resolveExpectedPathname(suite.route, baseUrl),
      bodyPreview: bodyText,
      interaction: {
        performed: interactionResult.performed,
        missingExpectedText: interactionResult.missingExpectedText,
      },
      loadingDiagnostics,
      consoleMessages,
      qaSession: {
        available: qaSession.available,
        status: qaSession.status,
        summary: qaSession.summary,
        path: qaSession.path ?? sessionArtifactPath,
        email: qaSession.email ?? null,
        createdAt: qaSession.createdAt ?? qaSession.generatedAt ?? null,
        expiresAt: qaSession.expiresAt ?? null,
        expiresAtEpochSeconds: qaSession.expiresAtEpochSeconds ?? null,
        validationMode: qaSession.validationMode ?? null,
        missingEnv: qaSession.missingEnv ?? [],
        reason: qaSession.reason ?? null,
      },
    };
  } catch (error) {
    const endedAt = Date.now();
    const finalUrl = page.url();
    const sessionMissingForProtectedRoute = suite.authRequired && qaSession.status !== "valid-session";
    const blockedReason = sessionMissingForProtectedRoute
      ? (qaSession.reason ?? qaSession.summary)
      : suite.authRequired && isAuthRedirect(finalUrl, baseUrl)
        ? "Protected route redirected to /login despite a valid QA session."
        : (error instanceof Error ? error.message : String(error));
    const authOutcome = suite.authRequired
      ? (sessionMissingForProtectedRoute
        ? qaSession.summary
        : (isAuthRedirect(finalUrl, baseUrl)
          ? "blocked: auth redirect"
          : "blocked: route capture failed"))
      : "blocked: public route capture failed";
    await page.screenshot({
      path: screenshotPath,
      fullPage: suite.fullPage ?? false,
    }).catch(() => {});

    manifest = {
      generatedAt: toIso(endedAt),
      startedAt: toIso(startedAt),
      endedAt: toIso(endedAt),
      durationMs: endedAt - startedAt,
      suite: suite.name,
      suiteState: suite.stateLabel,
      proofLane: suite.proofLane ?? null,
      seamKind: suite.seamKind ?? null,
      coversProtectedRoutes: suite.coversProtectedRoutes ?? [],
      baseUrl,
      devReceiptPath: receipt?.path ?? null,
      browserProfileMode: "codex-isolated-ephemeral",
      route: suite.route,
      viewport: viewport.label,
      screenshotPath,
      outputDir,
      status: "blocked",
      blockedReason,
      authOutcome,
      authRequired: suite.authRequired,
      allowAuthGatedFallback: suite.allowAuthGatedFallback,
      setupRequirements: suite.setupRequirements,
      expectedOutputFilename: suite.expectedOutputFilename,
      themePreset: suite.themePreset,
      httpStatus: null,
      finalUrl,
      expectedPathname: resolveExpectedPathname(suite.route, baseUrl),
      bodyPreview: null,
      interaction: {
        performed: false,
        missingExpectedText: suite.interaction?.expectedText ?? [],
      },
      loadingDiagnostics: [],
      consoleMessages,
      qaSession: {
        available: qaSession.available,
        status: qaSession.status,
        summary: qaSession.summary,
        path: qaSession.path ?? sessionArtifactPath,
        email: qaSession.email ?? null,
        createdAt: qaSession.createdAt ?? qaSession.generatedAt ?? null,
        expiresAt: qaSession.expiresAt ?? null,
        expiresAtEpochSeconds: qaSession.expiresAtEpochSeconds ?? null,
        validationMode: qaSession.validationMode ?? null,
        missingEnv: qaSession.missingEnv ?? [],
        reason: qaSession.reason ?? null,
      },
    };
  } finally {
    await browser.close();
  }

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return {
    ...manifest,
    manifestPath,
  };
}

async function writeLoadingDiagnosticsReceipt({ receiptPath, results }) {
  const timestamp = buildTimestampStamp();
  const timestampedPath = path.join(LOADING_RECEIPT_DIR, `loading-diagnostics.${timestamp}.json`);
  const latestPath = path.join(LOADING_RECEIPT_DIR, "loading-diagnostics.latest.json");
  const payload = {
    generatedAt: toIso(Date.now()),
    devReceiptPath: receiptPath ?? null,
    suites: results.map((result) => ({
      suite: result.suite,
      route: result.route,
      proofLane: result.proofLane,
      seamKind: result.seamKind,
      coversProtectedRoutes: result.coversProtectedRoutes ?? [],
      status: result.status,
      blockedReason: result.blockedReason,
      manifestPath: result.manifestPath,
      screenshotPath: result.screenshotPath,
      loadingDiagnostics: result.loadingDiagnostics ?? [],
      consoleMessages: result.consoleMessages ?? [],
    })),
  };

  await fs.mkdir(LOADING_RECEIPT_DIR, { recursive: true });
  await fs.writeFile(timestampedPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await fs.writeFile(latestPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return {
    latestPath,
    timestampedPath,
  };
}

function resolveSuites(flags) {
  if (flags.all === true) {
    return listVisualFitnessSuites();
  }

  const lane = resolveProofLane(flags.lane);
  if (lane) {
    return listVisualFitnessSuites({ proofLane: lane });
  }

  const suiteName = typeof flags.suite === "string" ? flags.suite.trim() : "theme";
  const suite = getVisualFitnessSuite(suiteName);
  if (!suite) {
    const supported = listVisualFitnessSuites().map((entry) => entry.name).join(", ");
    throw new Error(`Unsupported visual suite "${suiteName}". Supported suites: ${supported}.`);
  }

  return [suite];
}

export async function runVisualFitnessSuites(argv = process.argv.slice(2)) {
  const { flags } = parseArgs(argv);
  const suites = resolveSuites(flags);
  const target = await resolveBaseUrlAndReceipt(flags);
  const receipt = target.receipt;
  const browserExecutablePath = await resolveBrowserExecutablePath();
  const results = [];
  const suiteFlags = {
    ...flags,
    __resolvedBaseUrl: target.baseUrl,
  };

  for (const suite of suites) {
    const result = await captureSuite({
      suite,
      flags: suiteFlags,
      receipt,
      browserExecutablePath,
    });
    results.push(result);
  }
  const loadingReceipt = await writeLoadingDiagnosticsReceipt({
    receiptPath: receipt?.path ?? null,
    results,
  });

  if (results.length === 1) {
    process.stdout.write(`${JSON.stringify({
      ...results[0],
      loadingDiagnosticsReceiptPath: loadingReceipt.latestPath,
    }, null, 2)}\n`);
    if (results[0].status === "blocked") {
      process.exitCode = 1;
    }
    return results[0];
  }

  const aggregate = {
    generatedAt: toIso(Date.now()),
    devReceiptPath: receipt?.path ?? null,
    loadingDiagnosticsReceiptPath: loadingReceipt.latestPath,
    suites: results.map((result) => ({
      suite: result.suite,
      route: result.route,
      status: result.status,
      blockedReason: result.blockedReason,
      screenshotPath: result.screenshotPath,
      manifestPath: result.manifestPath,
    })),
  };
  process.stdout.write(`${JSON.stringify(aggregate, null, 2)}\n`);
  if (results.some((result) => result.status === "blocked")) {
    process.exitCode = 1;
  }
  return aggregate;
}

async function main() {
  await runVisualFitnessSuites(process.argv.slice(2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  main().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
