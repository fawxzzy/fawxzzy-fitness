import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";
import WebSocket from "ws";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, attempts = 50) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Unexpected ${response.status} for ${url}`);
      }
      return response.json();
    } catch (error) {
      lastError = error;
      await delay(200);
    }
  }
  throw lastError ?? new Error(`Could not fetch ${url}`);
}

async function readDevToolsPort(profileDir, attempts = 50) {
  const activePortPath = path.join(profileDir, "DevToolsActivePort");
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const activePort = await fs.readFile(activePortPath, "utf8");
      const [portLine] = activePort.split(/\r?\n/, 1);
      const port = Number(portLine);
      if (!Number.isInteger(port) || port <= 0) {
        throw new Error(`Invalid DevTools port "${portLine}"`);
      }
      return port;
    } catch (error) {
      lastError = error;
      await delay(200);
    }
  }
  throw lastError ?? new Error(`Could not read ${activePortPath}`);
}

async function resolveProfileDir(profileDir) {
  if (profileDir) {
    const resolvedProfileDir = path.resolve(profileDir);
    await fs.mkdir(resolvedProfileDir, { recursive: true });
    return { profileDir: resolvedProfileDir, temporary: false };
  }

  const temporaryProfileDir = await fs.mkdtemp(path.join(os.tmpdir(), "fawxzzy-qa-edge-"));
  return { profileDir: temporaryProfileDir, temporary: true };
}

async function waitForChildExit(child, timeoutMs = 5000) {
  if (child.exitCode !== null) {
    return true;
  }

  return new Promise((resolve) => {
    const cleanup = () => {
      clearTimeout(timeoutId);
      child.off("exit", onExit);
      child.off("error", onExit);
    };

    const onExit = () => {
      cleanup();
      resolve(true);
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    child.once("exit", onExit);
    child.once("error", onExit);
  });
}

class CdpClient {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message));
          return;
        }
        pending.resolve(message.result);
        return;
      }
      const handlers = this.events.get(message.method);
      if (!handlers) return;
      for (const handler of handlers) {
        handler(message.params ?? {});
      }
    });
  }

  send(method, params = {}, options = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, ...(options.sessionId ? { sessionId: options.sessionId } : {}) }));
    });
  }

  on(method, handler) {
    const handlers = this.events.get(method) ?? [];
    handlers.push(handler);
    this.events.set(method, handlers);
  }

  async close() {
    await new Promise((resolve) => {
      if (this.ws.readyState === this.ws.CLOSED) {
        resolve();
        return;
      }
      this.ws.once("close", resolve);
      this.ws.close();
    });
  }
}

async function waitForCondition(client, expression, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await client.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.result?.value) {
      return true;
    }
    await delay(200);
  }
  throw new Error(`Condition timed out: ${expression}`);
}

async function runAction(client, action) {
  if (action.type === "waitForSelector") {
    const selector = JSON.stringify(action.selector);
    await waitForCondition(client, `Boolean(document.querySelector(${selector}))`, action.timeoutMs);
    return;
  }

  if (action.type === "waitForText") {
    const text = JSON.stringify(action.text);
    await waitForCondition(client, `document.body && document.body.innerText.includes(${text})`, action.timeoutMs);
    return;
  }

  if (action.type === "setValue") {
    const selector = JSON.stringify(action.selector);
    const value = JSON.stringify(action.value);
    await client.send("Runtime.evaluate", {
      expression: `
        (() => {
          const element = document.querySelector(${selector});
          if (!element) return false;
          element.focus();
          const prototype = Object.getPrototypeOf(element);
          const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
          if (descriptor && descriptor.set) {
            descriptor.set.call(element, ${value});
          } else {
            element.value = ${value};
          }
          element.dispatchEvent(new InputEvent('input', { bubbles: true, data: ${value} }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.blur();
          return true;
        })()
      `,
      returnByValue: true,
      awaitPromise: true,
    });
    return;
  }

  if (action.type === "click") {
    const selector = action.selector ? JSON.stringify(action.selector) : "null";
    const text = action.text ? JSON.stringify(action.text) : "null";
    await client.send("Runtime.evaluate", {
      expression: `
        (() => {
          const element = ${selector} !== null
            ? document.querySelector(${selector})
            : Array.from(document.querySelectorAll('button,a,[role="button"]')).find((node) => node.innerText && node.innerText.trim().includes(${text}));
          if (!element) return false;
          element.click();
          return true;
        })()
      `,
      returnByValue: true,
      awaitPromise: true,
    });
    return;
  }

  if (action.type === "sleep") {
    await delay(action.ms);
    return;
  }

  if (action.type === "scrollToBottom") {
    await client.send("Runtime.evaluate", {
      expression: "window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }); true;",
      returnByValue: true,
      awaitPromise: true,
    });
    return;
  }

  throw new Error(`Unknown action type: ${action.type}`);
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    throw new Error("Expected config path");
  }

  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  const requestedPort = config.port ?? null;
  const { profileDir, temporary: temporaryProfileDir } = await resolveProfileDir(config.profileDir);
  if (config.outPath) {
    await fs.mkdir(path.dirname(path.resolve(config.outPath)), { recursive: true });
  }

  const edge = spawn(EDGE_PATH, [
    "--headless",
    "--disable-gpu",
    `--remote-debugging-port=${requestedPort ?? 0}`,
    `--user-data-dir=${profileDir}`,
    "about:blank",
  ], {
    stdio: "ignore",
    windowsHide: true,
  });
  const port = requestedPort ?? await readDevToolsPort(profileDir);

  const version = await fetchJson(`http://127.0.0.1:${port}/json/version`);
  const browserWs = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    browserWs.once("open", resolve);
    browserWs.once("error", reject);
  });
  const browserClient = new CdpClient(browserWs);
  const targetInfo = await browserClient.send("Target.createTarget", { url: "about:blank" });
  const attachInfo = await browserClient.send("Target.attachToTarget", {
    targetId: targetInfo.targetId,
    flatten: true,
  });
  const sessionId = attachInfo.sessionId;
  const client = browserClient;
  const rawSend = client.send.bind(client);
  client.send = (method, params = {}) => rawSend(method, params, { sessionId });
  try {
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: config.width,
      height: config.height,
      deviceScaleFactor: config.deviceScaleFactor ?? 2,
      mobile: false,
      screenWidth: config.width,
      screenHeight: config.height,
    });

    if (config.cookies?.access && config.cookies?.refresh) {
      await client.send("Network.setCookies", {
        cookies: [
          {
            name: "sb-access-token",
            value: config.cookies.access,
            domain: "fawxzzy-fitness-local.vercel.app",
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
          },
          {
            name: "sb-refresh-token",
            value: config.cookies.refresh,
            domain: "fawxzzy-fitness-local.vercel.app",
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
          },
        ],
      });
    }

    await client.send("Page.navigate", { url: config.url });
    await delay(config.initialWaitMs ?? 3500);

    for (const action of config.actions ?? []) {
      await runAction(client, action);
    }

    await delay(config.finalWaitMs ?? 1500);

    if (config.outPath) {
      const screenshot = await client.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: Boolean(config.fullPage),
      });
      await fs.writeFile(path.resolve(config.outPath), Buffer.from(screenshot.data, "base64"));
    }

    if (config.evalExpression) {
      const result = await client.send("Runtime.evaluate", {
        expression: config.evalExpression,
        returnByValue: true,
        awaitPromise: true,
      });
      console.log(JSON.stringify(result.result?.value ?? null, null, 2));
    }
  } finally {
    try {
      await browserClient.send("Browser.close");
    } catch {
      // Ignore shutdown races if the browser is already gone.
    }

    const exitedCleanly = await waitForChildExit(edge, 4000);
    if (!exitedCleanly && edge.exitCode === null) {
      edge.kill();
      await waitForChildExit(edge, 4000);
    }

    await client.close().catch(() => {});

    if (temporaryProfileDir) {
      await delay(250);
      await fs.rm(profileDir, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      }).catch(() => {});
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
