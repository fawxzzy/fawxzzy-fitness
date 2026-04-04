import { AppNav } from "@/components/AppNav";
import { DetailMetaChip, DetailMetaRow, DetailSection } from "@/components/DetailSurface";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { AccountSettingsForm } from "@/components/settings/AccountSettingsForm";
import { GlassEffectsSettings } from "@/components/settings/GlassEffectsSettings";
import { SettingsBottomSignOutAction } from "@/components/settings/SettingsBottomSignOutAction";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);

  return (
    <MainTabScreen topNavMode="none">
      <ScrollScreenWithBottomActions topChrome={<AppNav mode="topChrome" />} className="px-1">
        <div className="flex min-h-0 flex-1 flex-col gap-3 py-1">
          <DetailMetaRow>
            <DetailMetaChip label="Signed in" value={user.email ?? "Unknown email"} emphasized />
          </DetailMetaRow>

          <DetailSection title="Profile">
            <AccountSettingsForm email={user.email ?? ""} />
          </DetailSection>

          <DetailSection title="Preferences">
            <GlassEffectsSettings
              preferredWeightUnit={profile.preferred_weight_unit ?? "lbs"}
              preferredDistanceUnit={profile.preferred_distance_unit ?? "mi"}
            />
          </DetailSection>
        </div>

        <SettingsBottomSignOutAction />
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
