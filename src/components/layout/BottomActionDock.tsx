import type { ButtonHTMLAttributes, ReactNode } from "react";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, type BottomActionIntent, type BottomDockButtonVariant } from "@/components/layout/BottomDockButton";

export function BottomActionDock({ left, right, className }: { left: ReactNode; right: ReactNode; className?: string }) {
  return <BottomActionSplit secondary={left} primary={right} className={className} />;
}

type DockButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  intent?: BottomActionIntent;
  variant?: BottomDockButtonVariant;
};

export function DockButton({ children, intent, variant, ...props }: DockButtonProps) {
  return (
    <BottomDockButton {...props} intent={intent} variant={variant}>
      {children}
    </BottomDockButton>
  );
}
