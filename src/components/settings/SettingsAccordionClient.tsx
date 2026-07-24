"use client";

import { AccountSettingsForm } from "@/components/settings/AccountSettingsForm";
import { AccountAchievementsSection } from "@/components/settings/AccountAchievementsSection";
import { AppThemeSettings } from "@/components/settings/AppThemeSettings";
import { DataSettingsSection } from "@/components/settings/DataSettingsSection";
import { DiscordAccessSettings } from "@/components/settings/DiscordAccessSettings";
import { LegacyMigrationSettings } from "@/components/settings/LegacyMigrationSettings";
import { ProAccessSettings } from "@/components/settings/ProAccessSettings";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import {
  SETTINGS_LEGACY_MIGRATION_ENABLED,
  useSettingsScreenState,
  type SettingsSectionKey,
} from "@/components/settings/SettingsScreenState";
import { StateChevron } from "@/components/ui/StateChevron";
import { canAccessQaLlelVisibilitySetting } from "@/lib/qa-data-visibility";
import type { ProAccessSnapshot } from "@/lib/billing/pro-access-snapshot";
import type { HistoryAchievement } from "@/lib/history-achievements";

type SettingsSectionMeta = {
  title: string;
  summary?: string;
};

export function getSettingsSectionMeta(section: Exclude<SettingsSectionKey, null>): SettingsSectionMeta | null {
  switch (section) {
    case "account":
      return { title: "Account" };
    case "achievements":
      return { title: "Achievements" };
    case "theme":
      return { title: "App Theme" };
    case "pro":
      return { title: "Pro Access" };
    case "data":
      return { title: "Data" };
    case "legacy":
      return SETTINGS_LEGACY_MIGRATION_ENABLED ? { title: "Legacy & Migration" } : null;
    case "discord":
      return { title: "Discord Connector" };
    default:
      return null;
  }
}

export function SettingsAccordionTrigger({
  title,
  summary,
  expanded,
  onClick,
}: {
  title: string;
  summary?: string;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onClick}
      className="group relative block w-full appearance-none !border-0 !bg-transparent px-1 pt-3 pb-2 shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
    >
      <span className="grid min-h-[2rem] grid-cols-[2rem_minmax(0,1fr)_2rem] items-end px-4 pb-3">
        <span aria-hidden="true" />
        <span className="min-w-0 w-full text-center">
          <span className="block text-[1.05rem] font-semibold leading-tight text-[rgb(var(--text-primary)/0.98)]">{title}</span>
          {summary ? (
            <span className="mt-1 block text-sm leading-5 text-[rgb(var(--text-secondary)/0.88)]">{summary}</span>
          ) : null}
        </span>
        <span className="flex items-center justify-end text-[rgb(var(--text-muted)/0.84)] transition-colors group-hover:text-[rgb(var(--text-secondary)/0.96)]">
          <StateChevron expanded={expanded} className="h-4 w-4" />
        </span>
      </span>
      <MetricAccentBar variant="thin" className="opacity-85 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

export function SettingsAccordionClient({
  email,
  username,
  legacyBridgeConfigured,
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
  email: string;
  username: string;
  legacyBridgeConfigured: boolean;
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

  const showAccount = expandedSection === null || expandedSection === "account";
  const showAchievements = expandedSection === null || expandedSection === "achievements";
  const showPro = expandedSection === null || expandedSection === "pro";
  const showData = expandedSection === null || expandedSection === "data";
  const showLegacy = SETTINGS_LEGACY_MIGRATION_ENABLED && (expandedSection === null || expandedSection === "legacy");
  const showDiscord = expandedSection === null || expandedSection === "discord";
  const showTheme = expandedSection === null || expandedSection === "theme";

  return (
    <div className="space-y-3">
      {showAccount ? (
        <div className="space-y-3">
          {expandedSection !== "account" ? (
            <SettingsAccordionTrigger
              title="Account"
              expanded={false}
              onClick={() => setExpandedSection("account")}
            />
          ) : null}
          {expandedSection === "account" ? <AccountSettingsForm email={email} username={username} /> : null}
        </div>
      ) : null}

      {showAchievements ? (
        <div className="space-y-3">
          {expandedSection !== "achievements" ? (
            <SettingsAccordionTrigger
              title="Achievements"
              expanded={false}
              onClick={() => setExpandedSection("achievements")}
            />
          ) : null}
          {expandedSection === "achievements" ? <AccountAchievementsSection achievements={achievements} /> : null}
        </div>
      ) : null}

      {showPro ? (
        <div className="space-y-3">
          {expandedSection !== "pro" ? (
            <SettingsAccordionTrigger
              title="Pro Access"
              expanded={false}
              onClick={() => setExpandedSection("pro")}
            />
          ) : null}
          {expandedSection === "pro" ? (
            <ProAccessSettings snapshot={proAccess} billingNotice={billingNotice} />
          ) : null}
        </div>
      ) : null}

      {showData ? (
        <div className="space-y-3">
          {expandedSection !== "data" ? (
            <SettingsAccordionTrigger
              title="Data"
              expanded={false}
              onClick={() => setExpandedSection("data")}
            />
          ) : null}
          {expandedSection === "data" ? (
            <DataSettingsSection
              canAccessQaLlelUi={canAccessQaVisibilitySetting}
              userKind={userKind}
              showQaLlelData={showQaLlelData}
              initialExportDateFrom={initialExportDateFrom}
              initialExportDateTo={initialExportDateTo}
            />
          ) : null}
        </div>
      ) : null}

      {showTheme ? (
        <div className="space-y-3">
          {expandedSection !== "theme" ? (
            <SettingsAccordionTrigger
              title="App Theme"
              expanded={false}
              onClick={() => setExpandedSection("theme")}
            />
          ) : null}
          {expandedSection === "theme" ? (
            <AppThemeSettings />
          ) : null}
        </div>
      ) : null}

      {showLegacy ? (
        <div className="space-y-3">
          {expandedSection !== "legacy" ? (
            <SettingsAccordionTrigger
              title="Legacy & Migration"
              expanded={false}
              onClick={() => setExpandedSection("legacy")}
            />
          ) : null}
          {expandedSection === "legacy" ? (
            <LegacyMigrationSettings
              legacyBridgeConfigured={legacyBridgeConfigured}
              defaultLegacyEmail={email}
            />
          ) : null}
        </div>
      ) : null}

      {showDiscord ? (
        <div className="space-y-3">
          {expandedSection !== "discord" ? (
            <SettingsAccordionTrigger
              title="Discord Connector"
              expanded={false}
              onClick={() => setExpandedSection("discord")}
            />
          ) : null}
          {expandedSection === "discord" ? <DiscordAccessSettings /> : null}
        </div>
      ) : null}
    </div>
  );
}
