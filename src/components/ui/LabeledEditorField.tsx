import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const labeledEditorFieldControlClassName = "mt-0 w-full rounded-[inherit] border-0 bg-transparent text-sm text-[rgb(var(--text-primary)/0.98)] shadow-none outline-none ring-0 placeholder:text-[rgb(var(--text-muted)/0.72)] [-webkit-tap-highlight-color:transparent] focus:border-0 focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0";

const shellBaseClassName = "min-w-0 rounded-[22px] border border-[rgb(var(--accent)/0.34)] bg-transparent p-0 shadow-none transition-colors [-webkit-tap-highlight-color:transparent] focus-within:border-[rgb(var(--accent)/0.52)]";
export const labeledEditorFieldFloatingLabelClassName = "ml-auto mr-4 w-auto max-w-[calc(100%-44px)] bg-transparent px-[7px] text-[11px] font-medium uppercase tracking-[0.16em] leading-none text-[rgb(var(--accent)/0.94)]";

type LabeledEditorFieldProps = {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
};

export function LabeledEditorField({ label, children, className, labelClassName }: LabeledEditorFieldProps) {
  return (
    <fieldset className={cn(shellBaseClassName, className)}>
      <legend className={cn(labeledEditorFieldFloatingLabelClassName, labelClassName)}>
        {label}
      </legend>
      {children}
    </fieldset>
  );
}
