"use client";

import { useEffect } from "react";
import "./globals.css";
import { ERROR_COPY } from "@/components/error/errorCopy";
import { AppRecoveryScreen } from "@/components/error/AppRecoveryScreen";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <AppRecoveryScreen
          digest={error.digest}
          errorName={error.name}
          onReopen={reset}
          topMessage={ERROR_COPY.globalBody}
        />
      </body>
    </html>
  );
}
