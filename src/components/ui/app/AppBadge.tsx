import type { HTMLAttributes, ReactNode } from "react";
import { Chip } from "@/components/ui/Chip";

// Legacy name, kept as a thin wrapper over the one chip family (Chip.tsx, docs/ui/FOUNDATION.md "Chips").
// Markup is identical to the old AppBadge.
export function AppBadge({
  tone = "default",
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "today" | "default" | "success" | "warning" | "destructive";
  children: ReactNode;
}) {
  return (
    <Chip tone={tone} className={className} {...props}>
      {children}
    </Chip>
  );
}
