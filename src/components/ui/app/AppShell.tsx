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
    "--app-top-inset": "env(safe-area-inset-top, 0px)",
    "--app-top-gutter": "var(--screen-gutter-top, 12px)",
    "--app-top-offset": "calc(var(--app-top-inset) + var(--app-header-offset) + var(--app-top-gutter))",
    "--app-bottom-inset": "env(safe-area-inset-bottom, 0px)",
    "--app-bottom-gutter": "12px",
    "--app-bottom-bar-height": "0px",
    "--app-bottom-offset": "calc(var(--app-bottom-inset) + var(--app-bottom-bar-height))",
  } as CSSProperties);

  return (
    <div className={cn("app-shell min-h-[100dvh] min-h-0 flex flex-col", className)} data-top-nav-mode={topNavMode} style={shellStyle}>
      {children}
    </div>
  );
}
