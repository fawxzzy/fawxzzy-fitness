#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderOfflineHtml } from "./offline-page.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const manifestPath = path.join(rootDir, "src", "generated", "appBuildManifest.json");
const outputPath = path.join(rootDir, "public", "app-sw.js");

export function renderServiceWorkerSource(buildId) {
  const safeBuildId = JSON.stringify(String(buildId));
  return `const APP_BUILD_ID = ${safeBuildId};
const OFFLINE_HTML = ${JSON.stringify(renderOfflineHtml(buildId))};

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
