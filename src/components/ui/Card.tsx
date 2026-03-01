import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { tokens } from "@/styles/tokens";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("border text-text", className)}
      style={{
        backgroundColor: tokens.colors.bgCard,
        borderColor: tokens.colors.borderSubtle,
        borderRadius: tokens.radii.card,
        padding: tokens.spacing.cardPad,
      }}
    >
      {children}
    </div>
  );
}
