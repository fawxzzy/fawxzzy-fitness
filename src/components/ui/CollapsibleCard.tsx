"use client";

import { type ReactNode, useId, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/Chevrons";
import { Glass } from "@/components/ui/Glass";

type CollapsibleCardProps = {
  title: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
};

export function CollapsibleCard({
  title,
  summary,
  defaultOpen = false,
  children,
  className,
  headerClassName,
  bodyClassName,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <Glass variant="base" interactive className={["overflow-hidden", className ?? ""].join(" ")}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
        className={[
          "flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2-soft active:bg-surface-2-active focus-visible:outline-none",
          headerClassName ?? "",
        ].join(" ")}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[rgb(var(--text)/0.95)]">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs text-[rgb(var(--text)/0.72)]">{summary}</span> : null}
        </span>
        {isOpen ? (
          <ChevronUpIcon className="h-4 w-4 shrink-0 text-[rgb(var(--text)/0.72)]" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-[rgb(var(--text)/0.72)]" />
        )}
      </button>
      <div
        id={panelId}
        hidden={!isOpen}
        className={[
          "border-t border-[rgb(var(--glass-tint-rgb)/var(--glass-current-border-alpha))] p-4",
          bodyClassName ?? "",
        ].join(" ")}
      >
        {children}
      </div>
    </Glass>
  );
}
