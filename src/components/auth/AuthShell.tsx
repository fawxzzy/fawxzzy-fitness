import type { ComponentPropsWithoutRef, ReactNode } from "react";
import {
  ACTION_CHROME_RAIL_CLASS_NAME,
  ACTION_CHROME_RAIL_GRID_CLASS_NAME,
} from "@/components/ui/actionChrome";
import { SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { PASSWORD_LOGIN_UI_COPY } from "@/components/auth/authCopy";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

export function AuthShell({
  children,
  className,
  topAction,
}: {
  children: ReactNode;
  className?: string;
  topAction?: ReactNode;
}) {
  return (
    <main
      className={cn(appTokens.authShell, "bg-transparent", "[caret-color:transparent]")}
      data-testid="auth-shell"
    >
      <div aria-hidden="true" className={appTokens.authShellBackdrop}>
        <div className={appTokens.authShellBackdropGrid} />
        <div className={appTokens.authShellBackdropGlowLeading} />
        <div className={appTokens.authShellBackdropGlowTrailing} />
        <div className={appTokens.authShellBackdropRuleTop} />
        <div className={appTokens.authShellBackdropRuleBottom} />
      </div>

      <div className={appTokens.authShellFrame}>
        {topAction ? (
          <div className={appTokens.authShellTopAction}>
            {topAction}
          </div>
        ) : null}
        <div
          className={cn("flex min-w-0 flex-1 flex-col justify-center", topAction ? appTokens.authShellContentOffset : "", appTokens.authShellContent, className)}
          data-testid="auth-shell-content"
        >
          {children}
        </div>
      </div>
    </main>
  );
}

export function AuthIntro({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <header className={cn(appTokens.authIntro, appTokens.authIntroFrame)} data-testid="auth-intro">
      <p className={appTokens.authWordmark}>{PASSWORD_LOGIN_UI_COPY.wordmark}</p>
      {eyebrow ? <p className={appTokens.authIntroEyebrow}>{eyebrow}</p> : null}
      {title || subtitle ? (
        <div className={appTokens.authIntroTitleStack}>
          {title ? <h1 className={appTokens.authIntroTitle}>{title}</h1> : null}
          {subtitle ? <p className={cn(appTokens.authIntroSubtitle, "mx-auto")}>{subtitle}</p> : null}
        </div>
      ) : null}
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

export function AuthField({
  label,
  children,
  hideLabel = false,
}: {
  label: string;
  children: ReactNode;
  hideLabel?: boolean;
}) {
  return (
    <label className={appTokens.authField}>
      <span className={hideLabel ? "sr-only" : appTokens.authFieldLabel}>{label}</span>
      {children}
    </label>
  );
}

export function AuthForm({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"form">) {
  return (
    <form
      {...props}
      className={cn(appTokens.authFormStack, className)}
    >
      {children}
    </form>
  );
}

export function AuthFormFields({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full max-w-[23rem] space-y-3 px-0.5 pt-1.5 sm:space-y-4 sm:px-0 sm:pt-2", className)}>{children}</div>;
}

export function AuthStatusText({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn(appTokens.authStatusMessage, className)}>{children}</p>;
}

export function AuthStack({
  children,
  className,
  size = "md",
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  size?: "xs" | "sm" | "compact" | "md" | "lg";
}) {
  const gapClassName =
    size === "xs"
      ? "space-y-1"
      : size === "sm"
        ? "space-y-2"
        : size === "compact"
          ? "space-y-3"
        : size === "lg"
          ? "space-y-5"
          : "space-y-4";

  return (
    <div {...props} className={cn(gapClassName, className)}>
      {children}
    </div>
  );
}

export function AuthActionRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex justify-end", className)}>{children}</div>;
}

export function AuthActionBar({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={cn(ACTION_CHROME_RAIL_CLASS_NAME, className)}>
      <div className={cn(ACTION_CHROME_RAIL_GRID_CLASS_NAME, innerClassName)}>
        {children}
      </div>
    </div>
  );
}

export function AuthFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(appTokens.authFooter, className)}>{children}</div>;
}

export function AuthFooterSeparator() {
  return <SignatureMiniPipe className={appTokens.authFooterSeparator} />;
}

export function AuthFooterText({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center leading-6", className)}>{children}</p>;
}

export function AuthInlineLinkButton({
  children,
  className,
  type = "button",
  ...props
}: ComponentPropsWithoutRef<"button">) {
  return (
    <button
      {...props}
      type={type}
      className={cn(
        "!border-0 !bg-transparent !px-1 !py-0.5 !text-[rgb(var(--accent))] !shadow-none !outline-none select-none hover:!text-[rgb(var(--accent-strong))] focus:!outline-none focus-visible:!outline-none focus:!shadow-none focus-visible:!shadow-none focus:!ring-0 focus-visible:!ring-0",
        appTokens.authInlineButton,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AuthDock({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(appTokens.authDock, className)}>{children}</div>;
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
      <AuthStack size="xs" data-testid={testId}>
        <p className={appTokens.authStatusTitle}>{title}</p>
        {description ? <p className={appTokens.authStatusDescription}>{description}</p> : null}
      </AuthStack>
    </AuthCard>
  );
}
