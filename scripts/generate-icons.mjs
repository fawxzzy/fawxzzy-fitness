import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const iconSourcePath = path.join(rootDir, "public", "icon-source.svg");
const iconsOutputDir = path.join(rootDir, "public", "icons");

const outputs = [
  { fileName: "icon-512.png", size: 512 },
  { fileName: "icon-192.png", size: 192 },
  { fileName: "apple-touch-icon.png", size: 180 },
];

async function main() {
  await fs.mkdir(iconsOutputDir, { recursive: true });

  let sourceSvg;
  try {
    sourceSvg = await fs.readFile(iconSourcePath);
  } catch (error) {
    throw new Error(`Unable to read icon source at ${iconSourcePath}: ${error.message}`);
  }

  await Promise.all(
    outputs.map(({ fileName, size }) => {
      const outputPath = path.join(iconsOutputDir, fileName);

      return sharp(sourceSvg)
        .resize(size, size, { fit: "cover" })
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath);
    }),
  );

  console.log(`Generated ${outputs.length} icons in ${iconsOutputDir}`);
}

main().catch((error) => {
  console.error("Icon generation failed:", error.message);
  process.exit(1);
});
