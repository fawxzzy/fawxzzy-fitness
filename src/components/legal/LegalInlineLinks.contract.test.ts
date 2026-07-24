import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("legal inline links use the canonical app pipe by default", () => {
  const source = readFileSync(new URL("./LegalInlineLinks.tsx", import.meta.url), "utf8");

  assert.match(source, /SignatureMiniPipe/);
  assert.match(source, /<SignatureMiniPipe className=\{separatorClassName\} \/>/);
  assert.doesNotMatch(source, />\s*\|\s*</);
});
