import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { AppSoftErrorBoundary } from "@/components/error/AppSoftErrorBoundary";
import { PASSWORD_LOGIN_UI_COPY } from "@/components/auth/authCopy";
import type { AuthNotice } from "@/components/auth/authMessages";
import { APP_LOADER_ICON_DATA_URI } from "@/lib/app-loader-icon";
import { cn } from "@/lib/cn";

// Auth Surface v2 (approved by Zac 2026-11-15). One anatomy for every auth, account, install, loading and error
// screen: app icon, kicker, title, optional lead, a body (fields + ONE reserved notice slot), links, legal, dock.
// The page is one 100dvh flex column: nothing is position:fixed, so no fixed px offsets sit on top of the
// safe areas and the keyboard can never push a floating footer over a field. The look lives in globals.css
// (`.fx-auth*`, a port of the approved mock's `.ph` spec) so every screen shares it.

export const AUTH_APP_ICON_SRC = APP_LOADER_ICON_DATA_URI;

export function AuthShell({
  children,
  className,
  testId = "auth-shell",
  variant = "form",
}: {
  children: ReactNode;
  className?: string;
  testId?: string;
  variant?: "form" | "status" | "install";
}) {
  return (
    <main
      className={cn("fx-auth auth-canonical-account-shell", className)}
      data-auth-family="fawxzzy"
      data-auth-layout="surface-v2"
      data-auth-product="fitness"
      data-auth-runtime="same-origin"
      data-auth-variant={variant}
      data-testid={testId}
    >
      <div className="fx-auth__frame" data-testid="auth-shell-content">
        <AppSoftErrorBoundary area="auth-shell">
          {children}
        </AppSoftErrorBoundary>
      </div>
    </main>
  );
}

/** The real Fitness app icon (the inline 256 px derivation the loader uses: no request, no pop-in). */
export function AuthAppIcon({ placement = "top" }: { placement?: "top" | "mark" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={cn("fx-appicon", placement === "top" ? "fx-appicon--top" : "")}
      src={AUTH_APP_ICON_SRC}
      alt=""
      width={placement === "top" ? 60 : 76}
      height={placement === "top" ? 60 : 76}
      decoding="sync"
      data-testid="auth-app-icon"
    />
  );
}

export function AuthKicker() {
  return <p className="fx-kick">{PASSWORD_LOGIN_UI_COPY.wordmark}</p>;
}

export function AuthHead({ title, lead }: { title: string; lead?: string | null }) {
  return (
    <header className="fx-head" data-testid="auth-intro">
      <AuthAppIcon />
      <AuthKicker />
      <h1 className="fx-ttl">{title}</h1>
      {lead ? <p className="fx-lead">{lead}</p> : null}
    </header>
  );
}

export function AuthBody({
  children,
  align = "center",
  className,
  ...props
}: ComponentPropsWithoutRef<"section"> & { align?: "center" | "top" }) {
  return (
    <section
      {...props}
      className={cn("fx-body", align === "top" ? "fx-body--top" : "", className)}
      data-testid="auth-card"
    >
      {children}
    </section>
  );
}

export function AuthForm({ className, ...props }: ComponentPropsWithoutRef<"form">) {
  return <form {...props} className={cn("fx-form", className)} />;
}

export function AuthFormFields({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("fx-fields", className)} data-testid="auth-form-fields">
      {children}
    </div>
  );
}

function NoticeIcon({ tone }: { tone: AuthNotice["tone"] }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9.5" />
      {tone === "success" ? <path d="M8 12.4l2.8 2.8L16.2 9.4" /> : tone === "info" ? <path d="M12 11v5.5M12 7.6v.1" /> : <path d="M12 7.5v5.5M12 16.4v.1" />}
    </svg>
  );
}

/**
 * The ONE notice box, in a slot whose height is always held (empty or not), so a message never moves the fields,
 * links or dock. At most one inline action. Every tone is role=alert (spec: the box only appears when something needs reading).
 */
