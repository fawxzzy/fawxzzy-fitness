"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value]);

  useEffect(() => {
    if (!isOpen) return;

    const updateMenuPosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };

    updateMenuPosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleViewportChange = () => {
      updateMenuPosition();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
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

        {isOpen && menuPosition ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[80] overflow-hidden rounded-xl border border-[rgb(var(--glass-tint-rgb)/0.3)] bg-[rgb(var(--glass-tint-rgb)/0.95)] p-1 shadow-xl"
            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, width: `${menuPosition.width}px` }}
          >
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
          </div>,
          document.body,
        ) : null}
      </div>
    </div>
  );

  return content;
}
