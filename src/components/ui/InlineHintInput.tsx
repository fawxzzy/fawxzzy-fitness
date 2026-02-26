import type { InputHTMLAttributes } from "react";

type InlineHintInputProps = InputHTMLAttributes<HTMLInputElement> & {
  hint: string;
  containerClassName?: string;
};

export function InlineHintInput({ hint, className = "", containerClassName = "", ...props }: InlineHintInputProps) {
  return (
    <div className={`relative ${containerClassName}`.trim()}>
      <input {...props} className={`w-full rounded-md border border-slate-300 px-2 py-2 pr-12 text-sm ${className}`.trim()} />
      <span aria-hidden className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-500/70">
        {hint}
      </span>
    </div>
  );
}
