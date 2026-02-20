"use client";

import { type ReactNode, useId, useState } from "react";

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
    <section className="overflow-hidden rounded-xl border border-slate-300 bg-white/95 transition-colors hover:border-[rgb(var(--border)/0.8)]">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgb(var(--surface-2)/0.35)] active:bg-[rgb(var(--surface-2)/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs text-slate-500">{summary}</span> : null}
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`}
        >
          <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={panelId} hidden={!isOpen} className="border-t border-slate-300 p-4">
        {children}
      </div>
    </section>
  );
}
