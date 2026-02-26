import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "exerciseIcons");
const destDir = path.join(rootDir, "public", "exercises", "icons");

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

async function main() {
  await fs.mkdir(destDir, { recursive: true });

  let entries;
  try {
    entries = await fs.readdir(sourceDir, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      console.log("No exerciseIcons/ directory found. Nothing to sync.");
      return;
    }
    throw error;
  }

  const pngFiles = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"));

  let added = 0;
  let skipped = 0;
  let renamed = 0;

  for (const file of pngFiles) {
    const parsed = path.parse(file.name);
    const normalizedBaseName = toKebabCase(parsed.name);

    if (!normalizedBaseName) {
      skipped += 1;
      console.log(`skip: ${file.name} (empty normalized filename)`);
      continue;
    }

    const targetFilename = `${normalizedBaseName}.png`;
    const sourcePath = path.join(sourceDir, file.name);
    const targetPath = path.join(destDir, targetFilename);

    if (file.name !== targetFilename) {
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
      console.log(`skip: ${file.name} -> ${targetFilename} (already exists)`);
      continue;
    }

    await fs.copyFile(sourcePath, targetPath);
    added += 1;
    if (file.name === targetFilename) {
      console.log(`add: ${targetFilename}`);
    } else {
      console.log(`add: ${file.name} -> ${targetFilename}`);
    }
  }

  console.log(`summary: added=${added} skipped=${skipped} renamed=${renamed}`);
}

main().catch((error) => {
  console.error("sync failed", error);
  process.exitCode = 1;
});
