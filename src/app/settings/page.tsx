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
            eyebrow="Account"
            title="Account"
            subtitle="Manage profile context and app appearance."
            meta={(
              <DetailMetaRow>
                <DetailMetaChip label="Signed in" value={user.email ?? "Unknown email"} emphasized />
              </DetailMetaRow>
            )}
          />

          <DetailSection title="Account" description="Your active sign-in identity for this device.">
            <div className="space-y-1 rounded-[1rem] border border-white/8 bg-black/10 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Email</p>
              <p className="break-all text-sm font-medium text-[rgb(var(--text)/0.96)]">{user.email ?? "Unknown email"}</p>
            </div>
          </DetailSection>

          <DetailSection title="Appearance" description="Control shared glass and translucency effects.">
            <GlassEffectsSettings />
          </DetailSection>

          <DetailSection title="Sign out" description="End this device session." className="border-red-400/20">
            <div className="space-y-2">
              <SignOutButton />
              <p className="text-xs text-[rgb(var(--text-muted)/0.78)]">You can sign back in anytime.</p>
            </div>
          </DetailSection>
        </div>
      </ScrollContainer>
    </MainTabScreen>
  );
}
