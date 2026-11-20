import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  APP_BACKDROP_VARIANTS,
  parseAppBackdropVariant,
  resolveAppBackdropForPathname,
  resolveDevRegressionBackdrop,
  TODAY_APP_BACKDROP_VARIANT,
} from "./app-backdrop.ts";

const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

test("three backdrops exist and Today ships aurora", () => {
  assert.deepEqual([...APP_BACKDROP_VARIANTS], ["aurora", "grid", "contour"]);
  assert.equal(TODAY_APP_BACKDROP_VARIANT, "aurora");
});

test("parseAppBackdropVariant: a|b|c aliases and full names, case/space tolerant, junk is null", () => {
  assert.equal(parseAppBackdropVariant("a"), "aurora");
  assert.equal(parseAppBackdropVariant("B"), "grid");
  assert.equal(parseAppBackdropVariant(" c "), "contour");
  assert.equal(parseAppBackdropVariant("Contour"), "contour");
  for (const junk of [null, undefined, "", "d", "ambient", "aurora2", "__proto__", "constructor"]) {
    assert.equal(parseAppBackdropVariant(junk), null, String(junk));
  }
});

test("production routes: only /today and its sub-paths get the static backdrop; every other screen keeps the ambient scene", () => {
  assert.equal(resolveAppBackdropForPathname("/today"), "aurora");
  assert.equal(resolveAppBackdropForPathname("/today/anything"), "aurora");
  for (const path of [null, "/", "/routines", "/history", "/settings", "/session/abc", "/todayx", "/dev/mobile-regression"]) {
    assert.equal(resolveAppBackdropForPathname(path), null, String(path));
  }
});

test("dev regression: Today scenarios mirror production, ?backdrop picks a look, ?backdrop=ambient restores the old scene", () => {
  assert.equal(resolveDevRegressionBackdrop({ screen: "today" }), "aurora");
  assert.equal(resolveDevRegressionBackdrop({ scenario: "today-rest" }), "aurora");
  assert.equal(resolveDevRegressionBackdrop({ screen: "today", backdrop: "c" }), "contour");
  assert.equal(resolveDevRegressionBackdrop({ screen: "routines", backdrop: "grid" }), "grid");
  assert.equal(resolveDevRegressionBackdrop({ screen: "today", backdrop: "ambient" }), null);
  assert.equal(resolveDevRegressionBackdrop({ screen: "routines" }), null);
  assert.equal(resolveDevRegressionBackdrop({}), null);
});

test("wiring: the persistent chrome swaps the ambient scene for the backdrop by pathname; the dev shell uses the override", () => {
  const chrome = read("src/components/ui/app/PersistentAppChrome.tsx");
  assert.match(chrome, /const backdrop = resolveAppBackdropForPathname\(pathname\);/);
  assert.match(chrome, /\{backdrop \? <AppBackdrop variant=\{backdrop\} \/> : <AppAmbientBackdrop preset=\{preset\} \/>\}/);
  const shell = read("src/components/ui/app/AppShell.tsx");
  assert.match(shell, /backdropOverride \? <AppBackdrop variant=\{backdropOverride\} \/> : <AppAmbientBackdrop preset=\{ambientPreset\} \/>/);
  const component = read("src/components/layout/AppBackdrop.tsx");
  assert.match(component, /<div aria-hidden="true" className="app-backdrop" data-app-backdrop=\{variant\}>/);
});

function backdropCss() {
  const css = read("src/app/globals.css");
  const start = css.indexOf(".app-backdrop {");
  assert.ok(start > 0, ".app-backdrop block exists");
  // The block ends at the first rule after the contour variant that is not an .app-backdrop rule.
  const contour = css.indexOf('.app-backdrop[data-app-backdrop="contour"]');
  const end = css.indexOf("\n}", contour);
  assert.ok(contour > start && end > contour, "contour rule found");
  return css.slice(start, end + 2);
}

test("backdrop CSS: token colours only, no images or animation, never takes taps or affects layout, safe-area aware", () => {
  const full = backdropCss();
  // Mask lines only carry alpha (black/rgb(0 0 0 / a) is the mask convention, never painted), so they are exempt.
  const css = full
    .split("\n")
    .filter((line) => !/^\s*(?:-webkit-)?mask-image:/.test(line))
    .join("\n");
  assert.doesNotMatch(css, /\/\*[\s\S]*?%3Csvg[\s\S]*?\*\//, "comments stay prose");
  // Colour comes only from theme tokens: no hex, no raw rgb()/hsl() literals outside rgb(var(--token)).
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(css, /\b(?:rgb|rgba|hsl|hsla)\(\s*\d/i);
  assert.doesNotMatch(css, /url\((?!"data:image\/svg\+xml)/, "no external images");
  assert.doesNotMatch(css, /animation|@keyframes|transition/);
  assert.match(css, /\.app-backdrop \{[^}]*position: absolute;[^}]*inset: 0;[^}]*pointer-events: none;[^}]*contain: strict;/);
  assert.match(css, /env\(safe-area-inset-top/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  for (const variant of APP_BACKDROP_VARIANTS) {
    assert.match(css, new RegExp(`\\[data-app-backdrop="${variant}"\\] \\.app-backdrop__pattern`), variant);
  }
});

test("the default (aurora) draws no shapes: radial/linear gradients only, so nothing behind a card can read as a glyph", () => {
  const css = backdropCss();
  const aurora = css.slice(css.indexOf('[data-app-backdrop="aurora"]'), css.indexOf('[data-app-backdrop="grid"]'));
  assert.match(aurora, /radial-gradient/);
  assert.doesNotMatch(aurora, /url\(|mask|repeat|\d+px \d+px/);
});

test("/dev/today-backgrounds frames the live Today screen for each look plus the old scene (no mock)", () => {
  const page = read("src/app/dev/today-backgrounds/page.tsx");
  assert.match(page, /await assertDevPageAvailable\(\);/);
  assert.match(page, /<iframe/);
  assert.match(page, /\/dev\/mobile-regression\?screen=today&fixture=default&backdrop=\$\{frame\.backdrop\}/);
  assert.match(page, /\/dev\/mobile-regression\/switch-day\?variant=standard&backdrop=\$\{frame\.backdrop\}/);
  assert.match(page, /backdrop: "ambient"/);
});
