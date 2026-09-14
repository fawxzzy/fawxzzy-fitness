"use client";

import { useEffect, useState } from "react";
import { AccountPortalRedirect } from "@/app/login/AccountPortalRedirect";
import { LoginScreen } from "@/app/login/LoginScreen";
import { RouteLoading } from "@/components/RouteLoading";
import { getFitnessLoginPortalUrl } from "@/lib/account-portal";
import { getInstallContext } from "@/lib/install/getInstallContext";
import { isTrustedLocalDevHost } from "@/lib/supabase/local-dev-host";

type LoginEntryProps = {
  error?: string;
  info?: string;
  requiresReauth?: boolean;
  returnTo?: string;
  manualRequested?: boolean;
};

export function LoginEntry(props: LoginEntryProps) {
  const [displayMode, setDisplayMode] = useState<"browser" | "standalone" | null>(null);

  useEffect(() => {
    const isLocalManualLogin = Boolean(
      props.manualRequested && isTrustedLocalDevHost(window.location.hostname),
    );
    setDisplayMode(
      getInstallContext().isStandalone || isLocalManualLogin ? "standalone" : "browser",
    );
  }, [props.manualRequested]);

  if (displayMode === null) {
    return <RouteLoading label="Opening Fitness" variant="route" />;
  }

  if (displayMode === "browser") {
    return <AccountPortalRedirect href={getFitnessLoginPortalUrl(props.returnTo)} />;
  }

  return <LoginScreen {...props} />;
}
