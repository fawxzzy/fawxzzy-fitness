"use client";

import { ContentRail } from "@/components/layout/ContentRail";
import { getSettingsSectionMeta, SettingsAccordionTrigger } from "@/components/settings/SettingsAccordionClient";
import { SettingsHeaderIdentity } from "@/components/settings/SettingsHeaderIdentity";
import { useSettingsScreenState } from "@/components/settings/SettingsScreenState";
import { appTokens } from "@/components/ui/app/tokens";

export function SettingsFloatingHeader({
  email,
  username,
}: {
  email: string;
  username: string;
}) {
  const { expandedSection, setExpandedSection } = useSettingsScreenState();
  const shouldHideIdentity = expandedSection === "theme";
  const activeSectionMeta = expandedSection ? getSettingsSectionMeta(expandedSection) : null;

  if (shouldHideIdentity && !activeSectionMeta) {
    return null;
  }

  return (
    <ContentRail className={appTokens.settingsFloatingHeaderRail}>
      <div className="space-y-3 px-4 py-3">
        {!shouldHideIdentity ? <SettingsHeaderIdentity email={email} username={username} /> : null}
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
