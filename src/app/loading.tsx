import { AuthCard, AuthShell } from "@/components/auth/AuthShell";
import { FawxzzySigilLoader } from "@/components/ui/FawxzzySigilLoader";

export default function AppLoading() {
  return (
    <AuthShell className="justify-center">
      <AuthCard className="space-y-4 text-center">
        <div className="flex justify-center">
          <FawxzzySigilLoader size="lg" />
        </div>
        <div className="space-y-1" data-testid="startup-loading-screen">
          <p className="text-base font-semibold text-white">Opening FawxzzyFitness</p>
          <p className="text-sm leading-6 text-slate-300">Preparing your install-aware start screen.</p>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
