import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("AuthFormFields keeps the shared compact pre-login field stack", () => {
  const source = readFileSync(new URL("./AuthShell.tsx", import.meta.url), "utf8");

  assert.match(source, /mx-auto w-full max-w-\[15rem\] space-y-\[18px\]/);
});

test("auth chrome keeps the final shared title, eye, separator, and dock contract", () => {
  const shellSource = readFileSync(new URL("./AuthShell.tsx", import.meta.url), "utf8");
  const designSource = readFileSync(new URL("../ui/app/designSystem.ts", import.meta.url), "utf8");
  const passwordSource = readFileSync(new URL("../ui/PasswordInput.tsx", import.meta.url), "utf8");

  assert.match(shellSource, /AUTH_PRIMARY_DOCK_BUTTON_CLASS_NAME/);
  assert.match(shellSource, /linear-gradient\(180deg,#f4f4f5_0%,rgb\(var\(--accent\)\)_180%\)/);
  assert.match(designSource, /introTitleClassName: "mt-\[26px\]/);
  assert.doesNotMatch(designSource, /footerSeparatorClassName: `px-/);
  assert.match(passwordSource, /className="h-5 w-5"/);
});
