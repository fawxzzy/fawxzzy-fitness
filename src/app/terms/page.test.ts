import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pageSource = readFileSync(fileURLToPath(new URL("./page.tsx", import.meta.url)), "utf8");

test("terms source does not include internal draft or placeholder language", () => {
  assert.doesNotMatch(pageSource, /not legal advice/i);
  assert.doesNotMatch(pageSource, /internal operating draft/i);
  assert.doesNotMatch(pageSource, /Governing Law and Dispute Terms/i);
  assert.match(pageSource, /Terms of Service/);
  assert.match(pageSource, /monthly recurring subscription/i);
});
