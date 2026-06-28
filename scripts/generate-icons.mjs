import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const iconSourcePath = path.join(rootDir, "public", "brand", "fitness-app-icon-source.jpg");
const generatedPngPath = path.join(rootDir, "public", "brand", "fitness-app-icon.png");
const outputTargets = [
  { type: "png", size: 1024, targetPath: generatedPngPath },
  { type: "png", size: 1024, targetPath: path.join(rootDir, "public", "app", "loader-sigil.png") },
];

function parseArguments(argv) {
  return {
    check: argv.includes("--check"),
  };
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

let sharpPromise;

async function loadSharp() {
  if (!sharpPromise) {
    sharpPromise = import("sharp").then((module) => module.default);
  }
  return sharpPromise;
}

async function renderPngBuffer(sourceBuffer, size) {
  const sharp = await loadSharp();
  return sharp(sourceBuffer)
    .resize(size, size, {
      fit: "cover",
      position: "centre",
    })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();
}

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

async function renderOutputBuffer(sourceBuffer, target) {
  if (target.type === "png") {
    return renderPngBuffer(sourceBuffer, target.size);
  }

  const frameBuffers = [];
  for (const size of target.sizes) {
    frameBuffers.push({
      size,
      buffer: await renderPngBuffer(sourceBuffer, size),
    });
  }
  return buildIcoBuffer(frameBuffers);
}

async function readExistingBuffer(filePath) {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const sourceBuffer = await fs.readFile(iconSourcePath);
  const staleTargets = [];

  for (const target of outputTargets) {
    const nextBuffer = await renderOutputBuffer(sourceBuffer, target);
    const currentBuffer = await readExistingBuffer(target.targetPath);
    const relativePath = path.relative(rootDir, target.targetPath);

    if (currentBuffer && sha256(currentBuffer) === sha256(nextBuffer)) {
      console.log(`ok    ${relativePath}`);
      continue;
    }

    staleTargets.push(relativePath);

    if (options.check) {
      console.log(`${currentBuffer ? "stale" : "miss "} ${relativePath}`);
      continue;
    }

    await fs.mkdir(path.dirname(target.targetPath), { recursive: true });
    await fs.writeFile(target.targetPath, nextBuffer);
    console.log(`sync  ${relativePath}`);
  }

  if (options.check && staleTargets.length > 0) {
    console.error(`Fitness icon drift detected in ${staleTargets.length} target(s).`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Icon generation failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
