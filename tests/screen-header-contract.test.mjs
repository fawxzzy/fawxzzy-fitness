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
    // `appMenu`: the screen-level header shows the app menu (DESIGN-CONTRACT.md 15.6).
    ["src/app/today/page.tsx", /<ScreenHeader\s+kind="tab"\s+appMenu\s+title="Today"/],
    ["src/app/today/TodayDayPicker.tsx", /<ScreenHeader\s+kind="tab"\s+appMenu\s+title="Today"/],
    ["src/app/routines/page.tsx", /<ScreenHeader kind="tab" appMenu title="Routines"/],
    ["src/components/history/HistoryRouteScaffold.tsx", /<ScreenHeader\s+kind="tab"\s+title="History"\s+appMenu\b/],
    ["src/components/settings/SettingsFloatingHeader.tsx", /<ScreenHeader kind="tab" appMenu title="Settings" \/>/],
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
  // The one destination list (src/lib/app-menu.ts); AppNav.tsx only adds icons.
  const destinations = read("src/lib/app-menu.ts");
  const list = destinations.slice(destinations.indexOf("export const APP_MENU_DESTINATIONS"), destinations.indexOf("] as const;"));
  const labels = [...list.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(labels, ["Today", "Routines", "History", "Settings"]);
  for (const source of [list, read("src/components/AppNav.tsx")]) {
    assert.doesNotMatch(source, /href: "\/account"|account\.fawxzzy\.com|getFitnessAccountPortalUrl/);
  }
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
  assert.match(controls, /status=\{statusBadge\}/);
  assert.doesNotMatch(controls, /trailing=\{statusBadge\}/, "the offline state is inline on the title line, not a trailing chip");
  const client = read("src/components/SessionPageClient.tsx");
  assert.doesNotMatch(client, /buildCurrentSessionHeaderInfoRailItems|sessionHeaderInfoItems|isExerciseOpen \?/);
});

test("live workout: Pause top right is the one header exit (back to Today, workout keeps running); no left Back, no menu", () => {
  // Zac 2026-11-23 replaced the two-step Back (close the open exercise, then history-first back) with Pause. Drafts
  // persist in the session draft store, so leaving with an exercise open loses nothing.
  const controls = read("src/components/SessionHeaderControls.tsx");
  assert.match(controls, /<ScreenHeader\s+kind="detail"\s+title="Workout"/);
  assert.match(controls, /trailing=\{<SessionPauseButton backHref=\{backHref\} \/>\}/);
  assert.match(controls, /aria-label=\{SESSION_PAUSE_ARIA_LABEL\}/);
  assert.match(controls, /\bh-11 min-w-11\b/, "44px target");
  assert.doesNotMatch(controls, /<ScreenHeaderBackButton|\bback=\{|\bappMenu\b/);
  const pause = read("src/components/sessionBackAction.ts");
  assert.match(pause, /SESSION_PAUSE_FALLBACK_HREF = "\/today"/);
  const client = read("src/components/SessionPageClient.tsx");
  assert.doesNotMatch(client, /onCloseExercise=|exerciseOpen=/);
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
    // Lane H3: the last legacy header pieces, deleted once nothing used them.
    "src/components/ui/app/AppHeader.tsx",
    "src/components/ui/app/SharedScreenHeader.tsx",
    "src/components/ui/BackButton.tsx",
    "src/components/ui/TopRightBackButton.tsx",
    "src/components/ui/app/RoutineDayHeaderTitle.tsx",
    "src/components/ui/app/standaloneHeaderFamily.ts",
    "src/components/exercises/ExerciseChooserScreenFamily.tsx",
    "src/components/routines/RoutineAddExerciseScaffold.tsx",
    "src/lib/header-info-rail.ts",
  ]) {
    assert.throws(() => statSync(join(root, path)), /ENOENT/, `${path} should be deleted`);
  }
});

