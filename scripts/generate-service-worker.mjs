#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const manifestPath = path.join(rootDir, "src", "generated", "appBuildManifest.json");
const outputPath = path.join(rootDir, "public", "sw.js");

export function renderServiceWorkerSource(buildId) {
  const safeBuildId = JSON.stringify(String(buildId));
  return `const APP_BUILD_ID = ${safeBuildId};
const OFFLINE_HTML = [
  "<!doctype html>",
  "<html lang=\\"en\\">",
  "<head>",
  "<meta charset=\\"utf-8\\" />",
  "<meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1\\" />",
  "<title>FawxzzyFitness</title>",
  "<style>",
  "body{margin:0;min-height:100vh;display:grid;place-items:center;background:#141922;color:#f5f7fa;font:16px/1.6 system-ui,sans-serif;padding:24px;text-align:center;}",
  "main{max-width:28rem;}",
  "h1{margin:0 0 0.75rem;font-size:1.5rem;}",
  "p{margin:0;color:#c6ced8;}",
  "</style>",
  "</head>",
  "<body>",
  "<main>",
  "<h1>FawxzzyFitness needs a connection</h1>",
  "<p>Reconnect, then reopen the app to continue your workout flow.</p>",
  "<p style=\\"margin-top:0.75rem;color:#90a4bc;font-size:0.875rem;\\">Build: " + APP_BUILD_ID + "</p>",
  "</main>",
  "</body>",
  "</html>",
].join("");

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE_HTML, {
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
      },
    })),
  );
});
`;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const source = renderServiceWorkerSource(manifest.buildId);
  const existingSource = await fs.readFile(outputPath, "utf8").catch(() => null);
  if (existingSource !== source) {
    await fs.writeFile(outputPath, source, "utf8");
  }
  process.stdout.write(`Generated service worker at ${path.relative(rootDir, outputPath)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
