import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
export const repoRoot = path.resolve(scriptDir, "..");
export const atlasRoot = path.resolve(repoRoot, "..", "..");
export const nextOutputDir = path.join(repoRoot, ".next");
export const runtimeFitnessRoot = path.join(atlasRoot, "runtime", "fitness");
export const devServerStateRoot = path.join(runtimeFitnessRoot, "dev-servers");
export const DEFAULT_PORT_CLOSE_TIMEOUT_MS = 15000;
const DEFAULT_PROCESS_EXIT_TIMEOUT_MS = 15000;

function toIso(value) {
  return new Date(value).toISOString();
}

function parseJsonOutput(stdout) {
  const trimmed = String(stdout ?? "").trim();
  if (!trimmed) {
    return [];
  }

  const parsed = JSON.parse(trimmed);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function normalizeProcessInfo(entry) {
  return {
    pid: Number(entry.pid),
    name: typeof entry.name === "string" ? entry.name : null,
    executablePath: typeof entry.executablePath === "string" ? entry.executablePath : null,
    commandLine: typeof entry.commandLine === "string" ? entry.commandLine : null,
  };
}

function isRepoLocalNextCommandLine(commandLine) {
  if (typeof commandLine !== "string" || commandLine.length === 0) {
    return false;
  }

  const normalized = commandLine.toLowerCase();
  const repoNeedle = repoRoot.toLowerCase();

  return normalized.includes(repoNeedle) && (
    normalized.includes("scripts\\dev.mjs")
      || normalized.includes("next\\dist\\bin\\next")
      || normalized.includes(" next dev")
      || normalized.includes("\"dev\"")
  );
}

export function isSafeRepoProcess(processInfo) {
  return isRepoLocalNextCommandLine(processInfo?.commandLine)
    || isRepoLocalNextCommandLine(processInfo?.executablePath)
    || isRepoLocalNextCommandLine(
      [
        processInfo?.name,
        processInfo?.executablePath,
        processInfo?.commandLine,
      ]
        .filter((value) => typeof value === "string" && value.length > 0)
        .join(" "),
    );
}

export async function readRepoLocalNextProcesses() {
  if (process.platform !== "win32") {
    return [];
  }

  const repoPathNeedle = repoRoot.toLowerCase().replace(/'/g, "''");
  const psScript = [
    `$repoPathNeedle = '${repoPathNeedle}'`,
    "$selfPid = $PID",
    "Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |",
    "  Where-Object {",
    "    if ($_.ProcessId -eq $selfPid) { return $false }",
    "    $cmd = $_.CommandLine",
    "    if (-not $cmd) { return $false }",
    "    $normalized = $cmd.ToLower()",
    "    $normalized.Contains($repoPathNeedle) -and (",
    "      $normalized.Contains('scripts\\\\dev.mjs') -or",
    "      $normalized.Contains('next\\\\dist\\\\bin\\\\next') -or",
    "      $normalized.Contains(' next dev')",
    "    )",
    "  } |",
    "  ForEach-Object {",
    "    [pscustomobject]@{",
    "      pid = [int]$_.ProcessId",
    "      name = $_.Name",
    "      executablePath = $_.ExecutablePath",
    "      commandLine = $_.CommandLine",
    "    }",
    "  } | ConvertTo-Json -Compress",
  ].join("\n");
  const details = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", psScript], {
    windowsHide: true,
    timeout: 15000,
  }).catch(() => null);
  if (!details?.stdout) {
    return [];
  }

  return parseJsonOutput(details.stdout).map(normalizeProcessInfo);
}

export async function readListeningProcesses(port) {
  if (process.platform !== "win32") {
    return [];
  }

  const { stdout } = await execFileAsync("cmd.exe", ["/c", "netstat -ano -p tcp"], {
    windowsHide: true,
    timeout: 15000,
  });
  const pids = new Set();
  const lines = stdout.split(/\r?\n/);
  const needle = `:${port}`;

  for (const line of lines) {
    if (!line.includes("LISTENING") || !line.includes(needle)) {
      continue;
    }

    const match = line.trim().match(/\s+(\d+)$/);
    if (match) {
      pids.add(Number(match[1]));
    }
  }

  const processes = [];
  for (const pid of pids) {
    const psScript = [
      `$proc = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" -ErrorAction SilentlyContinue`,
      "if (-not $proc) { return }",
      "[pscustomobject]@{",
      `  pid = ${pid}`,
      "  name = $proc.Name",
      "  executablePath = $proc.ExecutablePath",
      "  commandLine = $proc.CommandLine",
      "} | ConvertTo-Json -Compress",
    ].join("\n");
    const details = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", psScript], {
      windowsHide: true,
      timeout: 10000,
    }).catch(() => null);
    if (!details?.stdout) {
      processes.push({
        pid,
        name: null,
        executablePath: null,
        commandLine: null,
      });
      continue;
    }

    const [entry] = parseJsonOutput(details.stdout);
    if (entry) {
      processes.push(normalizeProcessInfo(entry));
    }
  }

  return processes;
}