// Every old header component, helper and token. Matching is on whole identifiers, so ScreenHeaderBackButton
// (the one Back control) is not caught by `BackButton`. Dev fixtures are included: no screen, real or fixture,
// may show the old style. A new name added here must be gone from src first.
const BANNED_HEADER_PIECES = [
  "AppHeader",
  "SharedScreenHeader",
  "BackButton",
  "TopRightBackButton",
  "RoutineDayHeaderTitle",
  "standaloneHeaderFamily",
  "headerFamily",
  "HeaderInfoRail",
  "RoutineEditorPageHeader",
  "RoutinesRouteHeaderCard",
  "HeaderInfoRailItem",
  "HeaderInfoRailTone",
  "buildRoutineTrainingRestInfoRailItems",
  "buildCurrentSessionHeaderInfoRailItems",
  "ExerciseChooserScreenFamily",
  "ExerciseChooserRouteScaffold",
  "RoutineAddExerciseScaffold",
  "SessionBackButton",
  "HistoryDetailsBackButton",
  "ScreenBackButton",
  "DetailHeader",
];
const BANNED_HEADER_PATTERN = new RegExp(`\\b(?:${BANNED_HEADER_PIECES.join("|")})\\b`);
// Deleted modules, caught by import path too (a hyphenated path is not an identifier).
const BANNED_HEADER_MODULE_PATTERN = /["'][^"']*\/(?:header-info-rail|ExerciseChooserScreenFamily|AppHeader|SharedScreenHeader|TopRightBackButton|standaloneHeaderFamily|RoutineDayHeaderTitle|ui\/BackButton)["']/;
// A raw screen-title size outside the header: the old header title tokens or a hand-written 22px+ semibold title.
const RAW_TITLE_CLASS_PATTERN = /headerTokens\.titleClassName|typography\.title\b|\btext-\[1\.375rem\]|\btext-\[1\.625rem\][^"]*\btruncate\b/;
const RAW_TITLE_CLASS_ALLOWED = new Set([
  "src/components/ui/app/headerTokens.ts",
  "src/components/ui/app/ScreenHeader.tsx",
]);

export function findBannedHeaderUses(files, readSource) {
  return files
    .map(toPosix)
    .filter((path) => {
      const source = readSource(path).replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      if (BANNED_HEADER_PATTERN.test(source) || BANNED_HEADER_MODULE_PATTERN.test(source)) return true;
      return !RAW_TITLE_CLASS_ALLOWED.has(path) && RAW_TITLE_CLASS_PATTERN.test(source);
    });
}

test("no file in src uses an old header component, helper or a raw header title class", () => {
  assert.deepEqual(findBannedHeaderUses(listSourceFiles("src"), read), []);
});

test("the banned-header check catches an old header, an old Back button and a raw title class (mutation guard)", () => {
  const fake = {
    "src/app/dev/fixture/Fake.tsx": 'import { AppHeader } from "@/components/ui/app/AppHeader";',
    "src/app/routines/Fake.tsx": "<TopRightBackButton href=\"/routines\" />",
    "src/components/Fake.tsx": "<BackButton href=\"/\" />",
    "src/components/Title.tsx": '<p className="text-[1.375rem] font-semibold">Workout</p>',
    "src/components/Fine.tsx": '<ScreenHeaderBackButton href="/" />',
    "src/components/Commented.tsx": "// AppHeader used to live here\nexport const x = 1;",
    "src/components/ui/app/headerTokens.ts": 'title: "truncate text-[1.375rem] font-semibold"',
    "src/components/Chooser.tsx": "<ExerciseChooserScreenFamily />",
    "src/components/Rail.tsx": "const items = buildRoutineTrainingRestInfoRailItems({});",
    "src/components/RailType.ts": "let item: HeaderInfoRailItem;",
    "src/components/RailImport.ts": 'import * as rail from "@/lib/header-info-rail";',
    "src/components/ChooserImport.ts": 'import * as family from "@/components/exercises/ExerciseChooserScreenFamily";',
  };
  assert.deepEqual(findBannedHeaderUses(Object.keys(fake), (path) => fake[path]), [
    "src/app/dev/fixture/Fake.tsx",
    "src/app/routines/Fake.tsx",
    "src/components/Fake.tsx",
    "src/components/Title.tsx",
    "src/components/Chooser.tsx",
    "src/components/Rail.tsx",
    "src/components/RailType.ts",
    "src/components/RailImport.ts",
    "src/components/ChooserImport.ts",
  ]);
});

test("both Add exercise routes share the one detail frame: title, day · routine subtitle, Back on the left", () => {
  const scaffold = read("src/components/exercises/AddExerciseScaffold.tsx");
  assert.match(scaffold, /<ScreenHeader\s+kind="detail"/);
  assert.match(scaffold, /title = "Add exercise"/);
  assert.match(scaffold, /back=\{<ScreenHeaderBackButton href=\{backHref\} label=\{backLabel\} \/>\}/);
  assert.match(scaffold, /topNavMode="none"/, "no tab bar on a detail screen");
  for (const [path, backLabel] of [
    ["src/app/routines/[id]/edit/day/[dayId]/add-exercise/page.tsx", "Back to day"],
    ["src/app/session/[id]/add-exercise/page.tsx", "Back to workout"],
  ]) {
    const source = read(path);
    assert.match(source, /<AddExerciseScaffold\b/, path);
    assert.match(source, /subtitle=\{formatAddExerciseSubtitle\(/, path);
    assert.match(source, new RegExp(`backLabel="${backLabel}"`), path);
  }
});

test("the detail-screen fixtures are fail-closed and render each route's own frame", () => {
  const page = read("src/app/dev/detail-screens/page.tsx");
  assert.match(page, /export const dynamic = "force-dynamic";/);
  assert.match(page, /\}\) \{\r?\n\s*await assertDevPageAvailable\(\);/, "the guard is the first statement");
  const pageCode = page.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(pageCode, /supabase|requireUser/i, "fixtures use static data only");
  for (const frame of ["<CreateDayScreen", "<DaysLibraryScreen>", "<AddExerciseScaffold"]) {
    assert.ok(page.includes(frame), `fixture renders ${frame}`);
  }
  const data = read("src/app/dev/detail-screens/fixtureData.ts");
  for (const id of ["create-day", "copy-day", "days", "days-empty", "routine-add-exercise", "session-add-exercise"]) {
    assert.ok(data.includes(`"${id}"`), `fixture id ${id}`);
  }
});
