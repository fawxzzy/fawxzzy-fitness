import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ReactElement } from "react";
import { renderToStaticMarkup as renderMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { BottomActionsProvider } from "../layout/bottom-actions.tsx";
import { ToastProvider } from "../ui/ToastProvider.tsx";
import { AccountAchievementsSection } from "./AccountAchievementsSection.tsx";
import { AccountPasswordSection } from "./AccountPasswordSection.tsx";
import { AppThemeSettings } from "./AppThemeSettings.tsx";
import { DataSettingsSection } from "./DataSettingsSection.tsx";
import { DiscordAccessSettings } from "./DiscordAccessSettings.tsx";
import { ProAccessSettings } from "./ProAccessSettings.tsx";
import { SettingsFloatingHeader } from "./SettingsFloatingHeader.tsx";
import { SettingsScreenStateProvider } from "./SettingsScreenState.tsx";
import {
  SETTINGS_SECTION_ORDER,
  SettingsSectionCard,
  getSettingsPanelId,
  getSettingsSectionMeta,
} from "./SettingsSectionsClient.tsx";
import type { ProAccessSnapshot } from "../../lib/billing/pro-access-snapshot.ts";

const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };

function render(node: ReactElement) {
  return renderMarkup(
    <AppRouterContext.Provider value={router}>
      <ToastProvider>
        <BottomActionsProvider>{node}</BottomActionsProvider>
      </ToastProvider>
    </AppRouterContext.Provider>,
  );
}

function source(name: string) {
  return readFileSync(new URL(name, import.meta.url), "utf8");
}

const settingsFiles = [
  "AccountAchievementsSection.tsx",
  "AccountPasswordSection.tsx",
  "AccountSettingsForm.tsx",
  "AppThemeSettings.tsx",
  "DataSettingsSection.tsx",
  "DiscordAccessSettings.tsx",
  "ProAccessSettings.tsx",
  "SettingsCard.tsx",
  "SettingsFloatingHeader.tsx",
  "SettingsSectionsClient.tsx",
];

const freePlan: ProAccessSnapshot = {
  schemaReady: true,
  accessState: "free",
  accessLabel: "Free",
  accessSource: null,
  offerMode: "founding",
  offerLabel: "Monthly Pro",
  checkoutConfigured: true,
  customerPortalAvailable: false,
  grantedAt: null,
  renewsAt: null,
  cancellationScheduledFor: null,
  lastPurchaseStatus: null,
  supportNote: "",
};

test("Settings sections keep their order and titles; Account navigates, the rest expand", () => {
  assert.deepEqual([...SETTINGS_SECTION_ORDER], ["account", "achievements", "pro", "data", "theme", "discord"]);
  assert.deepEqual(
    SETTINGS_SECTION_ORDER.map((section) => getSettingsSectionMeta(section)?.title),
    ["Account", "Achievements", "Pro Access", "Data", "App Theme", "Discord Connector"],
  );

  const account = render(<SettingsSectionCard section="account" onPress={() => {}} />);
  assert.match(account, /<h2[^>]*data-card-title="true"[^>]*>Account<\/h2>/);
  assert.match(account, /data-card-hit="press"/);
  assert.match(account, /data-card-affordance="press"/);
  assert.doesNotMatch(account, /aria-expanded/);

  const collapsed = render(<SettingsSectionCard section="data" onToggle={() => {}} />);
  assert.match(collapsed, /<h2[^>]*>Data<\/h2>/);
  assert.match(collapsed, /aria-expanded="false"/);
  assert.doesNotMatch(collapsed, /aria-controls/, "a collapsed card must not point at a panel that is not in the DOM");
  assert.match(collapsed, /data-card-tone="neutral"/);

  const expanded = render(<SettingsSectionCard section="data" expanded onToggle={() => {}} />);
  assert.match(expanded, /aria-expanded="true"/);
  assert.ok(expanded.includes(`aria-controls="${getSettingsPanelId("data")}"`));
  assert.match(expanded, /data-card-tone="current"/);
});

test("Settings header: an sr-only h1, then the open section as the h2 that collapses it", () => {
  const closed = render(
    <SettingsScreenStateProvider>
      <SettingsFloatingHeader email="a@example.com" username="atlas" />
    </SettingsScreenStateProvider>,
  );
  assert.match(closed, /<h1 class="sr-only">Settings<\/h1>/);
  assert.doesNotMatch(closed, /<h2/);

  const open = render(
    <SettingsScreenStateProvider initialExpandedSection="theme">
      <SettingsFloatingHeader email="a@example.com" username="atlas" />
    </SettingsScreenStateProvider>,
  );
  assert.match(open, /<h2[^>]*>App Theme<\/h2>/);
  assert.match(open, /aria-expanded="true"/);
});

