import Link from "next/link";

type SegmentedControlOption = {
  label: string;
  value: string;
  href: string;
};

export function SegmentedControl({
  options,
  value,
  className,
}: {
  options: SegmentedControlOption[];
  value: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="History sections"
      className={`flex w-full rounded-xl border border-[rgb(var(--glass-tint-rgb)/0.24)] bg-[rgb(var(--glass-tint-rgb)/0.48)] p-1 ${className ?? ""}`.trim()}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Link
            key={option.value}
            href={option.href}
            role="tab"
            aria-selected={isActive}
            className={`inline-flex min-h-9 flex-1 items-center justify-center rounded-lg px-3 text-xs font-semibold transition ${
              isActive
                ? "bg-[rgb(var(--glass-tint-rgb)/0.95)] text-slate-50 shadow-[inset_0_-2px_0_0_rgb(var(--accent-rgb)/0.95),0_0_12px_rgb(var(--accent-rgb)/0.18)]"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
