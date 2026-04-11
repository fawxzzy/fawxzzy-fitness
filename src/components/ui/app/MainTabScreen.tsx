import type { ReactNode } from "react";
import { AppShell } from "@/components/ui/app/AppShell";
import type { AmbientPreset } from "@/lib/ambient/tuning";

type MainTabScreenProps = {
  children: ReactNode;
  className?: string;
  topNavMode?: "main" | "none";
  ambientPreset?: AmbientPreset;
};

export function MainTabScreen({
  children,
  className,
  topNavMode = "main",
  ambientPreset = "viewDay",
}: MainTabScreenProps) {
  return (
    <AppShell topNavMode={topNavMode} className={className} ambientPreset={ambientPreset}>
      {children}
    </AppShell>
  );
}
