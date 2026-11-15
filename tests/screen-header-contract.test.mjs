// Screen header contract (docs/design-system/DESIGN-CONTRACT.md section 15).
// Source-level checks: one ScreenHeader, the tab family on it, Account opens the portal,
// Sign out in the Settings body, no dock toggles or info rails in the tab headers.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
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

test("ScreenHeader has two kinds, a left-aligned single-line h1, and no centred option or hairline", () => {
  const header = read("src/components/ui/app/ScreenHeader.tsx");
  assert.match(header, /ScreenHeaderKind = "tab" \| "detail";/);
  assert.match(header, /<h1 className=\{screenHeaderTokens\.title\} title=\{title\}>/);
  const headerCode = header.replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(headerCode, /text-center|justify-center|align\??:|centered|eyebrow|kicker/i);

  const tokens = read("src/components/ui/app/headerTokens.ts");
  const block = tokens.slice(tokens.indexOf("export const screenHeaderTokens"));
  assert.match(block, /title: "truncate /, "the title truncates to one line");
  const tokenCode = block.slice(0, block.indexOf("} as const;")).replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(tokenCode, /border|shadow|text-center/, "no hairline, glow or centring");
});

test("the four tab screens render the standard tab header", () => {
  const cases = [
    ["src/app/today/page.tsx", /<ScreenHeader\s+kind="tab"\s+title="Today"/],
    ["src/app/today/TodayDayPicker.tsx", /<ScreenHeader\s+kind="tab"\s+title="Today"/],
    ["src/app/routines/page.tsx", /<ScreenHeader kind="tab" title="Routines"/],
    ["src/components/history/HistoryRouteScaffold.tsx", /<ScreenHeader\s+kind="tab"\s+title="History"/],
    ["src/components/settings/SettingsFloatingHeader.tsx", /<ScreenHeader kind="tab" title="Settings" \/>/],
  ];
  for (const [path, pattern] of cases) {
    assert.match(read(path), pattern, path);
  }
});

test("the header title style lives only in the header component and its tokens", () => {
  const allowed = new Set([
    join("src", "components", "ui", "app", "ScreenHeader.tsx"),
    join("src", "components", "ui", "app", "headerTokens.ts"),
  ]);
  const offenders = listSourceFiles("src")
    .filter((path) => !allowed.has(path))
    .filter((path) => /screenHeaderTokens\.title|text-\[1\.375rem\]/.test(read(path)));
  assert.deepEqual(offenders.map((path) => relative(root, join(root, path)).split(sep).join("/")), []);
});

test("Today's header is one subtitle line, with no info rail, pipes or status chip", () => {
  for (const path of ["src/app/today/page.tsx", "src/app/today/TodayDayPicker.tsx"]) {
    const source = read(path);
    assert.doesNotMatch(source, /HeaderInfoRail|buildTodayHeaderInfoRailItems|TodayOverviewHeader|RoutineDayCardTitle/, path);
    assert.match(source, /formatTodayHeaderSubtitle\(/, path);
  }
});

test("tabs are Today / Routines / History / Settings and never leave the app", () => {
  const nav = read("src/components/AppNav.tsx");
  const labels = [...nav.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(labels, ["Today", "Routines", "History", "Settings"]);
  assert.doesNotMatch(nav, /href: "\/account"|account\.fawxzzy\.com|getFitnessAccountPortalUrl/);
});

test("the Settings Account row opens the shared account portal; Sign out sits in the body", () => {
  const sections = read("src/components/settings/SettingsSectionsClient.tsx");
  assert.match(sections, /getFitnessAccountPortalUrl\("\/account", "\/settings"\)/);
  assert.doesNotMatch(sections, /href="\/account"|getAccountRouteHref/);
  assert.match(sections, /<SignOutButton placement="body" \/>/);

  const settingsPage = read("src/app/settings/page.tsx");
  assert.doesNotMatch(settingsPage, /<SignOutButton(?![^>]*placement="body")/, "no Sign out in the dock");
});

test("History uses one segmented control and the header density toggle, not a dock of view buttons", () => {
  const scaffold = read("src/components/history/HistoryRouteScaffold.tsx");
  assert.match(scaffold, /<HistoryTabs\s/);
  for (const path of ["src/app/history/HistorySessionsClient.tsx", "src/app/history/exercises/ExerciseBrowserClient.tsx"]) {
    const source = read(path);
    assert.doesNotMatch(source, /View Exercises|View History|PublishBottomActions/, path);
    assert.match(source, /<HistoryHeaderDensityToggle/, path);
  }
});

test("the in-app /account route and its form stay reachable by direct visit", () => {
  assert.match(read("src/app/account/page.tsx"), /export default/);
  assert.match(read("src/components/settings/AccountSettingsForm.tsx"), /export /);
});
