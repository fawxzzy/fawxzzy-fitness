import type { ButtonHTMLAttributes, ReactNode } from "react";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, type BottomDockButtonVariant } from "@/components/layout/BottomDockButton";

export function BottomActionDock({ left, right, className }: { left: ReactNode; right: ReactNode; className?: string }) {
  return <BottomActionSplit secondary={left} primary={right} className={className} />;
}

type DockButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  variant?: BottomDockButtonVariant;
};

export function DockButton({ children, variant = "primary", ...props }: DockButtonProps) {
  return (
    <BottomDockButton {...props} variant={variant}>
      {children}
    </BottomDockButton>
  );
}
