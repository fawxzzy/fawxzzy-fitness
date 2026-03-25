import { forwardRef, type InputHTMLAttributes } from "react";

type InlineHintInputProps = InputHTMLAttributes<HTMLInputElement> & {
  hint: string;
  containerClassName?: string;
};

export const InlineHintInput = forwardRef<HTMLInputElement, InlineHintInputProps>(function InlineHintInput(
  { hint, className = "", containerClassName = "", ...props },
  ref,
) {
  return (
    <div className={`relative ${containerClassName}`.trim()}>
      <input ref={ref} {...props} className={`w-full rounded-md border border-border/45 bg-[rgb(var(--bg)/0.12)] px-2 py-2 pr-12 text-sm text-text placeholder:text-muted/70 focus-visible:border-emerald-300/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/20 ${className}`.trim()} />
      <span aria-hidden className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted/70">
        {hint}
      </span>
    </div>
  );
});
