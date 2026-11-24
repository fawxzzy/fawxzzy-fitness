import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard, SkeletonList, SkeletonRow } from "@/components/ui/Skeleton";

// App-wide states (F1): loading boundaries, retired routes, the invalid-colour sweep, the Skeleton / EmptyState
// foundation, the 44px auth link rows. Source scans use the repo root as cwd (every test script runs from it).
const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const APP = join(SRC, "app");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

const posix = (path: string) => relative(APP, path).split(sep).join("/");
const read = (path: string) => readFileSync(path, "utf8");

test("every route page has a loading boundary at or above its segment, and every loading.tsx only registers a wait", () => {
  const files = walk(APP).map(posix);
  const loadingDirs = new Set(files.filter((f) => /(^|\/)loading\.tsx$/.test(f)).map((f) => f.replace(/\/?loading\.tsx$/, "")));
  assert.ok(loadingDirs.has(""), "the root app/loading.tsx exists");

  const pages = files.filter((f) => /(^|\/)page\.tsx$/.test(f) && !f.startsWith("dev/"));
  assert.ok(pages.length > 20, "found the route pages");
  for (const page of pages) {
    const segments = page.split("/").slice(0, -1);
    let covered = false;
    for (let depth = segments.length; depth >= 0; depth -= 1) {
      if (loadingDirs.has(segments.slice(0, depth).join("/"))) {
        covered = true;
        break;
      }
    }
    assert.ok(covered, `${page} has a loading boundary`);
  }

  for (const dir of loadingDirs) {
    const source = read(join(APP, dir, "loading.tsx"));
    assert.match(source, /RouteLoading|RouteTabLoading/, `${dir || "app"}/loading.tsx registers the single app loader wait`);
    assert.doesNotMatch(source, /animate-pulse|SkeletonCard|className=/, `${dir || "app"}/loading.tsx draws nothing of its own (the one loader host draws)`);
  }
});

test("retired routes redirect instead of rendering or 404ing", () => {
  const optional = read(join(APP, "review", "optional-planned-day", "page.tsx"));
  assert.match(optional, /redirect\("\/routines"\)/);
  assert.doesNotMatch(optional, /RoutineDayKindReviewPanel|ScreenHeader/);

  const exercise = read(join(APP, "exercises", "[exerciseId]", "page.tsx"));
  assert.match(exercise, /redirect\(returnHref\)/);
  assert.match(exercise, /isSafeAppPath/);
  assert.match(exercise, /"\/history\/exercises"/);
});

test("no rgba(var(--token), a) anywhere: the app tokens are space-separated triplets, so that form is invalid CSS", () => {
  const invalid = new RegExp("rgba\\(var\\(--");
  const offenders = walk(SRC)
    .filter((file) => /\.(tsx?|css)$/.test(file))
    .filter((file) => !file.endsWith("appStates.contract.test.tsx"))
    .filter((file) => invalid.test(read(file)))
    .map((file) => relative(ROOT, file));
  assert.deepEqual(offenders, [], "use rgb(var(--token)/alpha)");
});

// An undefined custom property inside rgb(var(--x)/a) makes the whole declaration invalid, so the surface draws nothing
// (the same silent failure as the comma form). Known offenders that predate F1 are listed so the scan can only shrink;
// fixing one means removing its entry (a fix changes how that surface looks, so each needs its own capture pass).
const KNOWN_UNDEFINED_TOKENS = new Set([
  "--surface-2-soft@src/app/dev/mobile-regression/EditDayRegressionSurface.tsx",
  "--surface-2-soft@src/components/stretch/StretchLibraryPanel.tsx",
  "--surface-2-soft@src/components/ui/PickerListViewport.tsx",
  "--surface-3@src/components/stretch/StretchLibraryPanel.tsx",
  "--accent-warning@src/app/dev/progression-audit/page.tsx",
  "--accent-warning@src/app/dev/progression-scenarios/page.tsx",
  "--accent-rgb@src/app/dev/progression-scenarios/page.tsx",
  "--border-rgb@src/components/ExerciseInfoSheet.tsx",
  "--border-rgb@src/components/history/ProgressionHistoryCharts.tsx",
  "--surface-0-rgb@src/components/session/sessionLoggerModel.tsx",
  "--surface-0-rgb@src/features/curated-onboarding/components/QuestionnaireStep.tsx",
]);

