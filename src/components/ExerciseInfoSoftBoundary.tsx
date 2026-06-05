"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { recordClientBootDiagnostic } from "@/lib/boot-diagnostics";

type ExerciseInfoSoftBoundaryProps = {
  children: ReactNode;
  exerciseId: string | null;
  onClose?: () => void;
};

type ExerciseInfoSoftBoundaryState = {
  error: Error | null;
};

function ExerciseInfoFallback({
  error,
  onClose,
}: {
  error: Error;
  onClose?: () => void;
}) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 overflow-y-auto overscroll-none bg-[rgb(var(--bg))] p-4">
      <div className="flex min-h-[100dvh] items-center justify-center">
        <SurfaceCard className="w-full max-w-[32rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.9)] backdrop-blur-xl">
          <div className="space-y-2">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.92)]">
              Exercise Info Error
            </p>
            <h2 className="text-[1.02rem] font-semibold leading-[1.2] text-[rgb(var(--text-primary)/0.96)]">
              This exercise card could not be opened safely.
            </h2>
            <p className="text-[0.88rem] leading-[1.45] text-[rgb(var(--text-secondary)/0.94)]">
              The failure was logged and the exercise info surface was stopped before it could take down the rest of the app.
            </p>
          </div>
          {process.env.NODE_ENV !== "production" ? (
            <div className="rounded-[1rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.48)] px-4 py-3">
              <p className="text-[0.8rem] leading-[1.35] text-[rgb(var(--text-secondary)/0.88)]">
                {error.name}: {error.message}
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onClose?.()}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--accent)/0.92)] px-4 text-[0.84rem] font-semibold text-white transition hover:bg-[rgb(var(--accent)/1)]"
            >
              Close
            </button>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}

export class ExerciseInfoSoftBoundary extends Component<
  ExerciseInfoSoftBoundaryProps,
  ExerciseInfoSoftBoundaryState
> {
  state: ExerciseInfoSoftBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ExerciseInfoSoftBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    recordClientBootDiagnostic({
      tag: "[entry.boot.unexpected]",
      source: "client",
      route: null,
      stage: "exercise-info-soft-boundary",
      buildId: CURRENT_APP_BUILD_ID,
      errorName: error.name,
      errorMessage: error.message,
    }, {
      level: "error",
    });

    console.error("[exercise-info-soft-boundary]", {
      exerciseId: this.props.exerciseId,
      error,
      componentStack: errorInfo.componentStack,
    });
  }

  componentDidUpdate(prevProps: ExerciseInfoSoftBoundaryProps) {
    if (
      this.state.error
      && prevProps.exerciseId !== this.props.exerciseId
    ) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return <ExerciseInfoFallback error={this.state.error} onClose={this.props.onClose} />;
    }

    return this.props.children;
  }
}
