#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import net from "node:net";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_EDGE_PATHS = [
  process.env.QA_EDGE_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
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

async function resolveEdgePath() {
  for (const candidate of DEFAULT_EDGE_PATHS) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(`Unable to locate a Chromium browser. Set QA_EDGE_PATH to a valid executable path.`);
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to resolve a local debugging port."));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

async function waitForJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Keep polling until the debugging endpoint is available.
    }

    await delay(100);
  }

  throw new Error(`Timed out waiting for DevTools endpoint: ${url}`);
}

async function killProcessTree(pid) {
  if (!pid) return;

  if (process.platform === "win32") {
    try {
      await execFileAsync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
      return;
    } catch {
      // Fall back to a direct kill when taskkill is unavailable.
    }
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Ignore cleanup failures.
  }
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.socket = null;
    this.nextMessageId = 0;
    this.pending = new Map();
    this.eventListeners = new Map();
  }

  async connect() {
    if (typeof WebSocket !== "function") {
      throw new Error("This Node runtime does not expose WebSocket, which is required for CDP screenshots.");
    }

    await new Promise((resolve, reject) => {
      const socket = new WebSocket(this.webSocketUrl);
      this.socket = socket;

      socket.addEventListener("open", () => {
        resolve();
      }, { once: true });

      socket.addEventListener("error", (event) => {
        reject(event.error ?? new Error("Unable to connect to the DevTools websocket."));
      }, { once: true });

      socket.addEventListener("message", (event) => {
        const payload = JSON.parse(String(event.data));
        if (typeof payload.id === "number") {
          const resolver = this.pending.get(payload.id);
          if (!resolver) {
            return;
          }

          this.pending.delete(payload.id);
          if (payload.error) {
            resolver.reject(new Error(payload.error.message ?? "CDP command failed."));
            return;
          }

          resolver.resolve(payload.result ?? {});
          return;
        }

        const listeners = this.eventListeners.get(payload.method) ?? [];
        for (const listener of listeners) {
          listener(payload.params ?? {});
        }
      });
    });
  }

  async close() {
    if (!this.socket) return;
    this.socket.close();
    this.socket = null;
  }

  send(method, params = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error(`Cannot send CDP command ${method}; websocket is not open.`);
    }

    const id = this.nextMessageId += 1;
    const message = JSON.stringify({ id, method, params });

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(message);
    });
  }

  waitForEvent(method, predicate = () => true, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const listeners = this.eventListeners.get(method) ?? [];
      const handler = (params) => {
        if (!predicate(params)) {
          return;
        }

        clearTimeout(timeoutId);
        const current = this.eventListeners.get(method) ?? [];
        this.eventListeners.set(method, current.filter((entry) => entry !== handler));
        resolve(params);
      };

      const timeoutId = setTimeout(() => {
        const current = this.eventListeners.get(method) ?? [];
        this.eventListeners.set(method, current.filter((entry) => entry !== handler));
        reject(new Error(`Timed out waiting for CDP event: ${method}`));
      }, timeoutMs);

      this.eventListeners.set(method, [...listeners, handler]);
    });
  }
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });

  if (result.exceptionDetails) {
    throw new Error(`Runtime.evaluate failed for expression: ${expression}`);
  }

  return result.result?.value;
}

async function waitForCondition(client, expression, timeoutMs, failureMessage) {
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    const matched = await evaluate(client, expression);
    if (matched) {
      return;
    }
    await delay(100);
  }

  throw new Error(failureMessage);
}

