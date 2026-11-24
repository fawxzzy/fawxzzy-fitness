"use client";

import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { AppButton } from "@/components/ui/AppButton";
import { CardSurface } from "@/components/ui/card-system/CardSurface";
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

// One line and one action, like Mazer: "Could not load", the shared crash line, "Try again". The error name never
// shows. The first Try again re-renders the area; if it fails again the same button reloads the app. It is the same
// card as the rest of the app (CardSurface, the Today card layout) with the one primary AppButton, 8px apart, so a
// crashed area looks like the app and not like a different product. The words are plain text, never red.
function AppSoftErrorFallback({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-4">
      <CardSurface showRail={false} className="w-full max-w-sm" role="alert" data-app-soft-error="true">
        <div className="grid gap-2 p-4 text-center">
          <h2 className="m-0 text-[length:var(--type-title-sm)] font-semibold leading-snug text-[rgb(var(--text-primary))]">
            {ERROR_COPY.boundaryTitle}
          </h2>
          <p className="m-0 text-[length:var(--type-body)] leading-snug text-[rgb(var(--text-secondary))]">
            {ERROR_COPY.boundaryBody}
          </p>
          <AppButton type="button" variant="primary" fullWidth className="mt-2" onClick={onRetry}>
            {ERROR_COPY.retryLabel}
          </AppButton>
        </div>
      </CardSurface>
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
          onRetry={this.state.retryNonce > 0 ? () => window.location.reload() : this.handleRetry}
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
