import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SharedProps = {
  active?: boolean;
  tone?: "default" | "success" | "warning" | "destructive";
  className?: string;
};

const toneClassNames: Record<NonNullable<SharedProps["tone"]>, string> = {
  default: "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--bg-panel)/0.5)] text-[rgb(var(--text-primary)/0.82)]",
  success: "border-[rgb(var(--accent-mint)/0.3)] bg-[rgb(var(--accent-mint)/0.12)] text-[rgb(244_249_248)]",
  warning: "border-[rgb(var(--accent-yellow-on)/0.3)] bg-[rgb(var(--accent-yellow-off)/0.12)] text-[rgb(255_246_214)]",
  destructive: "border-[rgb(var(--accent-red)/0.34)] bg-[rgb(var(--accent-red)/0.12)] text-[rgb(255_241_243)]",
};

export function Pill({ active, tone = "default", className, ...props }: HTMLAttributes<HTMLSpanElement> & SharedProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        active ? "border-[rgb(var(--accent-mint)/0.34)] bg-[rgb(var(--accent-mint)/0.14)] text-[rgb(244_249_248)]" : toneClassNames[tone],
        className,
      )}
      {...props}
    />
  );
}

export function PillButton({ active, tone = "default", className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & SharedProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]",
        active
          ? "border-[rgb(var(--accent-mint)/0.38)] bg-[rgb(var(--accent-mint)/0.14)] text-[rgb(244_249_248)]"
          : cn(toneClassNames[tone], "hover:border-[rgb(var(--border-strong)/0.28)] hover:bg-[rgb(var(--bg-card)/0.56)] hover:text-[rgb(var(--text-primary))]"),
        className,
      )}
      {...props}
    />
  );
}
