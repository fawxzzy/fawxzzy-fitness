import type { ReactNode } from "react";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import { SubtitleText } from "@/components/ui/text-roles";

export function HistoryPageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <AppPanel className="space-y-3 p-4">
      <AppHeader
        eyebrow="History"
        title={title}
        subtitleLeft={subtitle}
      />
    </AppPanel>
  );
}

export function HistoryControlPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <AppPanel className={cn("space-y-3 p-3", className)}>{children}</AppPanel>;
}

export function HistoryTabs({ value, sessionsHref, exercisesHref }: { value: "sessions" | "exercises"; sessionsHref: string; exercisesHref: string }) {
  return (
    <SegmentedControl
      options={[
        { label: "Sessions", value: "sessions", href: sessionsHref },
        { label: "Exercises", value: "exercises", href: exercisesHref },
      ]}
      value={value}
      size="sm"
      ariaLabel="History tabs"
      shellClassName="bg-[rgb(var(--surface-rgb)/0.34)] border-white/10"
      activeClassName="bg-[rgb(var(--surface-rgb)/0.86)] text-slate-50 shadow-[inset_0_-2px_0_0_rgb(var(--accent-rgb)/0.82)]"
      inactiveClassName="text-slate-300 hover:bg-white/6 hover:text-white"
    />
  );
}

export function HistoryControlGroup({ label, children, summary }: { label: string; children: ReactNode; summary?: string }) {
  return (
    <div className="space-y-2 rounded-[1.15rem] border border-white/8 bg-black/10 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text)/0.56)]">{label}</p>
        {summary ? <SubtitleText className="text-xs">{summary}</SubtitleText> : null}
      </div>
      {children}
    </div>
  );
}

export function HistoryMetaRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap gap-1.5", className)}>{children}</div>;
}

export function HistoryMetaChip({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        emphasized
          ? "border-[rgb(var(--button-primary-border)/0.45)] bg-[rgb(var(--button-primary-bg)/0.18)] text-slate-100"
          : "border-white/10 bg-white/5 text-slate-300",
      )}
    >
      <span className="text-slate-400">{label}</span>
      <span className="ml-1 text-slate-100">{value}</span>
    </div>
  );
}
