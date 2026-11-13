"use client";

import { useRouter } from "next/navigation";
import { AccountAchievementsSection } from "@/components/settings/AccountAchievementsSection";
import { AppThemeSettings } from "@/components/settings/AppThemeSettings";
import { DataSettingsSection } from "@/components/settings/DataSettingsSection";
import { DiscordAccessSettings } from "@/components/settings/DiscordAccessSettings";
import { ProAccessSettings } from "@/components/settings/ProAccessSettings";
import { useSettingsScreenState, type SettingsSectionKey } from "@/components/settings/SettingsScreenState";
import { CardHeader, CardMeta, CardSurface, cardTokens } from "@/components/ui/card-system";
import type { ProAccessSnapshot } from "@/lib/billing/pro-access-snapshot";
import type { HistoryAchievement } from "@/lib/history-achievements";
import { getAccountRouteHref } from "@/lib/account-navigation";

type SettingsSectionId = Exclude<SettingsSectionKey, null>;

type SettingsSectionMeta = {
  title: string;
  summary: string;
};

/** Settings sections in screen order. `account` opens its own route; every other section expands in place. */
export const SETTINGS_SECTION_ORDER: readonly SettingsSectionId[] = ["account", "achievements", "pro", "data", "theme", "discord"];

export function getSettingsSectionMeta(section: SettingsSectionId): SettingsSectionMeta | null {
  switch (section) {
    case "account":
      return { title: "Account", summary: "Username, email, password and sign out" };
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

/**
 * One Settings section as a card. `Account` navigates (right chevron); the others expand a panel (down chevron).
 * When `expanded`, the card is the screen's `h2` in the floating header and collapses the panel again.
 */
export function SettingsSectionCard({
  section,
  expanded = false,
  onPress,
  onToggle,
}: {
  section: SettingsSectionId;
  expanded?: boolean;
  /** Navigate (Account). */
  onPress?: () => void;
  /** Expand or collapse (everything else). */
  onToggle?: () => void;
}) {
  const meta = getSettingsSectionMeta(section);
  if (!meta) {
    return null;
  }

  return (
    <CardSurface tone={expanded ? "current" : "neutral"} data-settings-section-card={section}>
      <CardHeader
        title={meta.title}
        meta={<CardMeta items={[meta.summary]} />}
        headingLevel={2}
        interaction={onPress
          ? { kind: "press", onPress }
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
}: {
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
  const router = useRouter();
  const { expandedSection, setExpandedSection } = useSettingsScreenState();

  // Collapsed: the list of section cards. Expanded: only that section's panel (its card is in the floating header).
  if (expandedSection === null) {
    return (
      <ul className={cardTokens.list}>
        {SETTINGS_SECTION_ORDER.map((section) => (
          <li key={section}>
            {section === "account" ? (
              <SettingsSectionCard section={section} onPress={() => router.push(getAccountRouteHref("/settings"))} />
            ) : (
              <SettingsSectionCard section={section} onToggle={() => setExpandedSection(section)} />
            )}
          </li>
        ))}
      </ul>
    );
  }

  const meta = getSettingsSectionMeta(expandedSection);

  return (
    <div id={getSettingsPanelId(expandedSection)} role="region" aria-label={meta?.title} className="space-y-3">
      {expandedSection === "account" ? (
        <SettingsSectionCard section="account" onPress={() => router.push(getAccountRouteHref("/settings"))} />
      ) : null}
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
