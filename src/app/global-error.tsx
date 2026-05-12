"use client";

import { useEffect } from "react";
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
          topMessage="The full app shell did not complete, so recovery is running in minimal mode."
        />
      </body>
    </html>
  );
}
