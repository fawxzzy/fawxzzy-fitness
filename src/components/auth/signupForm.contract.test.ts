import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Create account says the password rule before the person types, tied to the field", () => {
  const source = read("./SignupForm.tsx");
  assert.match(source, /PASSWORD_HINT = `\$\{NEW_PASSWORD_MINIMUM\}\+ characters`/);
  assert.match(source, /<p id=\{PASSWORD_HINT_ID\} className="fx-fld__hint">\{PASSWORD_HINT\}<\/p>/);
  assert.match(source, /aria-describedby=\{PASSWORD_HINT_ID\}/);
  // The hint is a quiet line, never red text: the rule violation itself still goes through the in-flow notice.
  assert.doesNotMatch(read("../../app/globals.css").match(/\.fx-fld__hint \{[^}]*\}/)?.[0] ?? "", /danger|red|error/i);
});

test("a disabled primary button reads as off (muted outline), not as a half-faded copy of the enabled one", () => {
  const css = read("../../app/globals.css");
  const disabled = css.match(/\.fx-dock:disabled:not\(\[data-busy="true"\]\) \{[^}]*\}/)?.[0] ?? "";
  assert.ok(disabled, "the disabled dock rule exists");
  assert.doesNotMatch(disabled, /opacity/, "no opacity fade over the green fill");
  assert.match(disabled, /background: rgb\(var\(--fx-text\) \/ 0\.07\)/);
  assert.match(disabled, /color: rgb\(var\(--fx-text\) \/ 0\.62\)/);
  // Enabled keeps the solid green fill.
  assert.match(css, /\.fx-dock \{[^}]*background: rgb\(var\(--fx-primary\)\);/);
});
