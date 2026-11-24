import { useId, type ReactNode } from "react";
import { FieldNotice, fieldNoticeId } from "@/components/ui/FieldNotice";
import { cn } from "@/lib/cn";

// DESIGN-CONTRACT.md C14, the one field recipe: an 11px uppercase label ABOVE the field (never on the border),
// a 44px minimum control, 16px input text (stops iOS zoom), 12px muted helper below. An error is NEVER red text
// under the field (Zac 2026-11-23): it goes to the in-flow notice through <FieldNotice> (docs/ui/FOUNDATION.md),
// the field keeps the danger border, a neutral "!" marker by the label and an sr-only description for aria.
// The label is a real <label htmlFor>, so tapping it focuses the control. `children` is a render function that
// receives the props the control must spread: its id, aria-describedby (helper or error) and aria-invalid.
// `LabeledEditorField` (legend on the border) is the legacy recipe this replaces screen by screen.
export const formFieldLabelClassName = "mb-1.5 block w-full px-1 text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-[rgb(var(--text-secondary)/0.92)]";
export const formFieldShellClassName = "relative min-h-11 min-w-0 rounded-[var(--radius-sm)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.22)] transition-[border-color,box-shadow] focus-within:border-[rgb(var(--button-primary-border)/0.5)] focus-within:ring-2 focus-within:ring-[rgb(var(--button-primary-border)/0.18)]";
export const formFieldInvalidShellClassName = "!border-[rgb(var(--danger-rgb)/0.72)]";
export const formFieldInvalidMarkerClassName = "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--border-strong)/0.42)] bg-[rgb(var(--surface-2)/0.9)] text-[11px] font-bold leading-none text-[rgb(var(--text-primary))]";
export const formFieldControlClassName = "block h-11 w-full min-w-0 rounded-[inherit] border-0 bg-transparent px-3 text-base text-[rgb(var(--text-primary)/0.98)] shadow-none outline-none ring-0 placeholder:text-[rgb(var(--text-muted)/0.72)] [-webkit-tap-highlight-color:transparent] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0";

export type FormFieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

export function FormField({
  label,
  children,
  id,
  className,
  shellClassName,
  helper,
  error,
  invalid = false,
}: {
  label: ReactNode;
  children: (control: FormFieldControlProps) => ReactNode;
  id?: string;
  className?: string;
  shellClassName?: string;
  helper?: ReactNode;
  /** The error text. It goes to the shared notice, so it must be a plain string (a ReactNode could not be shown). */
  error?: string | null;
  invalid?: boolean;
}) {
  const generatedId = useId();
  const controlId = id ?? `form-field-${generatedId}`;
  const messageId = `${controlId}-message`;
  const hasError = Boolean(error);
  const hasMessage = hasError || Boolean(helper);
  const isInvalid = invalid || hasError;
  const control: FormFieldControlProps = {
    id: controlId,
    ...(hasMessage ? { "aria-describedby": messageId } : {}),
    ...(isInvalid ? { "aria-invalid": true as const } : {}),
  };

  return (
    <div data-form-field="true" className={cn("min-w-0", className)}>
      <label htmlFor={controlId} className={formFieldLabelClassName}>
        {isInvalid ? (
          <span className="inline-flex items-center gap-1.5">
            {label}
            <span aria-hidden="true" data-form-field-marker="" className={formFieldInvalidMarkerClassName}>!</span>
          </span>
        ) : label}
      </label>
      <div className={cn(formFieldShellClassName, isInvalid ? formFieldInvalidShellClassName : null, shellClassName)}>
        {children(control)}
      </div>
      {/* Always mounted, so clearing the error also dismisses its notice. */}
      <FieldNotice error={error ?? null} id={fieldNoticeId(controlId)} />
      {hasError ? (
        // Announced by the notice; this copy only backs aria-describedby, so it is visually hidden.
        <p id={messageId} className="sr-only" data-form-field-error="">{error}</p>
      ) : helper ? (
        <p id={messageId} className="mt-1 px-1 text-xs text-[rgb(var(--text-muted))]">{helper}</p>
      ) : null}
    </div>
  );
}
