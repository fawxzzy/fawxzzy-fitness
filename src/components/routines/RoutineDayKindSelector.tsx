"use client";

import { cn } from "@/lib/cn";

export type RoutineDayKind = "required" | "optional" | "rest";

type Props = {
  value: RoutineDayKind;
  onChange: (value: RoutineDayKind) => void;
  className?: string;
};

const options: Array<{ value: RoutineDayKind; label: string }> = [
  { value: "required", label: "Required" },
  { value: "optional", label: "Optional" },
  { value: "rest", label: "Rest" },
];

export function RoutineDayKindSelector({ value, onChange, className }: Props) {
  return (
    <div className={cn("mx-auto flex w-full max-w-sm gap-1 rounded-[0.9rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.58)] p-1", className)}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-9 flex-1 rounded-[0.65rem] px-2 text-[11px] font-semibold transition",
              active
                ? option.value === "rest"
                  ? "bg-[rgb(var(--accent-yellow-off)/0.2)] text-[rgb(var(--accent-yellow-on))]"
                  : "bg-[rgb(var(--accent)/0.16)] text-[rgb(var(--accent-strong))]"
                : "text-[rgb(var(--text-secondary)/0.82)] hover:bg-[rgb(var(--surface-1-rgb)/0.72)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
