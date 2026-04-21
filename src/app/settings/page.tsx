import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { AccountSettingsForm } from "@/components/settings/AccountSettingsForm";
import { GlassEffectsSettings } from "@/components/settings/GlassEffectsSettings";
import { LegacyMigrationSettings } from "@/components/settings/LegacyMigrationSettings";
import { SettingsBottomSignOutAction } from "@/components/settings/SettingsBottomSignOutAction";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { appTokens } from "@/components/ui/app/tokens";
import { Chip } from "@/components/ui/Chip";
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
                className={appTokens.settingsCardHeader}
              />
            </SurfaceCard>
          </ContentRail>
        )}
      >
        <ContentRail className="flex min-h-0 flex-1 flex-col gap-3 py-1">
          <SurfaceCard>
            <AppHeader
              title="Data & Account"
              meta="Keep your sign-in email current, and import legacy data only if you still need the old project moved over."
              titleAs="h2"
              className={appTokens.settingsCardHeader}
              titleClassName={appTokens.settingsSectionTitle}
            />
            <AccountSettingsForm email={user.email ?? ""} username={username} />
            <LegacyMigrationSettings
              legacyBridgeConfigured={legacyBridgeConfigured}
              defaultLegacyEmail={user.email ?? ""}
            />
          </SurfaceCard>

          <SurfaceCard>
            <AppHeader
              title="Preferences"
              meta="Tune visual density and default units without changing the rest of the app shell."
              titleAs="h2"
              className={appTokens.settingsCardHeader}
              titleClassName={appTokens.settingsSectionTitle}
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
