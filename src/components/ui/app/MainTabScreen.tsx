import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AppShell } from "@/components/ui/app/AppShell";

type MainTabScreenProps = {
  children: ReactNode;
  className?: string;
};

export function MainTabScreen({ children, className }: MainTabScreenProps) {
  return (
    <AppShell className={cn("space-y-3", className)}>
      {children}
    </AppShell>
  );
}

