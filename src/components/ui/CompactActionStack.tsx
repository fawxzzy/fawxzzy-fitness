import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function CompactActionStack({
  children,
  className,
  mode = "inline",
}: {
  children: ReactNode;
  className?: string;
  mode?: "inline" | "fixed";
}) {
  const content = (
    <div className={cn("mt-4 flex flex-col items-center gap-3 pb-[var(--app-bottom-gap)]", className)}>
      {children}
    </div>
  );

  if (mode === "fixed") {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="pointer-events-auto mx-auto w-full max-w-md px-3">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
