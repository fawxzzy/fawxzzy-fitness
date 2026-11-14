import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import * as loader from "@/lib/app-loader";
import {
  APP_LOADER_ICON_BYTES,
  APP_LOADER_ICON_DATA_URI,
  APP_LOADER_ICON_PX,
  APP_LOADER_ICON_SHA256,
  APP_LOADER_ICON_SOURCE_SHA256,
} from "@/lib/app-loader-icon";

const repoRoot = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(repoRoot, relativePath), "utf8").replace(/\r\n/g, "\n");
const sha256 = (buffer: Buffer) => crypto.createHash("sha256").update(buffer).digest("hex").toUpperCase();

const CSS_START = "App loader (docs/design-system/LOADER-SPEC.md)";
const CSS_END = "@keyframes exercise-card-progress-glint";
const loaderCssBlock = () => {
  const css = read("src/app/globals.css");
  return css.slice(css.indexOf(CSS_START), css.indexOf(CSS_END));
};

/** The shared numbers, exactly as docs/design-system/LOADER-SPEC.md and the Mazer appLoader.ts state them. */
const SHARED_CONSTANTS: Record<string, number> = {
  LOADER_SHOW_DELAY_MS: 150,
  LOADER_MIN_HOLD_MS: 350,
  LOADER_FADE_IN_MS: 200,
  LOADER_FADE_OUT_MS: 300,
  LOADER_REDUCED_CROSSFADE_MS: 200,
  LOADER_PULSE_PERIOD_MS: 1200,
  LOADER_ICON_SIZE_RATIO: 0.3,
  LOADER_ICON_MIN_PX: 88,
  LOADER_ICON_MAX_PX: 150,
  LOADER_ICON_PULSE_SCALE: 0.03,
  LOADER_RING_GROWTH: 0.22,
  LOADER_RING_PEAK_ALPHA: 0.5,
  LOADER_RING_REDUCED_SCALE: 1.08,
  LOADER_RING_REDUCED_ALPHA: 0.28,
};

test("the loader constants are the shared numbers", () => {
  for (const [name, value] of Object.entries(SHARED_CONSTANTS)) {
    assert.equal((loader as Record<string, unknown>)[name], value, name);
  }
});

test("LOADER-SPEC.md states every shared constant with the same value", () => {
  const spec = read("docs/design-system/LOADER-SPEC.md");
  for (const [name, value] of Object.entries(SHARED_CONSTANTS)) {
    const row = spec.split("\n").find((line) => line.startsWith(`| ${name} |`));
    assert.ok(row, `${name} is in the spec`);
    assert.equal(Number(row.split("|")[2].trim()), value, `${name} value in the spec`);
  }
  assert.match(spec, /`#07111b`/);
  assert.match(spec, /`#c8ed66`/);
  assert.match(spec, /5F1011EF2DB7A4725E991D5FB6347F3E589028669F74BC35F273E6E800F11F03/);
});

test("the CSS keyframes and sizes are pinned to the constants", () => {
  const block = loaderCssBlock();
  assert.ok(block.length > 500, "the loader CSS block exists");

  // Stage fade-in after the show delay, over the fade-in length.
  assert.match(block, new RegExp(`animation: app-loader-stage-in ${loader.LOADER_FADE_IN_MS}ms ease ${loader.LOADER_SHOW_DELAY_MS}ms both;`));
  // One beat for the breath and the ring.
  const beatSeconds = `${loader.LOADER_PULSE_PERIOD_MS / 1000}s`;
  assert.match(block, new RegExp(`animation: app-loader-breathe ${beatSeconds} ease-in-out infinite;`));
  assert.match(block, new RegExp(`animation: app-loader-ring ${beatSeconds} ease-out infinite;`));
  // Breath peak, ring growth and opacity.
  assert.match(block, new RegExp(`@keyframes app-loader-breathe \\{[^@]*50% \\{\\s*transform: scale\\(${1 + loader.LOADER_ICON_PULSE_SCALE}\\);`));
  assert.match(block, new RegExp(`0% \\{\\s*transform: scale\\(1\\);\\s*opacity: ${loader.LOADER_RING_PEAK_ALPHA};`));
  assert.match(block, new RegExp(`100% \\{\\s*transform: scale\\(${1 + loader.LOADER_RING_GROWTH}\\);\\s*opacity: 0;`));
  // Reduced motion: still halo.
  assert.match(block, new RegExp(`transform: scale\\(${loader.LOADER_RING_REDUCED_SCALE}\\);\\s*opacity: ${loader.LOADER_RING_REDUCED_ALPHA};`));
  // Icon size and geometry.
  const percent = loader.LOADER_ICON_SIZE_RATIO * 100;
  assert.match(block, new RegExp(`clamp\\(${loader.LOADER_ICON_MIN_PX}px, min\\(${percent}vw, ${percent}vh\\), ${loader.LOADER_ICON_MAX_PX}px\\)`));
  assert.match(block, /border-radius: 22%;/);
  assert.match(block, /border: 2px solid var\(--app-loader-ring\);/);
  // Opaque backdrop from the first paint, the same colour as the manifest background.
  assert.match(block, /background: #07111b;/);
  assert.match(read("src/app/manifest.ts"), /background_color: "#07111b"/);
});

test("the loader has no blur, blend mode or mask, and nothing blocks input", () => {
  const block = loaderCssBlock();
  assert.doesNotMatch(block, /mix-blend-mode|filter:|backdrop-filter|mask-image|blur\(/);
  assert.match(block, /pointer-events: none;/);
  const css = read("src/app/globals.css");
  assert.doesNotMatch(css, /route-loading__|route-loading-(grid|scan|glow|particle)/);
  assert.doesNotMatch(css, /data-route-loading/, "the loader no longer hides app chrome");
});

test("no route arms its own loading timer: loading.tsx files and RouteLoading only register a wait", () => {
  const loadingFiles: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const next = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(next);
      } else if (entry.name === "loading.tsx") {
        loadingFiles.push(next);
      }
    }
  };
  walk(path.join(repoRoot, "src", "app"));
  assert.ok(loadingFiles.length >= 7, "the route loading files are found");
  for (const file of loadingFiles) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /setTimeout|setInterval|useDelayedVisible|useState/, file);
  }

  const routeLoading = read("src/components/RouteLoading.tsx");
  assert.match(routeLoading, /acquireLoaderWait\(/);
  assert.match(routeLoading, /return null;/);
  assert.doesNotMatch(routeLoading, /setTimeout|setInterval|useDelayedVisible|dataset\.routeLoading/);

  const routeLoadingLib = read("src/lib/route-loading.ts");
  assert.doesNotMatch(routeLoadingLib, /LOADING_DELAY_MS|shouldHideRouteLoadingChrome/);
});

