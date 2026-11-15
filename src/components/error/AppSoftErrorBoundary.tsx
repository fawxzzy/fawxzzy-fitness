"use client";

import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { ERROR_COPY } from "@/components/error/errorCopy";
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
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-4">
      <SurfaceCard className="w-full max-w-sm space-y-4 text-center" role="alert">
        <p className="text-base font-semibold text-[rgb(var(--text-primary))]">{ERROR_COPY.boundaryTitle}</p>
        <p className="text-sm text-[rgb(var(--text-secondary))]">
          {ERROR_COPY.boundaryBody}
          {process.env.NODE_ENV !== "production" ? ` (${error.name})` : ""}
        </p>
        <div className="flex flex-col gap-3">
          <button type="button" className={getAppButtonClassName({ variant: "primary", fullWidth: true })} onClick={onRetry}>
            {ERROR_COPY.retryLabel}
          </button>
          <button
            type="button"
            className={getAppButtonClassName({ variant: "secondary", fullWidth: true })}
            onClick={() => window.location.reload()}
          >
            {ERROR_COPY.reloadLabel}
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
