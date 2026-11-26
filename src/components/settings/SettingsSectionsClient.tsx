"use client";

import { useEffect, useState } from "react";
import { AppThemeSettings } from "@/components/settings/AppThemeSettings";
import { DataSettingsSection } from "@/components/settings/DataSettingsSection";
import { DiscordAccessSettings } from "@/components/settings/DiscordAccessSettings";
import { ProAccessSettings } from "@/components/settings/ProAccessSettings";
import { UnitsSettings, type UnitsSettingsAction } from "@/components/settings/UnitsSettings";
import { updateUnitsSettingsAction } from "@/app/settings/units-actions";
import { formatUnitsSettingsStatus, UNITS_SETTINGS_DEFAULTS, type UnitsSettingsValues } from "@/lib/units-settings";
import { useSettingsScreenState, type SettingsSectionKey } from "@/components/settings/SettingsScreenState";
import { useIsOnline } from "@/components/session/useIsOnline";
import { CardChip, CardChips, CardHeader, CardMeta, CardNotice, CardSurface, cardTokens } from "@/components/ui/card-system";
import {
  APP_THEME_SELECTION_CHANGE_EVENT,
  getAppThemePresetLabel,
  isAppThemePreset,
  readStoredAppThemeLibrary,
  readStoredAppThemeSelection,
} from "@/lib/app-theme";
import type { ProAccessSnapshot } from "@/lib/billing/pro-access-snapshot";
import { SignOutButton } from "@/components/SignOutButton";
import { ACCOUNT_PORTAL_LINK_ATTRIBUTE, getFitnessAccountPortalUrl, getFitnessSignOutEverywhereUrl } from "@/lib/account-portal";

type SettingsSectionId = Exclude<SettingsSectionKey, null>;

type SettingsSectionMeta = {
  title: string;
  summary: string;
};

/**
 * Settings sections in screen order. `account` opens the Fawxzzy account portal; every other section expands in place.
 * Achievements moved to History > Progress (`/history/progression`); `/settings?section=achievements` redirects there.
 */
export const SETTINGS_SECTION_ORDER: readonly SettingsSectionId[] = ["account", "units", "pro", "data", "theme", "discord"];

export function getSettingsSectionMeta(section: SettingsSectionId): SettingsSectionMeta | null {
  switch (section) {
    case "account":
      return { title: "Account", summary: "Opens account.fawxzzy.com" };
    case "units":
      return { title: "Units & time zone", summary: "Weight, distance and time zone" };
    case "theme":
      return { title: "App Theme", summary: "Colors and shape" };
    case "pro":
      return { title: "Pro Access", summary: "Your plan and billing" };
    case "data":
      return { title: "Data", summary: "Your saved data and export" };
    case "discord":
      return { title: "Discord Connector", summary: "Join the community and get a verification key" };
    default:
      return null;
  }
}

export function getSettingsPanelId(section: SettingsSectionId) {
  return `settings-section-${section}`;
}

/** Where the Settings "Account" row goes: the shared Fawxzzy account portal, coming back to Settings. */
export const SETTINGS_ACCOUNT_PORTAL_HREF = getFitnessAccountPortalUrl("/account", "/settings");

/** "Sign out everywhere": the portal Account page, whose own link confirms and ends every session (all devices, all apps). */
export const SETTINGS_SIGN_OUT_EVERYWHERE_HREF = getFitnessSignOutEverywhereUrl("/settings");

/**
 * The two sign-outs, kept apart: `Sign out` (this device, a button) first, then a gap, then the quiet
 * `Sign out everywhere` link to the portal. Used by Settings and the /account screen.
 */
export function AccountSignOutActions({ everywhereHref, signedInAs }: { everywhereHref: string; signedInAs?: string }) {
  return (
    <div className="space-y-6 pt-2" data-account-sign-out-actions="true">
      <SignOutButton placement="body" signedInAs={signedInAs} />
      <a
        href={everywhereHref}
        {...{ [ACCOUNT_PORTAL_LINK_ATTRIBUTE]: "sign-out-everywhere" }}
        className="flex min-h-11 items-center justify-center rounded-[var(--radius-control,0.75rem)] text-sm font-medium text-[rgb(var(--text-secondary))] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
      >
        Sign out everywhere
      </a>
    </div>
  );
}

/**
 * One Settings section as a card. `Account` navigates (right chevron); the others expand a panel (down chevron).
 * When `expanded`, the card leads the body (as the panel's `h2`) and collapses the panel again.
 * `signedInAs` adds who is signed in to the Account card (the header carries only the screen title).
 */
export function SettingsSectionCard({
  section,
  expanded = false,
  href,
  onToggle,
  signedInAs,
  status,
}: {
  section: SettingsSectionId;
  expanded?: boolean;
  /** Navigate (Account): a real link, so it opens in a new tab and shows its destination. */
  href?: string;
  /** Expand or collapse (everything else). */
  onToggle?: () => void;
  signedInAs?: string;
  /** A live one-word state for the section (units, plan, current theme), shown as a chip. */
  status?: string | null;
}) {
  const meta = getSettingsSectionMeta(section);
  if (!meta) {
    return null;
  }

  return (
    <CardSurface tone={expanded ? "current" : "neutral"} data-settings-section-card={section}>
      <CardHeader
        title={meta.title}
        meta={<CardMeta items={signedInAs ? [signedInAs, meta.summary] : [meta.summary]} />}
        headingLevel={2}
        chips={status ? <CardChips><CardChip tone={expanded ? "current" : "neutral"}>{status}</CardChip></CardChips> : undefined}
        interaction={href
          ? { kind: "link", href, linkProps: { [ACCOUNT_PORTAL_LINK_ATTRIBUTE]: section } }
          : { kind: "toggle", expanded, onToggle: onToggle ?? (() => {}), controlsId: expanded ? getSettingsPanelId(section) : undefined }}
      />
    </CardSurface>
  );
}

