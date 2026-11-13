"use client";

import { ContentRail } from "@/components/layout/ContentRail";
import { getSettingsSectionMeta, SettingsSectionCard } from "@/components/settings/SettingsSectionsClient";
import { SettingsHeaderIdentity } from "@/components/settings/SettingsHeaderIdentity";
import { appTokens } from "@/components/ui/app/tokens";
import { useSettingsScreenState } from "@/components/settings/SettingsScreenState";

export function SettingsFloatingHeader({
  email,
  username,
}: {
  email: string;
  username: string;
}) {
  const { expandedSection, setExpandedSection } = useSettingsScreenState();
  const activeSectionMeta = expandedSection ? getSettingsSectionMeta(expandedSection) : null;

  return (
    <ContentRail className={appTokens.settingsFloatingHeaderRail}>
      <div className="space-y-3 px-4 py-3">
        {/* The screen has no visible page title (the identity line is the header); this keeps h1 > h2 > h3 valid. */}
        <h1 className="sr-only">Settings</h1>
        <SettingsHeaderIdentity email={email} username={username} />
        {expandedSection && activeSectionMeta ? (
          <SettingsSectionCard section={expandedSection} expanded onToggle={() => setExpandedSection(null)} />
        ) : null}
      </div>
    </ContentRail>
  );
}
