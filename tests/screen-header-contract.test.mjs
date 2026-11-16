// Screen header contract (docs/design-system/DESIGN-CONTRACT.md section 15).
// Source-level checks: one ScreenHeader, the tab and detail families on it, no raw <h1> screen titles
// outside it, Account opens the portal, Sign out in the Settings body, no dock toggles or info rails.
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
  assert.doesNotMatch(tokenCode, /border(?!-0)|shadow|text-center/, "no hairline, glow or centring");
  assert.match(tokenCode, /iconAction:\s*"[^"]*!border-0 !bg-transparent/, "the icon action opts out of the global button ring");
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

test("the in-app /account route stays reachable by direct visit as a read-only screen (no edit form)", () => {
  assert.match(read("src/app/account/page.tsx"), /export default/);
  assert.doesNotMatch(read("src/components/account/AccountScreen.tsx"), /<form|AccountSettingsForm|AccountPasswordSection/);
});

// A screen title is an <h1>. Only ScreenHeader may render one; anything else is a second, hand-styled header.
const RAW_H1_PATTERN = /<h1\b|\bas="h1"|\btitleAs\s*=\s*"h1"/;
const toPosix = (path) => path.split(sep).join("/");
const RAW_H1_ALLOWED = new Map([
  ["src/components/ui/app/ScreenHeader.tsx", "the one header"],
  ["src/components/auth/AuthShell.tsx", "auth screens own their title (Auth Surface v2, section 15.1)"],
  ["src/components/ui/app/AppHeader.tsx", "legacy header; only dev fixtures still use it"],
]);
const RAW_H1_ALLOWED_DIRS = [
  ["src/app/dev/", "internal fixture and gallery pages"],
  ["src/app/api/", "server-rendered HTML strings, not app screens"],
];

export function findRawH1Offenders(files, readSource) {
  return files
    .map(toPosix)
    .filter((path) => !RAW_H1_ALLOWED.has(path))
    .filter((path) => !RAW_H1_ALLOWED_DIRS.some(([dir]) => path.startsWith(dir)))
    .filter((path) => RAW_H1_PATTERN.test(readSource(path)));
}

test("no raw <h1> screen title outside ScreenHeader in src/app, src/components or src/features", () => {
  const files = ["src/app", "src/components", "src/features"].flatMap((dir) => listSourceFiles(dir));
  assert.deepEqual(findRawH1Offenders(files, read), []);
});

test("the raw <h1> check catches a hand-made centred title (mutation guard)", () => {
  const fake = {
    "src/app/history/[sessionId]/Fake.tsx": '<h1 className="text-center text-2xl">Workout</h1>',
    "src/features/curated-onboarding/components/Fake.tsx": '<TitleText as="h1">Setup</TitleText>',
    "src/components/ui/app/Fake.tsx": 'export function X({ titleAs = "h1" }) {}',
    "src/components/history/Fine.tsx": '<h2 className="text-sm">Section</h2>',
    "src/app/dev/fixture/page.tsx": "<h1>Dev fixture</h1>",
  };
  assert.deepEqual(findRawH1Offenders(Object.keys(fake), (path) => fake[path]), [
    "src/app/history/[sessionId]/Fake.tsx",
    "src/features/curated-onboarding/components/Fake.tsx",
    "src/components/ui/app/Fake.tsx",
  ]);
});

test("detail screens render the standard detail header with Back on the left", () => {
  const cases = [
    ["src/components/SessionHeaderControls.tsx", /<ScreenHeader\s+kind="detail"\s+title="Workout"/],
    ["src/app/history/[sessionId]/LogAuditClient.tsx", /<ScreenHeader\s+kind="detail"\s+title=\{sessionSummary\.dayTitle\?\.trim\(\) \|\| "Workout"\}/],
    ["src/app/history/[sessionId]/page.tsx", /<ScreenHeader kind="detail" title="Workout" back=\{<ScreenHeaderBackButton href="\/history" historyBehavior="history-first" label="Back to History" \/>\} \/>/],
    ["src/components/ExerciseInfoSheet.tsx", /<ScreenHeader\s+kind="detail"\s+title=\{exercise\?\.name \?\? "Exercise"\}/],
    ["src/components/account/AccountScreen.tsx", /<ScreenHeader\s+kind="detail"\s+title="Account"/],
    ["src/features/curated-onboarding/components/CuratedOnboardingShell.tsx", /<ScreenHeader\s+kind="detail"\s+title="Routine setup"/],
    ["src/components/legal/LegalDocumentLayout.tsx", /<ScreenHeader kind="detail" title=\{title\}/],
    ["src/app/review/optional-planned-day/page.tsx", /<ScreenHeader\s+kind="detail"\s+title="Optional workout day"/],
  ];
  for (const [path, pattern] of cases) {
    const source = read(path);
    assert.match(source, pattern, path);
    assert.match(source, /<ScreenHeaderBackButton\s/, `${path}: Back uses the shared left Back control`);
    assert.doesNotMatch(
      source,
      /\b(?:AppHeader|SharedScreenHeader|TopRightBackButton|HeaderInfoRail|standaloneHeaderFamily|SessionBackButton|HistoryDetailsBackButton|RoutineDayHeaderTitle|DetailHeader|SignatureMetaTag)\b/,
      `${path}: no legacy header pieces`,
    );
  }
});

test("the live workout header is title, one day · routine line, Back and at most the offline chip", () => {
  const controls = read("src/components/SessionHeaderControls.tsx");
  assert.match(controls, /\.join\(" · "\)/);
  assert.match(controls, /trailing=\{statusBadge\}/);
  const client = read("src/components/SessionPageClient.tsx");
  assert.doesNotMatch(client, /buildCurrentSessionHeaderInfoRailItems|sessionHeaderInfoItems|isExerciseOpen \?/);
  assert.doesNotMatch(read("src/lib/header-info-rail.ts"), /buildCurrentSessionHeaderInfoRailItems/);
});

test("live workout Back closes an open exercise first, like history detail (two-step Back)", () => {
  const controls = read("src/components/SessionHeaderControls.tsx");
  assert.match(controls, /onClick=\{\(event\) => handleSessionBackClick\(event, exerciseOpen, onCloseExercise\)\}/);
  assert.match(controls, /label=\{getSessionBackLabel\(exerciseOpen\)\}/);
  const client = read("src/components/SessionPageClient.tsx");
  assert.match(client, /exerciseOpen=\{selectedExerciseId !== null\}/);
  assert.match(client, /onCloseExercise=\{\(\) => setSelectedExerciseId\(null\)\}/);
  const history = read("src/app/history/[sessionId]/LogAuditClient.tsx");
  assert.match(history, /if \(expandedExercise\) \{\s+event\.preventDefault\(\);\s+setExpandedExerciseId\(null\);/);
});

test("the old per-screen back buttons are gone", () => {
  for (const path of [
    "src/components/SessionBackButton.tsx",
    "src/app/history/[sessionId]/HistoryDetailsBackButton.tsx",
    "src/components/DetailSurface.tsx",
    "src/components/settings/SettingsHeaderIdentity.tsx",
    "src/components/ui/app/ScreenBackButton.tsx",
    "src/components/ui/HeaderInfoRail.tsx",
  ]) {
    assert.throws(() => statSync(join(root, path)), /ENOENT/, `${path} should be deleted`);
  }
});
