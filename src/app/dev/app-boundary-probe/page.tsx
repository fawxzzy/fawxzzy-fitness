import { AppBoundaryProbeClient } from "@/app/dev/app-boundary-probe/AppBoundaryProbeClient";
import { AppShell } from "@/components/ui/app/AppShell";

export const dynamic = "force-dynamic";

export default function AppBoundaryProbePage({
  searchParams,
}: {
  searchParams?: {
    crash?: string;
  };
}) {
  return (
    <AppShell topNavMode="none" ambientPreset="logSet">
      <AppBoundaryProbeClient autoCrash={searchParams?.crash === "1"} />
    </AppShell>
  );
}