test("Achievements: a list of cards, text chips instead of dimming, h3 section title and h4 card titles", () => {
  const html = render(
    <AccountAchievementsSection
      achievements={[
        { id: "first-workout", title: "First Workout", description: "Complete one workout.", unlocked: true },
        { id: "first-pr", title: "PR Logged", description: "Record one PR.", unlocked: false },
      ]}
    />,
  );

  assert.match(html, /data-account-achievements-section="true"/);
  assert.match(html, /<h3[^>]*>Training milestones<\/h3>/);
  assert.match(html, /1\/2 earned/);
  assert.equal((html.match(/<li>/g) ?? []).length, 2);
  assert.equal((html.match(/<h4[^>]*data-card-title="true"/g) ?? []).length, 2);
  assert.match(html, /data-card-tone="completed"/);
  assert.match(html, /Earned/);
  assert.match(html, /Not earned/);
  assert.doesNotMatch(html, /opacity-68/, "locked milestones were dimmed below contrast; the chip carries the state");
});

test("Pro Access: status, unlocks and terms are cards; state chips are text; nothing under 11px", () => {
  const free = render(<ProAccessSettings snapshot={freePlan} billingNotice="cancel" />);
  assert.match(free, /<h3[^>]*>Monthly Pro available<\/h3>/);
  assert.match(free, /<h3[^>]*>Pro unlocks<\/h3>/);
  assert.match(free, /<h3[^>]*>Terms and support<\/h3>/);
  assert.equal((free.match(/Locked/g) ?? []).length, 2);
  assert.match(free, /Checkout was cancelled/);
  assert.match(free, /role="status"/);
  assert.match(free, /Plan/);
  assert.match(free, /\$5\/month/);

  const pro = render(
    <ProAccessSettings
      snapshot={{
        ...freePlan,
        accessState: "pro",
        accessSource: "subscription",
        customerPortalAvailable: true,
        grantedAt: "2026-10-02T14:00:00.000Z",
        renewsAt: "2026-12-02T14:00:00.000Z",
      }}
      billingNotice="success"
    />,
  );
  assert.match(pro, /<h3[^>]*>Monthly subscription active<\/h3>/);
  assert.match(pro, /<h3[^>]*>Unlocked now<\/h3>/);
  assert.equal((pro.match(/Active<\/span>/g) ?? []).length >= 2, true);
  assert.match(pro, /Purchase date:/);
  assert.match(pro, /Renewal date:/);
  assert.match(pro, /Checkout returned successfully and Pro is now active/);

  const fallback = render(<ProAccessSettings snapshot={{ ...freePlan, schemaReady: false }} />);
  assert.match(fallback, /Billing is not fully set up on this server yet/);
  assert.doesNotMatch(fallback, /fallback mode|Billing schema/);

  for (const html of [free, pro, fallback]) {
    assert.doesNotMatch(html, /text-\[(?:[0-9]|10)(?:\.\d+)?px\]/);
    assert.match(html, /min-h-11/, "support and legal links keep a 44px target");
  }
});

