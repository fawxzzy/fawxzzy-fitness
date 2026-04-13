import { AuthShell, AuthStatusCard } from "@/components/auth/AuthShell";

export default function AppLoading() {
  return (
    <AuthShell className="justify-center">
      <AuthStatusCard
        title="Opening FawxzzyFitness"
        description="Preparing your install-aware start screen."
        testId="startup-loading-screen"
      />
    </AuthShell>
  );
}
