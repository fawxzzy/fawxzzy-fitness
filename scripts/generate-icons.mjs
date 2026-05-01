import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const iconSourcePath = path.join(rootDir, "public", "brand", "atlas-sigil-master.png");
const defaultIconBackground = "#07111b";

const outputs = [
  { relativePath: path.join("public", "icons", "icon-512.png"), size: 512 },
  { relativePath: path.join("public", "icons", "icon-192.png"), size: 192 },
  { relativePath: path.join("public", "icons", "apple-touch-icon.png"), size: 180 },
  { relativePath: path.join("public", "app", "icon-512.png"), size: 512 },
  { relativePath: path.join("public", "app", "icon-192.png"), size: 192 },
  { relativePath: path.join("public", "favicon-32x32.png"), size: 32 },
  { relativePath: path.join("public", "favicon-16x16.png"), size: 16 },
];

function parseHexColor(value) {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^[\da-fA-F]{6}$/.test(normalized)) {
    throw new Error(`FITNESS_ICON_BG must be a 6-digit hex color. Received: ${value}`);
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
    alpha: 1,
  };
}

const iconBackgroundColor = parseHexColor(process.env.FITNESS_ICON_BG ?? defaultIconBackground);

async function main() {
  let sourcePng;
  try {
    sourcePng = await fs.readFile(iconSourcePath);
  } catch (error) {
    throw new Error(
      `Unable to read synced brand master at ${iconSourcePath}: ${error.message}. Run the ATLAS brand sync before building Fitness.`,
    );
  }

  await Promise.all(
    outputs.map(async ({ relativePath, size }) => {
      const outputPath = path.join(rootDir, relativePath);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      return sharp(sourcePng)
        .resize(size, size, {
          fit: "contain",
          background: iconBackgroundColor,
        })
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath);
    }),
  );

  console.log(`Generated ${outputs.length} ATLAS brand icons from ${iconSourcePath}`);
}

main().catch((error) => {
  console.error("Icon generation failed:", error.message);
  process.exit(1);
});
