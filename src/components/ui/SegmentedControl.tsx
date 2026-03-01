import Link from "next/link";

type SegmentedControlOption = {
  label: string;
  value: string;
  href?: string;
};

export function SegmentedControl({
  options,
  value,
  className,
  size = "default",
  ariaLabel = "Segmented options",
  onChange,
}: {
  options: SegmentedControlOption[];
  value: string;
  className?: string;
  size?: "default" | "sm";
  ariaLabel?: string;
  onChange?: (value: string) => void;
}) {
  const itemClassName = size === "sm"
    ? "inline-flex min-h-8 min-w-0 flex-1 basis-0 items-center justify-center rounded-lg px-3 text-[11px] font-semibold transition"
    : "inline-flex min-h-9 min-w-0 flex-1 basis-0 items-center justify-center rounded-lg px-3.5 text-xs font-semibold transition";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex w-full items-center gap-1 rounded-xl border border-[rgb(var(--glass-tint-rgb)/0.26)] bg-[rgb(var(--glass-tint-rgb)/0.56)] p-1 ${className ?? ""}`.trim()}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        const stateClassName = isActive
          ? "bg-[rgb(var(--glass-tint-rgb)/0.94)] text-slate-50 shadow-[inset_0_-2px_0_0_rgb(var(--accent-rgb)/0.9)]"
          : "text-slate-300 hover:bg-white/5 hover:text-white";

        if (onChange || !option.href) {
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange?.(option.value)}
              className={`${itemClassName} ${stateClassName}`}
            >
              {option.label}
            </button>
          );
        }

        return (
          <Link
            key={option.value}
            href={option.href}
            role="tab"
            aria-selected={isActive}
            className={`${itemClassName} ${stateClassName}`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
