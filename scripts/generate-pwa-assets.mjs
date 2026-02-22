import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const iconSource = path.join(rootDir, "assets", "pwa", "icon.svg");
const publicDir = path.join(rootDir, "public");

const FALLBACK_BG = { r: 11, g: 18, b: 32, a: 255 };

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function createSolidPng(width, height, color) {
  const header = Buffer.from("89504e470d0a1a0a", "hex");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const row = Buffer.alloc(width * 4, 0);
  for (let x = 0; x < width; x += 1) {
    const index = x * 4;
    row[index] = color.r;
    row[index + 1] = color.g;
    row[index + 2] = color.b;
    row[index + 3] = color.a;
  }

  const raw = Buffer.alloc((width * 4 + 1) * height, 0);
  for (let y = 0; y < height; y += 1) {
    const offset = y * (width * 4 + 1);
    row.copy(raw, offset + 1);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    header,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function generateWithSharp(iconSvg) {
  const { default: sharp } = await import("sharp");
  const outputs = [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["apple-touch-icon.png", 180],
  ];

  await Promise.all(
    outputs.map(([name, size]) =>
      sharp(iconSvg)
        .resize(size, size, { fit: "cover" })
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(path.join(publicDir, name)),
    ),
  );
}

async function generateFallback() {
  const outputs = [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["apple-touch-icon.png", 180],
  ];

  await Promise.all(
    outputs.map(([name, size]) =>
      fs.writeFile(path.join(publicDir, name), createSolidPng(size, size, FALLBACK_BG)),
    ),
  );
}

async function main() {
  await ensureDir(publicDir);
  const iconSvg = await fs.readFile(iconSource);

  try {
    await generateWithSharp(iconSvg);
    console.log("Generated PWA icons in public/ using sharp");
  } catch (error) {
    console.warn("sharp unavailable; generated fallback PNG icons.");
    await generateFallback();
  }
}

main().catch((error) => {
  console.error("Failed to generate PWA assets", error);
  process.exit(1);
});
