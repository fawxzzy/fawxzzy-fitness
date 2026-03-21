import { AppNav } from "@/components/AppNav";
import { DetailHeader, DetailMetaChip, DetailMetaRow, DetailSection } from "@/components/DetailSurface";
import { GlassEffectsSettings } from "@/components/settings/GlassEffectsSettings";
import { SignOutButton } from "@/components/SignOutButton";
import { ScrollContainer } from "@/components/ui/app/ScrollContainer";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  await ensureProfile(user.id);

  return (
    <MainTabScreen>
      <AppNav />

      <ScrollContainer className="px-1">
        <div className="flex min-h-0 flex-1 flex-col gap-3 py-1">
          <DetailHeader
            eyebrow="Settings"
            title="Preferences"
            subtitle="Manage app appearance, account context, and sign-out actions using the shared detail surface structure."
            meta={(
              <DetailMetaRow>
                <DetailMetaChip label="Account" value={user.email ?? "Unknown email"} emphasized />
              </DetailMetaRow>
            )}
          />

          <DetailSection
            title="Appearance"
            description="Choose how strong translucent glass surfaces should appear across the app."
          >
            <GlassEffectsSettings />
          </DetailSection>

          <DetailSection
            title="Account"
            description="Keep your signed-in account context visible without introducing a route-local summary card."
          >
            <div className="space-y-1 rounded-[1rem] border border-white/8 bg-black/10 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Signed in as</p>
              <p className="break-all text-sm font-medium text-[rgb(var(--text)/0.96)]">{user.email}</p>
            </div>
          </DetailSection>

          <DetailSection
            title="Danger zone"
            description="Sign out of this device while leaving the rest of your settings structure unchanged."
            className="border-red-400/20"
          >
            <SignOutButton />
          </DetailSection>
        </div>
      </ScrollContainer>
    </MainTabScreen>
  );
}