export function AuthNoticeSlot({
  notice,
  onAction,
  className,
}: {
  notice: AuthNotice | null | undefined;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("fx-slot", className)} data-testid="auth-notice-slot">
      {notice ? (
        <div
          className="fx-notice"
          data-tone={notice.tone}
          data-notice-id={notice.id}
          role="alert"
          aria-live="assertive"
          data-testid="auth-notice"
        >
          <NoticeIcon tone={notice.tone} />
          <span className="fx-notice__t">
            {notice.text}
            {notice.action && onAction ? (
              <button type="button" className="fx-notice__act" onClick={onAction}>{notice.action}</button>
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The same notice box outside the auth shell (Account settings outcomes). No role or live region of its own: the
 * caller keeps its existing live region, so adopting the v2 look changes nothing for assistive tech.
 */
export function AuthNoticeBox({ tone, children, testId }: { tone: AuthNotice["tone"]; children: ReactNode; testId?: string }) {
  return (
    <div className="fx-notice" data-tone={tone} data-testid={testId}>
      <NoticeIcon tone={tone} />
      <span className="fx-notice__t">{children}</span>
    </div>
  );
}

export function AuthLinks({ children }: { children: ReactNode }) {
  return <nav className="fx-links" aria-label="Account links" data-testid="auth-secondary-row">{children}</nav>;
}

export function AuthLinkButton({ className, type = "button", ...props }: ComponentPropsWithoutRef<"button">) {
  return <button {...props} type={type} className={cn("fx-link", className)} />;
}

export function AuthLink({ className, ...props }: ComponentPropsWithoutRef<typeof Link>) {
  return <Link {...props} className={cn("fx-link", className)} />;
}

function legalHref(pathname: "/privacy" | "/terms", returnTo?: string) {
  return returnTo ? { pathname, query: { returnTo } } : pathname;
}

export function AuthLegalRow({ returnTo }: { returnTo?: string }) {
  return (
    <nav className="fx-legal" aria-label="Legal" data-testid="auth-legal-row">
      <Link href={legalHref("/privacy", returnTo)} className="auth-canonical-legal-link">Privacy</Link>
      <Link href={legalHref("/terms", returnTo)} className="auth-canonical-legal-link">Terms</Link>
    </nav>
  );
}

function DockSpinner() {
  return (
    <svg className="fx-dock__sp" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" opacity=".25" />
      <path d="M12 3a9 9 0 019 9" />
    </svg>
  );
}

export function AuthDockButton({
  children,
  busy = false,
  busyLabel,
  className,
  disabled,
  type = "button",
  tone = "primary",
  ...props
}: ComponentPropsWithoutRef<"button"> & { busy?: boolean; busyLabel?: string; tone?: "primary" | "ghost" }) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn("fx-dock", tone === "ghost" ? "fx-dock--ghost" : "", className)}
      data-busy={busy ? "true" : undefined}
      data-auth-primary-action="true"
      data-testid="auth-dock"
    >
      {busy ? <DockSpinner /> : null}
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}

export function AuthDockLink({ className, ...props }: ComponentPropsWithoutRef<typeof Link>) {
  return <Link {...props} className={cn("fx-dock", className)} data-auth-primary-action="true" data-testid="auth-dock" />;
}

/** Loader, not-found, crash and offline screens: kicker, the icon in its mark (with a ring while working), title. */
export function AuthStatusScreen({
  title,
  lead,
  working = false,
  notice,
  onNoticeAction,
  action,
  testId,
}: {
  title: string;
  lead?: string | null;
  working?: boolean;
  notice?: AuthNotice | null;
  onNoticeAction?: () => void;
  action?: ReactNode;
  testId?: string;
}) {
  return (
    <AuthShell variant="status" testId={testId ?? "auth-shell"}>
      <AuthKicker />
      <div className="fx-stat" role={working ? "status" : undefined} aria-live={working ? "polite" : undefined}>
        <div className={cn("fx-mark", working ? "fx-mark--spin" : "")}>
          {working ? (
            <svg className="fx-mark__ring" aria-hidden="true" viewBox="0 0 100 100">
              <circle className="fx-mark__track" cx="50" cy="50" r="48" />
              <circle className="fx-mark__arc" cx="50" cy="50" r="48" strokeDasharray="70 230" />
            </svg>
          ) : null}
          <AuthAppIcon placement="mark" />
        </div>
        <h1 className="fx-ttl">{title}</h1>
        {lead ? <p className="fx-lead">{lead}</p> : null}
        {notice !== undefined ? <AuthNoticeSlot notice={notice} onAction={onNoticeAction} /> : null}
      </div>
      {action ?? null}
    </AuthShell>
  );
}

export function AuthInstallSteps({ steps }: { steps: readonly ReactNode[] }) {
  return (
    <ol className="fx-steps" aria-label="Install Fitness" data-testid="install-steps">
      {steps.map((step, index) => (
        <li key={index}>
          <span className="fx-steps__n" aria-hidden="true">{index + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

const ICON_PROPS = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function AuthLockIcon() {
  return (
    <svg {...ICON_PROPS} className="fx-fld__ico">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" />
    </svg>
  );
}

export function AuthShareIcon({ label = "Share" }: { label?: string }) {
  return (
    <svg {...ICON_PROPS} aria-hidden={undefined} role="img" aria-label={label}>
      <path d="M12 15V3.5M8 7l4-4 4 4M6 11H5.5A1.5 1.5 0 004 12.5v7A1.5 1.5 0 005.5 21h13a1.5 1.5 0 001.5-1.5v-7a1.5 1.5 0 00-1.5-1.5H18" />
    </svg>
  );
}

export function AuthAddIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

export function AuthDotsIcon({ label = "Menu" }: { label?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" role="img" aria-label={label}>
      <circle cx="5.5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="18.5" cy="12" r="1.8" />
    </svg>
  );
}
