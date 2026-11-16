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
const loginEntrySource = read("./LoginEntry.tsx");

// Auth Surface v2 (Zac 2026-11-15): updated deliberately from the v1 fixed-centre layout. Same family, product and
// runtime markers; a 100dvh flex column instead of fixed anchors; one reserved notice slot; locked fields for known
// values; the remembered account is a locked field, not a name under the title.
test("shared auth shell keeps the family markers and the one-column v2 layout", () => {
  assert.match(shellSource, /data-auth-family="fawxzzy"/);
  assert.match(shellSource, /data-auth-layout="surface-v2"/);
  assert.match(shellSource, /data-auth-product="fitness"/);
  assert.match(shellSource, /data-auth-runtime="same-origin"/);
  assert.match(shellSource, /auth-canonical-account-shell/);
  assert.match(shellSource, /"fx-fields"/);
  assert.match(globalCssSource, /\.fx-auth \{[^}]*height: 100dvh;/);
  assert.match(globalCssSource, /\.fx-auth__frame \{[^}]*env\(safe-area-inset-bottom, 0px\) \+ 26px/);
  assert.doesNotMatch(shellSource, /\[caret-color:transparent\]/);
});

test("installed auth uses the canonical account presentation without crossing origins", () => {
  assert.match(loginEntrySource, /getInstallContext\(\)\.isStandalone \|\| isLocalManualLogin/);
  assert.match(loginEntrySource, /return <LoginScreen \{\.\.\.props\} \/>/);
  // One accent on auth screens: the standard green, no lime left (Zac 2026-11-15).
  assert.match(globalCssSource, /\.fx-auth \{[^}]*--accent: 32 151 78;[^}]*--fx-ac: 32 151 78;/);
  // The account screen is fixed to the same green (themes override --accent-mint, so it is not used here); the lime
  // stays only on the non-auth install card (.fx-earned).
  const authBlock = globalCssSource.match(/\n\.fx-auth \{[^}]*\}/)?.[0] ?? "";
  const accountBlock = globalCssSource.match(/\n\.fx-account \{[^}]*\}/)?.[0] ?? "";
  assert.ok(authBlock && accountBlock, "the .fx-auth and .fx-account token blocks exist");
  assert.match(accountBlock, /--fx-ac: 32 151 78;/);
  for (const block of [authBlock, accountBlock]) {
    assert.doesNotMatch(block, /160 223 56|190 242 100|var\(--accent-mint/);
  }
  assert.match(globalCssSource, /\.fx-auth \{[^}]*--fx-base: #060b07/);
  // Sign in is the app's standard green primary, flat, with no lime gradient or glow.
  assert.match(globalCssSource, /\.fx-auth \{[^}]*--fx-primary: 32 151 78;/);
  assert.match(globalCssSource, /\.fx-dock \{[^}]*background: rgb\(var\(--fx-primary\)\);\s*box-shadow: none;/);
  assert.match(globalCssSource, /\.fx-auth \.auth-canonical-legal-link \{/);
  assert.match(read("../../components/auth/authCopy.ts"), /idle: "Sign in"[\s\S]*ready: "Sign in"/);

  assert.match(loginSource, /data-auth-intent="login"/);
  assert.match(loginSource, /data-auth-surface="credentials"/);
  assert.match(signupSource, /data-auth-intent="signup"/);
  assert.match(signupSource, /data-auth-surface="credentials"/);
  assert.match(forgotSource, /data-auth-surface="recovery"/);
  assert.match(resetFormSource, /data-auth-surface="recovery"/);

  assert.doesNotMatch(loginSource, /iframe|account\.fawxzzy\.com|accessToken|refreshToken/);
  assert.doesNotMatch(signupSource, /iframe|account\.fawxzzy\.com|accessToken|refreshToken/);
});

test("account fields keep centred native editing and one focus indicator per field", () => {
  assert.match(fieldSource, /"fx-fld auth-account-field"/);
  assert.match(fieldSource, /auth-input-plain/);
  assert.match(fieldSource, /data-invalid=\{invalid \? "true" : undefined\}/);
  assert.match(fieldSource, /readOnly\s+aria-readonly="true"/);
  assert.match(globalCssSource, /\.fx-auth \.fx-fld__input \{[^}]*text-align: center/);
  assert.match(globalCssSource, /\.fx-auth \.fx-fld__input \{[^}]*font-size: 17px/);
  assert.match(globalCssSource, /\.fx-fld:focus-within \{/);
  assert.match(globalCssSource, /:user-invalid/);
  assert.match(globalCssSource, /@media \(forced-colors: active\)/);
  assert.match(globalCssSource, /\.auth-account-input::-ms-reveal/);
});

test("every editable Fitness account form uses the canonical field, notice slot, dock and legal row", () => {
  for (const source of [loginSource, signupSource, forgotSource, resetFormSource]) {
    assert.match(source, /AuthAccountField/);
    assert.match(source, /<AuthNoticeSlot notice=\{notice\}/);
    assert.match(source, /AuthLegalRow/);
    assert.match(source, /AuthDockButton/);
  }
  for (const source of [loginSource, signupSource, forgotSource]) {
    assert.match(source, /<AuthLinks>/);
  }
  // No reset-password route renders a dead end: link problems become the request screen.
  assert.match(resetPageSource, /<ForgotPasswordFormClient initialNotice=/);
});

test("returning login says Welcome back and shows the remembered account as a locked field", () => {
  assert.match(loginSource, /rememberedLogin \? "Welcome back" : AUTH_MODE_COPY\["password-login"\]\.title/);
  assert.match(loginSource, /<AuthLockedField id=\{REMEMBERED_INPUT_ID\} name="remembered-account" autoComplete="username" label=\{rememberedLabel\} value=\{rememberedValue\} \/>/);
  assert.match(read("../../components/auth/authCopy.ts"), /title: "Welcome"/);
});

test("password inputs keep one product reveal control while native reveal chrome is suppressed", () => {
  assert.equal((passwordSource.match(/<button/g) ?? []).length, 1);
  assert.match(passwordSource, /aria-label=\{toggleLabel\}/);
  assert.match(passwordSource, /InputHTMLAttributes<HTMLInputElement>/);
  assert.match(passwordSource, /<Input\s+[\s\S]*\{\.\.\.props\}/);
  assert.match(globalCssSource, /::-ms-reveal/);
});

test("dev lab covers the public auth, install, status and same-origin account screen family", () => {
  for (const screen of [
    "login", "signup", "forgot-password", "reset-password", "reset-password-expired", "entry-handoff-error", "account",
    "login-remembered", "forgot-password-signed-in", "forgot-password-sent", "signup-sent", "not-found", "app-recovery",
    "install-ios-safari", "install-ios-inapp", "install-prompt", "install-manual", "install-unsupported", "install-installed",
  ]) {
    assert.match(labSource, new RegExp(`id: "${screen}"`));
  }

  assert.match(accountSource, /<AccountScreen/);
  assert.doesNotMatch(accountSource, /getFitnessAccountPortalUrl|account\.fawxzzy\.com/);
});
