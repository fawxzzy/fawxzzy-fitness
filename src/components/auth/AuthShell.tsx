import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function AuthShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      className="hide-scrollbar relative isolate min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[rgb(var(--bg-app))] touch-pan-y overscroll-y-contain"
      data-testid="auth-shell"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(26,119,86,0.16),transparent_24%),radial-gradient(circle_at_18%_18%,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_84%_72%,rgba(148,163,184,0.1),transparent_30%),linear-gradient(180deg,rgba(9,16,25,0.92),rgba(4,9,16,0.96)_46%,rgba(2,6,12,0.99))]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.14)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.86),rgba(0,0,0,0.42)_52%,transparent_82%)]" />
        <div className="absolute left-[-10%] top-[10%] h-72 w-72 rounded-full bg-emerald-400/10 blur-[140px]" />
        <div className="absolute bottom-[-18%] right-[-8%] h-80 w-80 rounded-full bg-slate-300/8 blur-[160px]" />
        <div className="absolute inset-x-[10%] top-[18%] h-px bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent opacity-80 blur-[0.8px]" />
        <div className="absolute inset-x-[18%] top-[62%] h-px bg-gradient-to-r from-transparent via-white/16 to-transparent opacity-60 blur-[0.8px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_18%,rgba(4,8,12,0.22)_58%,rgba(1,4,8,0.68))]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-[calc(env(safe-area-inset-top,0px)+1.25rem)]">
        <div className={cn("flex flex-1 flex-col justify-center gap-5", className)} data-testid="auth-shell-content">
          {children}
        </div>
      </div>
    </main>
  );
}

export function AuthIntro({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <header className="space-y-3 px-1" data-testid="auth-intro">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent/90">{eyebrow}</p>
      <div className="space-y-2">
        <h1 className="text-[clamp(2.2rem,9vw,2.85rem)] font-semibold tracking-[-0.04em] text-white">{title}</h1>
        <p className="max-w-sm text-sm leading-6 text-slate-300">{subtitle}</p>
      </div>
    </header>
  );
}

export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "glass-surface glass-sheen relative space-y-5 rounded-[1.65rem] border border-white/10 px-5 py-5 shadow-[0_22px_56px_rgba(0,0,0,0.34)]",
        className,
      )}
      data-testid="auth-card"
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

export function AuthStatusCard({
  title,
  description,
  testId,
}: {
  title: string;
  description?: string;
  testId?: string;
}) {
  return (
    <AuthCard className="space-y-3 text-center" >
      <div
        className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-accent"
        aria-hidden="true"
      >
        <span className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-current border-r-transparent motion-reduce:animate-none" />
      </div>
      <div className="space-y-1" data-testid={testId}>
        <p className="text-base font-semibold text-white">{title}</p>
        {description ? <p className="text-sm leading-6 text-slate-300">{description}</p> : null}
      </div>
    </AuthCard>
  );
}
