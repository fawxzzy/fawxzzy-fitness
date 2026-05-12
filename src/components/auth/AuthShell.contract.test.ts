import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("AuthFormFields keeps a shared horizontal inset for pre-login inputs", () => {
  const source = readFileSync(new URL("./AuthShell.tsx", import.meta.url), "utf8");

  assert.match(source, /mx-auto w-full max-w-\[23rem\] space-y-4 px-1 pt-2 sm:px-0/);
});
