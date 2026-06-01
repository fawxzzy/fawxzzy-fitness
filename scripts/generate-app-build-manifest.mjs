#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const packageJsonPath = path.join(rootDir, "package.json");
const generatedDir = path.join(rootDir, "src", "generated");
const manifestPath = path.join(generatedDir, "appBuildManifest.json");

async function readExistingManifest() {
  try {
    return JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  const existingManifest = await readExistingManifest();
  const deploymentBuildSource =
    process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    || process.env.VERCEL_DEPLOYMENT_ID;

  let manifest;
  if (deploymentBuildSource) {
    manifest = {
      buildId: String(deploymentBuildSource),
      generatedAt: new Date().toISOString(),
      version: String(packageJson.version),
    };
  } else if (
    existingManifest
    && existingManifest.version === String(packageJson.version)
    && typeof existingManifest.buildId === "string"
    && typeof existingManifest.generatedAt === "string"
  ) {
    manifest = existingManifest;
  } else {
    manifest = {
      buildId: `${packageJson.version}-local`,
      generatedAt: new Date().toISOString(),
      version: String(packageJson.version),
    };
  }

  await fs.mkdir(generatedDir, { recursive: true });
  const nextContent = `${JSON.stringify(manifest, null, 2)}\n`;
  const existingContent = await fs.readFile(manifestPath, "utf8").catch(() => null);
  if (existingContent !== nextContent) {
    await fs.writeFile(`${manifestPath}`, nextContent, "utf8");
  }
  process.stdout.write(`Generated app build manifest at ${path.relative(rootDir, manifestPath)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
