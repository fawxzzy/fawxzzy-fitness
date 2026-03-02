"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppPanel } from "@/components/ui/app/AppPanel";
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
  withPanel?: boolean;
};

export function ViewModeSelect({ label, value, options, onChange, className, withPanel = true }: ViewModeSelectProps) {
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
    <div className={cn("p-2", className)}>
      <div ref={containerRef} className="space-y-1">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-left [-webkit-tap-highlight-color:transparent]"
        >
          <span className="min-w-0 truncate text-xs text-slate-400">
            {label}: <span className="font-normal text-slate-200">{selectedOption?.label ?? value}</span>
          </span>
          <span
            aria-hidden="true"
            className={cn("text-xs text-slate-400 transition-transform", isOpen ? "rotate-180" : "rotate-0")}
          >
            ▾
          </span>
        </button>

        {isOpen ? (
          <div className="grid grid-cols-2 gap-1">
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
                    "min-h-8 rounded-md border px-2.5 py-1 text-xs font-medium transition",
                    isSelected
                      ? "border-border/70 bg-[rgb(var(--glass-tint-rgb)/0.75)] text-slate-100"
                      : "border-border/35 bg-white/5 text-slate-300 opacity-65 hover:opacity-90",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!withPanel) {
    return content;
  }

  return <AppPanel>{content}</AppPanel>;
}
