"use client";

import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
} from "react";
import { usePathname } from "next/navigation";
import { navigateToFirstSafeRecoveryHref } from "@/components/error/safeRecoveryNavigation";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { SESSION_EXPIRED_LOGIN_ERROR } from "@/lib/auth-session";
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
  navigationMessage: string | null;
  retryNonce: number;
};

const SOFT_ERROR_TOAST_MESSAGE = "That screen crashed. Fitness recovered to a safe screen.";

function isPath(pathname: string | null | undefined, target: string) {
  return pathname === target || Boolean(pathname?.startsWith(`${target}/`));
}

function AppSoftErrorFallback({
  area,
  error,
  currentPath,
  onNavigationFailure,
  navigationMessage,
}: {
  area: string;
  error: Error;
  currentPath: string;
  onNavigationFailure: (message: string) => void;
  navigationMessage: string | null;
}) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    clearClientRecoveryState(window.sessionStorage);
    const loginHref = `/login?error=${encodeURIComponent(SESSION_EXPIRED_LOGIN_ERROR)}`;
    const preferredHrefs = isPath(currentPath, "/today") ? [loginHref] : [];

    void navigateToFirstSafeRecoveryHref({
      currentPath,
      preferredHrefs,
      recoveryErrorMessage: SOFT_ERROR_TOAST_MESSAGE,
    }).then((href) => {
      if (!href) {
        if (isPath(currentPath, "/login")) {
          window.location.assign(buildFreshRecoveryReloadHref("/login"));
          return;
        }
        onNavigationFailure("The screen crashed and no safe route was confirmed. Reloading Today.");
        window.location.assign(buildFreshRecoveryReloadHref("/today"));
      }
    });
  }, [currentPath, onNavigationFailure]);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-4">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-secondary)/0.82)]">
        Recovering {area}{process.env.NODE_ENV !== "production" ? ` (${error.name})` : ""}
      </p>
      {navigationMessage ? <span className="sr-only">{navigationMessage}</span> : null}
    </div>
  );
}

class AppSoftErrorBoundaryInner extends Component<
  AppSoftErrorBoundaryInnerProps,
  AppSoftErrorBoundaryState
> {
  state: AppSoftErrorBoundaryState = {
    error: null,
    navigationMessage: null,
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
        navigationMessage: null,
        retryNonce: current.retryNonce + 1,
      }));
    }
  }

  private handleNavigationFailure = (message: string) => {
    this.setState({ navigationMessage: message });
  };

  render() {
    if (this.state.error) {
      return (
        <AppSoftErrorFallback
          area={this.props.area ?? "app-content"}
          error={this.state.error}
          currentPath={this.props.routeKey}
          onNavigationFailure={this.handleNavigationFailure}
          navigationMessage={this.state.navigationMessage}
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
