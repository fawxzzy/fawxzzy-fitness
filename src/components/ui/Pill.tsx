import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { Chip, ChipButton } from "@/components/ui/Chip";

// Legacy names, kept as thin wrappers over the one chip family in Chip.tsx (docs/ui/FOUNDATION.md "Chips").
// Markup is identical to the old Pill/PillButton. New code uses `Chip variant="label"` and `ChipButton`.

type SharedProps = {
  active?: boolean;
  tone?: "default" | "success" | "warning" | "destructive";
  className?: string;
};

export function Pill({ active, tone = "default", className, children, ...props }: HTMLAttributes<HTMLSpanElement> & SharedProps) {
  return (
    <Chip variant="label" tone={tone} selected={Boolean(active)} className={className} {...props}>
      {children}
    </Chip>
  );
}

/** Tappable pill: see `ChipButton` (44px tall by default; `hitSlop` only for an isolated small pill). */
export function PillButton(props: ButtonHTMLAttributes<HTMLButtonElement> & SharedProps & { hitSlop?: boolean }) {
  return <ChipButton {...props} />;
}
