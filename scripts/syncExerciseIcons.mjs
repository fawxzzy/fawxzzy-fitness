import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "exerciseIcons");
const destDir = path.join(rootDir, "public", "exercises", "icons");

// Sync strategy: skip when destination already exists (never overwrite existing icons).
function toKebabCase(input) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

async function findPngFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findPngFiles(fullPath);
      files.push(...nested);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  await fs.mkdir(destDir, { recursive: true });

  let pngFiles;
  try {
    pngFiles = await findPngFiles(sourceDir);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      console.log("No exerciseIcons/ directory found. Nothing to sync.");
      return;
    }
    throw error;
  }

  let added = 0;
  let skipped = 0;
  let renamed = 0;
  let errors = 0;

  for (const sourcePath of pngFiles) {
    const sourceFilename = path.basename(sourcePath);
    const parsed = path.parse(sourceFilename);
    const normalizedBaseName = toKebabCase(parsed.name);

    if (!normalizedBaseName) {
      skipped += 1;
      console.log(`skipped: ${sourceFilename} (empty normalized filename)`);
      continue;
    }

    const targetFilename = `${normalizedBaseName}.png`;
    const targetPath = path.join(destDir, targetFilename);

    if (sourceFilename !== targetFilename) {
      renamed += 1;
    }

    let targetExists = false;
    try {
      await fs.access(targetPath);
      targetExists = true;
    } catch {
      targetExists = false;
    }

    if (targetExists) {
      skipped += 1;
      console.log(`skipped: ${sourceFilename} -> ${targetFilename} (already exists)`);
      continue;
    }

    try {
      await fs.copyFile(sourcePath, targetPath);
      added += 1;
      if (sourceFilename === targetFilename) {
        console.log(`added: ${targetFilename}`);
      } else {
        console.log(`added: ${sourceFilename} -> ${targetFilename}`);
      }
    } catch (error) {
      errors += 1;
      console.error(`error: ${sourceFilename} -> ${targetFilename}`, error);
    }
  }

  console.log(`summary: added=${added} skipped=${skipped} renamed=${renamed} errors=${errors}`);

  if (errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("sync failed", error);
  process.exitCode = 1;
});
