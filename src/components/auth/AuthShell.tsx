import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
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
        <div
          className={cn("flex flex-1 flex-col justify-center", appTokens.authShellContent, className)}
          data-testid="auth-shell-content"
        >
          {children}
        </div>
      </div>
    </main>
  );
}

export function AuthIntro({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <header className={appTokens.authIntro} data-testid="auth-intro">
      <p className={appTokens.authIntroEyebrow}>{eyebrow}</p>
      <div className={appTokens.authIntroTitleStack}>
        <h1 className={appTokens.authIntroTitle}>{title}</h1>
        <p className={appTokens.authIntroSubtitle}>{subtitle}</p>
      </div>
    </header>
  );
}

export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        appTokens.authCard,
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
      ? appTokens.authMessageError
      : tone === "success"
        ? appTokens.authMessageSuccess
        : appTokens.authMessageDefault;

  return <p className={cn(appTokens.authMessage, toneClassName)}>{children}</p>;
}

export function AuthField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={appTokens.authField}>
      <span className={appTokens.authFieldLabel}>{label}</span>
      {children}
    </label>
  );
}

export function AuthFooter({ children }: { children: ReactNode }) {
  return <div className={appTokens.authFooter}>{children}</div>;
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
    <AuthCard className={appTokens.authStatusCard}>
      <div
        className={appTokens.authStatusSpinnerShell}
        aria-hidden="true"
      >
        <span className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-current border-r-transparent motion-reduce:animate-none" />
      </div>
      <div className="space-y-1" data-testid={testId}>
        <p className={appTokens.authStatusTitle}>{title}</p>
        {description ? <p className={appTokens.authStatusDescription}>{description}</p> : null}
      </div>
    </AuthCard>
  );
}
