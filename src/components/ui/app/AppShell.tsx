import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

type AppShellProps = {
  children: ReactNode;
  className?: string;
  topNavMode?: "main" | "none";
};

export function AppShell({ children, className, topNavMode = "main" }: AppShellProps) {
  const shellStyle = ({
    "--app-header-offset": topNavMode === "none" ? "0px" : "var(--header-h)",
    "--app-header-gap": topNavMode === "main" ? "12px" : "0px",
    "--app-safe-top": "env(safe-area-inset-top, 0px)",
    "--app-safe-bottom": "env(safe-area-inset-bottom, 0px)",
    "--app-safe-left": "env(safe-area-inset-left, 0px)",
    "--app-safe-right": "env(safe-area-inset-right, 0px)",
    "--app-top-inset": "var(--app-safe-top)",
    "--app-top-offset": "calc(var(--app-top-inset) + var(--app-header-offset) + var(--app-header-gap))",
    "--app-bottom-inset": "var(--app-safe-bottom)",
    "--app-bottom-gap": "3px",
    "--app-top-chrome-content-gap": "10px",
    "--app-mobile-dock-clearance-gap": "6px",
  } as CSSProperties);

  return (
    <div className={cn("app-shell flex h-[100dvh] min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden overflow-y-hidden pt-[var(--app-top-offset)] touch-pan-y [overscroll-behavior-x:none]", className)} data-top-nav-mode={topNavMode} style={shellStyle}>
      {children}
    </div>
  );
}
