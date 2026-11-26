import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Auth Surface v2 (Zac 2026-11-15). Updated deliberately from the v1 contract (fixed centred field stack, split dock):
// one anatomy, one reserved notice slot, the real app icon, a 100dvh flex column with nothing position:fixed.
const shellSource = readFileSync(new URL("./AuthShell.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const passwordSource = readFileSync(new URL("../ui/PasswordInput.tsx", import.meta.url), "utf8");

function cssBlock(selector: string) {
  const start = cssSource.indexOf(`\n${selector} {`);
  assert.notEqual(start, -1, `missing CSS block ${selector}`);
  return cssSource.slice(start, cssSource.indexOf("}", start));
}

test("AuthFormFields keeps the shared field stack inside the scrolling body", () => {
  assert.match(shellSource, /className=\{cn\("fx-fields", className\)\} data-testid="auth-form-fields"/);
  assert.match(shellSource, /className=\{cn\("fx-body", align === "top" \? "fx-body--top" : "", className\)\}/);
  assert.doesNotMatch(cssSource, /\.auth-form-fields-centered/);
});

test("auth chrome keeps one anatomy: icon, kicker, title, lead, body, links, legal, dock", () => {
  assert.match(shellSource, /export const AUTH_APP_ICON_SRC = APP_LOADER_ICON_DATA_URI;/);
  assert.match(shellSource, /<header className="fx-head" data-testid="auth-intro">\s*<AuthAppIcon \/>\s*<AuthKicker \/>\s*<h1 className="fx-ttl">/);
  assert.match(shellSource, /<p className="fx-kick">\{PASSWORD_LOGIN_UI_COPY\.wordmark\}<\/p>/);
  assert.match(shellSource, /AuthLegalRow/);
  assert.match(shellSource, /data-auth-primary-action="true"/);
  assert.match(passwordSource, /className="h-5 w-5"/);
  assert.doesNotMatch(shellSource, /\[caret-color:transparent\]/);
  // No v1 split dock or fixed footer survives in the shell.
  assert.doesNotMatch(shellSource, /BottomActionSplit|BottomActionSingle|"fixed |fixed inset-x-0/);
});

test("the page is one 100dvh flex column with safe areas in padding, never fixed px offsets", () => {
  const shell = cssBlock(".fx-auth");
  assert.match(shell, /display: flex;/);
  assert.match(shell, /flex-direction: column;/);
  assert.match(shell, /height: 100dvh;/);
  const frame = cssBlock(".fx-auth__frame");
  assert.match(frame, /calc\(env\(safe-area-inset-top, 0px\) \+ 44px\)/);
  assert.match(frame, /calc\(env\(safe-area-inset-bottom, 0px\) \+ 26px\)/);
  const v2 = cssSource.slice(cssSource.indexOf("\n.fx-auth {"));
  assert.doesNotMatch(v2.slice(0, v2.indexOf(".app-page-scroll")), /position: fixed/);
  // Small phones (320x568): compact metrics, narrower side padding.
  assert.match(cssSource, /@media \(max-height: 640px\) \{\s*\.fx-auth__frame/);
  assert.match(cssSource, /@media \(max-width: 340px\) \{\s*\.fx-auth__frame/);
});

test("the notice slot always holds its height and every notice is role=alert", () => {
  assert.match(cssBlock(".fx-slot"), /min-height: 70px;/);
  assert.match(cssSource, /@media \(max-height: 640px\)[\s\S]*\.fx-slot \{\s*min-height: 62px;/);
  assert.match(shellSource, /<div className=\{cn\("fx-slot", className\)\} data-testid="auth-notice-slot">/);
  assert.match(shellSource, /role="alert"/);
  // A freshly shown notice scrolls itself into view (320x568: the auth body is a short scroller).
  assert.match(shellSource, /<NoticeScrollIntoView \/>/);
  assert.match(readFileSync(new URL("./NoticeScrollIntoView.tsx", import.meta.url), "utf8"), /scrollIntoView\(\{ block: "nearest" \}\)/);
  assert.doesNotMatch(shellSource, /role="status"[^}]*data-testid="auth-notice"/);
});
