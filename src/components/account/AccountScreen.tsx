import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { AccountPasswordSection } from "@/components/settings/AccountPasswordSection";
import { AccountSettingsForm } from "@/components/settings/AccountSettingsForm";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { ScreenBackButton } from "@/components/ui/app/ScreenBackButton";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import { appTokens } from "@/components/ui/app/tokens";

// Account is a detail screen pushed from Settings (DESIGN-CONTRACT.md section 15): Back on the left, title
// "Account", the username (or email) as the one subtitle line. No tab bar, no second identity block.
export function AccountScreen({
  email,
  username,
  returnHref,
}: {
  email: string;
  username: string;
  returnHref: string;
}) {
  return (
    <MainTabScreen topNavMode="none" ambientPreset="today">
      <ScrollScreenWithBottomActions
        floatingHeader={(
          <ScreenHeader
            kind="detail"
            title="Account"
            subtitle={username.trim() || email.trim() || null}
            back={<ScreenBackButton href={returnHref} historyBehavior="fallback-only" label="Back to Settings" />}
          />
        )}
      >
        <ContentRail className={appTokens.settingsContentRail}>
          <div className="fx-account space-y-3" data-testid="account-screen">
            <AccountSettingsForm email={email} username={username} />
            <AccountPasswordSection email={email} />
          </div>
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
