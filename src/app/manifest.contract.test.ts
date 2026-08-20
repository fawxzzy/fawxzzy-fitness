import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifestUrl = new URL("./manifest.ts", import.meta.url);

test("the standalone app starts through authenticated entry instead of the session-clearing login screen", async () => {
  const source = await readFile(manifestUrl, "utf8");

  assert.match(source, /start_url:\s*"\/entry\?installedApp=1"/);
  assert.doesNotMatch(source, /start_url:\s*"\/login\?installedApp=1"/);
});
