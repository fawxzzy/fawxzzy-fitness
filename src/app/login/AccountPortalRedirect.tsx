"use client";

import { useEffect } from "react";
import { RouteLoading } from "@/components/RouteLoading";
import { clearBrowserSupabaseSession } from "@/lib/supabase/client";

export function AccountPortalRedirect({ href }: { href: string }) {
  useEffect(() => {
    let active = true;

    void clearBrowserSupabaseSession().finally(() => {
      if (active) window.location.replace(href);
    });

    return () => {
      active = false;
    };
  }, [href]);

  return (
    <RouteLoading
      label="Opening your Fawxzzy account"
      detail="Clearing the Fitness session before continuing."
      variant="route"
    />
  );
}
