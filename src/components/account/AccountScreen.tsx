import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { AccountSettingsForm } from "@/components/settings/AccountSettingsForm";
import { SettingsHeaderIdentity } from "@/components/settings/SettingsHeaderIdentity";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { standaloneHeaderFamily } from "@/components/ui/app/standaloneHeaderFamily";
import { appTokens } from "@/components/ui/app/tokens";

export function AccountScreen({
  email,
  username,
  returnHref,
  activePathnameOverride,
}: {
  email: string;
  username: string;
  returnHref: string;
  activePathnameOverride?: string;
}) {
  return (
    <MainTabScreen topNavMode="none" ambientPreset="today">
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" activePathnameOverride={activePathnameOverride} />}
        floatingHeader={(
          <ContentRail className={appTokens.settingsFloatingHeaderRail}>
            <div className="space-y-3 px-4 py-3">
              <AppHeader
                title="Account"
                align="center"
                className={standaloneHeaderFamily.headerClassName}
                actionClassName={standaloneHeaderFamily.actionClassName}
                titleClassName={standaloneHeaderFamily.titleClassName}
                action={(
                  <TopRightBackButton
                    href={returnHref}
                    historyBehavior="fallback-only"
                    ariaLabel="Back to Settings"
                  />
                )}
              />
              <SettingsHeaderIdentity email={email} username={username} />
            </div>
          </ContentRail>
        )}
      >
        <ContentRail className={appTokens.settingsContentRail}>
          <SurfaceCard
            className="!border-transparent !bg-transparent !shadow-none !backdrop-blur-0"
            data-testid="account-screen"
          >
            <AccountSettingsForm email={email} username={username} />
          </SurfaceCard>
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
