import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function FormSectionCard({
  children,
  className,
  insetClassName,
}: {
  children: ReactNode;
  className?: string;
  insetClassName?: string;
}) {
  return (
    <div className={cn("rounded-[1.35rem] border border-white/8 bg-[rgb(var(--surface-rgb)/0.42)] p-3", className)}>
      <div className={cn("rounded-2xl bg-white/5 p-3", insetClassName)}>{children}</div>
    </div>
  );
}
