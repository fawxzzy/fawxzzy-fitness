import { AppShell } from "@/components/ui/app/AppShell";
import { ContentRail } from "@/components/layout/ContentRail";
import { BottomActionsProvider } from "@/components/layout/bottom-actions";
import { StretchCardPassSurface } from "@/app/dev/stretch-hub/StretchCardPassSurface";

export default function DevStretchCardPassPage() {
  return (
    <BottomActionsProvider>
      <AppShell topNavMode="none" ambientPreset="logSet">
        <main className="app-page-scroll min-h-[100dvh] pb-12 pt-[calc(max(var(--app-safe-top),var(--vv-top,0px))+0.75rem)]">
          <ContentRail className="flex flex-col gap-3">
            <StretchCardPassSurface />
          </ContentRail>
        </main>
      </AppShell>
    </BottomActionsProvider>
  );
}