export async function stopProcessTrees(processesToStop) {
  const pids = [...new Set(
    processesToStop
      .map((entry) => entry?.pid)
      .filter(Number.isInteger),
  )];

  for (const pid of pids) {
    const psScript = `Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`;
    await execFileAsync("powershell.exe", ["-NoProfile", "-Command", psScript], {
      windowsHide: true,
      timeout: 15000,
    }).catch(() => {});
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitForPortToClose(port, timeoutMs = DEFAULT_PORT_CLOSE_TIMEOUT_MS) {
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    const owners = await readListeningProcesses(port);
    if (owners.length === 0) {
      return;
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for port ${port} to close.`);
}

export async function waitForRepoLocalNextProcessesToExit(timeoutMs = DEFAULT_PROCESS_EXIT_TIMEOUT_MS) {
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    const processes = await readRepoLocalNextProcesses();
    if (processes.length === 0) {
      return;
    }

    await delay(250);
  }

  throw new Error("Timed out waiting for repo-local Next dev processes to exit.");
}

export async function cleanNextOutput() {
  await fs.rm(nextOutputDir, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
}

export async function getNextOutputState() {
  const exists = await pathExists(nextOutputDir);
  if (!exists) {
    return {
      exists: false,
      path: nextOutputDir,
      checkedAt: toIso(Date.now()),
      topLevelEntries: [],
      buildIdExists: false,
      traceExists: false,
      serverDirExists: false,
      cacheDirExists: false,
      modifiedAt: null,
    };
  }

  const [stats, entries, buildIdExists, traceExists, serverDirExists, cacheDirExists] = await Promise.all([
    fs.stat(nextOutputDir),
    fs.readdir(nextOutputDir, { withFileTypes: true }),
    pathExists(path.join(nextOutputDir, "BUILD_ID")),
    pathExists(path.join(nextOutputDir, "trace")),
    pathExists(path.join(nextOutputDir, "server")),
    pathExists(path.join(nextOutputDir, "cache")),
  ]);

  return {
    exists: true,
    path: nextOutputDir,
    checkedAt: toIso(Date.now()),
    modifiedAt: toIso(stats.mtimeMs),
    topLevelEntries: entries.map((entry) => ({
      name: entry.name,
      kind: entry.isDirectory() ? "directory" : "file",
    })),
    buildIdExists,
    traceExists,
    serverDirExists,
    cacheDirExists,
  };
}

export function getDevServerStatePath(port) {
  return path.join(devServerStateRoot, `next-dev-port-${port}.json`);
}

function isProcessRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function writeDevServerState(state) {
  await fs.mkdir(devServerStateRoot, { recursive: true });
  const statePath = getDevServerStatePath(state.port);
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return statePath;
}

export async function removeDevServerState(port) {
  const statePath = getDevServerStatePath(port);
  await fs.rm(statePath, { force: true }).catch(() => {});
}

export async function listActiveRecordedDevServers() {
  await fs.mkdir(devServerStateRoot, { recursive: true });
  const entries = await fs.readdir(devServerStateRoot, { withFileTypes: true }).catch(() => []);
  const active = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const entryPath = path.join(devServerStateRoot, entry.name);
    try {
      const parsed = JSON.parse(await fs.readFile(entryPath, "utf8"));
      if (parsed?.repoRoot !== repoRoot || !Number.isInteger(parsed?.port)) {
        continue;
      }

      const owners = await readListeningProcesses(parsed.port);
      const portActive = owners.length > 0;
      const pidActive = Number.isInteger(parsed?.pid) ? isProcessRunning(parsed.pid) : false;
      if (!portActive && !pidActive) {
        await fs.rm(entryPath, { force: true }).catch(() => {});
        continue;
      }

      active.push({
        ...parsed,
        listeningOwners: owners.map(normalizeProcessInfo),
        statePath: entryPath,
      });
    } catch {
      await fs.rm(entryPath, { force: true }).catch(() => {});
    }
  }

  return active;
}

function summarizeProcess(processInfo) {
  return {
    pid: processInfo.pid,
    name: processInfo.name,
    executablePath: processInfo.executablePath,
    commandLine: processInfo.commandLine,
    port: processInfo.port ?? null,
    hostname: processInfo.hostname ?? null,
    source: processInfo.source ?? null,
    statePath: processInfo.statePath ?? null,
    safeToStop: isSafeRepoProcess(processInfo),
  };
}

export function formatGuardFailureMessage(guard) {
  if (!guard?.blocked) {
    return "Workspace guard passed.";
  }

  if (guard.code === "active-dev-server-detected") {
    const processes = guard.repoLocalDevProcesses
      .map((entry) => {
        const portLabel = entry.port ? `:${entry.port}` : "";
        return `${entry.pid}:${entry.name ?? "unknown"}${portLabel}`;
      })
      .join(", ");
    return [
      "Active repo-local Next dev server detected. Production builds must not share .next with an active dev server.",
      processes ? `Detected processes: ${processes}.` : null,
      "Stop the repo dev server and rerun the build, or explicitly allow cleanup with `npm run build:guard -- --stop-dev`.",
    ].filter(Boolean).join(" ");
  }

  return guard.message ?? "Workspace guard failed.";
}

export async function evaluateBuildWorkspaceGuard({ stopDev = false } = {}) {
  const checkedAt = Date.now();
  const [repoLocalDevProcesses, recordedDevServers] = await Promise.all([
    readRepoLocalNextProcesses(),
    listActiveRecordedDevServers(),
  ]);
  const nextOutputState = await getNextOutputState();
  const activeDevProcesses = [
    ...recordedDevServers.map((entry) => ({
      pid: entry.pid,
      name: entry.processName ?? "next-dev",
      executablePath: entry.executablePath ?? null,
      commandLine: entry.commandLine ?? null,
      port: entry.port ?? null,
      hostname: entry.hostname ?? null,
      source: "runtime-state",
      statePath: entry.statePath,
    })),
    ...recordedDevServers.flatMap((entry) => {
      return (entry.listeningOwners ?? []).map((owner) => ({
        pid: owner.pid,
        name: owner.name ?? "next-dev-listener",
        executablePath: owner.executablePath ?? entry.executablePath ?? null,
        commandLine: owner.commandLine ?? entry.commandLine ?? null,
        port: entry.port ?? null,
        hostname: entry.hostname ?? null,
        source: "runtime-state-port-owner",
        statePath: entry.statePath,
      }));
    }),
    ...repoLocalDevProcesses.map((entry) => ({
      ...entry,
      source: "process-scan",
      statePath: null,
    })),
  ].filter((entry, index, collection) => {
    return collection.findIndex((candidate) => candidate.pid === entry.pid) === index;
  });
  const guard = {
    checkedAt: toIso(checkedAt),
    nextOutputState,
    repoLocalDevProcesses: activeDevProcesses.map(summarizeProcess),
    recordedDevServers,
    action: "none",
    blocked: false,
    code: null,
    message: null,
  };

  if (activeDevProcesses.length === 0) {
    guard.message = "No repo-local Next dev processes were detected.";
    return guard;
  }

  if (!stopDev) {
    guard.blocked = true;
    guard.code = "active-dev-server-detected";
    guard.message = formatGuardFailureMessage(guard);
    return guard;
  }

  await stopProcessTrees(activeDevProcesses);
  await waitForRepoLocalNextProcessesToExit().catch((error) => {
    guard.blocked = true;
    guard.code = "active-dev-server-detected";
    guard.message = error instanceof Error ? error.message : String(error);
  });

  if (!guard.blocked) {
    const remainingRecordedServers = await listActiveRecordedDevServers();
    if (remainingRecordedServers.length > 0) {
      guard.blocked = true;
      guard.code = "active-dev-server-detected";
      guard.message = "Timed out waiting for recorded repo-local Next dev servers to exit.";
    }
  }

  if (!guard.blocked) {
    guard.action = "stopped-repo-local-dev-processes";
    guard.message = `Stopped ${activeDevProcesses.length} repo-local Next dev process(es) before build.`;
  }

  return guard;
}