test("no new rgb(var(--token)/a) reads a custom property that nothing defines", () => {
  const files = walk(SRC).filter((file) => /\.(tsx?|css)$/.test(file) && !/\.test\.tsx?$/.test(file));
  const defined = new Set<string>();
  for (const file of files) {
    const source = read(file);
    for (const match of source.matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(match[1]);
    for (const match of source.matchAll(/["'](--[a-z0-9-]+)["']\s*:/gi)) defined.add(match[1]);
    for (const match of source.matchAll(/\[(--[a-z0-9-]+):/gi)) defined.add(match[1]);
  }
  assert.ok(defined.size > 100, "found the token definitions");
  assert.ok(defined.has("--surface-2") && defined.has("--bg-app"));

  const offenders: string[] = [];
  for (const file of files) {
    const source = read(file);
    for (const match of source.matchAll(/rgb\(var\((--[a-z0-9-]+)\)\s*\//gi)) {
      const key = `${match[1]}@${relative(ROOT, file).split(sep).join("/")}`;
      if (!defined.has(match[1]) && !KNOWN_UNDEFINED_TOKENS.has(key) && !offenders.includes(key)) offenders.push(key);
    }
  }
  assert.deepEqual(offenders, [], "define the token or use an existing one (--surface-2, --surface-3-rgb, --border ...)");
});

test("the shared exercise title never defaults to the word Target, and no live component shows the Title Case heading", () => {
  const source = read(join(SRC, "components", "workout", "ExerciseCardStandardTitle.tsx"));
  assert.match(source, /rightTitle = null,/);
  assert.doesNotMatch(source, /Current Target/);
});

test("Skeleton blocks pulse, stop under reduced motion, and are decorative; the list owns the status role", () => {
  const row = renderToStaticMarkup(createElement(SkeletonRow));
  assert.match(row, /animate-pulse/);
  assert.match(row, /motion-reduce:animate-none/);
  assert.match(row, /aria-hidden="true"/);

  const card = renderToStaticMarkup(createElement(SkeletonCard));
  assert.equal((card.match(/animate-pulse/g) ?? []).length, 1, "the card pulses as one block");
  assert.match(card, /motion-reduce:animate-none/);

  const list = renderToStaticMarkup(createElement(SkeletonList, { label: "Loading routines", count: 3, "data-test": "x" }));
  assert.match(list, /role="status"/);
  assert.match(list, /aria-label="Loading routines"/);
  assert.match(list, /aria-busy="true"/);
  assert.match(list, /data-test="x"/);
  assert.equal((list.match(/animate-pulse/g) ?? []).length, 3);
});

test("History scope loaders use the shared SkeletonRow", () => {
  for (const file of ["history/HistorySessionsClient.tsx", "history/exercises/ExerciseBrowserClient.tsx"]) {
    const source = read(join(APP, file));
    assert.match(source, /<SkeletonRow key=\{index\} \/>/, file);
    assert.doesNotMatch(source, /animate-pulse/, `${file} has no hand-rolled pulse block`);
  }
});

test("EmptyState is the card-system empty card: dashed surface, heading, plain body, optional action", () => {
  const html = renderToStaticMarkup(
    createElement(EmptyState, { title: "No routines yet", body: "Create a routine to get started.", action: createElement("a", { href: "/routines/new" }, "Create routine") }),
  );
  assert.match(html, /data-card-empty="true"/);
  assert.match(html, /<h2[^>]*>No routines yet<\/h2>/);
  assert.match(html, /Create a routine to get started\./);
  assert.match(html, /href="\/routines\/new"/);
  assert.doesNotMatch(html, /danger|red|Target/);
});

test("the in-app error card is a card with the one primary AppButton, not a hand-built button", () => {
  const soft = read(join(SRC, "components", "error", "AppSoftErrorBoundary.tsx"));
  assert.match(soft, /<AppButton\b[^>]*variant="primary"/);
  assert.match(soft, /<CardSurface\b/);
  assert.doesNotMatch(soft, /getAppButtonClassName|SurfaceCard/);
});

test("auth link rows are real 44px boxes: nothing extends past its row, so neighbouring rows cannot overlap", () => {
  const css = read(join(APP, "globals.css"));
  const rule = css.match(/\.fx-link,\s*\.fx-legal a \{([^}]*)\}/);
  assert.ok(rule, "the shared link box rule exists");
  assert.match(rule[1], /display: inline-flex;/);
  assert.match(rule[1], /min-height: 44px;/);
  assert.match(rule[1], /min-width: 44px;/);
  // The invisible ::after that reached 11px past a 24px / 20px line (and overlapped the row below) is gone for links.
  assert.doesNotMatch(css, /\.fx-link::after/);
  assert.doesNotMatch(css, /\.fx-legal a::after/);
  assert.match(css, /\.fx-links \{[^}]*min-height: 44px;/);
  assert.match(css, /\.fx-legal \{[^}]*min-height: 44px;/);
});