test("one host is mounted once in the root layout, before the page, outside every Suspense boundary", () => {
  const layout = read("src/app/layout.tsx");
  assert.equal((layout.match(/<AppLoaderHost \/>/g) ?? []).length, 1);
  assert.ok(layout.indexOf("<AppLoaderHost />") < layout.indexOf("<main"), "the cover is earlier in the document than the page");
  assert.ok(layout.indexOf("<AppLoaderHost />") < layout.indexOf("<Suspense"), "the cover is not inside a Suspense boundary");
  assert.match(layout, /<main id="app-main"/);
});

test("the host markup is server-rendered opaque, accessible and focus-free", () => {
  const host = read("src/components/AppLoaderHost.tsx");
  assert.match(host, /data-state="boot"/);
  assert.match(host, /data-visible="true"/);
  assert.match(host, /aria-hidden="true"/);
  assert.match(host, /role="status"\s+aria-live="polite"/);
  assert.match(host, /aria-busy/);
  assert.doesNotMatch(host, /tabIndex|\.focus\(|autoFocus|inert/);
  assert.match(host, /APP_LOADER_ICON_DATA_URI/);
  assert.match(host, /width=\{APP_LOADER_ICON_PX\}/);
  assert.match(host, /height=\{APP_LOADER_ICON_PX\}/);
  assert.doesNotMatch(host, /setTimeout|setInterval/, "the host is frame-driven, not timer-driven");
});

test("the inline icon is one small data URI derived from the site Fitness app image", () => {
  assert.match(APP_LOADER_ICON_DATA_URI, /^data:image\/webp;base64,/);
  const bytes = Buffer.from(APP_LOADER_ICON_DATA_URI.slice("data:image/webp;base64,".length), "base64");
  assert.equal(bytes.length, APP_LOADER_ICON_BYTES);
  assert.equal(sha256(bytes), APP_LOADER_ICON_SHA256);
  assert.ok(bytes.length < 16 * 1024, "small enough to inline in every document");
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");
  assert.equal(APP_LOADER_ICON_PX, 256);

  // FawxzzyWeb public/apps/fitness/icon.png (catalog key `icon`, slug `fitness`) is byte-identical to this file.
  const source = readFileSync(path.join(repoRoot, "public", "app", "icon-512.png"));
  assert.equal(sha256(source), "5F1011EF2DB7A4725E991D5FB6347F3E589028669F74BC35F273E6E800F11F03");
  assert.equal(APP_LOADER_ICON_SOURCE_SHA256, sha256(source));
});

test("the old 1024 px sigil, its blended loader and its generator target are gone", () => {
  assert.equal(existsSync(path.join(repoRoot, "public", "app", "loader-sigil.png")), false);
  assert.equal(existsSync(path.join(repoRoot, "src", "components", "ui", "FawxzzySigilLoader.tsx")), false);
  assert.doesNotMatch(read("scripts/generate-icons.mjs"), /loader-sigil/);
  const publicApp = path.join(repoRoot, "public", "app");
  for (const entry of readdirSync(publicApp)) {
    const file = path.join(publicApp, entry);
    if (statSync(file).isFile()) {
      assert.ok(statSync(file).size < 120 * 1024, `${entry} stays small`);
    }
  }
});
