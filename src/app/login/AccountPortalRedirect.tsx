"use client";

import { useEffect } from "react";
import { RouteLoading } from "@/components/RouteLoading";

export function AccountPortalRedirect({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return (
    <RouteLoading
      label="Opening your Fawxzzy account"
      detail="Secure sign-in will return you to Fitness."
      variant="route"
    />
  );
}
