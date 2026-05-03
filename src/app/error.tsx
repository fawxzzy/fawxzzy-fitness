"use client";

import { useEffect } from "react";
import { AppRecoveryScreen } from "@/components/error/AppRecoveryScreen";

export default function Error({
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
    <AppRecoveryScreen
      digest={error.digest}
      errorName={error.name}
      onReopen={reset}
    />
  );
}
