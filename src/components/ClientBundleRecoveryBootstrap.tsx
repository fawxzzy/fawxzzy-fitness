"use client";

import { useEffect } from "react";
import { CURRENT_APP_BUILD_ID } from "@/lib/app-build";
import { recordClientBootDiagnostic } from "@/lib/boot-diagnostics";
import {
  buildClientBundleRecoveryHref,
  getStaleClientAssetSignature,
  markClientBundleRecoveryAttempt,
  shouldAttemptClientBundleRecovery,
} from "@/lib/client-bundle-recovery";

export function ClientBundleRecoveryBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let recovering = false;

    const attemptRecovery = (error: unknown) => {
      const signature = getStaleClientAssetSignature(error);
      if (!signature || recovering) {
        return;
      }

      if (!shouldAttemptClientBundleRecovery(window.sessionStorage, CURRENT_APP_BUILD_ID, signature)) {
        return;
      }

      recovering = true;
      markClientBundleRecoveryAttempt(window.sessionStorage, CURRENT_APP_BUILD_ID, signature);
      recordClientBootDiagnostic({
        tag: "[boot.service-worker]",
        source: "client",
        route: window.location.pathname,
        stage: `bundle-recovery-${signature}`,
        buildId: CURRENT_APP_BUILD_ID,
        errorMessage: error instanceof Error ? error.message : typeof error === "string" ? error : null,
      }, {
        level: "warn",
      });

      void navigator.serviceWorker?.getRegistration()
        ?.then((registration) => registration?.update())
        .catch(() => {
          // Ignore service worker update failures and continue to cache cleanup.
        })
        .finally(() => {
          void window.caches?.keys()
            .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
            .catch(() => {
              // Ignore cache cleanup failures and continue to the reload.
            })
            .finally(() => {
              window.location.replace(
                buildClientBundleRecoveryHref(window.location.href, CURRENT_APP_BUILD_ID, signature),
              );
            });
        });
    };

    const handleError = (event: ErrorEvent) => {
      attemptRecovery(event.error ?? event.message);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      attemptRecovery(event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
