import type { HTMLAttributes, ReactNode } from "react";
import { ContentRail } from "@/components/layout/ContentRail";
import { cn } from "@/lib/cn";

export function FloatingHeaderRail({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ContentRail className={className}>{children}</ContentRail>;
}

type FloatingHeaderSlotProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  railClassName?: string;
};

export function FloatingHeaderSlot({
  children,
  railClassName,
  className,
  ...props
}: FloatingHeaderSlotProps) {
  return (
    <FloatingHeaderRail className={railClassName}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </FloatingHeaderRail>
  );
}
