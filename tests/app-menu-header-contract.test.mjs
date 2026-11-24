// App menu, header colour, inline offline status, header anchor and dock look
// (docs/design-system/DESIGN-CONTRACT.md section 15.6). Source-level checks with mutation guards: each checker is
// also run against a broken copy of the source to prove it fails.
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

function appMenuProblems(menuSource) {
  const problems = [];
  for (const [pattern, why] of [
    [/aria-expanded=\{open\}/, "button has aria-expanded"],
    [/aria-controls=\{panelId\}/, "button has aria-controls"],
    [/event\.key === "Escape"/, "Escape closes"],
    [/addEventListener\("pointerdown"/, "outside tap closes"],
    [/nextMenuFocusIndex\(/, "keyboard focus uses the shared focus rules (trap)"],
    [/motion-reduce:transition-none/, "reduced motion turns the animation off"],
    [/z-\[115\]/, "panel sits on the documented layer"],
    [/aria-current=\{isActive \? "page" : undefined\}/, "current screen is marked"],
  ]) {
    if (!pattern.test(menuSource)) problems.push(why);
  }
  const tokens = menuSource.slice(menuSource.indexOf("export const appMenuTokens"), menuSource.indexOf("} as const;"));
  if (RAW_COLOUR.test(tokens)) problems.push("raw colour in menu tokens");
  if (/export function AppNav\b|grid-cols-4/.test(menuSource)) problems.push("the old tab bar is back");
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

test("ScreenHeader puts the inline status after the title and the app menu at the end of the title row", () => {
  const header = read("src/components/ui/app/ScreenHeader.tsx");
  assert.match(header, /<h1 className=\{screenHeaderTokens\.title\} title=\{title\}>\{title\}<\/h1>\s*\{status \?\? null\}/);
  const row = header.slice(header.indexOf("screenHeaderTokens.row"));
  assert.ok(row.indexOf("trailingSlot") < row.indexOf("<ScreenHeaderMenuSlot />"), "menu comes after the trailing slot (top right)");
  const tokens = read("src/components/ui/app/headerTokens.ts");
  assert.match(tokens, /row: "flex min-h-11 min-w-0 items-start/, "row is top aligned so the title shares the button line");
});

test("the four tab screens show the app menu; the live workout has Pause instead; the old tab bar is gone", () => {
  for (const path of [
    "src/components/today/TodayScreenFamily.tsx",
    "src/app/routines/page.tsx",
    "src/app/settings/page.tsx",
    "src/components/history/HistoryRouteScaffold.tsx",
  ]) {
    assert.match(read(path), /headerMenu=\{(?:showTopChrome \? )?<AppMenu \/>/, path);
  }
  // Zac 2026-11-23: the in-progress workout has no app menu; Pause (top right) returns to Today and Finish ends it.
  for (const path of ["src/components/SessionPageClient.tsx", "src/app/session/[id]/SessionOfflineShell.tsx"]) {
    assert.doesNotMatch(read(path), /headerMenu=|<AppMenu\b/, path + ": no app menu on the live workout");
  }
  const offenders = listSourceFiles("src").filter((path) => /<AppNav\b|topChrome=\{<AppNav/.test(read(path)));
  assert.deepEqual(offenders, []);
});

test("the app menu is accessible, animated within the motion rules and token-only", () => {
  const menu = read("src/components/AppNav.tsx");
  assert.deepEqual(appMenuProblems(menu), []);
  // Mutation guards.
  assert.notDeepEqual(appMenuProblems(menu.replaceAll('event.key === "Escape"', 'event.key === "Esc"')), []);
  assert.notDeepEqual(appMenuProblems(menu.replace("aria-expanded={open}", "")), []);
  assert.notDeepEqual(appMenuProblems(menu.replace("bg-[rgb(var(--accent)/0.13)]", "bg-emerald-500/20")), []);
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
  assert.match(contract, /toasts 110 < app menu panel 115/);
  assert.doesNotMatch(contract, /--app-header-menu-bottom|--app-header-height/);
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

// Review fix (PR #293): React context passes through portals, so an automatic menu slot put a second app menu on
// every sheet header opened over a menu screen (the exercise info sheet on Today, the live workout and History).
// The menu is opt-in: only these screen-level headers pass `appMenu`.
const APP_MENU_HEADERS = new Set([
  "src/app/today/TodayDayPicker.tsx",
  "src/app/today/page.tsx",
  "src/app/routines/page.tsx",
  "src/components/settings/SettingsFloatingHeader.tsx",
  "src/components/history/HistoryRouteScaffold.tsx",
  "src/components/SessionHeaderControls.tsx",
  "src/app/dev/mobile-regression/DevMobileRegressionRoute.tsx",
]);

// The header itself and its menu slot define the prop; they are not call sites.
const HEADER_DEFINITION_FILES = new Set(["src/components/ui/app/ScreenHeader.tsx", "src/components/ui/app/ScreenHeaderMenu.tsx"]);

function appMenuOptInProblems(files) {
  const problems = [];
  for (const [path, source] of files) {
    if (HEADER_DEFINITION_FILES.has(path)) continue;
    // Any `appMenu` in a file that renders a ScreenHeader counts (props may contain `=>`, so no JSX parsing here).
    const optsIn = /\bappMenu\b/.test(source);
    if (optsIn && !APP_MENU_HEADERS.has(path)) problems.push(`${path}: only screen-level headers opt in to the app menu`);
  }
  return problems;
}

function screenHeaderSlotProblems(headerSource) {
  const problems = [];
  if (!/\{appMenu \? <ScreenHeaderMenuSlot \/> : null\}/.test(headerSource)) problems.push("menu slot is not gated on appMenu");
  if (/appMenu = true/.test(headerSource)) problems.push("appMenu defaults to on");
  // The anchor is the menu button slot (ScreenHeaderMenuSlot), not the whole row: the row also holds the subtitle.
  if (/data-app-notice-anchor/.test(headerSource)) problems.push("the header row must not be the notice anchor (the menu slot is)");
  return problems;
}

test("the app menu is opt-in: only screen-level headers render it, never a sheet or dialog header", () => {
  const files = listSourceFiles("src").map((path) => [path.replaceAll("\\", "/"), read(path)]).filter(([, s]) => s.includes("<ScreenHeader"));
  assert.deepEqual(appMenuOptInProblems(files), []);
  for (const path of ["src/app/today/TodayDayPicker.tsx", "src/app/routines/page.tsx", "src/components/settings/SettingsFloatingHeader.tsx", "src/components/history/HistoryRouteScaffold.tsx"]) {
    assert.match(read(path), /<ScreenHeader\b[^>]*?\sappMenu\b/s, `${path} opts in`);
  }
  assert.doesNotMatch(read("src/components/SessionHeaderControls.tsx"), /\bappMenu\b/, "the live workout header never opts in (Pause sits there)");
  const sheet = read("src/components/ExerciseInfoSheet.tsx");
  assert.doesNotMatch(sheet, /\bappMenu\b/, "the exercise info sheet header never opts in");
  const header = read("src/components/ui/app/ScreenHeader.tsx");
  assert.deepEqual(screenHeaderSlotProblems(header), []);
  // Mutation guards.
  assert.notDeepEqual(appMenuOptInProblems([["src/components/ExerciseInfoSheet.tsx", '<ScreenHeader\n  kind="detail"\n  appMenu\n  title="x" />']]), []);
  assert.notDeepEqual(screenHeaderSlotProblems(header.replace("{appMenu ? <ScreenHeaderMenuSlot /> : null}", "<ScreenHeaderMenuSlot />")), []);
  assert.notDeepEqual(screenHeaderSlotProblems(header.replace("appMenu = false", "appMenu = true")), []);
});

test("notice anchor: the header menu button slot carries data-app-notice-anchor (PR #294 contract)", () => {
  // PR #294 (src/lib/app-notice-anchor.ts) reads `[data-app-notice-anchor]` inside the shell and puts notices 8px under
  // it. Review fix (PR #293): the marker sits on the 44x44 menu slot, so notices land under the button, not under the
  // subtitle line that hangs below the title in the same row. One slot serves the ScreenHeader and the menu-only row.
  const slot = read("src/components/ui/app/ScreenHeaderMenu.tsx");
  assert.match(slot, /<div className=\{screenHeaderTokens\.menuSlot\} data-screen-header-menu="true" data-app-notice-anchor="">/);
  const header = read("src/components/ui/app/ScreenHeader.tsx");
  assert.doesNotMatch(header, /data-app-notice-anchor/);
  const shell = read("src/components/shared/mobile-shell/MobileScreenShell.tsx");
  assert.doesNotMatch(shell, /data-app-notice-anchor/, "the menu-only row is not a second anchor; its slot is");
  assert.match(shell, /cn\(screenHeaderTokens\.row, "justify-end"\)\}>\s*<ScreenHeaderMenuSlot \/>/);
});

// Review fix (PR #293): a z-index only counts inside its stacking context. `<main>` (layout.tsx, `relative z-10`)
// capped the in-header panel below the body-level toasts (z 110), so toasts painted over the open menu (seen in real
// Chrome). The panel is portaled to <body> and placed with `fixed`.
function panelLayerProblems(menuSource) {
  const problems = [];
  if (!/\{portalTarget \? createPortal\(panel, portalTarget\) : panel\}/.test(menuSource)) problems.push("menu panel is not portaled to <body>");
  if (!/setPortalTarget\(document\.body\)/.test(menuSource)) problems.push("portal target is not <body>");
  if (!/panel:\s*"fixed z-\[115\] /.test(menuSource)) problems.push("panel is not fixed on layer 115");
  if (!/panelRef\.current\?\.contains\(event\.target\)/.test(menuSource)) problems.push("a tap on the portaled panel would close the menu");
  return problems;
}

test("layers: the open menu panel sits above toasts (110) and below sheets (120)", () => {
  const menu = read("src/components/AppNav.tsx");
  assert.deepEqual(panelLayerProblems(menu), []);
  // Mutation guards.
  assert.notDeepEqual(panelLayerProblems(menu.replace("{portalTarget ? createPortal(panel, portalTarget) : panel}", "{panel}")), []);
  assert.notDeepEqual(panelLayerProblems(menu.replace('"fixed z-[115] ', '"absolute right-0 top-[calc(100%+4px)] z-[115] ')), []);
  assert.notDeepEqual(panelLayerProblems(menu.replace(" || panelRef.current?.contains(event.target)", "")), []);
  const toasts = read("src/components/ui/ToastProvider.tsx");
  assert.match(toasts, /z-\[110\]/, "toasts stay at 110");
  const layout = read("src/app/layout.tsx");
  assert.match(layout, /<main id="app-main" className="[^"]*\brelative z-10\b/, "main is the stacking context the portal escapes");
  const contract = read("docs/design-system/DESIGN-CONTRACT.md");
  assert.match(contract, /the app menu panel is portaled to `<body>`/);
});

function destinationSourceProblems(menuSource) {
  const problems = [];
  if (!/APP_MENU_DESTINATIONS\.map\(/.test(menuSource)) problems.push("menu rows are not built from APP_MENU_DESTINATIONS");
  if (/\bhref: "\/(?:today|routines|history|settings)"/.test(menuSource)) problems.push("AppNav keeps its own destination list");
  if (/\blabel: "(?:Today|Routines|History|Settings)"/.test(menuSource)) problems.push("AppNav keeps its own labels");
  return problems;
}

test("one destination list: AppNav builds its rows from APP_MENU_DESTINATIONS", () => {
  const menu = read("src/components/AppNav.tsx");
  assert.deepEqual(destinationSourceProblems(menu), []);
  assert.notDeepEqual(destinationSourceProblems(menu.replace("APP_MENU_DESTINATIONS.map(", "LOCAL_LINKS.map(")), []);
  assert.notDeepEqual(destinationSourceProblems(`${menu}\nconst extra = [{ href: "/today", label: "Today" }];`), []);
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
