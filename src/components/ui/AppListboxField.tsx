"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type ListboxOption = {
  label: string;
  value: string;
};

type AppListboxFieldProps = {
  label: string;
  name: string;
  options: readonly ListboxOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
};

export function AppListboxField({
  label,
  name,
  options,
  defaultValue,
  value: controlledValue,
  onValueChange,
  required = false,
  className,
  buttonClassName,
}: AppListboxFieldProps) {
  const generatedId = useId();
  const buttonId = `${generatedId}-button`;
  const listboxId = `${generatedId}-listbox`;
  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0]?.value ?? "");
  const value = controlledValue ?? internalValue;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === (defaultValue ?? options[0]?.value))));
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!defaultValue) return;
    if (controlledValue === undefined) setInternalValue(defaultValue);
    const nextIndex = options.findIndex((option) => option.value === defaultValue);
    if (nextIndex >= 0) setActiveIndex(nextIndex);
  }, [controlledValue, defaultValue, options]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

  useEffect(() => {
    if (!isOpen) return;

    const updateMenuPosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPosition({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    };

    const selectedIndex = options.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    updateMenuPosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleViewportChange = () => updateMenuPosition();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, options, value]);

  useEffect(() => {
    if (!isOpen) return;
    optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, isOpen]);

  const selectIndex = (index: number) => {
    const option = options[index];
    if (!option) return;
    if (controlledValue === undefined) setInternalValue(option.value);
    onValueChange?.(option.value);
    setActiveIndex(index);
    setIsOpen(false);
    requestAnimationFrame(() => {
      containerRef.current?.querySelector<HTMLButtonElement>("button[data-listbox-trigger='true']")?.focus();
    });
  };

  return (
    <label className={cn("block text-sm font-medium text-text", className)}>
      {label}
      <input type="hidden" name={name} value={value} required={required} />
      <div ref={containerRef} className="relative mt-1">
        <button
          id={buttonId}
          data-listbox-trigger="true"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          onClick={() => setIsOpen((prev) => !prev)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsOpen(true);
            }
          }}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-md border border-slate-300 bg-[rgb(var(--bg)/0.4)] px-3 py-2 text-left text-sm text-[rgb(var(--text))] leading-5 transition",
            "focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25",
            isOpen ? "border-accent ring-2 ring-accent/20" : undefined,
            buttonClassName,
          )}
        >
          <span className="min-w-0 truncate">{selectedOption?.label ?? "Select an option"}</span>
          <span aria-hidden="true" className={cn("ml-3 text-xs text-[rgb(var(--text)/0.6)] transition-transform", isOpen ? "rotate-180" : undefined)}>▾</span>
        </button>

        {isOpen && menuPosition ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={buttonId}
            className="fixed z-[90] overflow-hidden rounded-xl border border-white/12 bg-[linear-gradient(180deg,rgba(var(--surface-rgb),0.985),rgba(var(--surface-rgb),0.955))] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.42)] backdrop-blur-md"
            style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
          >
            <div className="max-h-72 overflow-y-auto">
              {options.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={option.value}
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => selectIndex(index)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setActiveIndex((prev) => Math.min(prev + 1, options.length - 1));
                      } else if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setActiveIndex((prev) => Math.max(prev - 1, 0));
                      } else if (event.key === "Home") {
                        event.preventDefault();
                        setActiveIndex(0);
                      } else if (event.key === "End") {
                        event.preventDefault();
                        setActiveIndex(options.length - 1);
                      } else if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectIndex(index);
                      } else if (event.key === "Escape") {
                        event.preventDefault();
                        setIsOpen(false);
                      }
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition",
                      isSelected
                        ? "bg-accent/18 text-[rgb(var(--text))] shadow-[inset_0_0_0_1px_rgba(96,200,130,0.22)]"
                        : isActive
                          ? "bg-white/8 text-white"
                          : "text-[rgb(var(--text)/0.84)] hover:bg-white/6 hover:text-white",
                    )}
                  >
                    <span>{option.label}</span>
                    <span aria-hidden="true" className={cn("text-xs", isSelected ? "text-accent" : "text-transparent")}>✓</span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        ) : null}
      </div>
    </label>
  );
}
