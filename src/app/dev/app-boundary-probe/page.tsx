import { AppBoundaryProbeClient } from "@/app/dev/app-boundary-probe/AppBoundaryProbeClient";
import { AppShell } from "@/components/ui/app/AppShell";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";

export const dynamic = "force-dynamic";

export default async function AppBoundaryProbePage(
  props: {
    searchParams?: Promise<{
      crash?: string;
    }>;
  }
) {
  await assertDevPageAvailable();
  const searchParams = await props.searchParams;

  return (
    <AppShell topNavMode="none" ambientPreset="logSet">
      <AppBoundaryProbeClient autoCrash={searchParams?.crash === "1"} />
    </AppShell>
  );
}
