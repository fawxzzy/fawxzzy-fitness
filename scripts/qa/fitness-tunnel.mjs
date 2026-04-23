#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import {
  ensureDirectoryForFile,
  getConfiguredQaPort,
  getOptionalEnv,
  mobileLoopStatusPath,
  resolveMobileLoopUrls,
} from "./fitness-qa-config.mjs";

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

function splitCommandLine(value) {
  const parts = [];
  let current = "";
  let quote = null;
  let escaping = false;

  for (const char of value) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        parts.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

function resolveTunnelCommand({ localUrl, port }) {
  const configuredCommand = getOptionalEnv("FITNESS_QA_TUNNEL_COMMAND");
  const argsJson = getOptionalEnv("FITNESS_QA_TUNNEL_ARGS_JSON");
  const argsString = getOptionalEnv("FITNESS_QA_TUNNEL_ARGS");

  if (configuredCommand) {
    const rawArgs = argsJson
      ? JSON.parse(argsJson)
      : argsString
        ? splitCommandLine(argsString)
        : [];
    if (!Array.isArray(rawArgs) || rawArgs.some((entry) => typeof entry !== "string")) {
      throw new Error("FITNESS_QA_TUNNEL_ARGS_JSON must be a JSON array of strings.");
    }

    return {
      command: configuredCommand,
      args: rawArgs.map((entry) => entry.replaceAll("{localUrl}", localUrl).replaceAll("{port}", String(port))),
      mode: "configured",
    };
  }

  return {
    command: "cloudflared",
    args: ["tunnel", "--url", localUrl],
    mode: "cloudflared-quick",
  };
}

async function updateStatus(patch) {
  let previous = {};
  try {
    previous = JSON.parse(await fs.readFile(mobileLoopStatusPath, "utf8"));
  } catch {
    previous = {};
  }

  const next = {
    ...previous,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  ensureDirectoryForFile(mobileLoopStatusPath);
  await fs.writeFile(mobileLoopStatusPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function extractTunnelUrl(text) {
  const match = text.match(/https:\/\/[a-z0-9.-]+\.(?:trycloudflare\.com|ngrok-free\.app|loca\.lt|localhost\.run)\b/i);
  return match?.[0] ?? null;
}

async function main() {
  const flags = parseArgs();
  const port = typeof flags.port === "string" ? Number.parseInt(flags.port, 10) : getConfiguredQaPort();
  const localUrl = typeof flags["local-url"] === "string" ? String(flags["local-url"]).replace(/\/$/, "") : `http://127.0.0.1:${port}`;
  const configuredTunnelUrl = typeof flags.url === "string"
    ? String(flags.url).replace(/\/$/, "")
    : getOptionalEnv("FITNESS_QA_TUNNEL_URL")?.replace(/\/$/, "") ?? null;

  if (configuredTunnelUrl && flags.force !== true) {
    const status = await updateStatus({
      tunnelUrl: configuredTunnelUrl,
      tunnelMode: "configured-url",
      tunnelPid: null,
    });
    process.stdout.write(`${JSON.stringify({
      command: "tunnel",
      localUrl,
      tunnelUrl: configuredTunnelUrl,
      statusFile: mobileLoopStatusPath,
      updatedAt: status.updatedAt,
    }, null, 2)}\n`);
    return;
  }

  const tunnel = resolveTunnelCommand({ localUrl, port });
  process.stdout.write(`[qa:tunnel] Starting ${tunnel.command} ${tunnel.args.join(" ")}\n`);

  const child = spawn(tunnel.command, tunnel.args, {
    cwd: path.resolve(process.cwd()),
    env: process.env,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  await updateStatus({
    tunnelUrl: null,
    tunnelMode: tunnel.mode,
    tunnelPid: child.pid ?? null,
    tunnelLocalUrl: localUrl,
  });

  child.on("error", (error) => {
    process.stderr.write(
      `[qa:tunnel] Unable to start ${tunnel.command}. Install cloudflared or set FITNESS_QA_TUNNEL_COMMAND and FITNESS_QA_TUNNEL_ARGS_JSON. ${error.message}\n`,
    );
    process.exitCode = 1;
  });

  const handleOutput = async (chunk, stream) => {
    const text = String(chunk);
    stream.write(text);
    const tunnelUrl = extractTunnelUrl(text);
    if (tunnelUrl) {
      const urls = resolveMobileLoopUrls({ port, tunnelUrl });
      await updateStatus({
        tunnelUrl,
        tunnelMode: tunnel.mode,
        tunnelPid: child.pid ?? null,
        tunnelLocalUrl: localUrl,
        urls,
      });
      process.stdout.write(`[qa:tunnel] Phone URL: ${tunnelUrl}\n`);
    }
  };

  child.stdout.on("data", (chunk) => {
    handleOutput(chunk, process.stdout).catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    });
  });
  child.stderr.on("data", (chunk) => {
    handleOutput(chunk, process.stderr).catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    });
  });
  child.on("exit", (code, signal) => {
    process.stderr.write(`[qa:tunnel] Tunnel exited with ${signal ?? code ?? 0}.\n`);
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
