"use client";

import { type ReactNode, useId, useState } from "react";
import { Glass } from "@/components/ui/Glass";

type CollapsibleCardProps = {
  title: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function CollapsibleCard({ title, summary, defaultOpen = false, children }: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <Glass variant="base" interactive className="overflow-hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2-soft active:bg-surface-2-active focus-visible:outline-none"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[rgb(var(--text)/0.95)]">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs text-[rgb(var(--text)/0.72)]">{summary}</span> : null}
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-[rgb(var(--text)/0.72)] transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`}
        >
          <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={panelId} hidden={!isOpen} className="border-t border-[rgb(var(--glass-tint-rgb)/var(--glass-current-border-alpha))] p-4">
        {children}
      </div>
    </Glass>
  );
}
