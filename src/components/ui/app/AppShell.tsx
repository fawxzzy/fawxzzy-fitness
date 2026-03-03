import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

type AppShellProps = {
  children: ReactNode;
  className?: string;
  topNavMode?: "main" | "none";
};

export function AppShell({ children, className, topNavMode = "main" }: AppShellProps) {
  const shellStyle = ({
    "--app-top-inset": "env(safe-area-inset-top, 0px)",
    "--app-nav-gap": topNavMode === "none" ? "0px" : "10px",
    "--app-nav-h": "var(--header-h)",
    "--app-nav-top": "calc(var(--app-top-inset) + var(--app-nav-gap))",
    "--app-content-top": topNavMode === "none" ? "0px" : "calc(var(--app-nav-top) + var(--app-nav-h) + 8px)",
    "--app-bottom-inset": "env(safe-area-inset-bottom, 0px)",
    "--app-bottom-gap": "3px",
  } as CSSProperties);

  return (
    <div className={cn("app-shell min-h-[100dvh] min-h-0 flex flex-col pt-[var(--app-content-top)]", className)} data-top-nav-mode={topNavMode} style={shellStyle}>
      {children}
    </div>
  );
}
