import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { AccountSettingsForm } from "@/components/settings/AccountSettingsForm";
import { GlassEffectsSettings } from "@/components/settings/GlassEffectsSettings";
import { SettingsBottomSignOutAction } from "@/components/settings/SettingsBottomSignOutAction";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { Chip } from "@/components/ui/Chip";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

const CARD_HEADER_CLASS_NAME = "-mx-4 -mt-1 pb-1 sm:-mx-5";
const SECTION_TITLE_CLASS_NAME = "text-[1.3125rem] font-semibold leading-[1.04] tracking-[-0.03em]";

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);

  return (
    <MainTabScreen topNavMode="none">
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={(
          <ContentRail className="py-1">
            <SurfaceCard dense>
              <AppHeader
                title="Settings"
                subtitle="Account, defaults, and appearance"
                meta={user.email ?? "Unknown email"}
                action={<Chip tone="success">Signed in</Chip>}
                className={CARD_HEADER_CLASS_NAME}
              />
            </SurfaceCard>
          </ContentRail>
        )}
      >
        <ContentRail className="flex min-h-0 flex-1 flex-col gap-3 py-1">
          <SurfaceCard>
            <AppHeader
              title="Profile"
              meta="Keep your sign-in email current for recovery and verification flows."
              titleAs="h2"
              className={CARD_HEADER_CLASS_NAME}
              titleClassName={SECTION_TITLE_CLASS_NAME}
            />
            <AccountSettingsForm email={user.email ?? ""} />
          </SurfaceCard>

          <SurfaceCard>
            <AppHeader
              title="Preferences"
              meta="Tune visual density and default units without changing the rest of the app shell."
              titleAs="h2"
              className={CARD_HEADER_CLASS_NAME}
              titleClassName={SECTION_TITLE_CLASS_NAME}
            />
            <GlassEffectsSettings
              preferredWeightUnit={profile.preferred_weight_unit ?? "lbs"}
              preferredDistanceUnit={profile.preferred_distance_unit ?? "mi"}
            />
          </SurfaceCard>
        </ContentRail>

        <SettingsBottomSignOutAction />
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
