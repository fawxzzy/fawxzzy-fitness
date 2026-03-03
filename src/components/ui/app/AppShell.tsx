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
    "--app-top-offset": "calc(var(--app-top-inset) + var(--app-header-offset))",
    "--app-bottom-inset": "env(safe-area-inset-bottom, 0px)",
    "--app-bottom-gap": "3px",
    "--app-bottom-bar-height": "0px",
    "--app-bottom-offset": "calc(var(--app-bottom-inset) + var(--app-bottom-gap) + var(--app-bottom-bar-height))",
  } as CSSProperties);

  return (
    <div className={cn("app-shell min-h-[100dvh] min-h-0 flex flex-col pt-[var(--app-top-offset)]", className)} data-top-nav-mode={topNavMode} style={shellStyle}>
      {children}
    </div>
  );
}
