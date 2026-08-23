import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("legal inline links use the canonical app pipe by default", () => {
  const source = readFileSync(new URL("./LegalInlineLinks.tsx", import.meta.url), "utf8");

  assert.match(source, /SignatureMiniPipe/);
  assert.match(source, /<SignatureMiniPipe className=\{separatorClassName\} \/>/);
  assert.match(source, /centerSeparator = false/);
  assert.match(source, /grid-cols-\[minmax\(0,1fr\)_0\.465rem_minmax\(0,1fr\)\]/);
  assert.match(source, /centerSeparator \? "justify-self-end"/);
  assert.match(source, /centerSeparator \? "justify-self-start"/);
  assert.doesNotMatch(source, />\s*\|\s*</);
});
