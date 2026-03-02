import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

export function AppShell({ children, className }: AppShellProps) {
  return <div className={cn("min-h-[100dvh] min-h-0 flex flex-col", className)}>{children}</div>;
}

