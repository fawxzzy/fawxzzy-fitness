import { AppBoundaryProbeClient } from "@/app/dev/app-boundary-probe/AppBoundaryProbeClient";
import { AppShell } from "@/components/ui/app/AppShell";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";

export const dynamic = "force-dynamic";

export default function AppBoundaryProbePage({
  searchParams,
}: {
  searchParams?: {
    crash?: string;
  };
}) {
  assertDevPageAvailable();

  return (
    <AppShell topNavMode="none" ambientPreset="logSet">
      <AppBoundaryProbeClient autoCrash={searchParams?.crash === "1"} />
    </AppShell>
  );
}