async function runAction(client, action) {
  switch (action.type) {
    case "navigate": {
      const loadPromise = client.waitForEvent("Page.loadEventFired");
      await client.send("Page.navigate", { url: String(action.url) });
      await loadPromise;
      return;
    }
    case "sleep":
      await delay(Number(action.ms ?? 0));
      return;
    case "scrollToBottom":
      await evaluate(client, "(() => { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }); return true; })()");
      return;
    case "waitForSelector":
      await waitForCondition(
        client,
        `(() => Boolean(document.querySelector(${JSON.stringify(action.selector)})))()`,
        Number(action.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        `Timed out waiting for selector: ${action.selector}`,
      );
      return;
    case "waitForText":
      await waitForCondition(
        client,
        `(() => {
          const bodyText = document.body?.innerText?.toLowerCase() ?? "";
          return bodyText.includes(${JSON.stringify(String(action.text).toLowerCase())});
        })()`,
        Number(action.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        `Timed out waiting for text: ${action.text}`,
      );
      return;
    case "assertExpression": {
      const passed = await evaluate(client, String(action.expression));
      if (!passed) {
        throw new Error(String(action.message ?? `Render assertion failed: ${action.expression}`));
      }
      return;
    }
    case "click": {
      const clicked = await evaluate(
        client,
        `(() => {
          const element = document.querySelector(${JSON.stringify(action.selector)});
          if (!(element instanceof HTMLElement)) return false;
          element.scrollIntoView({ block: "center", inline: "center" });
          element.click();
          return true;
        })()`,
      );

      if (!clicked) {
        throw new Error(`Unable to click selector: ${action.selector}`);
      }
      return;
    }
    default:
      throw new Error(`Unsupported capture action type: ${action.type}`);
  }
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    throw new Error("Usage: node scripts/qa/cdp-edge.mjs <capture-config.json>");
  }

  const config = await readConfig(configPath);
  const edgePath = await resolveEdgePath();
  const debuggingPort = await findFreePort();
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "fitness-cdp-edge-"));
  const windowWidth = Number(config.width ?? 430);
  const windowHeight = Number(config.height ?? 932);
  const deviceScaleFactor = Number(config.deviceScaleFactor ?? 1);
  const browserArgs = [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--disable-background-networking",
    "--disable-sync",
    "--disable-extensions",
    "--disable-default-apps",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${profileDir}`,
    `--window-size=${windowWidth},${windowHeight}`,
    `--force-device-scale-factor=${deviceScaleFactor}`,
    "about:blank",
  ];

  const browser = spawn(edgePath, browserArgs, {
    stdio: "ignore",
    windowsHide: true,
  });

  let client = null;

  try {
    const versionInfo = await waitForJson(`http://127.0.0.1:${debuggingPort}/json/version`);
    const targets = await waitForJson(`http://127.0.0.1:${debuggingPort}/json/list`);
    const pageTarget = targets.find((target) => target.type === "page" && typeof target.webSocketDebuggerUrl === "string");

    if (!pageTarget?.webSocketDebuggerUrl) {
      throw new Error("Unable to find a debuggable page target for the screenshot run.");
    }

    if (!versionInfo.Browser) {
      throw new Error("DevTools version endpoint did not return browser metadata.");
    }

    client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");
    if (config.disableJavaScript) {
      await client.send("Emulation.setScriptExecutionDisabled", { value: true });
    }
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: windowWidth,
      height: windowHeight,
      deviceScaleFactor,
      mobile: Boolean(config.mobile),
      screenWidth: windowWidth,
      screenHeight: windowHeight,
    });

    if (config.mobile) {
      await client.send("Emulation.setTouchEmulationEnabled", {
        enabled: true,
        maxTouchPoints: 5,
      });
    }

    const loadPromise = client.waitForEvent("Page.loadEventFired");
    await client.send("Page.navigate", { url: String(config.url) });
    await loadPromise;

    if (Number(config.initialWaitMs ?? 0) > 0) {
      await delay(Number(config.initialWaitMs));
    }

    for (const action of Array.isArray(config.actions) ? config.actions : []) {
      await runAction(client, action);
    }

    if (Number(config.finalWaitMs ?? 0) > 0) {
      await delay(Number(config.finalWaitMs));
    }

    const screenshot = await client.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });

    const outPath = path.resolve(String(config.outPath));
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, Buffer.from(String(screenshot.data), "base64"));
  } finally {
    await client?.close().catch(() => {});
    await killProcessTree(browser.pid);
    await fs.rm(profileDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    }).catch(() => {});
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
