import { AppNav } from "@/components/AppNav";
import { SignOutButton } from "@/components/SignOutButton";
import { requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="rounded-md bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">Logged in as</p>
        <p className="font-medium">{user.email}</p>
      </div>
      <SignOutButton />
      <AppNav />
    </section>
  );
}
