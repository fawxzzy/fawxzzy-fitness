import { AppShell } from "@/components/ui/app/AppShell";
import { StretchInfoPreviewSurface } from "@/app/dev/stretch-hub/StretchInfoPreviewSurface";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";

export default function DevStretchInfoPreviewPage() {
  assertDevPageAvailable();

  return (
    <AppShell topNavMode="none" ambientPreset="logSet">
      <StretchInfoPreviewSurface />
    </AppShell>
  );
}
