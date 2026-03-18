import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function AuthShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn("mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 py-8", className)}>
      {children}
    </main>
  );
}

export function AuthIntro({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <header className="space-y-3 px-1 pt-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent/90">{eyebrow}</p>
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-[-0.03em] text-white">{title}</h1>
        <p className="max-w-sm text-sm leading-6 text-slate-300">{subtitle}</p>
      </div>
    </header>
  );
}

export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "glass-surface glass-sheen space-y-5 rounded-[1.5rem] border border-white/10 px-5 py-5 shadow-[0_20px_44px_rgba(0,0,0,0.28)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function AuthMessage({ tone = "default", children }: { tone?: "default" | "error" | "success"; children: ReactNode }) {
  const toneClassName =
    tone === "error"
      ? "border-red-400/30 bg-red-500/10 text-red-100"
      : tone === "success"
        ? "border-accent/40 bg-accent/10 text-emerald-100"
        : "border-white/10 bg-white/5 text-slate-200";

  return <p className={cn("rounded-2xl border px-4 py-3 text-sm leading-6", toneClassName)}>{children}</p>;
}

export function AuthField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      {children}
    </label>
  );
}

export function AuthFooter({ children }: { children: ReactNode }) {
  return <div className="space-y-3 border-t border-white/10 pt-4 text-sm text-slate-300">{children}</div>;
}
