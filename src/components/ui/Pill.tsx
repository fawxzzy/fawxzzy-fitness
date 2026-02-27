import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SharedProps = {
  active?: boolean;
  className?: string;
};

export function Pill({ active, className, ...props }: HTMLAttributes<HTMLSpanElement> & SharedProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        active ? "bg-surface-2-active text-text" : "bg-surface-2-soft text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function PillButton({ active, className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & SharedProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors",
        active ? "bg-surface-2-active text-text" : "bg-surface-2-soft text-muted hover:bg-surface-2-active hover:text-text",
        className,
      )}
      {...props}
    />
  );
}
