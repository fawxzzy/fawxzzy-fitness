import { AccountPortalReturnRefresh } from "@/components/account/AccountPortalReturnRefresh";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { AccountSignOutActions } from "@/components/settings/SettingsSectionsClient";
import { CardHeader, CardMeta, CardSurface, cardTokens } from "@/components/ui/card-system";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { ScreenHeaderBackButton } from "@/components/ui/app/ScreenHeaderBackButton";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import { appTokens } from "@/components/ui/app/tokens";
import { ACCOUNT_PORTAL_LINK_ATTRIBUTE, getFitnessAccountPortalUrl, getFitnessSignOutEverywhereUrl } from "@/lib/account-portal";

/**
 * Every Account row opens the portal Account page (username, email and Reset password live there). The return target is
 * Settings, the same one the Settings Account row already uses (and the screen that shows who is signed in).
 */
export const ACCOUNT_SCREEN_PORTAL_HREF = getFitnessAccountPortalUrl("/account", "/settings");
export const ACCOUNT_SCREEN_SIGN_OUT_EVERYWHERE_HREF = getFitnessSignOutEverywhereUrl("/settings");
const PORTAL_SUMMARY = "Opens account.fawxzzy.com";

/**
 * Account is a read-only detail screen (DESIGN-CONTRACT.md section 15): username, email and password are changed on
 * account.fawxzzy.com, so each row shows the current value and links there. Kept for direct visits to /account (old
 * links, bookmarks); Settings links straight to the portal. Back on the left, title "Account"; no tab bar.
 */
export function AccountScreen({
  email,
  username,
  returnHref,
}: {
  email: string;
  username: string;
  returnHref: string;
}) {
  const rows = [
    { key: "username", title: "Username", value: username.trim() },
    { key: "email", title: "Email", value: email.trim() },
    { key: "password", title: "Password", value: "" },
  ];

  return (
    <MainTabScreen topNavMode="none" ambientPreset="today">
      <AccountPortalReturnRefresh />
      <ScrollScreenWithBottomActions
        floatingHeader={(
          <ScreenHeader
            kind="detail"
            title="Account"
            back={<ScreenHeaderBackButton href={returnHref} historyBehavior="fallback-only" label="Back to Settings" />}
          />
        )}
      >
        <ContentRail className={appTokens.settingsContentRail}>
          <div className="fx-account space-y-3" data-testid="account-screen">
            <ul className={cardTokens.list}>
              {rows.map((row) => (
                <li key={row.key}>
                  <CardSurface tone="neutral" data-account-row={row.key}>
                    <CardHeader
                      title={row.title}
                      meta={<CardMeta items={row.value ? [row.value, PORTAL_SUMMARY] : [PORTAL_SUMMARY]} />}
                      headingLevel={2}
                      interaction={{
                        kind: "link",
                        href: ACCOUNT_SCREEN_PORTAL_HREF,
                        linkProps: { [ACCOUNT_PORTAL_LINK_ATTRIBUTE]: row.key },
                      }}
                    />
                  </CardSurface>
                </li>
              ))}
            </ul>
            <AccountSignOutActions everywhereHref={ACCOUNT_SCREEN_SIGN_OUT_EVERYWHERE_HREF} signedInAs={username.trim() || email.trim() || undefined} />
          </div>
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
