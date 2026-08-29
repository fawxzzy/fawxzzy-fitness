"use client";

import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { recordClientBootDiagnostic } from "@/lib/boot-diagnostics";

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

function AppSoftErrorFallback({
  area,
  error,
  onRetry,
}: {
  area: string;
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
      <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">
        Fitness could not load {area}.
      </p>
      <p className="text-xs text-[rgb(var(--text-secondary))]">
        This error did not sign you out.
        {process.env.NODE_ENV !== "production" ? ` (${error.name})` : ""}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          className="min-h-11 rounded-full border border-[rgb(var(--border-strong)/0.42)] px-5 text-sm font-semibold text-[rgb(var(--text-primary))]"
          onClick={onRetry}
        >
          Retry
        </button>
        <button
          type="button"
          className="min-h-11 rounded-full border border-[rgb(var(--border-strong)/0.42)] px-5 text-sm font-semibold text-[rgb(var(--text-primary))]"
          onClick={() => window.location.reload()}
        >
          Reload app
        </button>
      </div>
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

  private handleRetry = () => {
    this.setState((current) => ({
      error: null,
      navigationMessage: null,
      retryNonce: current.retryNonce + 1,
    }));
  };

  render() {
    if (this.state.error) {
      return (
        <AppSoftErrorFallback
          area={this.props.area ?? "app-content"}
          error={this.state.error}
          onRetry={this.handleRetry}
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
