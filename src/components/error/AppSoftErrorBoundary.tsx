"use client";

import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { recordClientBootDiagnostic } from "@/lib/boot-diagnostics";
import {
  buildFreshRecoveryReloadHref,
  clearClientRecoveryState,
} from "@/lib/client-recovery-reset";

type AppSoftErrorBoundaryProps = {
  children: ReactNode;
  area?: string;
};

type AppSoftErrorBoundaryInnerProps = AppSoftErrorBoundaryProps & {
  routeKey: string;
};

type AppSoftErrorBoundaryState = {
  error: Error | null;
  retryNonce: number;
};

function AppSoftErrorFallback({
  area,
  error,
  onRetry,
  onOpenToday,
  onGoToLogin,
}: {
  area: string;
  error: Error;
  onRetry: () => void;
  onOpenToday: () => void;
  onGoToLogin: () => void;
}) {
  const handleReload = useCallback(() => {
    if (typeof window !== "undefined") {
      clearClientRecoveryState(window.sessionStorage);
      window.location.assign(buildFreshRecoveryReloadHref(window.location.href));
    }
  }, []);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-4">
      <SurfaceCard className="w-full max-w-[32rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.82)] backdrop-blur-xl">
        <div className="space-y-2">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.92)]">
            Recovered Screen Error
          </p>
          <h2 className="text-[1.02rem] font-semibold leading-[1.2] text-[rgb(var(--text-primary)/0.96)]">
            This screen hit an error, but the app stayed running.
          </h2>
          <p className="text-[0.88rem] leading-[1.45] text-[rgb(var(--text-secondary)/0.94)]">
            The failure was logged and this section was stopped before it could take down the full app shell.
          </p>
        </div>
        <div className="rounded-[1rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.48)] px-4 py-3">
          <p className="text-[0.76rem] font-medium uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.9)]">
            Error Area
          </p>
          <p className="mt-1 text-[0.88rem] leading-[1.35] text-[rgb(var(--text-primary)/0.94)]">
            {area}
          </p>
          {process.env.NODE_ENV !== "production" ? (
            <p className="mt-2 text-[0.8rem] leading-[1.35] text-[rgb(var(--text-secondary)/0.88)]">
              {error.name}: {error.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.7)] px-4 text-[0.84rem] font-semibold text-[rgb(var(--text-primary)/0.96)] transition hover:bg-[rgb(var(--surface-2-rgb)/0.9)]"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={handleReload}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--accent)/0.92)] px-4 text-[0.84rem] font-semibold text-white transition hover:bg-[rgb(var(--accent)/1)]"
          >
            Reload App
          </button>
          <button
            type="button"
            onClick={onOpenToday}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.56)] px-4 text-[0.84rem] font-semibold text-[rgb(var(--text-primary)/0.96)] transition hover:bg-[rgb(var(--surface-2-rgb)/0.82)]"
          >
            Open Today
          </button>
          <button
            type="button"
            onClick={onGoToLogin}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.56)] px-4 text-[0.84rem] font-semibold text-[rgb(var(--text-primary)/0.96)] transition hover:bg-[rgb(var(--surface-2-rgb)/0.82)]"
          >
            Go to Login
          </button>
        </div>
      </SurfaceCard>
    </div>
  );
}

class AppSoftErrorBoundaryInner extends Component<
  AppSoftErrorBoundaryInnerProps,
  AppSoftErrorBoundaryState
> {
  state: AppSoftErrorBoundaryState = {
    error: null,
    retryNonce: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<AppSoftErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    recordClientBootDiagnostic({
      tag: "[entry.boot.unexpected]",
      source: "client",
      route: this.props.routeKey,
      stage: `soft-boundary:${this.props.area ?? "app-content"}`,
      buildId: CURRENT_APP_BUILD_ID,
      errorName: error.name,
      errorMessage: error.message,
    }, {
      level: "error",
    });

    console.error("[app-soft-error-boundary]", {
      area: this.props.area ?? "app-content",
      routeKey: this.props.routeKey,
      error,
      componentStack: errorInfo.componentStack,
    });
  }

  componentDidUpdate(prevProps: AppSoftErrorBoundaryInnerProps) {
    if (
      this.state.error
      && (prevProps.routeKey !== this.props.routeKey || prevProps.area !== this.props.area)
    ) {
      this.setState((current) => ({
        error: null,
        retryNonce: current.retryNonce + 1,
      }));
    }
  }

  private handleRetry = () => {
    if (typeof window !== "undefined") {
      clearClientRecoveryState(window.sessionStorage);
    }
    this.setState((current) => ({
      error: null,
      retryNonce: current.retryNonce + 1,
    }));
  };

  private handleOpenToday = () => {
    if (typeof window !== "undefined") {
      clearClientRecoveryState(window.sessionStorage);
      window.location.assign("/today");
    }
  };

  private handleGoToLogin = () => {
    if (typeof window !== "undefined") {
      clearClientRecoveryState(window.sessionStorage);
      window.location.assign("/login?error=session_expired");
    }
  };

  render() {
    if (this.state.error) {
      return (
        <AppSoftErrorFallback
          area={this.props.area ?? "app-content"}
          error={this.state.error}
          onRetry={this.handleRetry}
          onOpenToday={this.handleOpenToday}
          onGoToLogin={this.handleGoToLogin}
        />
      );
    }

    return (
      <div key={`${this.props.routeKey}:${this.state.retryNonce}`} className="flex min-h-0 flex-1 flex-col">
        {this.props.children}
      </div>
    );
  }
}

export function AppSoftErrorBoundary({
  children,
  area = "app-content",
}: AppSoftErrorBoundaryProps) {
  const pathname = usePathname();
  const routeKey = pathname ?? "unknown";

  return (
    <AppSoftErrorBoundaryInner routeKey={routeKey} area={area}>
      {children}
    </AppSoftErrorBoundaryInner>
  );
}
