import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const shellSource = read("../../components/auth/AuthShell.tsx");
const fieldSource = read("../../components/auth/AuthAccountField.tsx");
const globalCssSource = read("../globals.css");
const loginSource = read("./LoginScreen.tsx");
const signupSource = read("../../components/auth/SignupForm.tsx");
const forgotSource = read("../forgot-password/ForgotPasswordFormClient.tsx");
const resetFormSource = read("../reset-password/ResetPasswordForm.tsx");
const resetPageSource = read("../reset-password/page.tsx");
const passwordSource = read("../../components/ui/PasswordInput.tsx");
const labSource = read("../dev/auth-screen-lab/page.tsx");
const accountSource = read("../account/page.tsx");

test("shared auth shell owns the viewport anchors and stable two-row footer", () => {
  assert.match(shellSource, /auth-form-fields-centered/);
  assert.match(shellSource, /grid-rows-\[24px_24px\]/);
  assert.match(shellSource, /grid-cols-\[minmax\(0,1fr\)_0\.465rem_minmax\(0,1fr\)\]/);
  assert.match(shellSource, /env\(safe-area-inset-bottom,0px\)\+1\.5rem/);
  assert.doesNotMatch(shellSource, /\[caret-color:transparent\]/);
});

test("account fields preserve centered native editing and one fieldset focus indicator", () => {
  assert.match(fieldSource, /auth-account-field/);
  assert.match(fieldSource, /text-center/);
  assert.match(fieldSource, /placeholder:text-center/);
  assert.match(fieldSource, /!text-base/);
  assert.match(fieldSource, /auth-input-plain/);
  assert.match(fieldSource, /px-12/);
  assert.match(fieldSource, /!px-12/);
  assert.match(globalCssSource, /\.auth-form-fields-centered[\s\S]*top: 50dvh/);
  assert.match(globalCssSource, /\.auth-account-input[\s\S]*caret-color: rgb\(var\(--text-primary\)\)/);
  assert.match(globalCssSource, /\.auth-account-field:focus-within/);
  assert.match(globalCssSource, /:user-invalid/);
  assert.match(globalCssSource, /@media \(forced-colors: active\)/);
  assert.match(globalCssSource, /@media \(max-height: 38rem\)[\s\S]*padding-bottom: calc\(env\(safe-area-inset-bottom, 0px\) \+ 10rem\)/);
  assert.match(globalCssSource, /@media \(max-height: 38rem\)[\s\S]*\[data-testid="auth-footer"\][\s\S]*position: static !important/);
  assert.match(globalCssSource, /@media \(max-height: 38rem\)[\s\S]*\[data-testid="auth-dock"\][\s\S]*background: linear-gradient/);
  assert.match(globalCssSource, /@media \(max-height: 38rem\) and \(min-width: 40rem\)[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(12rem, 1fr\)\)/);
  assert.match(globalCssSource, /\.auth-account-input::-ms-reveal/);
});

test("every editable Fitness account form consumes the canonical field and footer rows", () => {
  for (const source of [loginSource, signupSource, forgotSource, resetFormSource]) {
    assert.match(source, /AuthAccountField/);
    assert.match(source, /AuthLegalRow/);
  }

  assert.match(loginSource, /AuthCenteredFooterRow/);
  assert.match(forgotSource, /AuthCenteredFooterRow/);
  assert.match(resetFormSource, /AuthCenteredFooterRow/);
  assert.match(resetPageSource, /AuthFooterSpacer/);
  assert.match(resetPageSource, /AuthLegalRow/);
});

test("returning login retains Welcome and the remembered canonical display name", () => {
  assert.match(loginSource, /rememberedDisplayName/);
  assert.match(loginSource, /appTokens\.authDisplayName/);
  assert.match(read("../../components/auth/authCopy.ts"), /title: "Welcome"/);
});

test("password inputs keep one product reveal control while native reveal chrome is suppressed", () => {
  assert.equal((passwordSource.match(/<button/g) ?? []).length, 1);
  assert.match(passwordSource, /aria-label=\{toggleLabel\}/);
  assert.match(passwordSource, /InputHTMLAttributes<HTMLInputElement>/);
  assert.match(passwordSource, /<Input\s+[\s\S]*\{\.\.\.props\}/);
  assert.match(globalCssSource, /::-ms-reveal/);
});

test("dev lab covers the public auth and same-origin account screen family", () => {
  for (const screen of ["login", "signup", "forgot-password", "reset-password", "reset-password-expired", "entry-handoff-error", "account"]) {
    assert.match(labSource, new RegExp(`id: "${screen}"`));
  }

  assert.match(accountSource, /<AccountScreen/);
  assert.doesNotMatch(accountSource, /getFitnessAccountPortalUrl|account\.fawxzzy\.com/);
});
