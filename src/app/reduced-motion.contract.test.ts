import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const globalsUrl = new URL("./globals.css", import.meta.url);
const glassEffectsUrl = new URL("../lib/useGlassEffects.ts", import.meta.url);

test("reduced-motion keeps canonical ambient and interactive motion nonessential", async () => {
  const styles = await readFile(globalsUrl, "utf8");

  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /\.app-ambient__haze,[\s\S]*?animation-duration: 1ms !important;[\s\S]*?transform: none !important;/);
  assert.match(styles, /\.ambient-background__orb,[\s\S]*?animation: none;[\s\S]*?transform: none;/);
  assert.match(styles, /\.glass-interactive:active \{[\s\S]*?transform: none;/);
  assert.match(styles, /\.action-chrome:active:not\(:disabled\) \{[\s\S]*?transform: none;/);
});

test("glass effects default off for reduced-motion preference while retaining explicit user modes", async () => {
  const source = await readFile(glassEffectsUrl, "utf8");

  assert.match(source, /export type GlassEffectsMode = "on" \| "reduced" \| "off"/);
  assert.match(source, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches \? "off" : "reduced"/);
  assert.match(source, /window\.localStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(source, /isGlassEffectsMode\(saved\) \? saved : resolveDefaultMode\(\)/);
  assert.match(source, /document\.documentElement\.dataset\.glassEffects = mode/);
});

test("Promote shine: one shared class, a pure-CSS sweep on a pseudo-element, none under reduced motion or when disabled", async () => {
  const styles = await readFile(globalsUrl, "utf8");

  assert.match(styles, /\.promote-shine \{[^}]*position: relative;[^}]*overflow: hidden;/);
  const band = styles.match(/\.promote-shine::after \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(band, /pointer-events: none;/);
  assert.match(band, /animation: promote-shine-sweep [\d.]+s ease-in-out infinite;/);
  assert.match(band, /rgb\(var\(--text-primary\) \/ 0\.3\)/, "a 30% white band from the text token");
  assert.match(styles, /@keyframes promote-shine-sweep \{[\s\S]*?translateX\(-130%\)[\s\S]*?translateX\(290%\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\) \{\s*\.promote-shine::after \{\s*animation: none;/);
  assert.match(styles, /\.promote-shine\[aria-disabled="true"\]::after/);
});
