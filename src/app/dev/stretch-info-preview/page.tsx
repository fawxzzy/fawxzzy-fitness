import { AppShell } from "@/components/ui/app/AppShell";
import { StretchInfoPreviewSurface } from "@/app/dev/stretch-hub/StretchInfoPreviewSurface";

export default function DevStretchInfoPreviewPage() {
  return (
    <AppShell topNavMode="none" ambientPreset="logSet">
      <StretchInfoPreviewSurface />
    </AppShell>
  );
}
