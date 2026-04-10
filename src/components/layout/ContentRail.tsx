import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ContentRailProps = HTMLAttributes<HTMLDivElement>;

export function ContentRail({ className, ...props }: ContentRailProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[calc(var(--content-max)+var(--screen-gutter)*2)] px-[var(--screen-gutter)]",
        className,
      )}
      {...props}
    />
  );
}
