"use client";

import { type ReactNode, useEffect, useState } from "react";
import { AccountPortalRedirect } from "@/app/login/AccountPortalRedirect";
import { RouteLoading } from "@/components/RouteLoading";
import { getFitnessSignupPortalUrlForSearch } from "@/lib/account-portal";
import { getInstallContext } from "@/lib/install/getInstallContext";
import { isTrustedLocalDevHost } from "@/lib/supabase/local-dev-host";

type SignupEntryState = { mode: "browser" | "standalone"; portalHref: string };

// Browser tabs send sign-up to the ONE account-portal sign-up surface (same split as LoginEntry); the installed app
// keeps its own in-scope screen. `?manual=1` on a trusted local host forces the in-app screen for local review.
export function SignupEntry({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SignupEntryState | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isLocalManualSignup = params.get("manual") === "1" && isTrustedLocalDevHost(window.location.hostname);
    setState({
      mode: getInstallContext().isStandalone || isLocalManualSignup ? "standalone" : "browser",
      portalHref: getFitnessSignupPortalUrlForSearch(window.location.search),
    });
  }, []);

  if (state === null) {
    return <RouteLoading label="Opening Fitness" variant="route" />;
  }

  if (state.mode === "browser") {
    return <AccountPortalRedirect href={state.portalHref} />;
  }

  return <>{children}</>;
}
