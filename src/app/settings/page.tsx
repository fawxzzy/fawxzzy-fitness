import { AppNav } from "@/components/AppNav";
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
    <section className="space-y-4">
      <AppNav />
      <Glass variant="base" className="p-4" interactive={false}>
        <p className="text-sm text-slate-600">Logged in as</p>
        <p className="font-medium">{user.email}</p>
      </Glass>
      <GlassEffectsSettings />
      <Glass variant="base" className="space-y-3 p-4" interactive={false}>
        <div className="border-t border-white/10 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Danger zone</p>
        </div>
        <SignOutButton />
      </Glass>
    </section>
  );
}
