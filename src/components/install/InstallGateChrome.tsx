import type { ReactNode } from "react";
import { AuthCard, AuthDock, AuthIntro, AuthShell, AuthStack } from "@/components/auth/AuthShell";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
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
      <AuthCard className="mx-auto w-full max-w-md">
        <AuthIntro eyebrow={eyebrow} title={title} subtitle={subtitle} />
        <AuthStack className="pt-6" size="compact">
          {showInstallUrlCard ? (
            <div className="rounded-[1.25rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2)/0.84)] px-4 py-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--text-muted)/0.92)]">
                Install link
              </p>
              <p className="mt-2 break-all text-sm leading-6 text-[rgb(var(--text-primary)/0.98)]">{installUrl}</p>
            </div>
          ) : null}

          {children}
        </AuthStack>
      </AuthCard>

      {showCopyButton ? (
        <AuthDock>
          <BottomActionSingle>
            <BottomDockButton intent="positive" onClick={onCopy} type="button">
              {copyState === "copied" ? "Copied link" : copyState === "error" ? "Copy failed" : "Copy link"}
            </BottomDockButton>
          </BottomActionSingle>
        </AuthDock>
      ) : primaryHref && primaryLabel ? (
        <AuthDock>
          <BottomActionSingle>
            <BottomDockLink href={primaryHref} intent="positive">
              {primaryLabel}
            </BottomDockLink>
          </BottomActionSingle>
        </AuthDock>
      ) : secondaryAction ? (
        <AuthDock>
          <BottomActionSingle>{secondaryAction}</BottomActionSingle>
        </AuthDock>
      ) : null}
    </AuthShell>
  );
}
