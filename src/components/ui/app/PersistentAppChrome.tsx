"use client";

import { usePathname } from "next/navigation";
import { AppAmbientBackdrop } from "@/components/layout/AppAmbientBackdrop";
import { AppBackdrop } from "@/components/layout/AppBackdrop";
import { AppEdgeFrame } from "@/components/layout/AppEdgeFrame";
import { resolveAppBackdropForPathname } from "@/lib/ambient/app-backdrop";
import { resolveAmbientPresetForPathname, shouldRenderPersistentEdgeFrame } from "@/lib/ambient/route-preset";

export function PersistentAppChrome() {
  const pathname = usePathname();
  const preset = resolveAmbientPresetForPathname(pathname);
  const showEdgeFrame = shouldRenderPersistentEdgeFrame(pathname);
  // Screens that opt in to the static backdrop (Today first) draw it instead of the animated ambient scene.
  const backdrop = resolveAppBackdropForPathname(pathname);

  if (!preset) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <div className="app-standalone-safe-area-bleed" aria-hidden="true" />
      {backdrop ? <AppBackdrop variant={backdrop} /> : <AppAmbientBackdrop preset={preset} />}
      {showEdgeFrame ? <AppEdgeFrame preset={preset} /> : null}
    </div>
  );
}
