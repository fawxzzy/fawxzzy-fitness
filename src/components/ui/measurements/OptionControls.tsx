"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/ui/Chevrons";
import { cn } from "@/lib/cn";

/**
 * Plain on/off row for the "set it up" screens (DESIGN C14 toggles): the whole row is the 44px target, the label says
 * what it does, the switch shows its state with a neutral off track (no amber "Manual"/"Reps" pill).
 */
export function OptionSwitchRow({
  label,
  hint,
  checked,
  onCheckedChange,
  trailing,
  disabled = false,
  className,
}: {
  label: string;
  hint?: ReactNode;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  /** Extra control on the row's right, before the switch (e.g. a "How it works" link). */
  trailing?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const hintId = useId();
  return (
    <div className={cn("flex min-h-11 w-full min-w-0 items-center gap-2", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={hint ? hintId : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-[0.9rem] px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.25)] disabled:opacity-55 [button&]:border-0 [button&]:bg-transparent [button&]:shadow-none"
      >
        <span className="min-w-0">
          <span className="block text-[0.95rem] font-semibold leading-tight text-[rgb(var(--text-primary))]">{label}</span>
          {hint ? (
            <span id={hintId} className="mt-0.5 block text-[0.75rem] leading-snug text-[rgb(var(--text-muted))]">{hint}</span>
          ) : null}
        </span>
        <SwitchTrack checked={checked} />
      </button>
      {trailing}
    </div>
  );
}

export function SwitchTrack({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-[background,border-color]",
        checked
          ? "border-[rgb(var(--accent-strong)/0.6)] bg-[rgb(var(--accent-strong)/0.34)]"
          : "border-[rgb(var(--border-strong)/0.26)] bg-[rgb(var(--surface-2-rgb)/0.5)]",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-[left,background]",
          checked ? "left-[1.45rem] bg-[rgb(var(--accent-strong))]" : "left-[0.2rem] bg-[rgb(var(--text-muted)/0.85)]",
        )}
      />
      <span className="sr-only">{checked ? "On" : "Off"}</span>
    </span>
  );
}

/** One "More options" fold for everything a person rarely needs. Children stay mounted (hidden) so form fields submit. */
export function MoreOptionsDisclosure({
  label = "More options",
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
  contentClassName,
}: {
  label?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const panelId = useId();
  return (
    <div className={cn("w-full min-w-0", className)} data-more-options="">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          const next = !open;
          setUncontrolledOpen(next);
          onOpenChange?.(next);
        }}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[0.9rem] px-1 text-left text-[0.9rem] font-semibold text-[rgb(var(--accent-strong)/0.96)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.25)] [button&]:border-0 [button&]:bg-transparent [button&]:shadow-none"
      >
        {label}
        <ChevronDownIcon className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : undefined)} />
      </button>
      <div id={panelId} hidden={!open} className={cn("space-y-1 pt-1", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
