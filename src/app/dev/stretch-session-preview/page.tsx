import { AppShell } from "@/components/ui/app/AppShell";
import { BottomActionsProvider } from "@/components/layout/bottom-actions";
import { StretchSessionPreview } from "@/app/dev/stretch-hub/StretchSessionPreview";

export default function DevStretchSessionPreviewPage() {
  return (
    <BottomActionsProvider>
      <AppShell topNavMode="none" ambientPreset="logSet">
        <main className="app-page-scroll min-h-[100dvh] px-3 pb-10 pt-[calc(max(var(--app-safe-top),var(--vv-top,0px))+0.75rem)]">
          <div className="mx-auto flex min-h-[100dvh] w-full max-w-[28rem] flex-col justify-start">
            <StretchSessionPreview />
          </div>
        </main>
      </AppShell>
    </BottomActionsProvider>
  );
}
