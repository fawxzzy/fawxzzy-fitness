import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const iconSourcePath = path.join(rootDir, "public", "brand", "atlas-sigil-master.png");
const canonicalSourceSha256 = "E20A9FE2E42585ED1EC818D13EC80AA8CED89F15F82A35C51269C1B794F07F51";
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

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

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

const iconBackground = process.env.FITNESS_ICON_BG ?? defaultIconBackground;
const iconBackgroundColor = parseHexColor(iconBackground);

function buildIcoBuffer(frameBuffers) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frameBuffers.length, 4);

  const directory = Buffer.alloc(frameBuffers.length * 16);
  let offset = header.length + directory.length;

  frameBuffers.forEach(({ size, buffer }, index) => {
    const entryOffset = index * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, entryOffset);
    directory.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1);
    directory.writeUInt8(0, entryOffset + 2);
    directory.writeUInt8(0, entryOffset + 3);
    directory.writeUInt16LE(1, entryOffset + 4);
    directory.writeUInt16LE(32, entryOffset + 6);
    directory.writeUInt32LE(buffer.length, entryOffset + 8);
    directory.writeUInt32LE(offset, entryOffset + 12);
    offset += buffer.length;
  });

  return Buffer.concat([header, directory, ...frameBuffers.map(({ buffer }) => buffer)]);
}

async function renderPngBuffer(sourcePng, size) {
  return sharp(sourcePng)
    .resize(size, size, {
      fit: "contain",
      background: iconBackgroundColor,
    })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();
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

  await Promise.all(
    outputs.map(async ({ relativePath, size }) => {
      const outputPath = path.join(rootDir, relativePath);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      const renderedPng = await renderPngBuffer(sourcePng, size);
      return fs.writeFile(outputPath, renderedPng);
    }),
  );

  const faviconFrames = await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      buffer: await renderPngBuffer(sourcePng, size),
    })),
  );
  await fs.writeFile(path.join(rootDir, "public", "favicon.ico"), buildIcoBuffer(faviconFrames));

  console.log(`Generated ${outputs.length + 1} Fitness icon assets from ${iconSourcePath}`);
}

main().catch((error) => {
  console.error("Icon generation failed:", error.message);
  process.exit(1);
});
