import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adoptionFiles = [
  "../..//app/login/LoginScreen.tsx",
  "../auth/SignupForm.tsx",
  "../../app/reset-password/ResetPasswordForm.tsx",
  "../settings/LegacyMigrationSettings.tsx",
];

test("shared PasswordInput is adopted across auth and account password fields", () => {
  for (const relativePath of adoptionFiles) {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    assert.match(source, /<PasswordInput/);
  }
});

test("sign-in and account creation preserve the shared password-preview control", () => {
  for (const relativePath of adoptionFiles.slice(0, 2)) {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    assert.doesNotMatch(source, /showVisibilityToggle=\{false\}/);
  }
});
