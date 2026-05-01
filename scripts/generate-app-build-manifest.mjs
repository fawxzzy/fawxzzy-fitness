#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const packageJsonPath = path.join(rootDir, "package.json");
const generatedDir = path.join(rootDir, "src", "generated");
const manifestPath = path.join(generatedDir, "appBuildManifest.json");

async function main() {
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  const generatedAt = new Date().toISOString();
  const buildSource =
    process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    || process.env.VERCEL_DEPLOYMENT_ID
    || `${packageJson.version}-${generatedAt}`;

  const manifest = {
    buildId: String(buildSource),
    generatedAt,
    version: String(packageJson.version),
  };

  await fs.mkdir(generatedDir, { recursive: true });
  await fs.writeFile(`${manifestPath}`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(`Generated app build manifest at ${path.relative(rootDir, manifestPath)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
