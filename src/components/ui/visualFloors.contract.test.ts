import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const SRC_ROOT = path.resolve(process.cwd(), "src");

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "dev") continue; // dev-only fixture routes are not product UI
      yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      yield full;
    }
  }
}

function pixelSize(token: string): number {
  const rem = token.match(/^([0-9.]+)rem$/);
  if (rem) return parseFloat(rem[1]) * 16;
  return parseFloat(token);
}

test("visual floors: no Tailwind text size below 11px outside dev fixtures (DESIGN-CONTRACT C17)", () => {
  const offenders: string[] = [];
  for (const file of walk(SRC_ROOT)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/text-\[([0-9.]+(?:px|rem))\]/g)) {
      if (pixelSize(match[1]) < 11) offenders.push(`${path.relative(SRC_ROOT, file)}: text-[${match[1]}]`);
    }
  }
  assert.deepEqual(offenders, []);
});
