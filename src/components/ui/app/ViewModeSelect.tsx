"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type ViewModeOption = {
  label: string;
  value: string;
};

type ViewModeSelectProps = {
  label: string;
  value: string;
  options: ViewModeOption[];
  onChange: (value: string) => void;
  className?: string;
};

export function ViewModeSelect({ label, value, options, onChange, className }: ViewModeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  const content = (
    <div className={cn("w-full", className)}>
      <div ref={containerRef} className="relative w-full">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex min-h-9 w-full items-center justify-between gap-2 rounded-xl border border-[rgb(var(--glass-tint-rgb)/0.26)] bg-[rgb(var(--glass-tint-rgb)/0.56)] px-3 py-1.5 text-left [-webkit-tap-highlight-color:transparent]"
        >
          <span className="min-w-0 truncate text-xs text-slate-300">
            {label}: <span className="font-normal text-slate-200">{selectedOption?.label ?? value}</span>
          </span>
          <span
            aria-hidden="true"
            className={cn("text-xs text-slate-300 transition-transform", isOpen ? "rotate-180" : "rotate-0")}
          >
            ▾
          </span>
        </button>

        {isOpen ? (
          <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-[rgb(var(--glass-tint-rgb)/0.3)] bg-[rgb(var(--glass-tint-rgb)/0.95)] p-1 shadow-xl">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition",
                    isSelected
                      ? "bg-[rgb(var(--glass-tint-rgb)/0.86)] text-slate-100"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <span>{option.label}</span>
                  <span aria-hidden="true" className={cn("text-xs", isSelected ? "text-emerald-300" : "text-transparent")}>
                    ✓
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );

  return content;
}
