import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const atlasRoot = path.resolve(rootDir, "..", "..");
const manifestPath = path.join(atlasRoot, "branding", "manifest.json");
const iconSourcePath = path.join(rootDir, "public", "brand", "atlas-sigil-master.png");
const canonicalSourceSha256 = "E20A9FE2E42585ED1EC818D13EC80AA8CED89F15F82A35C51269C1B794F07F51";

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

function resolveAtlasPath(relativePath) {
  return path.resolve(atlasRoot, relativePath);
}

async function loadFitnessConsumers() {
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw new Error(`Unable to read ATLAS branding manifest at ${manifestPath}: ${error.message}`);
  }

  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest?.consumers)) {
    throw new Error(`Unsupported ATLAS branding manifest at ${manifestPath}.`);
  }

  return manifest.consumers
    .filter((consumer) => consumer?.repoId === "fitness")
    .filter((consumer) => typeof consumer?.source === "string" && typeof consumer?.target === "string")
    .filter((consumer) => !consumer.target.endsWith(path.join("public", "brand", "atlas-sigil-master.png")))
    .map((consumer) => ({
      id: String(consumer.id ?? consumer.target),
      sourcePath: resolveAtlasPath(consumer.source),
      targetPath: resolveAtlasPath(consumer.target),
    }));
}

async function main() {
  let sourcePng;
  try {
    sourcePng = await fs.readFile(iconSourcePath);
  } catch (error) {
    throw new Error(
      `Unable to read canonical icon source at ${iconSourcePath}: ${error.message}. Restore the Fitness icon master before building.`,
    );
  }

  const sourceHash = sha256(sourcePng);
  if (sourceHash !== canonicalSourceSha256) {
    throw new Error(
      `Unexpected Fitness icon source hash ${sourceHash} at ${iconSourcePath}. Restore the canonical sigil artwork before generating icons.`,
    );
  }

  const consumers = await loadFitnessConsumers();
  if (consumers === null) {
    console.log(`Skipped external Fitness brand sync; no ATLAS branding manifest found at ${manifestPath}`);
    return;
  }

  if (consumers.length === 0) {
    console.log(`Skipped external Fitness brand sync; no Fitness brand consumers were declared in ${manifestPath}`);
    return;
  }

  await Promise.all(
    consumers.map(async ({ sourcePath, targetPath }) => {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.copyFile(sourcePath, targetPath);
    }),
  );

  console.log(`Synced ${consumers.length} Fitness brand consumers from ${manifestPath}`);
}

main().catch((error) => {
  console.error("Icon generation failed:", error.message);
  process.exit(1);
});
