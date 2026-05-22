import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("PasswordInput keeps passwords hidden by default and binds input type and aria label to shared visibility helpers", () => {
  const source = readFileSync(new URL("./PasswordInput.tsx", import.meta.url), "utf8");

  assert.match(source, /useState\(false\)/);
  assert.match(source, /type=\{resolvePasswordInputType\(isVisible\)\}/);
  assert.match(source, /aria-label=\{toggleLabel\}/);
});
