"use client";

import { usePathname } from "next/navigation";
import { AppAmbientBackdrop } from "@/components/layout/AppAmbientBackdrop";
import { AppEdgeFrame } from "@/components/layout/AppEdgeFrame";
import { resolveAmbientPresetForPathname, shouldRenderPersistentEdgeFrame } from "@/lib/ambient/route-preset";

export function PersistentAppChrome() {
  const pathname = usePathname();
  const preset = resolveAmbientPresetForPathname(pathname);
  const showEdgeFrame = shouldRenderPersistentEdgeFrame(pathname);

  if (!preset) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <div className="app-standalone-safe-area-bleed" aria-hidden="true" />
      <AppAmbientBackdrop preset={preset} />
      {showEdgeFrame ? <AppEdgeFrame preset={preset} /> : null}
    </div>
  );
}
