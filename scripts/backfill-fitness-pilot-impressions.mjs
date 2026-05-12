import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

function readFlag(argv, flag, fallback = null) {
  const index = argv.findIndex((value) => value === flag);
  if (index === -1) {
    return fallback;
  }

  return argv[index + 1] ?? fallback;
}

function findAtlasRoot(startDir = process.cwd()) {
  let current = path.resolve(startDir);

  for (;;) {
    if (fs.existsSync(path.join(current, "stack.yaml"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }

    current = parent;
  }
}

const atlasRoot = findAtlasRoot();
const defaultReceiptRoot = path.join(atlasRoot, "runtime", "receipts", "events");
const receiptRoot = path.resolve(readFlag(process.argv.slice(2), "--receipt-root", defaultReceiptRoot));
const moduleUrl = pathToFileURL(path.join(process.cwd(), "src", "lib", "ecosystem", "fitness-pilot-evidence.ts")).href;
const { backfillFitnessPilotShadowImpressions } = await import(moduleUrl);

process.chdir(atlasRoot);

const result = await backfillFitnessPilotShadowImpressions({
  receiptRoot,
});

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
