import type { CSSProperties, ReactNode } from "react";
import { AuthCard, AuthDock, AuthIntro, AuthShell, AuthStack } from "@/components/auth/AuthShell";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { AppAmbientBackdrop } from "@/components/layout/AppAmbientBackdrop";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { cn } from "@/lib/cn";

export type InstallCopyState = "idle" | "copied" | "error";

type InstallGateChromeProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  copyState: InstallCopyState;
  installUrl: string;
  onCopy: () => void;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryAction?: ReactNode;
  showCopyButton?: boolean;
  showInstallUrlCard?: boolean;
};

const HERO_RING_SPIN_STYLE = {
  animation: "app-ambient-spin 108s linear infinite",
} satisfies CSSProperties;

const HERO_RING_COUNTER_SPIN_STYLE = {
  animation: "app-ambient-spin 74s linear infinite reverse",
} satisfies CSSProperties;

const CARD_RING_SPIN_STYLE = {
  animation: "app-ambient-spin 82s linear infinite",
} satisfies CSSProperties;

export function InstallGateChrome({
  eyebrow,
  title,
  subtitle,
  children,
  copyState,
  installUrl,
  onCopy,
  primaryHref,
  primaryLabel,
  secondaryAction,
  showCopyButton = false,
  showInstallUrlCard = false,
}: InstallGateChromeProps) {
  return (
    <AuthShell>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 inset-y-[-8%] z-0 overflow-hidden"
      >
        <div className="absolute inset-0 opacity-[0.94]">
          <AppAmbientBackdrop preset="history" />
        </div>
        <div className="absolute inset-y-[-12%] right-[-10%] w-[78%] opacity-[0.78] [mask-image:radial-gradient(circle_at_72%_54%,black_0%,black_44%,rgba(0,0,0,0.72)_72%,transparent_100%)] mix-blend-screen">
          <AppAmbientBackdrop preset="today" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_18%,rgb(var(--accent)/0.14),transparent_24%),radial-gradient(circle_at_18%_28%,rgb(var(--secondary-action-rgb)/0.11),transparent_22%),radial-gradient(circle_at_84%_70%,rgb(var(--accent-strong)/0.18),transparent_28%),linear-gradient(180deg,rgb(255_255_255/0.015),transparent_16%,rgb(4_8_12/0.05)_52%,rgb(1_4_8/0.14))]" />
        <div className="absolute inset-x-[10%] top-[18%] h-px bg-gradient-to-r from-transparent via-[rgb(var(--accent-strong)/0.58)] to-transparent opacity-90 blur-[0.7px]" />
        <div className="absolute inset-x-[22%] top-[61%] h-px bg-gradient-to-r from-transparent via-[rgb(var(--text-primary)/0.18)] to-transparent opacity-75 blur-[0.7px]" />
        <div className="absolute left-[6%] top-[14%] h-40 w-40 rounded-full border border-[rgb(var(--text-primary)/0.06)] bg-[radial-gradient(circle,rgb(var(--accent)/0.1)_0%,rgb(var(--accent)/0.03)_38%,transparent_72%)] blur-[2px]" />
        <div className="absolute bottom-[10%] left-[-4%] h-52 w-52 rounded-full bg-[radial-gradient(circle,rgb(var(--secondary-action-rgb)/0.12)_0%,rgb(var(--secondary-action-rgb)/0.03)_46%,transparent_74%)] blur-[20px]" />
        <div className="absolute right-[-5%] top-[6%] h-[27rem] w-[27rem]" style={HERO_RING_SPIN_STYLE}>
          <div className="absolute inset-0 rounded-full border border-[rgb(var(--accent-strong)/0.08)]" />
          <div className="absolute inset-[9%] rounded-full border border-[rgb(var(--accent-strong)/0.14)] shadow-[0_0_32px_rgb(var(--accent-strong)/0.12)]" />
          <div className="absolute inset-[20%] rounded-full border border-[rgb(var(--text-primary)/0.08)]" />
          <div className="absolute inset-[7%] rounded-full bg-[conic-gradient(from_220deg_at_50%_50%,rgb(var(--accent-strong)/0.44),transparent_14%,transparent_38%,rgb(var(--secondary-action-rgb)/0.24)_50%,transparent_62%,transparent_82%,rgb(var(--accent)/0.36)_92%,transparent)] blur-[1px] opacity-80" />
          <div className="absolute inset-[24%] rounded-full bg-[conic-gradient(from_30deg_at_50%_50%,transparent,transparent_26%,rgb(var(--text-primary)/0.2)_38%,transparent_48%,transparent_76%,rgb(var(--accent-strong)/0.22)_88%,transparent)]" />
        </div>
        <div className="absolute right-[2%] top-[14%] h-[19rem] w-[19rem]" style={HERO_RING_COUNTER_SPIN_STYLE}>
          <div className="absolute inset-[10%] rounded-full border border-dashed border-[rgb(var(--text-primary)/0.1)]" />
          <div className="absolute inset-[34%] rounded-full border border-[rgb(var(--secondary-action-rgb)/0.18)] shadow-[0_0_18px_rgb(var(--secondary-action-rgb)/0.1)]" />
          <div className="absolute left-1/2 top-[8%] h-2 w-2 -translate-x-1/2 rounded-full bg-[rgb(var(--accent-strong)/0.88)] shadow-[0_0_12px_rgb(var(--accent-strong)/0.42)]" />
          <div className="absolute bottom-[14%] left-[18%] h-1.5 w-1.5 rounded-full bg-[rgb(var(--secondary-action-rgb)/0.78)] shadow-[0_0_10px_rgb(var(--secondary-action-rgb)/0.38)]" />
        </div>
        <div className="absolute bottom-[-6%] right-[-2%] h-[18rem] w-[18rem] opacity-80" style={HERO_RING_SPIN_STYLE}>
          <div className="absolute inset-[12%] rounded-full border border-[rgb(var(--accent)/0.12)]" />
          <div className="absolute inset-[30%] rounded-full border border-[rgb(var(--text-primary)/0.08)]" />
          <div className="absolute inset-[6%] rounded-full bg-[conic-gradient(from_120deg_at_50%_50%,transparent,rgb(var(--accent)/0.28)_18%,transparent_34%,transparent_58%,rgb(var(--accent-strong)/0.24)_72%,transparent_88%,transparent)] blur-[1px]" />
        </div>
      </div>

      <AuthCard className="relative z-10 mx-auto w-full max-w-md overflow-hidden !border-[rgb(var(--border-strong)/0.12)] !bg-[rgb(var(--surface-1-rgb)/0.4)] shadow-[0_24px_64px_rgba(0,0,0,0.26)] supports-[backdrop-filter]:!bg-[rgb(var(--surface-1-rgb)/0.24)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 opacity-[0.48] [mask-image:radial-gradient(circle_at_78%_42%,black_0%,black_34%,rgba(0,0,0,0.28)_68%,transparent_100%)]">
            <AppAmbientBackdrop preset="today" />
          </div>
          <div className="absolute -right-[16%] top-[-10%] h-[18rem] w-[18rem]" style={CARD_RING_SPIN_STYLE}>
            <div className="absolute inset-[10%] rounded-full border border-[rgb(var(--accent-strong)/0.16)]" />
            <div className="absolute inset-[28%] rounded-full border border-[rgb(var(--text-primary)/0.09)]" />
            <div className="absolute inset-[6%] rounded-full bg-[conic-gradient(from_210deg_at_50%_50%,rgb(var(--accent-strong)/0.3),transparent_12%,transparent_46%,rgb(var(--secondary-action-rgb)/0.16)_56%,transparent_74%,rgb(var(--accent)/0.24)_88%,transparent)] blur-[1px]" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255/0.035),transparent_20%,rgb(4_8_12/0.08)_56%,rgb(1_4_8/0.18))]" />
        </div>
        <div className="relative z-10">
          <AuthIntro eyebrow={eyebrow} title={title} subtitle={subtitle} />
          <AuthStack className="pt-6" size="compact">
            {showInstallUrlCard ? (
              <div className="rounded-[1.25rem] border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-2-rgb)/0.42)] px-4 py-4 backdrop-blur-[8px]">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--text-muted)/0.92)]">
                  Install link
                </p>
                <p className="mt-2 break-all text-sm leading-6 text-[rgb(var(--text-primary)/0.98)]">{installUrl}</p>
              </div>
            ) : null}

            {children}
          </AuthStack>
        </div>
      </AuthCard>

      {showCopyButton ? (
        <AuthDock className="relative z-10">
          <BottomActionSingle>
            <BottomDockButton intent="positive" onClick={onCopy} type="button">
              {copyState === "copied" ? "Copied link" : copyState === "error" ? "Copy failed" : "Copy link"}
            </BottomDockButton>
          </BottomActionSingle>
        </AuthDock>
      ) : primaryHref && primaryLabel ? (
        <AuthDock className="relative z-10">
          <BottomActionSingle>
            <BottomDockLink href={primaryHref} intent="positive">
              {primaryLabel}
            </BottomDockLink>
          </BottomActionSingle>
        </AuthDock>
      ) : secondaryAction ? (
        <AuthDock className="relative z-10">
          <BottomActionSingle>{secondaryAction}</BottomActionSingle>
        </AuthDock>
      ) : null}
    </AuthShell>
  );
}