test("App Theme: themes are select cards, empty slots read as one New custom theme card, no Slot placeholders", () => {
  const html = render(<AppThemeSettings />);

  assert.match(html, /aria-label="Themes"/);
  assert.match(html, /<h3[^>]*data-card-title="true"[^>]*>Default theme<\/h3>/);
  assert.match(html, /<h3[^>]*data-card-title="true"[^>]*>Rose Circuit<\/h3>/);
  assert.match(html, /<h3[^>]*data-card-title="true"[^>]*>New custom theme<\/h3>/);
  assert.equal((html.match(/data-card-hit="select"/g) ?? []).length, 3);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.match(html, /border-dashed/);
  assert.doesNotMatch(html, /Slot \d/i);

  const themeSource = source("AppThemeSettings.tsx");
  assert.doesNotMatch(themeSource, /Slot \$\{|`Slot |ThemeSlotButton|THEME_PANEL_SHELL_CLASSNAME|text-\[0\.64rem\]/);
  // Same storage behaviour as before: selecting writes the selection, saving writes the library.
  assert.match(themeSource, /const selectEmptySlot = \(slotId: CustomAppThemeSlotId\) => \{[\s\S]*?writeStoredAppThemeSelection\(slotId\);/);
  assert.match(themeSource, /writeStoredAppThemeLibrary\(nextSavedThemes\)/);
  assert.match(themeSource, /onSelect=\{\(\) => selectEmptySlot\(slotId\)\}/);
  assert.match(themeSource, /aria-label="Theme name"/);
  assert.match(themeSource, /label="Theme name"/);
});

test("Data: cards for snapshot, export options and preview; real radio groups; plain copy; same requests", () => {
  const html = render(
    <DataSettingsSection
      canAccessQaLlelUi={false}
      userKind="human"
      showQaLlelData={false}
      initialExportDateFrom="2026-05-01"
      initialExportDateTo="2026-05-09"
    />,
  );

  assert.match(html, /<h3[^>]*>Stored snapshot<\/h3>/);
  assert.match(html, /<h3[^>]*>Export<\/h3>/);
  assert.match(html, /<h3[^>]*>Export preview<\/h3>/);
  assert.match(html, /<legend[^>]*>Type<\/legend>/);
  assert.match(html, /<legend[^>]*>Scope<\/legend>/);
  assert.equal((html.match(/name="export-file-type"/g) ?? []).length, 3);
  assert.equal((html.match(/name="export-scope"/g) ?? []).length, 3);
  assert.match(html, /aria-label="Export name"/);
  assert.match(html, /value="2026-05-01"/);
  assert.match(html, /value="2026-05-09"/);

  const dataSource = source("DataSettingsSection.tsx");
  assert.doesNotMatch(dataSource, /LLEL|Progression lane|both lanes/);
  assert.match(dataSource, /fetch\("\/api\/account\/export\/preview"/);
  assert.match(dataSource, /fetch\("\/api\/account\/export",/);
  assert.match(dataSource, /updateQaLlelVisibilityAction\(formData\)/);
  assert.match(dataSource, /formData\.set\("showQaLlelData", nextQaVisible \? "1" : "0"\)/);
  assert.match(dataSource, /has-\[:focus-visible\]/, "the visually hidden radios show a focus ring on their tile");
});

test("Discord: join link is a 44px target, the token field keeps its accessible name, no sub-11px text", () => {
  const html = render(<DiscordAccessSettings />);

  assert.match(html, /<h3[^>]*>Join the Discord<\/h3>/);
  assert.match(html, /<h3[^>]*>One-time key<\/h3>/);
  assert.match(html, /aria-label="Discord verification token"/);
  assert.match(html, /<legend[^>]*>Verification token<\/legend>/);
  assert.match(html, /min-h-11/);
  assert.doesNotMatch(html, /text-\[(?:[0-9]|10)(?:\.\d+)?px\]/);
});

test("Change password: same form wiring on a card (ids, field names, autocomplete) with an h2 and a form label", () => {
  const html = render(<AccountPasswordSection email="a@example.com" />);

  assert.match(html, /<h2[^>]*data-card-title="true"[^>]*>Change password<\/h2>/);
  assert.match(html, /<form[^>]*id="account-password-form"[^>]*aria-label="Change password"/);
  assert.match(html, /data-testid="account-password-form"/);
  for (const name of ["currentPassword", "newPassword", "confirmPassword"]) {
    assert.ok(html.includes(`name="${name}"`), name);
  }
  assert.match(html, /autoComplete="current-password"|autocomplete="current-password"/);
  assert.match(html, /type="submit"/);
});

test("Account details form keeps its ids, field names and action wiring on a card", () => {
  const formSource = source("AccountSettingsForm.tsx");

  assert.match(formSource, /<SettingsCard title="Account details" headingLevel=\{2\}>/);
  assert.match(formSource, /id=\{ACCOUNT_SETTINGS_FORM_ID\} onSubmit=\{submitEmailUpdate\}/);
  assert.match(formSource, /id="settings-username"\s+name="username"/);
  assert.match(formSource, /id="settings-email"\s+name="email"/);
  assert.match(formSource, /updateAccountEmailAction\(formData\)/);
  assert.match(formSource, /form=\{ACCOUNT_SETTINGS_FORM_ID\}/);
  assert.match(formSource, /disabled=\{!isDirty\}/);
  assert.match(formSource, /<SignOutButton \/>/);
  // Autosave and name behaviour are untouched: the same dirty rule and the same success bookkeeping.
  assert.match(formSource, /const isDirty = usernameValue\.trim\(\) !== savedUsername\.trim\(\) \|\| emailValue\.trim\(\) !== savedEmail\.trim\(\);/);
});

test("No Settings or Account file strips a card at the call site or keeps the old accordion", () => {
  for (const file of settingsFiles) {
    const text = source(file);
    assert.doesNotMatch(text, /!border-transparent|!backdrop-blur-0|-mx-5|SettingsAccordion|border-transparent bg-transparent shadow-none/, file);
    assert.doesNotMatch(text, /rounded-\[0\.95rem\]|rounded-\[0\.8rem\]|text-\[(?:[0-9]|10)(?:\.\d+)?px\]|text-\[0\.(?:[0-6]\d*)rem\]/, `${file}: ad-hoc radius or sub-11px text`);
  }

  const screen = readFileSync(new URL("../account/AccountScreen.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(screen, /SurfaceCard/);
  assert.match(screen, /data-testid="account-screen"/);

  const page = readFileSync(new URL("../../app/settings/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /SurfaceCard/);
  assert.match(page, /<SettingsSectionsClient/);
});

test("Settings cards add no behaviour to the auth-adjacent actions", () => {
  // Presentation only: these modules are consumed, never edited, by the Settings card migration.
  const actions = readFileSync(new URL("../../app/settings/actions.ts", import.meta.url), "utf8");
  assert.match(actions, /export async function changePasswordAction/);
  assert.match(actions, /export async function updateAccountEmailAction/);

  const accountForm = source("AccountSettingsForm.tsx");
  assert.match(accountForm, /import \{ updateAccountEmailAction, type EmailUpdateState \} from "@\/app\/settings\/actions"/);
  const passwordForm = source("AccountPasswordSection.tsx");
  assert.match(passwordForm, /import \{ changePasswordAction, type PasswordUpdateState \} from "@\/app\/settings\/actions"/);
});
