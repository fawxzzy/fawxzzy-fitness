import { AppNav } from "@/components/AppNav";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { GlassEffectsSettings } from "@/components/settings/GlassEffectsSettings";
import { Glass } from "@/components/ui/Glass";
import { SignOutButton } from "@/components/SignOutButton";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  await ensureProfile(user.id);

  return (
    <MainTabScreen>
      <AppNav />
      <Glass variant="base" className="p-4" interactive={false}>
        <p className="text-sm text-[rgb(var(--text)/0.7)]">Logged in as</p>
        <p className="font-semibold text-[rgb(var(--text)/0.96)]">{user.email}</p>
      </Glass>
      <GlassEffectsSettings />
      <Glass variant="base" className="space-y-3 border border-white/12 p-4" interactive={false}>
        <div className="border-t border-white/10 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Danger zone</p>
        </div>
        <SignOutButton />
      </Glass>
    </MainTabScreen>
  );
}
