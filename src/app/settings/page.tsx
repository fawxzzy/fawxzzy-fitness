import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { SettingsAccordionClient } from "@/components/settings/SettingsAccordionClient";
import { SettingsBottomSignOutAction } from "@/components/settings/SettingsBottomSignOutAction";
import { SettingsFloatingHeader } from "@/components/settings/SettingsFloatingHeader";
import { SettingsScreenStateProvider } from "@/components/settings/SettingsScreenState";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { appTokens } from "@/components/ui/app/tokens";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { requireUser } from "@/lib/auth";
import { optionalEnv } from "@/lib/env";
import { ensureProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const rawMetadata = user.user_metadata && typeof user.user_metadata === "object" && !Array.isArray(user.user_metadata)
    ? user.user_metadata as Record<string, unknown>
    : {};
  const username = typeof rawMetadata.username === "string"
    ? rawMetadata.username.trim()
    : typeof rawMetadata.display_name === "string"
      ? rawMetadata.display_name.trim()
      : "";
  const legacyBridgeConfigured = Boolean(
    optionalEnv("LEGACY_SUPABASE_URL") && optionalEnv("LEGACY_SUPABASE_ANON_KEY"),
  );

  return (
    <MainTabScreen topNavMode="none" ambientPreset="modal">
      <SettingsScreenStateProvider>
        <ScrollScreenWithBottomActions
          topChrome={<AppNav mode="topChrome" />}
          floatingHeader={<SettingsFloatingHeader email={user.email ?? ""} username={username} />}
        >
          <ContentRail className={appTokens.settingsContentRail}>
            <SurfaceCard className="border-transparent shadow-none">
              <SettingsAccordionClient
                email={user.email ?? ""}
                username={username}
                legacyBridgeConfigured={legacyBridgeConfigured}
                preferredWeightUnit={profile.preferred_weight_unit ?? "lbs"}
                preferredDistanceUnit={profile.preferred_distance_unit ?? "mi"}
              />
            </SurfaceCard>
          </ContentRail>

          <SettingsBottomSignOutAction />
        </ScrollScreenWithBottomActions>
      </SettingsScreenStateProvider>
    </MainTabScreen>
  );
}
