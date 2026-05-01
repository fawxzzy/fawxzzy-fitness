import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const labeledEditorFieldControlClassName = "mt-0 w-full rounded-[inherit] border-0 bg-transparent text-sm text-[rgb(var(--text-primary)/0.98)] shadow-none outline-none ring-0 placeholder:text-[rgb(var(--text-muted)/0.72)] focus:border-0 focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0";

const shellBaseClassName = "relative overflow-visible rounded-[var(--radius-md)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.28)] shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition-colors focus-within:border-[rgb(var(--button-primary-border)/0.42)]";
export const labeledEditorFieldFloatingLabelClassName = "pointer-events-none absolute right-3 top-0 z-10 -translate-y-1/2 bg-[rgb(var(--bg))] px-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent)/0.94)]";

type LabeledEditorFieldProps = {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
};

export function LabeledEditorField({ label, children, className, labelClassName }: LabeledEditorFieldProps) {
  return (
    <div className={cn(shellBaseClassName, className)}>
      {children}
      <span className={cn(labeledEditorFieldFloatingLabelClassName, labelClassName)}>
        {label}
      </span>
    </div>
  );
}
