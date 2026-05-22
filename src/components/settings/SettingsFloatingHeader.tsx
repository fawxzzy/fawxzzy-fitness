"use client";

import { ContentRail } from "@/components/layout/ContentRail";
import { getSettingsSectionMeta, SettingsAccordionTrigger } from "@/components/settings/SettingsAccordionClient";
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
        <SettingsHeaderIdentity email={email} username={username} />
        {activeSectionMeta ? (
          <SettingsAccordionTrigger
            title={activeSectionMeta.title}
            summary={activeSectionMeta.summary}
            expanded
            onClick={() => setExpandedSection(null)}
          />
        ) : null}
      </div>
    </ContentRail>
  );
}
