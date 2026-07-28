#!/usr/bin/env node
import fs from "node:fs/promises";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
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
  listRegistryVisualFitnessSuites,
  listVisualFitnessSuites,
} from "./visual-fitness-suites.mjs";
import {
  ACCEPTED_VISUAL_CATALOG_COUNTS,
  VISUAL_CAPTURE_ENVIRONMENT,
  VISUAL_FITNESS_STATE_REGISTRY,
  VISUAL_STATE_REGISTRY_VERSION,
  buildVisualCatalogCountDelta,
  buildVisualCatalogCoverage,
  computeVisualStateRegistryDigest,
  validateVisualStateRegistry,
} from "./visual-fitness-state-registry.mjs";

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

function normalizeRouteValue(rawValue, baseUrl = "http://127.0.0.1") {
  const parsed = new URL(rawValue, `${normalizeBaseUrl(baseUrl)}/`);
  return `${parsed.pathname}${parsed.search}`;
}

export function validateResolvedRoute({
  requestedRoute,
  resolvedUrl,
  expectedResolvedRoute,
  baseUrl = "http://127.0.0.1",
}) {
  const requested = normalizeRouteValue(requestedRoute, baseUrl);
  const resolved = normalizeRouteValue(resolvedUrl, baseUrl);
  if (!expectedResolvedRoute || typeof expectedResolvedRoute !== "object") {
    return {
      valid: false,
      requested,
      resolved,
      reason: "Expected resolved-route contract is missing.",
    };
  }

  let valid = false;
  if (expectedResolvedRoute.kind === "exact") {
    valid = resolved === normalizeRouteValue(expectedResolvedRoute.value, baseUrl);
  } else if (expectedResolvedRoute.kind === "one-of") {
    valid = Array.isArray(expectedResolvedRoute.values)
      && expectedResolvedRoute.values.some((value) => resolved === normalizeRouteValue(value, baseUrl));
  } else if (expectedResolvedRoute.kind === "pattern") {
    try {
      valid = new RegExp(expectedResolvedRoute.value).test(resolved);
    } catch {
      valid = false;
    }
  }

  return {
    valid,
    requested,
    resolved,
    reason: valid
      ? null
      : `Resolved route ${resolved} violates the ${expectedResolvedRoute.kind ?? "unknown"} contract for ${requested}.`,
  };
}

function isSafeLocalReturnPath(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

function isLoopbackHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function buildAnonymousLocalDevAutoLoginBypassUrl({ requestUrl, baseUrl }) {
  try {
    const request = new URL(requestUrl);
    const base = new URL(baseUrl);
    if (
      request.pathname !== "/auth/local-dev-auto-login"
      || !isLoopbackHost(request.hostname)
      || !isLoopbackHost(base.hostname)
      || request.port !== base.port
    ) {
      return null;
    }

    const params = new URLSearchParams({ manual: "1" });
    const returnTo = request.searchParams.get("returnTo");
    if (isSafeLocalReturnPath(returnTo)) {
      params.set("returnTo", returnTo);
    }
    // Keep the redirect on the request origin: Next dev may legitimately switch
    // between localhost and 127.0.0.1 while preserving the same loopback port.
    return new URL(`/login?${params.toString()}`, request.origin).toString();
  } catch {
    return null;
  }
}

export async function applyAnonymousRegistryGuards(context, registry, baseUrl) {
  if (registry?.authState !== "anonymous") {
    return;
  }

  await context.route("**/auth/local-dev-auto-login**", async (route) => {
    const location = buildAnonymousLocalDevAutoLoginBypassUrl({
      requestUrl: route.request().url(),
      baseUrl,
    });
    if (!location) {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 302,
      headers: { location },
      body: "",
    });
  });
}

