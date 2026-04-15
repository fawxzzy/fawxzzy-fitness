"use client";

import { usePathname } from "next/navigation";
import { AppAmbientBackdrop } from "@/components/layout/AppAmbientBackdrop";
import { AppEdgeFrame } from "@/components/layout/AppEdgeFrame";
import { resolveAmbientPresetForPathname } from "@/lib/ambient/route-preset";

export function PersistentAppChrome() {
  const pathname = usePathname();
  const preset = resolveAmbientPresetForPathname(pathname);

  if (!preset) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <AppAmbientBackdrop preset={preset} />
      <AppEdgeFrame preset={preset} />
    </div>
  );
}
