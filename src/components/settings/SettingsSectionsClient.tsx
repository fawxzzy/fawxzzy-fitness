"use client";

import { AccountAchievementsSection } from "@/components/settings/AccountAchievementsSection";
import { AppThemeSettings } from "@/components/settings/AppThemeSettings";
import { DataSettingsSection } from "@/components/settings/DataSettingsSection";
import { DiscordAccessSettings } from "@/components/settings/DiscordAccessSettings";
import { ProAccessSettings } from "@/components/settings/ProAccessSettings";
import { useSettingsScreenState, type SettingsSectionKey } from "@/components/settings/SettingsScreenState";
import { CardHeader, CardMeta, CardSurface, cardTokens } from "@/components/ui/card-system";
import type { ProAccessSnapshot } from "@/lib/billing/pro-access-snapshot";
import type { HistoryAchievement } from "@/lib/history-achievements";
import { SignOutButton } from "@/components/SignOutButton";
import { getFitnessAccountPortalUrl } from "@/lib/account-portal";

type SettingsSectionId = Exclude<SettingsSectionKey, null>;

type SettingsSectionMeta = {
  title: string;
  summary: string;
};

/** Settings sections in screen order. `account` opens the Fawxzzy account portal; every other section expands in place. */
export const SETTINGS_SECTION_ORDER: readonly SettingsSectionId[] = ["account", "achievements", "pro", "data", "theme", "discord"];

export function getSettingsSectionMeta(section: SettingsSectionId): SettingsSectionMeta | null {
  switch (section) {
    case "account":
      return { title: "Account", summary: "Opens account.fawxzzy.com" };
    case "achievements":
      return { title: "Achievements", summary: "Training milestones you have earned" };
    case "theme":
      return { title: "App Theme", summary: "Colors and shape" };
    case "pro":
      return { title: "Pro Access", summary: "Your plan and billing" };
    case "data":
      return { title: "Data", summary: "Stored snapshot and export" };
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
}: {
  section: SettingsSectionId;
  expanded?: boolean;
  /** Navigate (Account): a real link, so it opens in a new tab and shows its destination. */
  href?: string;
  /** Expand or collapse (everything else). */
  onToggle?: () => void;
  signedInAs?: string;
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
        interaction={href
          ? { kind: "link", href }
          : { kind: "toggle", expanded, onToggle: onToggle ?? (() => {}), controlsId: expanded ? getSettingsPanelId(section) : undefined }}
      />
    </CardSurface>
  );
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
  achievements,
  signedInAs,
}: {
  /** Username (or email when there is none), shown on the Account card. */
  signedInAs?: string;
  userKind: "human" | "automation" | "unknown";
  userNumber: number | null;
  canAccessQaVisibilitySetting: boolean;
  showQaLlelData?: boolean | null;
  initialExportDateFrom: string;
  initialExportDateTo: string;
  proAccess: ProAccessSnapshot;
  billingNotice?: "success" | "cancel" | null;
  achievements: HistoryAchievement[];
}) {
  const { expandedSection, setExpandedSection } = useSettingsScreenState();

  const accountCard = <SettingsSectionCard section="account" href={SETTINGS_ACCOUNT_PORTAL_HREF} signedInAs={signedInAs} />;
  const signOut = (
    <div className="pt-2">
      <SignOutButton placement="body" />
    </div>
  );

  // Collapsed: the list of section cards, then Sign out. Expanded: that section's card (tap to close) and its panel.
  if (expandedSection === null) {
    return (
      <div className="space-y-3">
        <ul className={cardTokens.list}>
          {SETTINGS_SECTION_ORDER.map((section) => (
            <li key={section}>
              {section === "account" ? (
                accountCard
              ) : (
                <SettingsSectionCard section={section} onToggle={() => setExpandedSection(section)} />
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
        <SettingsSectionCard section={expandedSection} expanded onToggle={() => setExpandedSection(null)} />
      )}
      {expandedSection === "achievements" ? <AccountAchievementsSection achievements={achievements} /> : null}
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
