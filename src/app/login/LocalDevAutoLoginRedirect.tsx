"use client";

import { useEffect } from "react";
import { RouteLoading } from "@/components/RouteLoading";

export function LocalDevAutoLoginRedirect({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return (
    <RouteLoading
      label="Signing into local dev account"
      detail="Redirecting into the local session bootstrap."
      variant="route"
    />
  );
}
