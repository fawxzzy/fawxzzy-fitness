"use client";

import { AccountSettingsForm } from "@/components/settings/AccountSettingsForm";
import { AppThemeSettings } from "@/components/settings/AppThemeSettings";
import { LegacyMigrationSettings } from "@/components/settings/LegacyMigrationSettings";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { useSettingsScreenState, type SettingsSectionKey } from "@/components/settings/SettingsScreenState";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";

type SettingsSectionMeta = {
  title: string;
  summary?: string;
};

export function getSettingsSectionMeta(section: Exclude<SettingsSectionKey, null>): SettingsSectionMeta | null {
  switch (section) {
    case "account":
      return { title: "Account" };
    case "theme":
      return { title: "App Theme" };
    case "legacy":
      return { title: "Legacy & Migration" };
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
          {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
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
  preferredWeightUnit,
  preferredDistanceUnit,
}: {
  email: string;
  username: string;
  legacyBridgeConfigured: boolean;
  preferredWeightUnit: "lbs" | "kg";
  preferredDistanceUnit: "mi" | "km";
}) {
  const { expandedSection, setExpandedSection } = useSettingsScreenState();

  const showAccount = expandedSection === null || expandedSection === "account";
  const showLegacy = expandedSection === null || expandedSection === "legacy";
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
            <AppThemeSettings
              preferredWeightUnit={preferredWeightUnit}
              preferredDistanceUnit={preferredDistanceUnit}
            />
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
    </div>
  );
}
