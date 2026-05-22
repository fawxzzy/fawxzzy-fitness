#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import {
  atlasRoot,
  DEFAULT_QA_PORT,
  getConfiguredQaPort,
  resolveMobileLoopUrls,
  repoRoot,
} from "./fitness-qa-config.mjs";

const DEV_RECEIPT_PATH = path.join(atlasRoot, "runtime", "receipts", "dev", "dev-server.latest.json");
const AUTH_SUMMARY_PATH = path.join(atlasRoot, "runtime", "fitness", "qa-auth-summary.json");
const LLEL_REPORT_PATH = path.join(atlasRoot, "runtime", "fitness", "llel-captures", "latest", "report.json");

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

function normalizePort(rawValue) {
  const parsed = rawValue ? Number.parseInt(String(rawValue), 10) : getConfiguredQaPort();
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Expected a valid TCP port. Received: ${rawValue}`);
  }

  return parsed;
}

function quoteShellArg(value) {
  if (/[\s"]/u.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  return value;
}

function runNpmScript(scriptName, extraArgs = []) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  return new Promise((resolve) => {
    const child = spawn(
      [npmCommand, "run", scriptName, ...(extraArgs.length > 0 ? ["--", ...extraArgs] : [])]
        .map((value) => quoteShellArg(String(value)))
        .join(" "),
      {
        cwd: repoRoot,
        env: process.env,
        shell: true,
        stdio: "inherit",
        windowsHide: true,
      },
    );

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function main() {
  const flags = parseArgs();
  const port = normalizePort(flags.port ?? DEFAULT_QA_PORT);
  const commandResults = [];

  const steps = [
    { label: "qa:dev:fresh", script: "qa:dev:fresh", args: ["--port", String(port)] },
    { label: "qa:auth:bootstrap", script: "qa:auth:bootstrap", args: [] },
    { label: "qa:llel:progression", script: "qa:llel:progression", args: [] },
  ];

  for (const step of steps) {
    const exitCode = await runNpmScript(step.script, step.args);
    commandResults.push({
      script: step.script,
      args: step.args,
      exitCode,
      ok: exitCode === 0,
    });
    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  }

  const [devReceipt, authSummary, llelReport] = await Promise.all([
    readJson(DEV_RECEIPT_PATH),
    readJson(AUTH_SUMMARY_PATH),
    readJson(LLEL_REPORT_PATH),
  ]);

  const urls = resolveMobileLoopUrls({ port });
  const summary = {
    command: "qa:fitness:ui-checkpoint",
    repoRoot,
    port,
    localUrl: devReceipt.baseUrl,
    loginUrl: `${devReceipt.baseUrl}/login`,
    lanUrls: urls.lanUrls,
    authSummaryPath: AUTH_SUMMARY_PATH,
    devReceiptPath: DEV_RECEIPT_PATH,
    llelReportPath: LLEL_REPORT_PATH,
    authUser: authSummary.email ?? null,
    routeProofTiers: {
      tier1: [
        "/login",
        "/today",
        "/routines",
        "/routines/new",
        "/routines/{id}/edit",
        "/settings",
      ],
      tier2WhenTouched: [
        "Edit Day",
        "History / progression",
        "Current Session",
        "Add Exercise",
        "Account/settings accordion",
        "Discord Connector",
        "mobile/real-phone LAN path",
      ],
      tier3ReleaseCheckpoint: [
        "full manual checklist",
        "qa:llel:progression",
        "release:fitness:ready",
        "production smoke after deploy",
      ],
    },
    llelRoutes: Array.isArray(llelReport.routesChecked)
      ? llelReport.routesChecked.map((route) => ({
          key: route.key,
          route: route.route,
          status: route.status,
          screenshotPath: route.screenshotPath,
        }))
      : [],
    commandResults,
    nextManualProof: [
      "Capture Tier 1 routes with Browser or manual proof for the touched batch.",
      "Store durable screenshots under docs/recovery/captures/<lane-name>/.",
      "Run typecheck and focused tests before continuing edits.",
    ],
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