export function sanitizeVisualDiagnosticText(rawValue) {
  const value = String(rawValue ?? "");
  return value
    .replace(/([?&](?:token|code|key|secret|email|access_token|refresh_token)=)[^&#\s]+/gi, "$1[redacted]")
    .replace(/\b(?:eyJ[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{8,})\b/g, "[redacted-jwt]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .slice(0, 1200);
}

function sanitizeUrl(rawValue) {
  try {
    const parsed = new URL(rawValue);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return sanitizeVisualDiagnosticText(rawValue);
  }
}

function readGitValue(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

export function readVisualSourceIdentity() {
  return {
    commit: readGitValue(["rev-parse", "HEAD"]),
    tree: readGitValue(["rev-parse", "HEAD^{tree}"]),
  };
}

async function sha256File(filePath) {
  const bytes = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function buildVisualCatalogManifest({
  tier,
  results,
  sourceIdentity,
  browserVersion,
  generatedAt,
  outputRoot,
}) {
  const coverage = buildVisualCatalogCoverage();
  const countDelta = buildVisualCatalogCountDelta(coverage);
  const planned = results.length;
  const captured = results.filter((result) => result.status === "captured").length;
  const blocked = results.filter((result) => result.status === "blocked");
  return {
    schemaVersion: "fitness-visual-catalog-manifest.v1",
    generatedAt,
    tier,
    source: sourceIdentity,
    registry: {
      version: VISUAL_STATE_REGISTRY_VERSION,
      digest: computeVisualStateRegistryDigest(),
      semanticStates: coverage.semanticStates,
      rawCaptures: coverage.rawCaptures,
      accepted: ACCEPTED_VISUAL_CATALOG_COUNTS,
      countDelta,
    },
    environment: {
      ...VISUAL_CAPTURE_ENVIRONMENT,
      nodeVersion: process.version,
      browserVersion,
      platform: `${process.platform}-${process.arch}`,
      osRelease: os.release(),
    },
    outputRoot,
    plannedCaptureCount: planned,
    capturedCount: captured,
    blockedCount: blocked.length,
    failures: blocked.map((result) => ({
      captureId: result.registryCaptureId,
      reason: sanitizeVisualDiagnosticText(result.blockedReason),
      tracePath: result.tracePath ?? null,
    })),
    captures: results.map((result) => ({
      captureId: result.registryCaptureId,
      stateId: result.suiteState,
      family: result.registryFamily,
      registryIndex: result.registryIndex,
      variantIndex: result.registryVariantIndex,
      viewport: result.viewport,
      captureMode: result.captureMode,
      requestedRoute: result.requestedRoute,
      resolvedRoute: result.resolvedRoute,
      fixtureOwner: result.fixtureOwner,
      authState: result.registryAuthState,
      status: result.status,
      blockedReason: result.blockedReason ? sanitizeVisualDiagnosticText(result.blockedReason) : null,
      screenshotPath: result.screenshotPath,
      screenshotSha256: result.screenshotSha256,
      receiptPath: result.manifestPath,
      tracePath: result.tracePath ?? null,
    })),
  };
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

export function resolveViewport(rawValue, fallback = DEFAULT_VISUAL_VIEWPORT) {
  const raw = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!raw) {
    const width = Number(fallback?.width);
    const height = Number(fallback?.height);
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
      throw new Error("Invalid fallback viewport. Expected positive integer width and height.");
    }

    return {
      label: typeof fallback?.label === "string" && fallback.label.trim()
        ? fallback.label.trim()
        : `${width}x${height}`,
      width,
      height,
    };
  }

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

export function buildQaBrowserStorageStateFromSessionCookies(
  sessionCookies,
  baseUrl,
  { ensureStorageState = ensureBrowserSupabaseStorageState } = {},
) {
  if (!Array.isArray(sessionCookies) || sessionCookies.length === 0) {
    return null;
  }

  const storageState = ensureStorageState({
    cookies: sessionCookies
      .map((cookie) => normalizeStorageCookie(cookie, baseUrl))
      .filter(Boolean),
    origins: [],
  }, { baseUrl });

  return hasUsableQaStorageState(storageState) ? storageState : null;
}

export async function resolveQaBrowserStorageState({
  authRequired,
  qaSession,
  baseUrl,
  loadStoredState = loadQaStorageState,
  ensureStorageState = ensureBrowserSupabaseStorageState,
}) {
  if (!authRequired || !qaSession?.available) {
    return null;
  }

  const qaStorageStateFromSession = buildQaBrowserStorageStateFromSessionCookies(
    qaSession.cookies,
    baseUrl,
    { ensureStorageState },
  );
  if (qaStorageStateFromSession) {
    return qaStorageStateFromSession;
  }

  return await loadStoredState(baseUrl);
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

function normalizeInteractionBodyText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

async function waitForFeedbackSavedState(page, options = {}) {
  const noteSelector = typeof options.noteSelector === "string" && options.noteSelector.trim().length > 0
    ? options.noteSelector.trim()
    : 'input[id^="session-copilot-note-"]';
  await page.waitForFunction(({ resolvedNoteSelector }) => {
    const controls = Array.from(document.querySelectorAll(
      `button[aria-label^="Effort "], button[aria-pressed], ${resolvedNoteSelector}`,
    )).filter((node) => {
      if (!(node instanceof HTMLElement)) {
        return false;
      }
      const style = window.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }
      return node.offsetWidth > 0 || node.offsetHeight > 0 || node.getClientRects().length > 0;
    });
    const allEnabled = controls.every((node) => (
      !(node instanceof HTMLButtonElement || node instanceof HTMLInputElement)
      || !node.disabled
    ));
    return allEnabled && !document.body.innerText.includes("Saving feedback...");
  }, { resolvedNoteSelector: noteSelector }, {
    timeout: 10000,
  });
}

async function runSuiteInteraction(page, suite, options = {}) {
  const interaction = suite.interaction;
  if (!interaction) {
    return {
      performed: false,
      bodyText: null,
      missingExpectedText: [],
      details: null,
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
        details: null,
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
          bodyText: normalizeInteractionBodyText(await page.textContent("body")),
          missingExpectedText: interaction.expectedText ?? [],
          details: null,
          blockedReason: `Unable to find the "${interaction.selectThemeSlotLabel}" theme slot trigger.`,
        };
      }

      await slotTrigger.click();
      await page.waitForTimeout(750);
    }

    const bodyText = normalizeInteractionBodyText(await page.textContent("body"));
    const normalizedBodyText = bodyText.toLowerCase();
    const missingExpectedText = (interaction.expectedText ?? []).filter((text) => !normalizedBodyText.includes(text.toLowerCase()));
    return {
      performed: true,
      bodyText,
      missingExpectedText,
      details: null,
      blockedReason: missingExpectedText.length > 0
        ? `Missing expected App Theme text: ${missingExpectedText.join(", ")}.`
        : null,
    };
  }

  if (interaction.type === "session-feedback-roundtrip") {
    const baseUrl = normalizeBaseUrl(options.baseUrl ?? resolveBaseUrl());
    const signalLabel = typeof interaction.signalLabel === "string" && interaction.signalLabel.trim().length > 0
      ? interaction.signalLabel.trim()
      : "Too Hard";
    const effortValue = Number.isFinite(interaction.effortValue)
      ? Math.round(interaction.effortValue)
      : 8;
    const noteValue = typeof interaction.noteValue === "string" ? interaction.noteValue : "";
    const routeUrl = `${baseUrl}${suite.route}`;
    const routeExerciseId = new URL(routeUrl).searchParams.get("exerciseId");
    const noteSelector = routeExerciseId
      ? `#session-copilot-note-${routeExerciseId}`
      : 'input[id^="session-copilot-note-"]';
    const getSignalButton = () => page.locator("button[aria-pressed]").filter({ hasText: signalLabel, visible: true }).first();
    const getEffortButton = () => page.locator(`button[aria-label="Effort ${effortValue} out of 10"]`).filter({ visible: true }).first();
    const getNoteInput = () => page.locator(noteSelector).filter({ visible: true }).first();

    const ensureFeedbackControls = async () => {
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      await getSignalButton().waitFor({ state: "visible", timeout: 15000 });
      await getEffortButton().waitFor({ state: "visible", timeout: 15000 });
    };
    const resetFeedbackBaseline = async () => {
      const noteInput = getNoteInput();
      if (await noteInput.isVisible().catch(() => false)) {
        const existingValue = await noteInput.inputValue().catch(() => "");
        if (existingValue.trim().length > 0) {
          await noteInput.fill("");
          await noteInput.evaluate((node) => node.blur());
          await waitForFeedbackSavedState(page, { noteSelector });
        }
      }

      const effortButton = getEffortButton();
      if ((await effortButton.getAttribute("aria-pressed")) === "true") {
        await effortButton.click();
        await page.waitForTimeout(200);
        await waitForFeedbackSavedState(page, { noteSelector });
      }

      const signalButton = getSignalButton();
      if ((await signalButton.getAttribute("aria-pressed")) === "true") {
        await signalButton.click();
        await page.waitForTimeout(200);
        await waitForFeedbackSavedState(page, { noteSelector });
      }
    };

    await ensureFeedbackControls();
    await resetFeedbackBaseline();
    await ensureFeedbackControls();

    const signalButton = getSignalButton();
    const signalVisible = await signalButton.isVisible().catch(() => false);
    if (!signalVisible) {
      return {
        performed: false,
        bodyText: null,
        missingExpectedText: interaction.expectedText ?? [],
        details: null,
        blockedReason: `Unable to find the "${signalLabel}" feedback chip on the session logger.`,
      };
    }

    const effortButton = getEffortButton();
    const effortVisible = await effortButton.isVisible().catch(() => false);
    if (!effortVisible) {
      return {
        performed: false,
        bodyText: null,
        missingExpectedText: interaction.expectedText ?? [],
        details: null,
        blockedReason: `Unable to find the effort ${effortValue}/10 chip on the session logger.`,
      };
    }

    await signalButton.click();
    await waitForFeedbackSavedState(page, { noteSelector });
    await effortButton.click();
    await waitForFeedbackSavedState(page, { noteSelector });

    const noteInput = getNoteInput();
    const noteVisible = await noteInput.isVisible().catch(() => false);
    if (!noteVisible) {
      return {
        performed: true,
        bodyText: normalizeInteractionBodyText(await page.textContent("body")),
        missingExpectedText: interaction.expectedText ?? [],
        details: null,
        blockedReason: "Feedback note input did not appear after selecting a signal and effort rating.",
      };
    }

    await page.waitForFunction(({ resolvedNoteSelector }) => {
      const input = document.querySelector(resolvedNoteSelector);
      return input instanceof HTMLInputElement && !input.disabled;
    }, { resolvedNoteSelector: noteSelector }, {
      timeout: 10000,
    });

    await noteInput.fill(noteValue);
    await noteInput.evaluate((node) => node.blur());
    await waitForFeedbackSavedState(page, { noteSelector });

    await page.goto(routeUrl, {
      waitUntil: suite.waitUntil ?? "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(suite.waitMs ?? 1600);
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await ensureFeedbackControls();

    const persistedSignalPressed = await getSignalButton().getAttribute("aria-pressed");
    const persistedEffortPressed = await getEffortButton().getAttribute("aria-pressed");
    const persistedNoteValue = await getNoteInput().inputValue().catch(() => "");
    const persistedBodyText = normalizeInteractionBodyText(await page.textContent("body"));
    const persistedBodyTextLower = persistedBodyText.toLowerCase();
    const missingExpectedText = (interaction.expectedText ?? []).filter((text) => !persistedBodyTextLower.includes(text.toLowerCase()));

    const signalPersisted = persistedSignalPressed === "true";
    const effortPersisted = persistedEffortPressed === "true";
    const notePersisted = persistedNoteValue.trim() === noteValue.trim();

    if (!signalPersisted || !notePersisted) {
      return {
        performed: true,
        bodyText: persistedBodyText,
        missingExpectedText,
        details: {
          persistedSignalPressed,
          persistedEffortPressed,
          persistedNoteValue,
        },
        blockedReason: "Session feedback signal or note did not persist across reload on the live route.",
      };
    }

    const restoredNoteInput = getNoteInput();
    await restoredNoteInput.fill("");
    await restoredNoteInput.evaluate((node) => node.blur());
    await waitForFeedbackSavedState(page, { noteSelector });

    const restoredEffortButton = getEffortButton();
    if ((await restoredEffortButton.getAttribute("aria-pressed")) === "true") {
      await restoredEffortButton.click();
      await page.waitForTimeout(200);
      await waitForFeedbackSavedState(page, { noteSelector });
    }

    const restoredSignalButton = getSignalButton();
    if ((await restoredSignalButton.getAttribute("aria-pressed")) === "true") {
      await restoredSignalButton.click();
      await page.waitForTimeout(200);
      await waitForFeedbackSavedState(page, { noteSelector });
    }

    await page.goto(routeUrl, {
      waitUntil: suite.waitUntil ?? "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(suite.waitMs ?? 1600);
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    await ensureFeedbackControls();

    const clearedSignalPressed = await getSignalButton().getAttribute("aria-pressed");
    const clearedEffortPressed = await getEffortButton().getAttribute("aria-pressed");
    const clearedNoteValue = await getNoteInput().inputValue().catch(() => "");
    const bodyText = normalizeInteractionBodyText(await page.textContent("body"));

    return {
      performed: true,
      bodyText,
      missingExpectedText,
      details: {
        persistedSignalPressed,
        persistedEffortPressed,
        persistedNoteValue,
        clearedSignalPressed,
        clearedEffortPressed,
        clearedNoteValue,
      },
      blockedReason: (
        clearedSignalPressed === "false"
        && clearedEffortPressed === "false"
        && clearedNoteValue.trim() === ""
      )
        ? (
          !effortPersisted
            ? "Signal and note persisted, but effort did not survive reload. The QA environment is still missing persisted effort support for session feedback."
            : (missingExpectedText.length > 0
              ? `Missing expected session feedback text: ${missingExpectedText.join(", ")}.`
              : null)
        )
        : "Session feedback cleanup did not restore the QA baseline after verification.",
    };
  }

  if (interaction.type === "session-feedback-fixture-contract") {
    const baseUrl = normalizeBaseUrl(options.baseUrl ?? resolveBaseUrl());
    const routeUrl = `${baseUrl}${suite.route}`;
    const routeExerciseId = new URL(routeUrl).searchParams.get("exerciseId");
    const signalLabel = typeof interaction.signalLabel === "string" ? interaction.signalLabel.trim() : "";
    const effortValue = Number.isFinite(interaction.effortValue)
      ? Math.round(interaction.effortValue)
      : null;
    const expectedLogButtonText = typeof interaction.expectedLogButtonText === "string"
      ? interaction.expectedLogButtonText.trim()
      : "";
    const expectedSummaryText = typeof interaction.expectedSummaryText === "string"
      ? interaction.expectedSummaryText.trim()
      : "";
    const expectedPlaceholderText = typeof interaction.expectedPlaceholderText === "string"
      ? interaction.expectedPlaceholderText.trim()
      : "";
    const expectedNoteValue = typeof interaction.noteValue === "string"
      ? interaction.noteValue
      : "";
    const noteSelector = routeExerciseId
      ? `#session-copilot-note-${routeExerciseId}`
      : 'input[id^="session-copilot-note-"]';
    const getPressedSignalButton = () => page.locator('button[aria-pressed="true"]').filter({ hasText: signalLabel, visible: true }).first();
    const getPressedEffortButton = () => page.locator(`button[aria-label="Effort ${effortValue} out of 10"][aria-pressed="true"]`).filter({ visible: true }).first();
    const getNoteInput = () => page.locator(noteSelector).filter({ visible: true }).first();
    const getLogButton = () => page.getByRole("button", { name: expectedLogButtonText });

    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    const signalButton = getPressedSignalButton();
    const signalCount = await signalButton.count().catch(() => 0);
    if (signalCount !== 1) {
      return {
        performed: false,
        bodyText: normalizeInteractionBodyText(await page.textContent("body")),
        missingExpectedText: interaction.expectedText ?? [],
        details: {
          signalCount,
        },
        blockedReason: `Expected exactly one pressed "${signalLabel}" feedback chip on the session fixture.`,
      };
    }

    const effortButton = getPressedEffortButton();
    const effortCount = await effortButton.count().catch(() => 0);
    if (effortCount !== 1) {
      return {
        performed: false,
        bodyText: normalizeInteractionBodyText(await page.textContent("body")),
        missingExpectedText: interaction.expectedText ?? [],
        details: {
          effortCount,
        },
        blockedReason: `Expected exactly one pressed effort ${effortValue}/10 chip on the session fixture.`,
      };
    }

    const noteInput = getNoteInput();
    const noteVisible = await noteInput.isVisible().catch(() => false);
    if (!noteVisible) {
      return {
        performed: false,
        bodyText: normalizeInteractionBodyText(await page.textContent("body")),
        missingExpectedText: interaction.expectedText ?? [],
        details: null,
        blockedReason: "Expected the session feedback note field to be visible on the selected fixture exercise.",
      };
    }

    const noteValue = await noteInput.inputValue().catch(() => "");
    const notePlaceholder = await noteInput.getAttribute("placeholder", { timeoutMs: 5000 }).catch(() => null);
    const logButton = getLogButton();
    const logButtonCount = await logButton.count().catch(() => 0);
    const logButtonText = logButtonCount > 0
      ? await logButton.innerText({ timeoutMs: 5000 }).catch(() => null)
      : null;
    const bodyText = normalizeInteractionBodyText(await page.textContent("body"));
    const bodyTextLower = bodyText.toLowerCase();
    const missingExpectedText = (interaction.expectedText ?? []).filter((text) => !bodyTextLower.includes(text.toLowerCase()));

    const blockedReasons = [];
    if (logButtonCount !== 1) {
      blockedReasons.push(`expected one visible log button with label "${expectedLogButtonText}"`);
    }
    if (expectedSummaryText && !bodyTextLower.includes(expectedSummaryText.toLowerCase())) {
      blockedReasons.push(`missing summary "${expectedSummaryText}"`);
    }
    if (expectedPlaceholderText && notePlaceholder !== expectedPlaceholderText) {
      blockedReasons.push(`expected placeholder "${expectedPlaceholderText}" but found "${notePlaceholder ?? ""}"`);
    }
    if ((noteValue ?? "").trim() !== expectedNoteValue.trim()) {
      blockedReasons.push(`expected note value "${expectedNoteValue}" but found "${noteValue ?? ""}"`);
    }
    if (missingExpectedText.length > 0) {
      blockedReasons.push(`missing expected fixture text: ${missingExpectedText.join(", ")}`);
    }

    return {
      performed: true,
      bodyText,
      missingExpectedText,
      details: {
        logButtonText,
        notePlaceholder,
        noteValue,
        signalLabel,
        effortValue,
      },
      blockedReason: blockedReasons.length > 0
        ? `Session feedback fixture contract failed: ${blockedReasons.join("; ")}.`
        : null,
    };
  }

  if (interaction.type === "history-detail-note-contract") {
    const expectedNoteText = typeof interaction.expectedNoteText === "string"
      ? interaction.expectedNoteText.trim()
      : "";
    const openExerciseName = typeof interaction.openExerciseName === "string"
      ? interaction.openExerciseName.trim()
      : "";

    if (openExerciseName) {
      const exerciseCardTrigger = page
        .getByRole("button")
        .filter({ has: page.getByText(new RegExp(openExerciseName, "i")) })
        .first();
      const triggerVisible = await exerciseCardTrigger.isVisible().catch(() => false);
      if (!triggerVisible) {
        return {
          performed: false,
          bodyText: normalizeInteractionBodyText(await page.textContent("body")),
          missingExpectedText: interaction.expectedText ?? [],
          details: {
            expectedNoteText,
            openExerciseName,
          },
          blockedReason: `Unable to find the "${openExerciseName}" exercise card on history detail.`,
        };
      }

      await exerciseCardTrigger.click();
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
    }

    const bodyText = normalizeInteractionBodyText(await page.textContent("body"));
    const bodyTextLower = bodyText.toLowerCase();
    const missingExpectedText = (interaction.expectedText ?? []).filter((text) => !bodyTextLower.includes(text.toLowerCase()));
    const notesHeading = page.getByRole("heading", { name: "Notes" });
    const notesHeadingCount = await notesHeading.count().catch(() => 0);
    const blockedReasons = [];

    if (notesHeadingCount !== 1) {
      blockedReasons.push(`expected exactly one Notes heading but found ${notesHeadingCount}`);
    }
    if (expectedNoteText && !bodyTextLower.includes(expectedNoteText.toLowerCase())) {
      blockedReasons.push(`missing note text "${expectedNoteText}"`);
    }
    if (missingExpectedText.length > 0) {
      blockedReasons.push(`missing expected history detail text: ${missingExpectedText.join(", ")}`);
    }

    return {
      performed: true,
      bodyText,
      missingExpectedText,
      details: {
        expectedNoteText,
        openExerciseName,
        notesHeadingCount,
      },
      blockedReason: blockedReasons.length > 0
        ? `History detail note contract failed: ${blockedReasons.join("; ")}.`
        : null,
    };
  }

  if (interaction.type === "history-sessions-notes-contract") {
    const filterToggle = page.getByRole("button", { name: "Toggle session filters" });
    const filterToggleCount = await filterToggle.count().catch(() => 0);
    if (filterToggleCount !== 1) {
      return {
        performed: false,
        bodyText: normalizeInteractionBodyText(await page.textContent("body")),
        missingExpectedText: interaction.expectedText ?? [],
        details: {
          filterToggleCount,
        },
        blockedReason: `Expected exactly one history filter toggle but found ${filterToggleCount}.`,
      };
    }

    await filterToggle.click();
    await page.waitForTimeout(300);

    const bodyText = normalizeInteractionBodyText(await page.textContent("body"));
    const bodyTextLower = bodyText.toLowerCase();
    const missingExpectedText = (interaction.expectedText ?? []).filter((text) => !bodyTextLower.includes(text.toLowerCase()));
    const missingVisibleText = (interaction.expectedVisibleText ?? []).filter((text) => !bodyTextLower.includes(text.toLowerCase()));
    const unexpectedHiddenText = (interaction.expectedHiddenText ?? []).filter((text) => bodyTextLower.includes(text.toLowerCase()));
    const notesHighlightButton = page.getByRole("button", { name: "Notes" });
    const notesHighlightCount = await notesHighlightButton.count().catch(() => 0);
    const blockedReasons = [];

    if (notesHighlightCount < 1) {
      blockedReasons.push("expected the History highlight filter group to expose a Notes option");
    } else {
      await notesHighlightButton.click();
      await page.waitForTimeout(300);
    }

    const filteredBodyText = normalizeInteractionBodyText(await page.textContent("body"));
    const filteredBodyTextLower = filteredBodyText.toLowerCase();
    const filteredMissingExpectedText = (interaction.expectedText ?? []).filter((text) => !filteredBodyTextLower.includes(text.toLowerCase()));
    const expectedVisibleHrefSubstrings = interaction.expectedVisibleHrefSubstrings ?? [];
    const expectedHiddenHrefSubstrings = interaction.expectedHiddenHrefSubstrings ?? [];
    const missingVisibleHrefSubstrings = [];
    const unexpectedHiddenHrefSubstrings = [];

    for (const hrefSubstring of expectedVisibleHrefSubstrings) {
      const matchCount = await page.locator(`a[href*="${hrefSubstring}"]`).count().catch(() => 0);
      if (matchCount < 1) {
        missingVisibleHrefSubstrings.push(hrefSubstring);
      }
    }

    for (const hrefSubstring of expectedHiddenHrefSubstrings) {
      const matchCount = await page.locator(`a[href*="${hrefSubstring}"]`).count().catch(() => 0);
      if (matchCount > 0) {
        unexpectedHiddenHrefSubstrings.push(hrefSubstring);
      }
    }

    if (filteredMissingExpectedText.length > 0) {
      blockedReasons.push(`missing expected history overview text: ${filteredMissingExpectedText.join(", ")}`);
    }
    if (missingVisibleHrefSubstrings.length > 0) {
      blockedReasons.push(`missing expected notes-filter session cards: ${missingVisibleHrefSubstrings.join(", ")}`);
    }
    if (unexpectedHiddenHrefSubstrings.length > 0) {
      blockedReasons.push(`notes filter still exposed non-note session cards: ${unexpectedHiddenHrefSubstrings.join(", ")}`);
    }

    return {
      performed: true,
      bodyText: filteredBodyText,
      missingExpectedText: filteredMissingExpectedText,
      details: {
        filterToggleCount,
        notesHighlightCount,
        missingVisibleHrefSubstrings,
        unexpectedHiddenHrefSubstrings,
      },
      blockedReason: blockedReasons.length > 0
        ? `History sessions notes contract failed: ${blockedReasons.join("; ")}.`
        : null,
    };
  }

  if (interaction.type === "history-sessions-drill-in-contract") {
    const targetHref = typeof interaction.targetHref === "string"
      ? interaction.targetHref.trim()
      : "";
    const expectedUrl = typeof interaction.expectedUrl === "string"
      ? interaction.expectedUrl.trim()
      : "";
    const targetCard = targetHref
      ? page.locator(`a[href="${targetHref}"]`)
      : null;
    const targetCount = targetCard ? await targetCard.count().catch(() => 0) : 0;
    if (!targetHref || targetCount !== 1) {
      return {
        performed: false,
        bodyText: normalizeInteractionBodyText(await page.textContent("body")),
        missingExpectedText: interaction.expectedText ?? [],
        details: {
          targetHref,
          targetCount,
        },
        blockedReason: `Expected exactly one history session drill-in target for "${targetHref}".`,
      };
    }

    await targetCard.click();
    await page.waitForLoadState("load", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(300);

    const openExerciseName = typeof interaction.openExerciseName === "string"
      ? interaction.openExerciseName.trim()
      : "";
    if (expectedUrl) {
      await page.waitForURL(expectedUrl, { timeout: 15000, waitUntil: "load" }).catch(() => {});
    }
    if (openExerciseName) {
      const exerciseCardTrigger = page
        .getByRole("button")
        .filter({ has: page.getByText(new RegExp(openExerciseName, "i")) })
        .first();
      await exerciseCardTrigger.waitFor({ state: "visible", timeoutMs: 15000 }).catch(() => {});
      const exerciseTriggerVisible = await exerciseCardTrigger.isVisible().catch(() => false);
      if (!exerciseTriggerVisible) {
        return {
          performed: true,
          bodyText: normalizeInteractionBodyText(await page.textContent("body")),
          missingExpectedText: interaction.expectedText ?? [],
          details: {
            targetHref,
            landedUrl: page.url(),
            openExerciseName,
          },
          blockedReason: `History drill-in landed, but could not find the "${openExerciseName}" exercise card to expand.`,
        };
      }

      await exerciseCardTrigger.click();
      await page.waitForLoadState("load", { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(300);
    } else if ((interaction.expectedText ?? []).length > 0) {
      await page.waitForFunction((expectedText) => {
        const bodyText = document.body?.innerText?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
        return expectedText.every((text) => bodyText.includes(String(text).toLowerCase()));
      }, interaction.expectedText, {
        timeout: 15000,
      }).catch(() => {});
    }

    const landedUrl = page.url();
    const bodyText = normalizeInteractionBodyText(await page.textContent("body"));
    const bodyTextLower = bodyText.toLowerCase();
    const missingExpectedText = (interaction.expectedText ?? []).filter((text) => !bodyTextLower.includes(text.toLowerCase()));
    const blockedReasons = [];

    if (expectedUrl && landedUrl !== expectedUrl) {
      blockedReasons.push(`expected to land on ${expectedUrl} but found ${landedUrl}`);
    }
    if (missingExpectedText.length > 0) {
      blockedReasons.push(`missing expected history drill-in text: ${missingExpectedText.join(", ")}`);
    }

    return {
      performed: true,
      bodyText,
      missingExpectedText,
      details: {
        targetHref,
        landedUrl,
      },
      blockedReason: blockedReasons.length > 0
        ? `History sessions drill-in contract failed: ${blockedReasons.join("; ")}.`
        : null,
    };
  }

  return {
    performed: false,
    bodyText: null,
    missingExpectedText: [],
    details: null,
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

async function applyRegistrySetup(context, registry) {
  if (!registry?.setup) {
    return;
  }
  if (registry.setup.kind !== "local-storage") {
    throw new Error(`Unsupported registry setup kind "${registry.setup.kind}".`);
  }
  await context.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, {
    key: registry.setup.key,
    value: registry.setup.value,
  });
}

export async function scrollRegistryCaptureToBottom(page) {
  await page.evaluate(() => {
    const scrollable = Array.from(document.querySelectorAll("*")).filter((element) => {
      const overflowY = window.getComputedStyle(element).overflowY;
      return (overflowY === "auto" || overflowY === "scroll")
        && element.scrollHeight > element.clientHeight + 1;
    }).sort((left, right) => {
      return (right.scrollHeight - right.clientHeight)
        - (left.scrollHeight - left.clientHeight);
    })[0];

    const target = scrollable ?? document.scrollingElement;
    if (target) {
      target.scrollTop = target.scrollHeight;
    }
  });
}

export async function applyDeterministicCaptureStyle(context) {
  await context.addInitScript(({ content, markerId }) => {
    const installStyle = () => {
      if (document.getElementById(markerId)) {
        return;
      }
      const style = document.createElement("style");
      style.id = markerId;
      style.textContent = content;
      (document.head ?? document.documentElement).appendChild(style);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", installStyle, { once: true });
      return;
    }
    installStyle();
  }, {
    markerId: "fitness-visual-qa-deterministic-style",
    content: [
      "*, *::before, *::after {",
      "  animation-delay: 0s !important;",
      "  animation-duration: 0s !important;",
      "  caret-color: transparent !important;",
      "  transition-delay: 0s !important;",
      "  transition-duration: 0s !important;",
      "}",
    ].join("\n"),
  });
}

async function runRegistryAssertions(page, assertions = []) {
  const failures = [];
  for (const assertion of assertions) {
    if (assertion.kind === "text") {
      const bodyText = (await page.textContent("body")) ?? "";
      if (!bodyText.toLowerCase().includes(String(assertion.value).toLowerCase())) {
        failures.push(`Missing expected text: ${assertion.value}`);
      }
    } else if (assertion.kind === "selector") {
      const count = await page.locator(assertion.value).count();
      if (count < 1) {
        failures.push(`Missing expected selector: ${assertion.value}`);
      }
    } else {
      failures.push(`Unsupported semantic assertion kind: ${assertion.kind}`);
    }
  }
  return failures;
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
    const interactionExpectedUrl = typeof suite?.interaction?.expectedUrl === "string"
      ? suite.interaction.expectedUrl.trim()
      : "";
    const expectedPathname = interactionExpectedUrl
      ? resolveExpectedPathname(interactionExpectedUrl, baseUrl)
      : resolveExpectedPathname(suite.route, baseUrl);
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
  const catalogOutputRoot = typeof flags.__catalogOutputRoot === "string"
    ? flags.__catalogOutputRoot
    : null;
  const outputDir = catalogOutputRoot && suite.registry
    ? path.join(catalogOutputRoot, "captures", suite.registry.captureId.replace(/[^a-z0-9-]+/gi, "-"))
    : buildOutputDir({
        suiteName: suite.name,
        explicitOutputDir: typeof flags["output-dir"] === "string" ? flags["output-dir"] : null,
      });
  const screenshotPath = path.join(outputDir, suite.expectedOutputFilename);
  const manifestPath = path.join(outputDir, "capture-manifest.json");
  const tracePath = path.join(outputDir, "failure-trace.zip");
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
  const qaStorageState = await resolveQaBrowserStorageState({
    authRequired: suite.authRequired,
    qaSession,
    baseUrl,
  });

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
  const browserVersion = browser.version();

  const context = await browser.newContext({
    viewport: {
      width: viewport.width,
      height: viewport.height,
    },
    isMobile: viewport.width <= 430,
    hasTouch: viewport.width <= 430,
    colorScheme: VISUAL_CAPTURE_ENVIRONMENT.colorScheme,
    deviceScaleFactor: VISUAL_CAPTURE_ENVIRONMENT.deviceScaleFactor,
    locale: VISUAL_CAPTURE_ENVIRONMENT.locale,
    reducedMotion: VISUAL_CAPTURE_ENVIRONMENT.reducedMotion,
    timezoneId: VISUAL_CAPTURE_ENVIRONMENT.timezoneId,
    ...(qaStorageState ? { storageState: qaStorageState } : {}),
  });
  await applyAnonymousRegistryGuards(context, suite.registry, baseUrl);
  await applyThemePreset(context, suite.themePreset);
  await applyRegistrySetup(context, suite.registry);
  if (suite.registry) {
    await applyDeterministicCaptureStyle(context);
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  }
  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on("console", (message) => {
    const text = message.text();
    if (
      text.includes("[loading-diagnostics]")
      || message.type() === "warning"
      || message.type() === "error"
    ) {
      consoleMessages.push({
        type: message.type(),
        text: sanitizeVisualDiagnosticText(text),
      });
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(sanitizeVisualDiagnosticText(error.message));
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({
      method: request.method(),
      url: sanitizeUrl(request.url()),
      failure: sanitizeVisualDiagnosticText(request.failure()?.errorText ?? "request failed"),
    });
  });

  let manifest = null;
  let retainTrace = false;

  try {
    if (suite.authRequired && qaSession.available && !qaStorageState) {
      await context.addCookies(normalizePlaywrightCookies(qaSession.cookies, baseUrl));
    }

    const response = await page.goto(`${baseUrl}${suite.route}`, {
      waitUntil: suite.waitUntil ?? "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(suite.waitMs ?? 1600);
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
    const interactionResult = await runSuiteInteraction(page, suite, { baseUrl });
    if (suite.registry?.captureMode === "mobile-bottom") {
      await scrollRegistryCaptureToBottom(page);
      await page.waitForTimeout(100);
    }
    const registryAssertionFailures = suite.registry
      ? await runRegistryAssertions(page, suite.registry.assertions)
      : [];
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
    const registryRouteResult = suite.registry
      ? validateResolvedRoute({
          requestedRoute: suite.route,
          resolvedUrl: finalUrl,
          expectedResolvedRoute: suite.registry.expectedResolvedRoute,
          baseUrl,
        })
      : null;
    const unexpectedFinalPathReason = suite.registry
      ? null
      : resolveUnexpectedFinalPathReason({
          finalUrl,
          suite,
          baseUrl,
        });
    const registryFailureReason = registryRouteResult && !registryRouteResult.valid
      ? registryRouteResult.reason
      : registryAssertionFailures.length > 0
        ? registryAssertionFailures.join("; ")
        : null;
    const blockedReason = sessionMissingForProtectedRoute
      ? (qaSession.reason ?? qaSession.summary)
      : authBlockedReason === "blocked: auth redirect"
        ? "Protected route redirected to /login despite a valid QA session."
        : interactionResult.blockedReason
          ? interactionResult.blockedReason
          : registryFailureReason
            ? registryFailureReason
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
    retainTrace = Boolean(blockedReason);
    const screenshotSha256 = await sha256File(screenshotPath);

    manifest = {
      schemaVersion: suite.registry ? "fitness-visual-state-receipt.v1" : "fitness-visual-suite-receipt.v1",
      generatedAt: toIso(endedAt),
      startedAt: toIso(startedAt),
      endedAt: toIso(endedAt),
      durationMs: endedAt - startedAt,
      suite: suite.name,
      suiteState: suite.stateLabel,
      registryCaptureId: suite.registry?.captureId ?? null,
      registryFamily: suite.registry?.family ?? null,
      registryIndex: suite.registry?.registryIndex ?? null,
      registryVariantIndex: suite.registry?.variantIndex ?? null,
      registryVersion: suite.registry ? VISUAL_STATE_REGISTRY_VERSION : null,
      registryDigest: suite.registry ? computeVisualStateRegistryDigest() : null,
      registryAuthState: suite.registry?.authState ?? null,
      fixtureOwner: suite.registry?.fixtureOwner ?? null,
      source: flags.__sourceIdentity ?? null,
      environment: suite.registry
        ? {
            ...VISUAL_CAPTURE_ENVIRONMENT,
            nodeVersion: process.version,
            browserVersion,
            platform: `${process.platform}-${process.arch}`,
          }
        : null,
      captureMode: suite.registry?.captureMode ?? "viewport",
      proofLane: suite.proofLane ?? null,
      seamKind: suite.seamKind ?? null,
      coversProtectedRoutes: suite.coversProtectedRoutes ?? [],
      baseUrl,
      devReceiptPath: receipt?.path ?? null,
      browserProfileMode: "codex-isolated-ephemeral",
      route: suite.route,
      requestedRoute: registryRouteResult?.requested ?? suite.route,
      resolvedRoute: registryRouteResult?.resolved ?? normalizeRouteValue(finalUrl, baseUrl),
      viewport: viewport.label,
      screenshotPath,
      screenshotSha256,
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
      bodyPreview: suite.registry ? null : sanitizeVisualDiagnosticText(bodyText),
      interaction: {
        performed: interactionResult.performed,
        missingExpectedText: interactionResult.missingExpectedText,
        details: interactionResult.details ?? null,
      },
      loadingDiagnostics,
      consoleMessages,
      pageErrors,
      failedRequests,
      tracePath: retainTrace ? tracePath : null,
      qaSession: {
        available: qaSession.available,
        status: qaSession.status,
        summary: qaSession.summary,
        path: qaSession.path ?? sessionArtifactPath,
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
    retainTrace = Boolean(suite.registry);
    const screenshotSha256 = await sha256File(screenshotPath).catch(() => null);
    const registryRouteResult = suite.registry
      ? validateResolvedRoute({
          requestedRoute: suite.route,
          resolvedUrl: finalUrl || `${baseUrl}${suite.route}`,
          expectedResolvedRoute: suite.registry.expectedResolvedRoute,
          baseUrl,
        })
      : null;

    manifest = {
      schemaVersion: suite.registry ? "fitness-visual-state-receipt.v1" : "fitness-visual-suite-receipt.v1",
      generatedAt: toIso(endedAt),
      startedAt: toIso(startedAt),
      endedAt: toIso(endedAt),
      durationMs: endedAt - startedAt,
      suite: suite.name,
      suiteState: suite.stateLabel,
      registryCaptureId: suite.registry?.captureId ?? null,
      registryFamily: suite.registry?.family ?? null,
      registryIndex: suite.registry?.registryIndex ?? null,
      registryVariantIndex: suite.registry?.variantIndex ?? null,
      registryVersion: suite.registry ? VISUAL_STATE_REGISTRY_VERSION : null,
      registryDigest: suite.registry ? computeVisualStateRegistryDigest() : null,
      registryAuthState: suite.registry?.authState ?? null,
      fixtureOwner: suite.registry?.fixtureOwner ?? null,
      source: flags.__sourceIdentity ?? null,
      environment: suite.registry
        ? {
            ...VISUAL_CAPTURE_ENVIRONMENT,
            nodeVersion: process.version,
            browserVersion,
            platform: `${process.platform}-${process.arch}`,
          }
        : null,
      captureMode: suite.registry?.captureMode ?? "viewport",
      proofLane: suite.proofLane ?? null,
      seamKind: suite.seamKind ?? null,
      coversProtectedRoutes: suite.coversProtectedRoutes ?? [],
      baseUrl,
      devReceiptPath: receipt?.path ?? null,
      browserProfileMode: "codex-isolated-ephemeral",
      route: suite.route,
      requestedRoute: registryRouteResult?.requested ?? suite.route,
      resolvedRoute: registryRouteResult?.resolved ?? normalizeRouteValue(finalUrl || suite.route, baseUrl),
      viewport: viewport.label,
      screenshotPath,
      screenshotSha256,
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
        details: null,
      },
      loadingDiagnostics: [],
      consoleMessages,
      pageErrors,
      failedRequests,
      tracePath: retainTrace ? tracePath : null,
      qaSession: {
        available: qaSession.available,
        status: qaSession.status,
        summary: qaSession.summary,
        path: qaSession.path ?? sessionArtifactPath,
        createdAt: qaSession.createdAt ?? qaSession.generatedAt ?? null,
        expiresAt: qaSession.expiresAt ?? null,
        expiresAtEpochSeconds: qaSession.expiresAtEpochSeconds ?? null,
        validationMode: qaSession.validationMode ?? null,
        missingEnv: qaSession.missingEnv ?? [],
        reason: qaSession.reason ?? null,
      },
    };
  } finally {
    if (suite.registry) {
      if (retainTrace) {
        await context.tracing.stop({ path: tracePath }).catch(() => {});
      } else {
        await context.tracing.stop().catch(() => {});
      }
    }
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
  const registryState = typeof flags["registry-state"] === "string"
    ? flags["registry-state"].trim()
    : null;
  const registryTier = typeof flags["registry-tier"] === "string"
    ? flags["registry-tier"].trim().toLowerCase()
    : null;
  if (registryState || registryTier) {
    const tier = registryTier ?? "full";
    if (tier !== "full" && tier !== "smoke") {
      throw new Error(`Unsupported --registry-tier "${tier}". Expected smoke or full.`);
    }
    const suites = listRegistryVisualFitnessSuites({
      tier,
      stateId: registryState,
    });
    if (registryState && suites.length === 0) {
      throw new Error(`Unknown visual registry state "${registryState}".`);
    }
    return suites;
  }

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

async function writeVisualCatalogArtifacts({
  tier,
  results,
  outputRoot,
  sourceIdentity,
  runBoards,
}) {
  const generatedAt = toIso(Date.now());
  const browserVersion = results.find((result) => result.environment?.browserVersion)?.environment?.browserVersion ?? null;
  const manifest = buildVisualCatalogManifest({
    tier,
    results,
    sourceIdentity,
    browserVersion,
    generatedAt,
    outputRoot,
  });
  const manifestPath = path.join(outputRoot, "visual-catalog-manifest.json");
  const coveragePath = path.join(outputRoot, "coverage-report.json");
  const deltaPath = path.join(outputRoot, "count-delta-ledger.json");
  const environmentPath = path.join(outputRoot, "environment-receipt.json");
  const failurePath = path.join(outputRoot, "failure-report.json");
  await fs.mkdir(outputRoot, { recursive: true });
  await Promise.all([
    fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    fs.writeFile(coveragePath, `${JSON.stringify(buildVisualCatalogCoverage(), null, 2)}\n`, "utf8"),
    fs.writeFile(deltaPath, `${JSON.stringify(manifest.registry.countDelta, null, 2)}\n`, "utf8"),
    fs.writeFile(environmentPath, `${JSON.stringify(manifest.environment, null, 2)}\n`, "utf8"),
    fs.writeFile(failurePath, `${JSON.stringify({
      schemaVersion: "fitness-visual-failure-report.v1",
      generatedAt,
      failures: manifest.failures,
    }, null, 2)}\n`, "utf8"),
  ]);

  let boardReceiptPath = null;
  if (runBoards && manifest.blockedCount === 0) {
    const command = process.env.PYTHON ?? "python";
    const result = spawnSync(command, [
      path.join(repoRoot, "scripts", "build-mobile-regression-boards.py"),
      "--visual-catalog",
      manifestPath,
    ], {
      cwd: repoRoot,
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.status !== 0) {
      throw new Error(`Visual catalog board generation failed: ${sanitizeVisualDiagnosticText(result.stderr || result.stdout)}`);
    }
    boardReceiptPath = path.join(outputRoot, "boards", "board-receipt.json");
  }

  return {
    manifest,
    manifestPath,
    coveragePath,
    deltaPath,
    environmentPath,
    failurePath,
    boardReceiptPath,
  };
}

export function assertVisualCatalogCountLedger({
  buildCatalogCoverage = buildVisualCatalogCoverage,
  buildCatalogCountDelta = buildVisualCatalogCountDelta,
} = {}) {
  const coverage = buildCatalogCoverage();
  const countDelta = buildCatalogCountDelta(coverage);
  if (!countDelta.reconciled) {
    throw new Error(
      "Visual catalog count ledger drifted: "
      + `accepted ${countDelta.accepted.semanticStates} states/${countDelta.accepted.rawCaptures} captures; `
      + `current ${countDelta.current.semanticStates} states/${countDelta.current.rawCaptures} captures. `
      + "Catalog capture aborted before browser launch.",
    );
  }
  return { coverage, countDelta };
}

export async function runVisualFitnessSuites(
  argv = process.argv.slice(2),
  countLedgerOptions = {},
) {
  const { flags } = parseArgs(argv);
  const registryValidation = validateVisualStateRegistry();
  if (!registryValidation.valid) {
    throw new Error(`Visual state registry is invalid: ${registryValidation.errors.join(" ")}`);
  }
  const isRegistryRequested = typeof flags["registry-state"] === "string"
    || typeof flags["registry-tier"] === "string";
  if (isRegistryRequested) {
    assertVisualCatalogCountLedger(countLedgerOptions);
  }
  const suites = resolveSuites(flags);
  const isRegistryRun = suites.length > 0 && suites.every((suite) => Boolean(suite.registry));
  const registryTier = typeof flags["registry-tier"] === "string"
    ? flags["registry-tier"].trim().toLowerCase()
    : "state";
  const catalogOutputRoot = isRegistryRun
    ? (
        typeof flags["output-dir"] === "string" && flags["output-dir"].trim().length > 0
          ? path.resolve(flags["output-dir"])
          : path.join(atlasRoot, "tmp", "captures", "fitness", "visual-catalog", buildTimestampStamp())
      )
    : null;
  const sourceIdentity = isRegistryRun ? readVisualSourceIdentity() : null;
  const target = await resolveBaseUrlAndReceipt(flags);
  const receipt = target.receipt;
  const browserExecutablePath = await resolveBrowserExecutablePath();
  const results = [];
  const suiteFlags = {
    ...flags,
    __resolvedBaseUrl: target.baseUrl,
    __catalogOutputRoot: catalogOutputRoot,
    __sourceIdentity: sourceIdentity,
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

  let catalogArtifacts = null;
  if (isRegistryRun) {
    catalogArtifacts = await writeVisualCatalogArtifacts({
      tier: registryTier,
      results,
      outputRoot: catalogOutputRoot,
      sourceIdentity,
      runBoards: flags.boards !== "false" && flags["skip-boards"] !== true,
    });
  }

  if (results.length === 1) {
    process.stdout.write(`${JSON.stringify({
      ...results[0],
      loadingDiagnosticsReceiptPath: loadingReceipt.latestPath,
      catalogManifestPath: catalogArtifacts?.manifestPath ?? null,
      boardReceiptPath: catalogArtifacts?.boardReceiptPath ?? null,
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
    catalogManifestPath: catalogArtifacts?.manifestPath ?? null,
    boardReceiptPath: catalogArtifacts?.boardReceiptPath ?? null,
    catalogCoverage: catalogArtifacts?.manifest?.registry ?? null,
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
