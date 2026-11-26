// Bottom tab bar, header colour, inline offline status, header anchor and dock look
// (docs/design-system/DESIGN-CONTRACT.md section 15.6, docs/mobile-shell-contract.md "Bottom tab bar"). Source-level
// checks with mutation guards: each checker is also run against a broken copy of the source to prove it fails.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

function listSourceFiles(dir) {
  const out = [];
  for (const name of readdirSync(join(root, dir))) {
    const path = join(dir, name);
    if (statSync(join(root, path)).isDirectory()) {
      out.push(...listSourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d|\b(?:emerald|green|lime|teal)-\d{2,3}\b/;

// Returns a list of problems; empty means the source follows the contract.
function headerTokenProblems(tokensSource) {
  const problems = [];
  const block = tokensSource.slice(tokensSource.indexOf("export const screenHeaderTokens"));
  const title = block.match(/title: "([^"]+)"/)?.[1] ?? "";
  if (!title.includes("text-[rgb(var(--accent))]")) problems.push("title is not the accent token");
  if (/text-\[rgb\(var\(--text-primary\)\)\]/.test(title)) problems.push("title still uses the primary text colour");
  const code = block.slice(0, block.indexOf("} as const;")).replace(/^\s*\/\/.*$/gm, "");
  if (RAW_COLOUR.test(code)) problems.push("raw colour in header tokens");
  return problems;
}

function tabBarProblems(barSource) {
  const problems = [];
  for (const [pattern, why] of [
    [/<nav aria-label="Sections" data-app-tab-bar=""/, "bar is a labelled nav carrying the layout hook"],
    [/aria-current=\{isActive && !pendingHref \? "page" : undefined\}/, "current tab is marked"],
    [/resolveAppTabBarVisibility\(/, "visibility comes from the one rule function"],
    [/APP_TAB_DESTINATIONS\.map\(/, "tabs are built from the one destination list"],
    [/if \(!visible\) \{\s*return null;/, "hidden means no node (the body:has rule switches off with it)"],
    [/pb-\[env\(safe-area-inset-bottom,0px\)\]/, "bar carries the home-indicator inset"],
    [/\bh-14\b/, "tabs are 56px tall (44px floor)"],
    [/motion-reduce:transition-none/, "reduced motion turns the transition off"],
  ]) {
    if (!pattern.test(barSource)) problems.push(why);
  }
  const tokens = barSource.slice(barSource.indexOf("export const appTabBarTokens"), barSource.indexOf("} as const;"));
  if (RAW_COLOUR.test(tokens)) problems.push("raw colour in tab bar tokens");
  if (/\bhref: "\/(?:today|routines|history|settings)"/.test(barSource)) problems.push("AppTabBar keeps its own destination list");
  if (/\b(?:fixed|absolute)\b[^"]*\bbottom-0\b/.test(tokens)) problems.push("bar is an overlay; it must stay in flow after <main>");
  return problems;
}

function bodyOfflinePillProblems(files) {
  return files
    .filter(([, source]) => /<OfflineSyncBadge\b(?![^>]*variant="header")[^>]*\/>/.test(source))
    .map(([path]) => `${path}: offline state rendered as a body pill instead of inline on the title line`);
}

// The flat look is scoped to the screen dock (`[data-app-bottom-dock]` on MobileScreenShell) so card action rows,
// timers and sheets that reuse `.bottom-action` keep their own look.
const DOCK = "[data-app-bottom-dock] ";

function dockProblems(css) {
  const problems = [];
  const blockOf = (selector) => {
    // Rule at line start only, so an unrelated scoped copy (`body:has(...) .bottom-action {`) never matches.
    const found = css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    if (!found) return "";
    const start = found.index;
    return css.slice(start, css.indexOf("\n}", start + 1));
  };
  for (const selector of [".bottom-action {", ".bottom-action--primary {", ".bottom-action--secondary {", '.bottom-action[data-bottom-action-intent="toggleActive"] {'].map((s) => DOCK + s)) {
    const block = blockOf(selector);
    if (!block) problems.push(`${selector} missing`);
    if (/linear-gradient/.test(block)) problems.push(`${selector} has a gloss gradient`);
    if (/rgb\(0 0 0|rgb\(255 255 255/.test(block)) problems.push(`${selector} uses a raw black/white instead of a token`);
  }
  if (!/--bottom-action-shadow: none;/.test(blockOf(DOCK + ".bottom-action {"))) problems.push("dock buttons still cast a shadow");
  if (!/background: none;/.test(blockOf(DOCK + ".bottom-action::before {"))) problems.push("dock buttons still have the top gloss");
  if (!/outline: 2px solid rgb\(var\(--accent\)/.test(blockOf(DOCK + ".bottom-action:focus-visible {"))) {
    problems.push("dock focus ring is not the 2px accent ring");
  }
  return problems;
}

test("header titles use the app accent on every screen, from tokens only", () => {
  const tokens = read("src/components/ui/app/headerTokens.ts");
  assert.deepEqual(headerTokenProblems(tokens), []);
  // Mutation guards.
  assert.notDeepEqual(headerTokenProblems(tokens.replace("text-[rgb(var(--accent))]", "text-[rgb(var(--text-primary))]")), []);
  assert.notDeepEqual(headerTokenProblems(tokens.replace("text-[rgb(var(--accent))]", "text-[#20974e]")), []);
});

test("ScreenHeader puts the inline status after the title and holds no navigation", () => {
  const header = read("src/components/ui/app/ScreenHeader.tsx");
  assert.match(header, /<h1 className=\{screenHeaderTokens\.title\} title=\{title\}>\{title\}<\/h1>\s*\{status \?\? null\}/);
  assert.doesNotMatch(header, /\bappMenu\b|ScreenHeaderMenu|data-app-notice-anchor/);
  const tokens = read("src/components/ui/app/headerTokens.ts");
  assert.match(tokens, /row: "flex min-h-11 min-w-0 items-start/, "row is top aligned so the title shares the button line");
});

test("one bottom tab bar in the root layout after <main>; the hamburger and every header menu are gone", () => {
  const layout = read("src/app/layout.tsx");
  assert.match(layout, /<\/main>\s*\{\/\*[^]*?\*\/\}\s*<AppTabBar \/>/, "the bar is the in-flow sibling right after <main>");
  assert.equal((layout.match(/<AppTabBar\b/g) ?? []).length, 1, "mounted once");
  const css = read("src/app/globals.css");
  assert.match(css, /body:has\(> \[data-app-tab-bar\]\) #app-main \{\s*--app-dock-safe-padding-bottom: 2px;/, "docks above the bar drop their own safe-area padding");
  for (const path of ["src/components/AppNav.tsx", "src/lib/app-menu.ts", "src/components/ui/app/ScreenHeaderMenu.tsx"]) {
    assert.equal(existsSync(join(root, path)), false, `${path} is deleted`);
  }
  const offenders = listSourceFiles("src").filter((path) => /<AppMenu\b|<AppNav\b|headerMenu=|\bappMenu\b|ScreenHeaderMenu/.test(read(path)));
  assert.deepEqual(offenders, []);
  // Zac 2026-11-23: the live workout owns the screen (Pause top right, Finish in the dock); the bar is hidden there.
  assert.match(read("src/lib/app-tabs.ts"), /if \(section === "session"\) return "workout";/);
});

test("the tab bar is accessible, built from the shared rules and token-only", () => {
  const bar = read("src/components/AppTabBar.tsx");
  assert.deepEqual(tabBarProblems(bar), []);
  // Mutation guards.
  assert.notDeepEqual(tabBarProblems(bar.replace('aria-label="Sections" ', "")), []);
  assert.notDeepEqual(tabBarProblems(bar.replace("text-[rgb(var(--accent))]", "text-emerald-400")), []);
  assert.notDeepEqual(tabBarProblems(bar.replace("APP_TAB_DESTINATIONS.map(", "LOCAL_TABS.map(")), []);
  assert.notDeepEqual(tabBarProblems(`${bar}\nconst extra = [{ href: "/today", label: "Today" }];`), []);
  assert.notDeepEqual(tabBarProblems(bar.replace('"relative z-10 flex-none', '"fixed inset-x-0 bottom-0 z-10 flex-none')), []);
});

test("the offline state is inline on the header title line, never a body pill", () => {
  const files = listSourceFiles("src")
    .filter((path) => !path.endsWith("OfflineSyncBadge.tsx"))
    .map((path) => [path, read(path)])
    .filter(([, source]) => source.includes("<OfflineSyncBadge"));
  assert.ok(files.length >= 5, "Today, Routines, History and the live workout all show the inline status");
  assert.deepEqual(bodyOfflinePillProblems(files), []);
  // Mutation guard: a body pill like the old Today one is caught.
  assert.notDeepEqual(bodyOfflinePillProblems([["mutant.tsx", "<div><OfflineSyncBadge userId={user.id} /></div>"]]), []);

  const badge = read("src/components/OfflineSyncBadge.tsx");
  assert.match(badge, /variant === "header"/);
  assert.match(badge, /<span aria-hidden="true">– <\/span>/, "the dash is decorative; screen readers hear only the status");
  assert.match(badge, /role="status"/);
});

test("notices have one header anchor: --app-notice-top (PR #294), no second set of header variables", () => {
  // Review fix (PR #293): `--app-header-height` / `--app-header-menu-bottom` duplicated PR #294's anchor and nothing
  // read them. They are gone; the toast stack reads only `--app-notice-top`.
  const css = read("src/app/globals.css");
  assert.doesNotMatch(css, /--app-header-height|--app-header-menu-bottom/);
  const shell = read("src/components/shared/mobile-shell/MobileScreenShell.tsx");
  assert.doesNotMatch(shell, /appHeaderMetrics|syncAppHeaderMetrics/);
  assert.match(shell, /useAppNoticeAnchor\(/);
  assert.match(shell, /ref=\{floatingHeaderRef\}\s*data-app-header="true"/);
  assert.equal(existsSync(join(root, "src/components/shared/mobile-shell/appHeaderMetrics.ts")), false);
  const contract = read("docs/design-system/DESIGN-CONTRACT.md");
  assert.match(contract, /toasts 110 < sheets and modals 120/);
  assert.doesNotMatch(contract, /--app-header-menu-bottom|--app-header-height/);
});

test("notice anchor: no header menu slot any more; the Pause pill or the floating header anchors notices", () => {
  const shell = read("src/components/shared/mobile-shell/MobileScreenShell.tsx");
  // The shell renders no anchor element of its own (the old menu-only row's slot is gone); it only falls back.
  assert.doesNotMatch(shell, /APP_NOTICE_ANCHOR_ATTRIBUTE|data-app-notice-anchor=/);
  assert.match(shell, /useAppNoticeAnchor\(\{ shellRef, topChromeRef, floatingHeaderRef/);
  assert.match(read("src/components/SessionHeaderControls.tsx"), /APP_NOTICE_ANCHOR_ATTRIBUTE/);
});

test("layers: the bar is in flow, not a layer; toasts stay at 110 under sheets", () => {
  const toasts = read("src/components/ui/ToastProvider.tsx");
  assert.match(toasts, /z-\[110\]/, "toasts stay at 110");
  const layout = read("src/app/layout.tsx");
  assert.match(layout, /<main id="app-main" className="[^"]*\brelative z-10\b/);
  const contract = read("docs/design-system/DESIGN-CONTRACT.md");
  assert.match(contract, /The bottom tab bar is not a layer: it is in flow after `<main>`/);
});

test("dock buttons are flat: no gloss gradient, no drop shadow, token colours", () => {
  const css = read("src/app/globals.css");
  assert.deepEqual(dockProblems(css), []);
  const shell = read("src/components/shared/mobile-shell/MobileScreenShell.tsx");
  assert.match(shell, /ref=\{dockRef\}\s*data-app-bottom-dock=""/, "the screen dock carries the scope attribute");
  // 2026-11-23: rgba(var(--bg-app),a) is invalid CSS (the token is space-separated), so the dock had no background and
  // card text showed through it on Safari, which skips the blur. The dock cover must use the valid "/ alpha" syntax.
  const dockLayer = shell.slice(shell.indexOf('data-app-bottom-dock=""'), shell.indexOf("{bottomDock ?"));
  assert.match(dockLayer, /bg-\[linear-gradient\(180deg,rgb\(var\(--bg-app\)\/0\.9\)_0%,rgb\(var\(--bg-app\)\)_16%/);
  assert.doesNotMatch(dockLayer, /rgba\(var\(--bg-app\),/);
  // Mutation guards.
  assert.notDeepEqual(dockProblems(css.replaceAll(DOCK, "")), [], "unscoped rules do not count");
  assert.notDeepEqual(dockProblems(css.replace("--bottom-action-shadow: none;", "--bottom-action-shadow: 0 8px 18px rgb(0 0 0 / 0.16);")), []);
  assert.notDeepEqual(
    dockProblems(css.replace(DOCK + ".bottom-action--primary {", DOCK + ".bottom-action--primary {\n  background: linear-gradient(180deg, red, blue);")),
    [],
  );
});

function statusTokenProblems(tokensSource) {
  const problems = [];
  const status = tokensSource.match(/status: "([^"]+)"/)?.[1] ?? "";
  const title = tokensSource.match(/\btitle: "([^"]+)"/)?.[1] ?? "";
  if (/\bshrink-0\b/.test(status)) problems.push("status cannot shrink");
  if (!/\btruncate\b/.test(status) || !/\bmin-w-0\b/.test(status)) problems.push("status does not end in an ellipsis");
  if (!/\bshrink-0\b/.test(title) || !/\bmax-w-full\b/.test(title)) problems.push("title does not win the line over the status");
  return problems;
}

test("narrow phones: the inline status shrinks before the title does", () => {
  const tokens = read("src/components/ui/app/headerTokens.ts");
  assert.deepEqual(statusTokenProblems(tokens), []);
  assert.notDeepEqual(statusTokenProblems(tokens.replace('status: "min-w-0 truncate', 'status: "shrink-0 whitespace-nowrap')), []);
  assert.notDeepEqual(statusTokenProblems(tokens.replace('title: "max-w-full shrink-0 truncate', 'title: "truncate')), []);
});
