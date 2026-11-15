import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

// DESIGN-CONTRACT.md C14, the one field recipe: an 11px uppercase label ABOVE the field (never on the border),
// a 44px minimum control, 16px input text (stops iOS zoom), 12px muted helper or 12px danger error below.
// `LabeledEditorField` (legend on the border) is the legacy recipe this replaces screen by screen.
export const formFieldLabelClassName = "float-left mb-1.5 w-full px-1 text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-[rgb(var(--text-secondary)/0.92)]";
export const formFieldShellClassName = "relative clear-both min-h-11 min-w-0 rounded-[var(--radius-sm)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.22)] transition-[border-color,box-shadow] focus-within:border-[rgb(var(--button-primary-border)/0.5)] focus-within:ring-2 focus-within:ring-[rgb(var(--button-primary-border)/0.18)]";
export const formFieldInvalidShellClassName = "!border-[rgb(var(--danger-rgb)/0.72)]";
export const formFieldControlClassName = "block h-11 w-full min-w-0 rounded-[inherit] border-0 bg-transparent px-3 text-base text-[rgb(var(--text-primary)/0.98)] shadow-none outline-none ring-0 placeholder:text-[rgb(var(--text-muted)/0.72)] [-webkit-tap-highlight-color:transparent] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0";

export function FormField({
  label,
  children,
  className,
  shellClassName,
  helper,
  error,
  invalid = false,
  fieldProps,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
  shellClassName?: string;
  helper?: ReactNode;
  error?: ReactNode;
  invalid?: boolean;
  fieldProps?: HTMLAttributes<HTMLFieldSetElement>;
}) {
  return (
    <fieldset {...fieldProps} data-form-field="true" className={cn("m-0 min-w-0 border-0 p-0", className)}>
      <legend className={formFieldLabelClassName}>{label}</legend>
      <div className={cn(formFieldShellClassName, invalid || error ? formFieldInvalidShellClassName : null, shellClassName)}>
        {children}
      </div>
      {error ? (
        <p role="alert" className="mt-1 px-1 text-xs text-[rgb(var(--danger-rgb))]">
          <span aria-hidden="true">! </span>
          {error}
        </p>
      ) : helper ? (
        <p className="mt-1 px-1 text-xs text-[rgb(var(--text-muted))]">{helper}</p>
      ) : null}
    </fieldset>
  );
}