/** The name of the theme in use on this device, read after hydration (storage is not available on the server). */
function readActiveThemeLabel(): string {
  const selection = readStoredAppThemeSelection();
  if (!selection) {
    return getAppThemePresetLabel("default");
  }
  if (isAppThemePreset(selection)) {
    return getAppThemePresetLabel(selection);
  }
  return readStoredAppThemeLibrary().find((slot) => slot.id === selection)?.name ?? getAppThemePresetLabel("default");
}

// The theme in use, read after mount (it lives in this device's storage) and again whenever the theme changes, so the
// chip stays right while the Theme section is open. The selection change has its own event.
function useActiveThemeLabel(): string | null {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setLabel(readActiveThemeLabel()), 0);
    };
    setLabel(readActiveThemeLabel());
    window.addEventListener(APP_THEME_SELECTION_CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(APP_THEME_SELECTION_CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return label;
}

export function SettingsSectionsClient({
  userKind,
  userNumber,
  canAccessQaVisibilitySetting,
  showQaLlelData,
  initialExportDateFrom,
  initialExportDateTo,
  proAccess,
  billingNotice,
  signedInAs,
  units = UNITS_SETTINGS_DEFAULTS,
  unitsAction = updateUnitsSettingsAction,
}: {
  /** Username (or email when there is none), shown on the Account card. */
  signedInAs?: string;
  /** The saved weight unit, distance unit and time zone (profile). */
  units?: UnitsSettingsValues;
  /** Saves the Units & time zone panel; dev fixtures pass a stub. */
  unitsAction?: UnitsSettingsAction;
  userKind: "human" | "automation" | "unknown";
  userNumber: number | null;
  canAccessQaVisibilitySetting: boolean;
  showQaLlelData?: boolean | null;
  initialExportDateFrom: string;
  initialExportDateTo: string;
  proAccess: ProAccessSnapshot;
  billingNotice?: "success" | "cancel" | null;
}) {
  const { expandedSection, setExpandedSection } = useSettingsScreenState();
  const isOnline = useIsOnline();
  const themeLabel = useActiveThemeLabel();
  const statusBySection: Partial<Record<SettingsSectionId, string | null>> = {
    units: formatUnitsSettingsStatus(units),
    pro: proAccess.accessState === "pro" ? "Pro" : "Free",
    theme: themeLabel,
  };
  const offlineNotice = !isOnline ? (
    <CardNotice tone="attention">
      You are offline. Theme and saved choices still work; billing, export and Discord keys need a connection.
    </CardNotice>
  ) : null;

  const accountCard = <SettingsSectionCard section="account" href={SETTINGS_ACCOUNT_PORTAL_HREF} signedInAs={signedInAs} />;
  const signOut = <AccountSignOutActions everywhereHref={SETTINGS_SIGN_OUT_EVERYWHERE_HREF} signedInAs={signedInAs} />;

  // Collapsed: the list of section cards, then Sign out. Expanded: that section's card (tap to close) and its panel.
  if (expandedSection === null) {
    return (
      <div className="space-y-3">
        {offlineNotice}
        <ul className={cardTokens.list}>
          {SETTINGS_SECTION_ORDER.map((section) => (
            <li key={section}>
              {section === "account" ? (
                accountCard
              ) : (
                <SettingsSectionCard section={section} status={statusBySection[section]} onToggle={() => setExpandedSection(section)} />
              )}
            </li>
          ))}
        </ul>
        {signOut}
      </div>
    );
  }

  const meta = getSettingsSectionMeta(expandedSection);

  return (
    <div id={getSettingsPanelId(expandedSection)} role="region" aria-label={meta?.title} className="space-y-3">
      {expandedSection === "account" ? (
        <>
          {accountCard}
          {signOut}
        </>
      ) : (
        <SettingsSectionCard section={expandedSection} expanded status={statusBySection[expandedSection]} onToggle={() => setExpandedSection(null)} />
      )}
      {offlineNotice}
      {expandedSection === "units" ? <UnitsSettings saved={units} action={unitsAction} /> : null}
      {expandedSection === "pro" ? <ProAccessSettings snapshot={proAccess} billingNotice={billingNotice} /> : null}
      {expandedSection === "data" ? (
        <DataSettingsSection
          canAccessQaLlelUi={canAccessQaVisibilitySetting}
          userKind={userKind}
          showQaLlelData={showQaLlelData}
          initialExportDateFrom={initialExportDateFrom}
          initialExportDateTo={initialExportDateTo}
        />
      ) : null}
      {expandedSection === "theme" ? <AppThemeSettings /> : null}
      {expandedSection === "discord" ? <DiscordAccessSettings /> : null}
    </div>
  );
}
