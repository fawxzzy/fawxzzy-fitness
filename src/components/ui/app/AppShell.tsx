import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

type AppShellProps = {
  children: ReactNode;
  className?: string;
  topNavMode?: "main" | "none";
};

export function AppShell({ children, className, topNavMode = "main" }: AppShellProps) {
  const shellStyle = topNavMode === "none"
    ? ({
        "--app-header-offset": "0px",
        "--app-top-inset": "env(safe-area-inset-top, 0px)",
        "--screen-gutter-top": "12px",
      } as CSSProperties)
    : undefined;

  return <div className={cn("min-h-[100dvh] min-h-0 flex flex-col", className)} style={shellStyle}>{children}</div>;
}
