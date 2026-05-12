import type { HTMLAttributes, ReactNode } from "react";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { cn } from "@/lib/cn";

export function SurfaceCard({
  children,
  className,
  dense = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  dense?: boolean;
}) {
  return (
    <AppPanel
      className={cn(dense ? "space-y-3 p-4" : "space-y-4 p-5", className)}
      {...props}
    >
      {children}
    </AppPanel>
  );
}
