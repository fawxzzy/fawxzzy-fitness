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
    "--app-header-gap": topNavMode === "main" ? "8px" : "0px",
    "--app-safe-top": "env(safe-area-inset-top, 0px)",
    "--app-safe-bottom": "env(safe-area-inset-bottom, 0px)",
    "--app-safe-left": "env(safe-area-inset-left, 0px)",
    "--app-safe-right": "env(safe-area-inset-right, 0px)",
    "--app-top-inset": "var(--app-safe-top)",
    "--app-top-offset": "calc(var(--app-top-inset) + var(--app-header-offset) + var(--app-header-gap))",
    "--app-bottom-inset": "var(--app-safe-bottom)",
    "--app-bottom-gap": "3px",
  } as CSSProperties);

  return (
    <div className={cn("app-shell h-[100dvh] min-h-0 overflow-hidden flex flex-col pt-[var(--app-top-offset)]", className)} data-top-nav-mode={topNavMode} style={shellStyle}>
      {children}
    </div>
  );
}
