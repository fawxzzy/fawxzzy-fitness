#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  QA_BASELINE,
  buildSessionCookies,
  captureRoot,
  getOptionalEnv,
  getHistoryPreviewEnabled,
  repoRoot,
  resolveBaseUrl,
  sessionArtifactPath,
} from "./fitness-qa-config.mjs";
import { bootstrapQaSession, readQaSessionArtifact } from "./fitness-qa-user.mjs";

const execFileAsync = promisify(execFile);
const runnerPath = path.resolve(repoRoot, "scripts", "qa", "cdp-edge.mjs");
const scriptPath = fileURLToPath(import.meta.url);

function parseArgs(argv = process.argv.slice(2)) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (!entry.startsWith("--")) {
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

  return flags;
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

async function ensureServerIsReachable(baseUrl) {
  const response = await fetch(`${baseUrl}/login`, {
    redirect: "manual",
  }).catch((error) => {
    throw new Error(`Local Fitness dev server is not reachable at ${baseUrl}: ${error instanceof Error ? error.message : String(error)}`);
  });

  if (!response || (response.status >= 500 && response.status <= 599)) {
    throw new Error(`Local Fitness dev server responded with ${response?.status ?? "unknown"} at ${baseUrl}/login.`);
  }
}

function buildCapturePlan({ baseUrl, sessionCookies, historyMode }) {
  const secure = baseUrl.startsWith("https://");
  const historyCookies = historyMode === "preview"
    ? [
      ...sessionCookies,
      {
        name: "atlas-history-preview",
        value: "enabled",
        url: baseUrl,
        path: "/",
        httpOnly: true,
        secure,
        sameSite: "Lax",
      },
    ]
    : sessionCookies;
  const historySessionPath = historyMode === "preview"
    ? "/history/history-preview-session-2"
    : `/history/${QA_BASELINE.sessionIds.latest}`;
  const historySentinel = historyMode === "preview" ? "Lower Rotation" : "Fitness QA Baseline";
  const historyExerciseSentinel = historyMode === "preview" ? "Back Squat" : "Weighted Pull-Up";

  return [
    {
      key: "login",
      url: `${baseUrl}/login`,
      width: 430,
      height: 932,
      mobile: true,
      finalWaitMs: 350,
      actions: [
        { type: "waitForSelector", selector: "input[type='password']", timeoutMs: 10000 },
      ],
      cookies: [],
      expectedPath: "/login",
    },
    {
      key: "entry",
      url: `${baseUrl}/entry`,
      width: 430,
      height: 932,
      mobile: true,
      initialWaitMs: 350,
      finalWaitMs: 1400,
      actions: [
        {
          type: "assertExpression",
          expression: "window.location.pathname !== '/login'",
          message: "QA entry bootstrap unexpectedly redirected back to /login.",
        },
      ],
      cookies: sessionCookies,
      expectedPath: "/today",
    },
    {
      key: "today",
      url: `${baseUrl}/today`,
      width: 430,
      height: 932,
      mobile: true,
      finalWaitMs: 650,
      actions: [
        { type: "waitForText", text: "Fitness QA Baseline", timeoutMs: 10000 },
      ],
      cookies: sessionCookies,
      expectedPath: "/today",
    },
    {
      key: "history",
      url: `${baseUrl}/history`,
      width: 430,
      height: 932,
      mobile: true,
      finalWaitMs: 650,
      actions: [
        { type: "waitForText", text: historySentinel, timeoutMs: 10000 },
      ],
      cookies: historyCookies,
      expectedPath: "/history",
    },
    {
      key: "history-exercises",
      url: `${baseUrl}/history/exercises`,
      width: 430,
      height: 932,
      mobile: true,
      finalWaitMs: 650,
      actions: [
        { type: "waitForText", text: historyExerciseSentinel, timeoutMs: 10000 },
      ],
      cookies: historyCookies,
      expectedPath: "/history/exercises",
    },
    {
      key: "history-detail",
      url: `${baseUrl}${historySessionPath}`,
      width: 430,
      height: 932,
      mobile: true,
      finalWaitMs: 650,
      actions: [
        { type: "waitForText", text: "Back Squat", timeoutMs: 10000 },
      ],
      cookies: historyCookies,
      expectedPath: historySessionPath,
    },
  ];
}

async function runCapture(config, outputDir) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fitness-qa-local-"));
  const tempConfigPath = path.join(tempDir, `${config.key}.capture.json`);
  const effectiveConfig = {
    ...config,
    outPath: path.join(outputDir, `${config.key}.png`),
  };

  try {
    await fs.writeFile(tempConfigPath, `${JSON.stringify(effectiveConfig, null, 2)}\n`, "utf8");
    await execFileAsync(process.execPath, [runnerPath, tempConfigPath], {
      cwd: repoRoot,
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

  return {
    key: config.key,
    url: config.url,
    screenshot: `${config.key}.png`,
    expectedPath: config.expectedPath,
  };
}

async function loadOrRefreshSessionArtifact() {
  try {
    const artifact = await readQaSessionArtifact();
    if (
      artifact
      && typeof artifact.session?.expiresAt === "number"
      && artifact.session.expiresAt > Math.floor(Date.now() / 1000) + 60
    ) {
      return artifact;
    }
  } catch {
    // Fall through to a fresh bootstrap.
  }

  return bootstrapQaSession();
}

async function main() {
  const flags = parseArgs();
  const configuredBaseUrl = typeof flags["base-url"] === "string"
    ? String(flags["base-url"])
    : getOptionalEnv("FITNESS_QA_LOCAL_BASE_URL") ?? resolveBaseUrl();
  const baseUrl = configuredBaseUrl.replace(/\/$/, "");
  const historyModeFlag = typeof flags["history-mode"] === "string" ? flags["history-mode"] : "auto";
  const historyMode = historyModeFlag === "preview"
    ? "preview"
    : historyModeFlag === "real"
      ? "real"
      : getHistoryPreviewEnabled()
        ? "preview"
        : "real";
  const outputDir = typeof flags["output-dir"] === "string"
    ? path.resolve(String(flags["output-dir"]))
    : captureRoot;

  await ensureServerIsReachable(baseUrl);
  await ensureFreshDirectory(outputDir);

  const sessionArtifact = await loadOrRefreshSessionArtifact();
  if (!sessionArtifact.session?.accessToken || !sessionArtifact.session?.refreshToken) {
    throw new Error(`QA session artifact is missing tokens. Re-run npm run qa:session.`);
  }

  const sessionCookies = buildSessionCookies({
    access_token: sessionArtifact.session?.accessToken,
    refresh_token: sessionArtifact.session?.refreshToken,
    expires_at: sessionArtifact.session?.expiresAt,
  }, baseUrl);
  const capturePlan = buildCapturePlan({
    baseUrl,
    sessionCookies,
    historyMode,
  });

  const captures = [];
  for (const captureConfig of capturePlan) {
    captures.push(await runCapture(captureConfig, outputDir));
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    helper: scriptPath,
    runner: runnerPath,
    baseUrl,
    historyMode,
    sessionArtifactPath,
    outputDir,
    captureCount: captures.length,
    captures,
  };

  await fs.writeFile(path.join(outputDir, "artifact-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
